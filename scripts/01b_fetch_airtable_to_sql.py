#!/usr/bin/env python3
"""Fetch data from Airtable and push to PostgreSQL (funding_compass schema).

This script:
1. Fetches projects, organizations, agencies, and themes from Airtable
2. Normalizes the data into the funding_compass relational schema
3. Generates deterministic UUIDs from Airtable record IDs
4. Pushes everything to PostgreSQL, recreating tables on each run

Usage:
    python scripts/01b_fetch_airtable_to_sql.py
"""

import os
import sys
import uuid
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import psycopg2
import psycopg2.extras

from _utils import (
    fetch_all_records,
    log,
    setup_environment,
    validate_config,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_NAME = "01b_fetch_airtable_to_sql"

# UUID namespace for deterministic ID generation (custom namespace for CRAF'd)
CRAFD_UUID_NAMESPACE = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")

# Field specs (mirrors 01_fetch_airtable.py)
FIELDS = {
    "projects": [
        "Project/Product Name",
        "product_key",
        "Provider Orgs Full Name",
        "Investment Type(s)",
        "Investment Theme(s)",
        "Project Website",
        "Project Description",
        "Project Donor Agencies",
        "HDX_SOHD",
    ],
    "organizations": [
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
        "Link to Data Products Overview",
        "Org IATI Name",
        "Org MPTFO Name",
        "Org MPTFO URL [Formula]",
        "UN Funding Link",
        "Org Transparency Portal",
        "Org Programme Budget",
        "Org Donor Agencies",
        "Provided Data Ecosystem Projects",
        "Funding Type",
    ],
    "agencies": [
        "Agency/Department Name",
        "Agency Data Portal",
        "Agency Website",
        "Country Name",
    ],
    "themes": [
        "THEME_ID",
        "Linked Investment Type",
        "Investment Type",
        "Investment Themes [Text Key]",
        "Data Ecosystem Projects",
        "theme_description",
        "theme_key",
    ],
}


# ---------------------------------------------------------------------------
# UUID helpers
# ---------------------------------------------------------------------------


def make_uuid(seed: str) -> str:
    """Generate a deterministic UUID v5 from a seed string.

    Using a fixed namespace ensures the same Airtable record ID always
    produces the same UUID, making re-runs idempotent.
    """
    return str(uuid.uuid5(CRAFD_UUID_NAMESPACE, seed))


def make_junction_uuid(left_id: str, right_id: str) -> str:
    """Generate a deterministic UUID for a junction row from two FK seeds."""
    return make_uuid(f"{left_id}::{right_id}")


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------


def get_db_connection():
    """Create a PostgreSQL connection using env vars."""
    return psycopg2.connect(
        host=os.getenv("AZURE_POSTGRES_HOST"),
        port=int(os.getenv("AZURE_POSTGRES_PORT", "5432")),
        dbname="crafd",  # Use crafd database, not postgres
        user=os.getenv("AZURE_POSTGRES_USER"),
        password=os.getenv("AZURE_POSTGRES_PASSWORD"),
        sslmode="require",
    )


def run_sql_file(conn, filepath: Path):
    """Execute a .sql file against the connection."""
    sql = filepath.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    log(SCRIPT_NAME, f"  Executed {filepath.name}")


def apply_schema(conn, schema_dir: Path):
    """Drop and recreate all tables from the SQL migration files."""
    log(SCRIPT_NAME, "Applying schema (drop + create) …")
    sql_files = sorted(schema_dir.glob("*.sql"))
    for sql_file in sql_files:
        run_sql_file(conn, sql_file)
    log(SCRIPT_NAME, "Schema applied successfully")


def bulk_upsert(conn, table: str, columns: List[str], rows: List[tuple], conflict_col: str = "id"):
    """Insert rows with ON CONFLICT DO NOTHING (idempotent)."""
    if not rows:
        return
    cols = ", ".join(columns)
    placeholders = ", ".join(["%s"] * len(columns))
    sql = f"INSERT INTO funding_compass.{table} ({cols}) VALUES ({placeholders}) ON CONFLICT ({conflict_col}) DO NOTHING"
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, rows, page_size=500)
    conn.commit()
    log(SCRIPT_NAME, f"  {table}: upserted {len(rows)} rows")


