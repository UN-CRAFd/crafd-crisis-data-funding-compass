# Run: python scripts/fetch_airtable.py

import json
import math
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

# Specification which fields to select from main projects table
FIELDS_PROJECTS = [
    "Project/Product Name",
    "product_key",
    "Provider Orgs Full Name",
    "CRAF’d-Funded Project?",
    "Investment Type(s)",
    "Investment Theme(s)",
    "Project Website",
    "Project Description",
    "Project Donor Agencies",
    "HDX_SOHD"
    
]

FIELDS_ORGANIZATIONS = [

    "org_key",
    "Org Full Name",
    "HDX Org Key",
    "IATI Org Key",
    "Est. Org Budget",
    "Budget Source",
    "Link to Budget Source",
    "Budget Source Screenshot",
    "Last Updated",
    "Org Type",
    "Org Short Name",
    "Org Website",
    "Org HQ Country",
    "Org Description",
    "Org Mission",
    "Link to Data Products Overview",
    "Org IATI Name",
    "Org MPTFO Name",
    "Org MPTFO URL [Formula]",
    "UN Funding Link",
    "Org Transparency Portal",
    "Org Programme Budget",
    "Has received CRAF'd Funding?",
    "Org Donor Agencies",
    "Provided Data Ecosystem Projects",
]

FIELDS_AGENCIES = [
    "Agency/Department Name",
    "Agency Data Portal",
    "Agency Website",
    "Country Name",
]

FIELDS_THEMES = [
    "THEME_ID",
    "Linked Investment Type",
    "Investment Type",
    "Investment Themes [Text Key]",
    "Data Ecosystem Projects",
    "theme_description",
    "theme_key"
]

# Load .env.local from project root (one level up from scripts/)
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DOTENV_PATH = PROJECT_ROOT / ".env.local"
if DOTENV_PATH.exists():
    load_dotenv(DOTENV_PATH, override=False)

else:
    # fall back to default .env if present
    load_dotenv(PROJECT_ROOT / ".env", override=False)

# Configuration from env
API_KEY = os.getenv("AIRTABLE_API_KEY")
BASE_ID = os.getenv("AIRTABLE_BASE_ID")

# Main table (projects) - support legacy name for backward compatibility
MAIN_TABLE_IDENTIFIER = os.getenv("AIRTABLE_TABLE_ID_PROJECTS") or os.getenv(
    "AIRTABLE_TABLE_ID"
)

# Additional tables (organizations, agencies, themes)
ORGANIZATIONS_TABLE_IDENTIFIER = os.getenv("AIRTABLE_TABLE_ID_ORGANIZATIONS")
# Accept either AIRTABLE_TABLED_ID_AGENCIES (as requested) or the likely-correct AIRTABLE_TABLE_ID_AGENCIES
AGENCIES_TABLE_IDENTIFIER = os.getenv("AIRTABLE_TABLED_ID_AGENCIES") or os.getenv(
    "AIRTABLE_TABLE_ID_AGENCIES"
)
THEMES_TABLE_IDENTIFIER = os.getenv("AIRTABLE_TABLE_ID_THEMES")

AIRTABLE_TIMEZONE = os.getenv("AIRTABLE_TIMEZONE", "UTC")
AIRTABLE_USER_LOCALE = os.getenv("AIRTABLE_USER_LOCALE", "en-US")

if not API_KEY or not BASE_ID or not MAIN_TABLE_IDENTIFIER:
    print(
        "Error: Ensure AIRTABLE_API_KEY, AIRTABLE_BASE_ID and AIRTABLE_TABLE_ID_PROJECTS (or AIRTABLE_TABLE_ID) are set in .env.local",
        file=sys.stderr,
    )
    sys.exit(1)

OUTPUT_DIR = PROJECT_ROOT / "public" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# Utilities
def log(*args):
    print("[airtable-fetch]", *args)


HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}


def airtable_fetch(url: str) -> Dict[str, Any]:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    if not resp.ok:
        raise RuntimeError(
            f"Airtable API error: {resp.status_code} {resp.reason}\n{resp.text}"
        )
    return resp.json()


def add_basic_params(params: Dict[str, str]):
    params["pageSize"] = "100"


