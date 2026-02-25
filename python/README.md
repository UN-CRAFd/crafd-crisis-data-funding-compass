# Data Pipeline Scripts

This directory contains scripts for fetching and processing data from Airtable and external APIs.

## Execution Order

The scripts should be executed in the following order:

1. **`01b_fetch_airtable_to_sql.py`** - Fetch all data from Airtable and push to PostgreSQL (funding_compass schema)
2. **`03_fetch_assets.py`** - Download logos and screenshots for organizations
3. **`04_clean_member_states.py`** - Process member states CSV data
4. **`05_fetch_iati.py`** (Optional) - Fetch IATI data for organizations with IATI Org Keys

## Script Descriptions

### 01b_fetch_airtable_to_sql.py
Main data fetching script that:
- Connects to Airtable API
- Fetches 4 tables: projects (ecosystem), organizations, agencies, themes
- Normalizes the data into the funding_compass relational schema
- Generates deterministic UUIDs from Airtable record IDs
- Pushes everything to PostgreSQL, recreating tables on each run
- Replaces old JSON-based approach

**Requirements:**
- `AIRTABLE_API_KEY` environment variable
- `AIRTABLE_BASE_ID` environment variable
- `AIRTABLE_TABLE_ID_PROJECTS`, `AIRTABLE_TABLE_ID_ORGANIZATIONS`, `AIRTABLE_TABLE_ID_AGENCIES` environment variables
- Azure PostgreSQL connection details: `AZURE_POSTGRES_HOST`, `AZURE_POSTGRES_PORT`, `AZURE_POSTGRES_USER`, `AZURE_POSTGRES_PASSWORD`

### 03_fetch_assets.py
Asset downloading script that:
- Downloads organization logos
- Downloads budget source screenshots
- Handles multiple image formats (PNG, JPG, SVG, WebP)
- Sanitizes filenames for safe storage

**Output directories:**
- `public/logos/` - Organization logo images
- `public/screenshots/` - Budget source screenshots

### 04_clean_member_states.py
Data cleaning script that:
- Filters current member states from full member states list
- Adds USA to the list
- Exports clean CSV for application use

**Output files:**
- `public/data/current_member_states.csv` - Filtered list of current member states

### 05_fetch_iati.py
IATI data fetching script that:
- Reads organizations with IATI Org Keys
- Queries IATI API for activities and transactions
- Uses caching to avoid redundant API calls
- Respects IATI API rate limits (5 requests/second)

**Output files:**
- `public/data/iati-data.json` - IATI activities and transactions for organizations
- Cache files stored in `cache/iati/`

**Requirements:**
- `IATI_PRIMARY_KEY` in .env.local
- Get your key from: https://developer.iatistandard.org/

## Shared Utilities

All scripts use common utilities from `_utils.py`:
- Environment configuration loading
- Airtable API helpers
- String parsing functions
- File I/O utilities

## Configuration

All scripts require `.env.local` file in project root with:
```bash
AIRTABLE_API_KEY=your_api_key
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_TABLE_ID_PROJECTS=table_id
AIRTABLE_TABLE_ID_ORGANIZATIONS=table_id
AIRTABLE_TABLE_ID_AGENCIES=table_id

# PostgreSQL configuration (for 01b_fetch_airtable_to_sql.py)
AZURE_POSTGRES_HOST=your_host
AZURE_POSTGRES_PORT=5432
AZURE_POSTGRES_USER=your_user
AZURE_POSTGRES_PASSWORD=your_password

# Optional: For IATI data fetching
IATI_PRIMARY_KEY=your_iati_api_key
```

## Running Scripts

```bash
# Run main Airtable to PostgreSQL pipeline
uv run python python/01b_fetch_airtable_to_sql.py

# Download assets
uv run python python/03_fetch_assets.py

# Clean member states
uv run python python/04_clean_member_states.py

# Fetch IATI data (optional)
uv run python python/05_fetch_iati.py
```

## CI/CD Integration

The GitHub Actions workflow `.github/workflows/fetch_data_from_airtable.yml` automatically runs:
1. `01b_fetch_airtable_to_sql.py` - Fetches from Airtable and syncs to PostgreSQL
2. Runs on a schedule (daily at 5 AM UTC) or manually via workflow_dispatch
