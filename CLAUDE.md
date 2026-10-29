# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CRAF'd Crisis Data Funding Compass (compass.crafd.io): a Next.js 16 / React 19 / Tailwind CSS v4 / shadcn/ui dashboard that maps donors → agencies → organizations → projects → themes in the crisis-data funding ecosystem. It is deployed on Vercel as a server-rendered app with API routes (not a static export).

> Some leftovers from the old Airtable→JSON setup (`public/data/*.json`) still exist. Scripts that read those files (`04_…`, `05_fetch_iati.py`, `python/misc/`) no longer run, and the in-app IATI activity view gets no data. `python/README.md` and `docs/IATI_INTEGRATION.md` describe what is current. The app reads everything from PostgreSQL, and the package manager is pnpm.

## Commands

Web app (pnpm):

```bash
pnpm install
pnpm dev          # usually already running on http://localhost:3000; clears .next first
pnpm build
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm format       # prettier (src/ only, with tailwind plugin)
pnpm test         # vitest run
```

Tests cover logic only, not components:

- Vitest tests sit next to the code as `src/**/*.test.ts`. `dashboardService.test.ts` mocks `getCoreData()` with a small fixture dataset and tests through `processDashboardData(filters)`. When you change filtering or stats logic, update or extend those fixtures.
- pytest covers the pure functions of the 01b pipeline (`python/tests/`, run with `uv run pytest`).
- `.github/workflows/ci.yml` runs typecheck, lint, both test suites and `pnpm build` on PRs and pushes to `main`. The build needs no database.

For UI changes, also look at the running app (Playwright MCP is available for that). Check that the page finishes loading and stays loaded, not just that it renders once.

`pnpm dev` deletes `.next` before starting. A stale `.next` (a production build next to old dev output) once sent every page into an endless reload loop: "[Fast Refresh] rebuilding" repeating in the browser console and "✓ Compiled" repeating in the server log. If that ever happens, restart `pnpm dev`. Don't run `pnpm build` while the dev server is running.

Python data pipeline (uv, Python ≥3.13):

```bash
uv sync
uv run python python/01b_fetch_airtable_to_sql.py   # Airtable → Postgres (the only step the app depends on)
uv run pytest                                       # pipeline tests (python/tests/)
uvx ruff check --select I --fix python/ && uvx ruff format python/
```

## Architecture

### Data flow

Airtable → `python/01b_fetch_airtable_to_sql.py` → PostgreSQL schema `funding_compass` (Azure) → Next.js API routes → client.

- The pipeline runs daily through `.github/workflows/fetch_data_from_airtable.yml` (05:00 UTC, or on manual dispatch).
- Each run **drops and recreates** the schema from `sql/schema/*.sql`, applied in filename order.
- The script fetches every Airtable table first. The drop, create and all inserts then run in one transaction, so a failed run leaves the previous data in place. Keep it that way: no commits inside helpers, and no `BEGIN`/`COMMIT` in the schema files.
- Safety checks run before the database is touched:
  - All five `AIRTABLE_TABLE_ID_*` vars are required (projects, organizations, agencies, themes, donors).
  - Every table must return records.
  - No table may shrink below 50% of its current row count. Set `ALLOW_LARGE_DROP=1` to override for an intentional deletion.
- All Airtable string values are whitespace-stripped on import.
- Data-quality problems (missing keys, non-http links, projects with no organization) print as `::warning::` annotations on the Actions run. They don't fail the import.
- Investment types are built from the Themes table, so missing theme data also empties the types.
- Projects' `Investment Theme(s)` is a lookup of an old dropdown on Themes, not of the theme names, and the import ignores it. Project↔theme links come only from the Themes table's `Data Ecosystem Projects` record links.
- Countries are matched on ISO alpha-3 codes, never on names. The code is the "ISO alpha-3" field of Airtable's Donors [High-level] table, which agencies and organization HQs link to; groups of funders have none. The pipeline stores it in `countries.iso_alpha3`, and loads the UN member states from `data/un_member_states.csv` (from UN-CRAFd/crafd-reference-datasets) into `un_member_states`. Member-state names and flags come from joining the two on the code.
- `AIRTABLE_API_KEY` is read-only, by design. Airtable fixes made from scripts use a separate `AIRTABLE_WRITE_API_KEY` from `.env`, which is local only and never goes in CI.
- IDs are deterministic UUIDs derived from Airtable record IDs.
- A schema change touches three places: `sql/schema/`, the normalizer in `01b_…py`, and the repositories in `src/server/repositories/`.
- `docs/DATA.md` is the data dictionary. `docs/FULL_DATASET_README.md` is the README that goes out with full database exports; keep both in sync with the schema.