# ---------------------------------------------------------------------------
# Data extraction / transformation
# ---------------------------------------------------------------------------


def get_field(record: Dict, field_name: str, default=None):
    """Safely extract a field from an Airtable record."""
    return record.get("fields", {}).get(field_name, default)


def safe_float(value) -> Optional[float]:
    """Try to parse a value as float, returning None on failure."""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def extract_countries(
    agencies: List[Dict],
    organizations: List[Dict],
) -> Dict[str, str]:
    """Collect unique country names → {name: uuid}.

    Sources:
    - Agency `Country Name`
    - Organization `Org HQ Country` (array)
    """
    names: Set[str] = set()

    for rec in agencies:
        cn = get_field(rec, "Country Name")
        if cn:
            names.add(cn.strip())

    for rec in organizations:
        hq = get_field(rec, "Org HQ Country") or []
        for c in (hq if isinstance(hq, list) else [hq]):
            if c:
                names.add(c.strip())

    return {name: make_uuid(f"country::{name}") for name in sorted(names) if name}


def extract_organization_types(
    organizations: List[Dict],
) -> Dict[str, str]:
    """Collect unique org type names → {name: uuid}."""
    names: Set[str] = set()
    for rec in organizations:
        ot = get_field(rec, "Org Type")
        if ot:
            names.add(ot.strip())
    return {name: make_uuid(f"org_type::{name}") for name in sorted(names) if name}


def extract_investment_types(
    themes: List[Dict],
) -> Dict[str, str]:
    """Collect unique investment type names → {name: uuid}."""
    names: Set[str] = set()
    for rec in themes:
        types = get_field(rec, "Investment Type") or []
        for t in (types if isinstance(types, list) else [types]):
            if t:
                names.add(t.strip())
    return {name: make_uuid(f"inv_type::{name}") for name in sorted(names) if name}


def extract_donors(
    agencies: List[Dict],
    country_map: Dict[str, str],
) -> Dict[str, str]:
    """Derive donors from unique agency country names → {name: uuid}.

    Each unique `Country Name` in agencies becomes a donor row.
    The donor gets linked to the matching country (if exists).
    """
    names: Set[str] = set()
    for rec in agencies:
        cn = get_field(rec, "Country Name")
        if cn:
            names.add(cn.strip())
    return {name: make_uuid(f"donor::{name}") for name in sorted(names) if name}


def build_agencies_rows(
    agencies: List[Dict],
    donor_map: Dict[str, str],
    country_map: Dict[str, str],
) -> Tuple[List[tuple], Dict[str, str]]:
    """Build agency rows + airtable_id → uuid mapping."""
    rows = []
    at_to_uuid: Dict[str, str] = {}
    for rec in agencies:
        at_id = rec["id"]
        uid = make_uuid(f"agency::{at_id}")
        at_to_uuid[at_id] = uid

        name = get_field(rec, "Agency/Department Name") or ""
        website = get_field(rec, "Agency Website") or get_field(rec, "Agency Data Portal")
        country_name = (get_field(rec, "Country Name") or "").strip()
        donor_id = donor_map.get(country_name)
        country_id = country_map.get(country_name)

        rows.append((uid, name, website, donor_id, country_id))
    return rows, at_to_uuid


