# Data Pipeline

Python scripts that move data from the CRAF'd Airtable base into the app. Run them from the repository root with [uv](https://docs.astral.sh/uv/):

```bash
uv sync
```

Scripts read environment variables from `.env.local`, falling back to `.env`. [`.env.example`](../.env.example) lists them all.

## 01b_fetch_airtable_to_sql.py: Airtable → PostgreSQL

This is the only script the app depends on.

```bash
uv run python python/01b_fetch_airtable_to_sql.py
```

It fetches the projects, organizations, agencies and themes tables from Airtable. It then normalizes them and rebuilds the `funding_compass` schema from [`sql/schema/`](../sql/schema/) in a single transaction, so a failed run leaves the previous data in place. Safety checks run before the database is touched; the module docstring describes them. The resulting tables are documented in [`docs/DATA.md`](../docs/DATA.md).

The script needs the `AIRTABLE_*` and `AZURE_POSTGRES_*` variables. It runs daily via [`.github/workflows/fetch_data_from_airtable.yml`](../.github/workflows/fetch_data_from_airtable.yml), and you can also start that workflow by hand from the Actions tab.

Tests for its pure functions live in [`tests/`](tests/):

```bash
uv run pytest
```

## 03_fetch_assets.py: logos and budget screenshots

```bash
uv run python python/03_fetch_assets.py                  # both
uv run python python/03_fetch_assets.py --logos          # logos only
uv run python python/03_fetch_assets.py --screenshots    # screenshots only
```

This script downloads the organizations' "Logo" and "Budget Source Screenshot" attachments from Airtable. It saves them to `public/logos/` and `public/screenshots/`, named by `org_key`. The images are committed to the repository and served as static files. The script isn't scheduled: run it by hand when logos or screenshots change in Airtable, then commit the new files.

It needs `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID` and `AIRTABLE_TABLE_ID_ORGANIZATIONS`.

## Legacy and one-off scripts

The app doesn't use these, and most no longer run as they are. They are kept for reference only.

| Path                        | Status                                                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `04_clean_member_states.py` | Reads `public/data/member-states.csv`, which no longer exists. The UN member-state list now lives in `src/server/repositories/memberStateRepository.ts`. |
| `05_fetch_iati.py`          | Reads `public/data/organizations-table.json`, which no longer exists. See [`docs/IATI_INTEGRATION.md`](../docs/IATI_INTEGRATION.md).                     |
| `iati_api/`                 | Exploratory IATI Datastore queries.                                                                                                                      |
| `misc/`                     | One-off analyses of the old `organizations-nested.json` export.                                                                                          |
| `check_*.py`                | Ad-hoc, read-only database checks.                                                                                                                       |

## Formatting

```bash
uvx ruff check --select I --fix python/
uvx ruff format python/
```