Env vars differ by side:

- The Next app needs `DATABASE_URL`. `NEXT_PUBLIC_SURVEY_URL` is optional: it sets the survey banner link and has a fallback.
- The 01b pipeline uses `AZURE_POSTGRES_HOST/PORT/USER/PASSWORD` plus the `AIRTABLE_*` vars.
- Python loads `.env.local` first, falling back to `.env`.

### Server layer (`src/server/`), strictly layered

1. `db/index.ts`: the singleton `pg` pool (max 1 connection per serverless instance). It is the only module that may import `pg`.
2. `repositories/`: raw SQL only, returning typed row shapes (`OrgRow`, …) with no business logic.
3. `cache.ts`: `getCoreData()` runs all batch repository queries in parallel and caches the result with a 60s TTL, sharing one in-flight promise between concurrent callers. **API routes and services get data through `getCoreData()`, never from repositories directly.**
4. `services/`: business logic with no SQL. It assembles rows into DTOs, applies filters and computes stats. `dashboardService.processDashboardData(filters)` is the core function.
5. `dto/`: response and filter shapes.
6. `src/app/api/*/route.ts`: thin handlers. `/api/dashboard` accepts POST with a filters body, or GET for the unfiltered data.

The frontend still uses the legacy Airtable record shape. `server/utils.ts#buildFieldsObject` rebuilds `org.fields["Org Full Name"]` and similar from SQL columns so that components and `src/types/airtable.ts` keep working. When you add a DB column the UI needs, add it there too.

### Client

- `src/lib/data.ts` is the client data layer: thin `fetch` wrappers over `/api/*`, plus cached theme, member-state and country-code mappings. `CountryFlag` looks flags up by ISO code through `useCountryCodes()`. It also keeps the old function names (e.g. `processDashboardData`), which now call the API.
- `CrisisDataDashboardWrapper.tsx` owns routing and URL state and fetches the data. `CrisisDataDashboard.tsx` renders it.
- Filter URL params and modal URL params (`org`, `asset`, `donor`) are deliberately independent: changing a modal never triggers a refetch or filter validation.
- Filter params are the same on `/` and `/analytics`: `d` (donor slugs), `a` (agency slugs), `t` (investment-type slugs), `th` (theme keys), `q` (search), `sb`/`sd` (sort, dashboard only). Old long names (`donors`, `types`, …) are no longer read.
- `src/lib/urlShortcuts.ts` maps investment-type labels to the short URL slugs.
- `src/config/labels.json` holds all user-facing text, and both server and client code import it. Investment-type display names also come from here. Other copy lives in `src/config/*Descriptions.ts`.
- The routes are `/` (dashboard), `/analytics` and `/methodology`.
- The "last updated" date (`/api/last-updated`, `src/lib/getLastUpdated.ts`) is the date of the latest git commit, not of the last data sync. If git isn't available, it shows today's date instead.

### Styling

Tailwind v4 is configured entirely in `src/app/globals.css`, **not** in `tailwind.config.ts`. Many v3 patterns no longer work, so check the current Tailwind v4 docs (via context7) rather than relying on memory.

- `@theme inline` holds the tokens that should become utility classes: fonts, colors and the like.
- `:root` holds plain CSS variables such as `--brand-primary`, used as `var(--…)`.
- Use colors from these tokens; don't add new hard-coded values.

Dark mode is a work in progress:

- `next-themes` uses the class strategy (`.dark` on `<html>`, `@custom-variant dark`), defaults to light and has `enableSystem=false`.
- Semantic tokens are redefined in the `.dark` block of `globals.css`.
- Many components still use hard-coded utilities (`bg-white`, `text-slate-600`, `text-[#333333]` …). `globals.css` overrides these with explicit `.dark .bg-white {…}` rules. New code should use the theme tokens, so the override list doesn't keep growing.

## Conventions

- shadcn/ui:
  - Install primitives with `npx shadcn@latest add <component>`.
  - `src/components/ui/` contains only primitives as installed: don't edit them there.
  - Custom components go in `src/components/`, with shared bits in `src/components/shared/`.
- Learn the API and page structure before making isolated changes.
- Don't build parallel infrastructure. Prefer global solutions, and don't hard-code things where they would be hard to find.
- Use context7 for up-to-date Next.js, Tailwind, shadcn/ui and React docs.
- Don't commit, push or open PRs unless asked. Leave changes uncommitted for review.
- When a decision is the user's to make (product behavior, open questions at the end of a task, choosing between approaches), ask it with the question dialog (AskUserQuestion) rather than in prose.