def build_themes_rows(
    themes: List[Dict],
    type_map: Dict[str, str],
) -> Tuple[List[tuple], Dict[str, str], Dict[str, str]]:
    """Build theme rows + mappings.

    Returns:
        (rows, airtable_id→uuid, theme_text_name→uuid)
    """
    rows = []
    at_to_uuid: Dict[str, str] = {}
    name_to_uuid: Dict[str, str] = {}
    for rec in themes:
        at_id = rec["id"]
        uid = make_uuid(f"theme::{at_id}")
        at_to_uuid[at_id] = uid

        theme_name = get_field(rec, "Investment Themes [Text Key]") or ""
        theme_key = get_field(rec, "theme_key") or ""
        description = get_field(rec, "theme_description") or ""

        # Link to first investment type
        inv_types = get_field(rec, "Investment Type") or []
        first_type = inv_types[0].strip() if isinstance(inv_types, list) and inv_types else (inv_types.strip() if isinstance(inv_types, str) else "")
        type_id = type_map.get(first_type)

        rows.append((uid, theme_key, theme_name, description, type_id))
        if theme_name:
            name_to_uuid[theme_name.strip()] = uid

    return rows, at_to_uuid, name_to_uuid


def build_organizations_rows(
    organizations: List[Dict],
    org_type_map: Dict[str, str],
    country_map: Dict[str, str],
) -> Tuple[List[tuple], Dict[str, str]]:
    """Build organization rows + airtable_id → uuid mapping."""
    rows = []
    at_to_uuid: Dict[str, str] = {}
    for rec in organizations:
        at_id = rec["id"]
        uid = make_uuid(f"org::{at_id}")
        at_to_uuid[at_id] = uid

        org_type_name = (get_field(rec, "Org Type") or "").strip()
        org_type_id = org_type_map.get(org_type_name)

        hq_countries = get_field(rec, "Org HQ Country") or []
        first_country = hq_countries[0].strip() if isinstance(hq_countries, list) and hq_countries else ""
        country_id = country_map.get(first_country)

        est_budget = get_field(rec, "Est. Org Budget")
        programme_budget = get_field(rec, "Org Programme Budget")

        last_updated_raw = get_field(rec, "Last Updated")
        last_updated = None
        if last_updated_raw:
            try:
                year = int(last_updated_raw)
                last_updated = date(year, 1, 1)
            except (ValueError, TypeError):
                pass

        rows.append((
            uid,
            get_field(rec, "org_key"),
            get_field(rec, "Org Full Name"),
            get_field(rec, "Org Short Name"),
            get_field(rec, "Org Website"),
            get_field(rec, "Org Description"),
            org_type_id,
            country_id,
            safe_float(est_budget),
            safe_float(programme_budget),
            get_field(rec, "Budget Source"),
            get_field(rec, "Link to Budget Source"),
            get_field(rec, "HDX Org Key"),
            get_field(rec, "IATI Org Key"),
            get_field(rec, "Org MPTFO Name"),
            get_field(rec, "Org MPTFO URL [Formula]"),
            get_field(rec, "Org Transparency Portal"),
            get_field(rec, "Link to Data Products Overview"),
            get_field(rec, "Funding Type"),
            last_updated,
        ))
    return rows, at_to_uuid


def build_projects_rows(
    projects: List[Dict],
) -> Tuple[List[tuple], Dict[str, str]]:
    """Build project rows + airtable_id → uuid mapping."""
    rows = []
    at_to_uuid: Dict[str, str] = {}
    for rec in projects:
        at_id = rec["id"]
        uid = make_uuid(f"project::{at_id}")
        at_to_uuid[at_id] = uid

        hdx_raw = get_field(rec, "HDX_SOHD")
        hdx_sohd = None
        if hdx_raw is not None:
            if isinstance(hdx_raw, bool):
                hdx_sohd = hdx_raw
            elif isinstance(hdx_raw, str):
                hdx_sohd = hdx_raw.lower() not in ("none", "", "false", "0", "no")

        rows.append((
            uid,
            get_field(rec, "product_key"),
            get_field(rec, "Project/Product Name") or "",
            get_field(rec, "Project Description"),
            get_field(rec, "Project Website"),
            hdx_sohd,
        ))
    return rows, at_to_uuid


# ---------------------------------------------------------------------------
# Junction table builders
# ---------------------------------------------------------------------------


