# scripts/fetch_airtable.py
# Python 3.8+
# Simplified Airtable fetch script:
# - Fetches raw records with IDs for linked fields (no string conversion)
# - Handles pagination
# - Optional field filtering
# - Writes JSON to public/data
#
# Env file: .env.local (loaded via python-dotenv)
# Required env vars:
#  - AIRTABLE_API_KEY
#  - AIRTABLE_BASE_ID
#  - AIRTABLE_TABLE_ID_PROJECTS (or fallback AIRTABLE_TABLE_ID)
# Optional:
#  - AIRTABLE_TABLE_ID_ORGANIZATIONS
#  - AIRTABLE_TABLED_ID_AGENCIES  (or fallback AIRTABLE_TABLE_ID_AGENCIES)
#
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

# Specification ohich fields to select from main projects table
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
]

FIELDS_ORGANIZATIONS = [
    "org_key",
    "Org Full Name",
    "Org Type",
    "Org Short Name",
    "Org Website",
    "Org HQ Country",
    "Org Description",
    "Org Mission",
    "Link to Data Products Overview",
    "Est. Org Budget [2024, $M]",
    "Est. Data Budget [2024, $M]",
    "Org IATI Name",
    "Org MPTFO Name",
    "Org MPTFO URL [Formula]",
    "Org Transparency Portal",
    "Org Programme Budget",
    "Has received CRAF'd Funding?",
    "Org Donor Agencies",
    "Provided Data Ecosystem Projects",
]

FIELDS_AGENCIES = [
    "Agency/Department Name",
    "Agency Data Portal",
    "Country Name",
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

# --- Configuration from env ---
API_KEY = os.getenv("AIRTABLE_API_KEY")
BASE_ID = os.getenv("AIRTABLE_BASE_ID")

# Main table (projects) - support legacy name for backward compatibility
MAIN_TABLE_IDENTIFIER = os.getenv("AIRTABLE_TABLE_ID_PROJECTS") or os.getenv(
    "AIRTABLE_TABLE_ID"
)

# Additional tables (organizations, agencies)
ORGANIZATIONS_TABLE_IDENTIFIER = os.getenv("AIRTABLE_TABLE_ID_ORGANIZATIONS")
# Accept either AIRTABLE_TABLED_ID_AGENCIES (as requested) or the likely-correct AIRTABLE_TABLE_ID_AGENCIES
AGENCIES_TABLE_IDENTIFIER = os.getenv("AIRTABLE_TABLED_ID_AGENCIES") or os.getenv(
    "AIRTABLE_TABLE_ID_AGENCIES"
)

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


# ---- Utilities ----
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


def fetch_records_by_ids(
    table_identifier: str, ids: List[str], chunk_size: int = 50
) -> List[Dict[str, Any]]:
    if not ids:
        return []
    results: List[Dict[str, Any]] = []
    for i in range(0, len(ids), chunk_size):
        chunk = ids[i : i + chunk_size]
        # Build formula OR(RECORD_ID()="recA",RECORD_ID()="recB",...)
        or_parts = ",".join(f'RECORD_ID()="{id_}"' for id_ in chunk)
        formula = f"OR({or_parts})"
        extra_params = {"filterByFormula": formula}
        url = build_table_url(table_identifier, extra_params)
        data = airtable_fetch(url)
        chunk_records = data.get("records", [])
        results.extend(chunk_records)
        log(
            f"Resolved {len(chunk_records)} records from {table_identifier} (chunk {i // chunk_size + 1})"
        )
    return results


def save_to_json(data: Any, filename: str, apply_select_filter: bool = True) -> Path:
    file_path = OUTPUT_DIR / filename
    to_write = data
    if apply_select_filter and FIELDS_PROJECTS and isinstance(data, list):
        filtered = []
        for rec in data:
            if (
                not isinstance(rec, dict)
                or "fields" not in rec
                or not isinstance(rec["fields"], dict)
            ):
                filtered.append(rec)
                continue
            new_fields = {}
            for k in FIELDS_PROJECTS:
                if k in rec["fields"]:
                    new_fields[k] = rec["fields"][k]
            # preserve helper fields ending with __names
            for fk in rec["fields"].keys():
                if fk.endswith("__names"):
                    new_fields[fk] = rec["fields"][fk]
            new_rec = dict(rec)
            new_rec["fields"] = new_fields
            filtered.append(new_rec)
        to_write = filtered
    with open(file_path, "w", encoding="utf-8") as f:
        # Ensure we do not include Airtable's top-level `createdTime` on any record
        if isinstance(to_write, list):
            for rec in to_write:
                if isinstance(rec, dict):
                    rec.pop("createdTime", None)
        elif isinstance(to_write, dict):
            # If a single object was passed, remove createdTime if present
            to_write.pop("createdTime", None)

        json.dump(to_write, f, indent=2, ensure_ascii=False)
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

        # 1) Fetch main (projects) table with basic params
        log(f"Fetching main/projects table: {MAIN_TABLE_IDENTIFIER}")
        main_records = fetch_airtable_table(MAIN_TABLE_IDENTIFIER)  # type: ignore
        save_to_json(main_records, "ecosystem-table.json", apply_select_filter=True)

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
                    org_records, "organizations-table.json", apply_select_filter=False
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
                    agencies_records, "agencies-table.json", apply_select_filter=False
                )
                agencies_count = len(agencies_records)
            except Exception as e:
                log(f"Failed to fetch agencies table {AGENCIES_TABLE_IDENTIFIER}: {e}")

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
