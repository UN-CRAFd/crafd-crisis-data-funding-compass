# Data Pipeline Scripts

This directory contains scripts for fetching and processing data from Airtable.

## Execution Order

The scripts should be executed in the following order:

1. **`01_fetch_airtable.py`** - Fetch all data from Airtable (organizations, projects, agencies, themes)
2. **`02_build_nested_data.py`** - Build nested organization structure with projects and agencies
3. **`03_fetch_assets.py`** - Download logos and screenshots for organizations
4. **`04_clean_member_states.py`** - Process member states CSV data

## Script Descriptions

### 01_fetch_airtable.py
Main data fetching script that:
- Connects to Airtable API
- Fetches 4 tables: projects (ecosystem), organizations, agencies, themes
- Validates data quality (minimum record counts, field presence)
- Saves JSON files to `public/data/`
- Automatically triggers the nesting script

**Output files:**
- `ecosystem-table.json` - Project/product data
- `organizations-table.json` - Organization data
- `agencies-table.json` - Donor agency data
- `themes-table.json` - Investment theme data

### 02_build_nested_data.py
Data transformation script that:
- Merges organizations with their agencies and projects
- Creates comprehensive nested structure
- Extracts and deduplicates donor countries
- Handles various name formats and ID references

**Output files:**
- `organizations-nested.json` - Complete nested structure used by the application

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
- `current_member_states.csv` - Filtered list of current member states

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
AIRTABLE_TABLE_ID_THEMES=table_id
```

## Running Scripts

```bash
# Run all data pipeline
python scripts/01_fetch_airtable.py  # Automatically runs 02_build_nested_data.py

# Download assets separately
python scripts/03_fetch_assets.py

# Clean member states
python scripts/04_clean_member_states.py
```

## CI/CD Integration

The GitHub Actions workflow `.github/workflows/fetch_data_from_airtable.yml` automatically runs:
1. `01_fetch_airtable.py` (which triggers `02_build_nested_data.py`)
2. Commits updated data files to the repository