def build_agency_project_funding(
    projects: List[Dict],
    agency_at_map: Dict[str, str],
    project_at_map: Dict[str, str],
) -> List[tuple]:
    """agency_project_funding from projects' `Project Donor Agencies`."""
    rows = []
    seen: Set[Tuple[str, str]] = set()
    for rec in projects:
        proj_at_id = rec["id"]
        proj_uuid = project_at_map.get(proj_at_id)
        if not proj_uuid:
            continue
        donor_agencies = get_field(rec, "Project Donor Agencies") or []
        for agency_at_id in donor_agencies:
            agency_uuid = agency_at_map.get(agency_at_id)
            if agency_uuid and (agency_uuid, proj_uuid) not in seen:
                seen.add((agency_uuid, proj_uuid))
                rows.append((
                    make_junction_uuid(agency_at_id, proj_at_id),
                    agency_uuid,
                    proj_uuid,
                ))
    return rows


def build_agency_organization_funding(
    organizations: List[Dict],
    agency_at_map: Dict[str, str],
    org_at_map: Dict[str, str],
) -> List[tuple]:
    """agency_organization_funding from orgs' `Org Donor Agencies`."""
    rows = []
    seen: Set[Tuple[str, str]] = set()
    for rec in organizations:
        org_at_id = rec["id"]
        org_uuid = org_at_map.get(org_at_id)
        if not org_uuid:
            continue
        donor_agencies = get_field(rec, "Org Donor Agencies") or []
        for agency_at_id in donor_agencies:
            agency_uuid = agency_at_map.get(agency_at_id)
            if agency_uuid and (agency_uuid, org_uuid) not in seen:
                seen.add((agency_uuid, org_uuid))
                rows.append((
                    make_junction_uuid(agency_at_id, org_at_id),
                    agency_uuid,
                    org_uuid,
                ))
    return rows


def build_organization_project(
    organizations: List[Dict],
    org_at_map: Dict[str, str],
    project_at_map: Dict[str, str],
) -> List[tuple]:
    """organization_project from orgs' `Provided Data Ecosystem Projects`."""
    rows = []
    seen: Set[Tuple[str, str]] = set()
    for rec in organizations:
        org_at_id = rec["id"]
        org_uuid = org_at_map.get(org_at_id)
        if not org_uuid:
            continue
        linked_projects = get_field(rec, "Provided Data Ecosystem Projects") or []
        for proj_at_id in linked_projects:
            proj_uuid = project_at_map.get(proj_at_id)
            if proj_uuid and (org_uuid, proj_uuid) not in seen:
                seen.add((org_uuid, proj_uuid))
                rows.append((
                    make_junction_uuid(org_at_id, proj_at_id),
                    org_uuid,
                    proj_uuid,
                ))
    return rows


