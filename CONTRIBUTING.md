# Contributing

This repository has two parts:

- **Web app:** Next.js, in `src/`. It reads everything from PostgreSQL through its own API routes.
- **Data pipeline:** Python, in `python/`. A daily GitHub Action rebuilds the database from the CRAF'd Airtable base.

## Data corrections go to Airtable, not code

The database is dropped and rebuilt from Airtable on every pipeline run, so any data edited here or directly in the database is overwritten. To correct or add data, change it in Airtable. If you don't have Airtable access, use the feedback form on the app's Methodology page.

## Setup

Requirements:

- Node.js with [pnpm](https://pnpm.io). The pnpm version is pinned in `package.json` (`packageManager`).
- [uv](https://docs.astral.sh/uv/) for the Python pipeline. uv picks up the Python version from `.python-version`.

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev                     # http://localhost:3000
```

The web app needs only `DATABASE_URL`. The pipeline needs the `AIRTABLE_*` and `AZURE_POSTGRES_*` variables. It reads `.env.local` first, then falls back to `.env`.

```bash
uv sync
uv run python python/01b_fetch_airtable_to_sql.py   # Airtable → Postgres
```

## Before opening a PR

CI runs these on every pull request ([`.github/workflows/ci.yml`](.github/workflows/ci.yml) has the authoritative list):

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
uv run pytest
```

Format your changes:

```bash
pnpm format
uvx ruff check --select I --fix python/
uvx ruff format python/
```

## Conventions

- **User-facing text** goes in `src/config/labels.json`, not inline in components.
- **Colors** come from the theme tokens in `src/app/globals.css`. Tailwind v4 is configured there, not in `tailwind.config.ts`. Avoid new hard-coded colors.
- **shadcn/ui primitives** in `src/components/ui/` stay as installed. Add new ones with `npx shadcn@latest add <component>`, and put custom components in `src/components/`.
- **Data access on the server** goes through `getCoreData()` in `src/server/cache.ts`. Only the repositories in `src/server/repositories/` contain SQL.
- **A database schema change** touches three places: `sql/schema/`, the normalizer in `python/01b_fetch_airtable_to_sql.py`, and the repositories. Update [`docs/DATA.md`](docs/DATA.md) too.

[CLAUDE.md](CLAUDE.md) has more detail on the architecture, the data flow and the pipeline's safety checks.