def build_table_url(
    table_identifier: str, extra_params: Optional[Dict[str, Any]] = None
) -> str:
    base = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table_identifier, safe='')}"  # type: ignore
    params = {}
    add_basic_params(params)
    if extra_params:
        for k, v in extra_params.items():
            if v is None:
                continue
            # If list, append each as separate param (Airtable expects this for fields[])
            if isinstance(v, list):
                # We'll encode later by building query string manually
                # Represent as k=item repeated
                params[k] = v
            else:
                params[k] = str(v)
    # build query string allowing repeated keys
    parts = []
    for k, v in params.items():
        if isinstance(v, list):
            for item in v:
                parts.append(
                    f"{requests.utils.quote(k)}={requests.utils.quote(str(item))}"
                )  # type: ignore
        else:
            parts.append(f"{requests.utils.quote(k)}={requests.utils.quote(str(v))}")  # type: ignore
    if parts:
        return base + "?" + "&".join(parts)
    else:
        return base


def fetch_airtable_table(
    table_identifier: str, extra_params: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    all_records: List[Dict[str, Any]] = []
    offset = None
    page = 0
    while True:
        params = dict(extra_params or {})
        if offset:
            params["offset"] = offset
        url = build_table_url(table_identifier, params)
        page += 1
        data = airtable_fetch(url)
        records = data.get("records", [])
        count = len(records)
        all_records.extend(records)
        offset = data.get("offset") or None
        log(
            f"Fetched {count} records (total {len(all_records)}) from {table_identifier} (page {page})"
        )
        if not offset:
            break
    return all_records


def save_to_json(data: Any, filename: str) -> Path:
    file_path = OUTPUT_DIR / filename
    with open(file_path, "w", encoding="utf-8") as f:
        # Ensure we do not include Airtable's top-level `createdTime` on any record
        if isinstance(data, list):
            for rec in data:
                if isinstance(rec, dict):
                    rec.pop("createdTime", None)
        elif isinstance(data, dict):
            # If a single object was passed, remove createdTime if present
            data.pop("createdTime", None)

        json.dump(data, f, indent=2, ensure_ascii=False)
    if isinstance(data, list):
        count = len(data)
    elif isinstance(data, dict):
        count = len(data.keys())
    else:
        count = 1
    log(f"Saved {count} items to {file_path}")
    return file_path


# ---- Main flow ----
def main():
    try:
        log("Starting simplified Airtable fetch...")

        # 1) Fetch main (projects) table with specified fields
        log(f"Fetching main/projects table: {MAIN_TABLE_IDENTIFIER}")
        # Request only the configured project fields from Airtable
        projects_extra_params: Dict[str, Any] = {}
        if FIELDS_PROJECTS:
            projects_extra_params["fields"] = FIELDS_PROJECTS
        main_records = fetch_airtable_table(
            MAIN_TABLE_IDENTIFIER, extra_params=projects_extra_params
        )
        save_to_json(main_records, "ecosystem-table.json")

        # 2) Fetch organizations table (if provided)
        org_count = 0
        if ORGANIZATIONS_TABLE_IDENTIFIER:
            try:
                log(f"Fetching organizations table: {ORGANIZATIONS_TABLE_IDENTIFIER}")
                # Request only the configured organization fields from Airtable
                org_extra_params = {}
                if FIELDS_ORGANIZATIONS:
                    org_extra_params["fields"] = FIELDS_ORGANIZATIONS
                org_records = fetch_airtable_table(
                    ORGANIZATIONS_TABLE_IDENTIFIER, extra_params=org_extra_params
                )
                save_to_json(
                    org_records, "organizations-table.json"
                )
                org_count = len(org_records)
            except Exception as e:
                log(
                    f"Failed to fetch organizations table {ORGANIZATIONS_TABLE_IDENTIFIER}: {e}"
                )

        # 3) Fetch agencies table (if provided)
        agencies_count = 0
        if AGENCIES_TABLE_IDENTIFIER:
            try:
                log(f"Fetching agencies table: {AGENCIES_TABLE_IDENTIFIER}")
                # Request only the configured agency fields from Airtable (if specified)
                agencies_extra_params: Dict[str, Any] = {}
                if FIELDS_AGENCIES:
                    agencies_extra_params["fields"] = FIELDS_AGENCIES
                agencies_records = fetch_airtable_table(
                    AGENCIES_TABLE_IDENTIFIER, extra_params=agencies_extra_params
                )
                save_to_json(
                    agencies_records, "agencies-table.json"
                )
                agencies_count = len(agencies_records)
            except Exception as e:
                log(f"Failed to fetch agencies table {AGENCIES_TABLE_IDENTIFIER}: {e}")

        # 4) Fetch themes table (if provided)
        themes_count = 0
        if THEMES_TABLE_IDENTIFIER:
            try:
                log(f"Fetching themes table: {THEMES_TABLE_IDENTIFIER}")
                # Request only the configured theme fields from Airtable
                themes_extra_params: Dict[str, Any] = {}
                if FIELDS_THEMES:
                    themes_extra_params["fields"] = FIELDS_THEMES
                themes_records = fetch_airtable_table(
                    THEMES_TABLE_IDENTIFIER, extra_params=themes_extra_params
                )
                save_to_json(
                    themes_records, "themes-table.json"
                )
                themes_count = len(themes_records)
            except Exception as e:
                log(f"Failed to fetch themes table {THEMES_TABLE_IDENTIFIER}: {e}")

        # Summary
        log("SUMMARY:")
        log(
            f'  Main projects table "{MAIN_TABLE_IDENTIFIER}": {len(main_records)} records (saved to ecosystem-table.json)'
        )
        if ORGANIZATIONS_TABLE_IDENTIFIER:
            log(
                f'  Organizations table "{ORGANIZATIONS_TABLE_IDENTIFIER}": {org_count} records (saved to organizations-table.json)'
            )
        else:
            log("  Organizations table: not configured (skipped)")
        if AGENCIES_TABLE_IDENTIFIER:
            log(
                f'  Agencies table "{AGENCIES_TABLE_IDENTIFIER}": {agencies_count} records (saved to agencies-table.json)'
            )
        else:
            log("  Agencies table: not configured (skipped)")
        if THEMES_TABLE_IDENTIFIER:
            log(
                f'  Themes table "{THEMES_TABLE_IDENTIFIER}": {themes_count} records (saved to themes-table.json)'
            )
        else:
            log("  Themes table: not configured (skipped)")
        log(f"  Files written to {OUTPUT_DIR}")

        # Data validation before proceeding
        log("Performing data validation...")
        validation_errors = []
        
        # Check minimum record counts
        if len(main_records) < 100:
            validation_errors.append(f"Insufficient projects: {len(main_records)} (minimum 100 required)")
        
        if org_count < 50:
            validation_errors.append(f"Insufficient organizations: {org_count} (minimum 50 required)")
        
        # Check that required fields exist in the data
        log("Validating field presence...")
        missing_project_fields = []
        missing_org_fields = []
        
        # Define required vs optional fields (optional fields may be empty/sparse in Airtable)
        OPTIONAL_ORG_FIELDS = {
            "Link to Budget Source",  # May not be populated for all orgs
            "Org Description",
            "Org Mission", 
            "Link to Data Products Overview",
            "Org IATI Name",
            "Org MPTFO Name",
            "Org MPTFO URL [Formula]",
            "Org Transparency Portal",
            "Org Programme Budget",
        }
        
        # Validate project fields
        if main_records:
            sample_project = main_records[0].get("fields", {})
            for field in FIELDS_PROJECTS:
                found_in_any = any(field in record.get("fields", {}) for record in main_records[:10])  # Check first 10
                if not found_in_any:
                    missing_project_fields.append(field)
        
        # Validate organization fields (if organizations table was fetched)
        if ORGANIZATIONS_TABLE_IDENTIFIER and org_count > 0:
            try:
                # Re-read the saved organizations to validate
                import json
                with open(OUTPUT_DIR / "organizations-table.json", "r", encoding="utf-8") as f:
                    saved_orgs = json.load(f)
                if saved_orgs:
                    for field in FIELDS_ORGANIZATIONS:
                        # Skip validation for optional fields (they may be empty/sparse)
                        if field in OPTIONAL_ORG_FIELDS:
                            continue
                        found_in_any = any(field in record.get("fields", {}) for record in saved_orgs[:10])  # Check first 10
                        if not found_in_any:
                            missing_org_fields.append(field)
            except Exception as e:
                validation_errors.append(f"Could not validate organization fields: {e}")
        
        # Report validation results
        if missing_project_fields:
            validation_errors.append(f"Missing project fields: {', '.join(missing_project_fields)}")
        
        if missing_org_fields:
            validation_errors.append(f"Missing organization fields: {', '.join(missing_org_fields)}")
        
        # Exit with error code if validation fails
        if validation_errors:
            log("VALIDATION FAILED:")
            for error in validation_errors:
                log(f"  ERROR: {error}")
            log("Aborting - data quality requirements not met")
            sys.exit(1)
        
        log("Data validation passed - proceeding with nesting")

        # Run nesting to merge agencies and projects into organizations
        log("Running nesting script to merge data...")
        import subprocess
        import sys

        result = subprocess.run(
            [sys.executable, "scripts/nesting.py"], cwd=PROJECT_ROOT
        )
        if result.returncode == 0:
            log("Nesting completed successfully")
            log("Done.")
        else:
            log(f"Nesting failed with code {result.returncode}")
            sys.exit(1)

    except Exception as err:
        print("Script failed:", str(err), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