def build_project_themes(
    themes: List[Dict],
    projects: List[Dict],
    theme_at_map: Dict[str, str],
    theme_name_map: Dict[str, str],
    project_at_map: Dict[str, str],
) -> List[tuple]:
    """project_themes from two sources:

    1. Theme records' `Data Ecosystem Projects` (Airtable linked IDs)
    2. Project records' `Investment Theme(s)` (text names → match to theme)
    """
    rows = []
    seen: Set[Tuple[str, str]] = set()

    # Source 1: theme → projects link
    for rec in themes:
        theme_at_id = rec["id"]
        theme_uuid = theme_at_map.get(theme_at_id)
        if not theme_uuid:
            continue
        linked = get_field(rec, "Data Ecosystem Projects") or []
        for proj_at_id in linked:
            proj_uuid = project_at_map.get(proj_at_id)
            if proj_uuid and (proj_uuid, theme_uuid) not in seen:
                seen.add((proj_uuid, theme_uuid))
                rows.append((
                    make_junction_uuid(proj_at_id, theme_at_id),
                    proj_uuid,
                    theme_uuid,
                ))

    # Source 2: project → theme name matching
    for rec in projects:
        proj_at_id = rec["id"]
        proj_uuid = project_at_map.get(proj_at_id)
        if not proj_uuid:
            continue
        theme_names = get_field(rec, "Investment Theme(s)") or []
        for tname in (theme_names if isinstance(theme_names, list) else [theme_names]):
            if not tname:
                continue
            theme_uuid = theme_name_map.get(tname.strip())
            if theme_uuid and (proj_uuid, theme_uuid) not in seen:
                seen.add((proj_uuid, theme_uuid))
                rows.append((
                    make_junction_uuid(proj_at_id, f"theme_name::{tname.strip()}"),
                    proj_uuid,
                    theme_uuid,
                ))

    return rows


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    """Fetch Airtable data and push to PostgreSQL."""
    try:
        log(SCRIPT_NAME, "Starting Airtable → PostgreSQL pipeline …")

        # --- Environment --------------------------------------------------
        config = setup_environment()
        validate_config(config, ["api_key", "base_id", "table_projects"])

        schema_dir = (
            config["project_root"]
            / "databases"
            / "crafd"
            / "schemas"
            / "funding_compass"
        )

        # --- Database connection ------------------------------------------
        log(SCRIPT_NAME, "Connecting to PostgreSQL …")
        conn = get_db_connection()
        log(SCRIPT_NAME, f"  Connected to {os.getenv('AZURE_POSTGRES_HOST')}")

        # --- Apply schema -------------------------------------------------
        apply_schema(conn, schema_dir)

        # --- Fetch from Airtable ------------------------------------------
        log(SCRIPT_NAME, "Fetching Airtable tables …")

        projects_raw = fetch_all_records(
            config["base_id"],
            config["table_projects"],
            config["api_key"],
            FIELDS["projects"],
            SCRIPT_NAME,
        )
        log(SCRIPT_NAME, f"  Projects: {len(projects_raw)} records")

        organizations_raw: List[Dict] = []
        if config["table_organizations"]:
            organizations_raw = fetch_all_records(
                config["base_id"],
                config["table_organizations"],
                config["api_key"],
                FIELDS["organizations"],
                SCRIPT_NAME,
            )
            log(SCRIPT_NAME, f"  Organizations: {len(organizations_raw)} records")

        agencies_raw: List[Dict] = []
        if config["table_agencies"]:
            agencies_raw = fetch_all_records(
                config["base_id"],
                config["table_agencies"],
                config["api_key"],
                FIELDS["agencies"],
                SCRIPT_NAME,
            )
            log(SCRIPT_NAME, f"  Agencies: {len(agencies_raw)} records")

        themes_raw: List[Dict] = []
        if config["table_themes"]:
            themes_raw = fetch_all_records(
                config["base_id"],
                config["table_themes"],
                config["api_key"],
                FIELDS["themes"],
                SCRIPT_NAME,
            )
            log(SCRIPT_NAME, f"  Themes: {len(themes_raw)} records")

        # --- Extract lookup tables ----------------------------------------
        log(SCRIPT_NAME, "Extracting lookup tables …")

        country_map = extract_countries(agencies_raw, organizations_raw)
        org_type_map = extract_organization_types(organizations_raw)
        inv_type_map = extract_investment_types(themes_raw)
        donor_map = extract_donors(agencies_raw, country_map)

        log(SCRIPT_NAME, f"  Countries: {len(country_map)}")
        log(SCRIPT_NAME, f"  Organization types: {len(org_type_map)}")
        log(SCRIPT_NAME, f"  Investment types: {len(inv_type_map)}")
        log(SCRIPT_NAME, f"  Donors: {len(donor_map)}")

        # --- Insert lookup tables -----------------------------------------
        log(SCRIPT_NAME, "Inserting lookup tables …")

        bulk_upsert(
            conn, "countries", ["id", "name"],
            [(uid, name) for name, uid in country_map.items()],
        )
        bulk_upsert(
            conn, "organization_types", ["id", "name"],
            [(uid, name) for name, uid in org_type_map.items()],
        )
        bulk_upsert(
            conn, "types", ["id", "name"],
            [(uid, name) for name, uid in inv_type_map.items()],
        )

        # --- Insert donors ------------------------------------------------
        log(SCRIPT_NAME, "Inserting donors …")
        donor_rows = [
            (uid, name, country_map.get(name))
            for name, uid in donor_map.items()
        ]
        bulk_upsert(conn, "donors", ["id", "name", "country_id"], donor_rows)

        # --- Build & insert entities --------------------------------------
        log(SCRIPT_NAME, "Building entity rows …")

        agency_rows, agency_at_map = build_agencies_rows(agencies_raw, donor_map, country_map)
        theme_rows, theme_at_map, theme_name_map = build_themes_rows(themes_raw, inv_type_map)
        org_rows, org_at_map = build_organizations_rows(organizations_raw, org_type_map, country_map)
        project_rows, project_at_map = build_projects_rows(projects_raw)

        log(SCRIPT_NAME, "Inserting entities …")
        bulk_upsert(
            conn, "agencies",
            ["id", "name", "website", "donor_id", "country_id"],
            agency_rows,
        )
        bulk_upsert(
            conn, "themes",
            ["id", "theme_key", "name", "description", "type_id"],
            theme_rows,
        )
        bulk_upsert(
            conn, "organizations",
            [
                "id", "org_key", "full_name", "short_name", "website",
                "description", "organization_type_id", "country_id",
                "estimated_budget", "programme_budget", "budget_source",
                "budget_source_link", "hdx_org_key", "iati_org_key",
                "mptfo_name", "mptfo_url", "transparency_portal_url",
                "data_products_overview_url", "funding_type", "last_updated",
            ],
            org_rows,
        )
        bulk_upsert(
            conn, "projects",
            ["id", "product_key", "name", "description", "website", "hdx_sohd"],
            project_rows,
        )

        # --- Junction tables ----------------------------------------------
        log(SCRIPT_NAME, "Building junction tables …")

        apf_rows = build_agency_project_funding(projects_raw, agency_at_map, project_at_map)
        aof_rows = build_agency_organization_funding(organizations_raw, agency_at_map, org_at_map)
        op_rows = build_organization_project(organizations_raw, org_at_map, project_at_map)
        pt_rows = build_project_themes(themes_raw, projects_raw, theme_at_map, theme_name_map, project_at_map)

        log(SCRIPT_NAME, "Inserting junction tables …")
        bulk_upsert(
            conn, "agency_project_funding",
            ["id", "agency_id", "project_id"],
            apf_rows,
        )
        bulk_upsert(
            conn, "agency_organization_funding",
            ["id", "agency_id", "organization_id"],
            aof_rows,
        )
        bulk_upsert(
            conn, "organization_project",
            ["id", "organization_id", "project_id"],
            op_rows,
        )
        bulk_upsert(
            conn, "project_themes",
            ["id", "project_id", "theme_id"],
            pt_rows,
        )

        # --- Summary ------------------------------------------------------
        log(SCRIPT_NAME, "")
        log(SCRIPT_NAME, "=== PIPELINE SUMMARY ===")
        log(SCRIPT_NAME, f"  Countries:                    {len(country_map)}")
        log(SCRIPT_NAME, f"  Organization types:           {len(org_type_map)}")
        log(SCRIPT_NAME, f"  Investment types:              {len(inv_type_map)}")
        log(SCRIPT_NAME, f"  Donors:                       {len(donor_map)}")
        log(SCRIPT_NAME, f"  Agencies:                     {len(agency_rows)}")
        log(SCRIPT_NAME, f"  Themes:                       {len(theme_rows)}")
        log(SCRIPT_NAME, f"  Organizations:                {len(org_rows)}")
        log(SCRIPT_NAME, f"  Projects:                     {len(project_rows)}")
        log(SCRIPT_NAME, f"  Agency→Project funding:       {len(apf_rows)}")
        log(SCRIPT_NAME, f"  Agency→Organization funding:  {len(aof_rows)}")
        log(SCRIPT_NAME, f"  Organization→Project:         {len(op_rows)}")
        log(SCRIPT_NAME, f"  Project→Theme:                {len(pt_rows)}")
        log(SCRIPT_NAME, "========================")
        log(SCRIPT_NAME, "Pipeline completed successfully ✓")

        conn.close()

    except Exception as err:
        log(SCRIPT_NAME, f"Script failed: {err}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
