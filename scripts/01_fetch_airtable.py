#!/usr/bin/env python3
"""Fetch data from Airtable and save to JSON files.

This is the main data pipeline entry point. It:
1. Fetches projects, organizations, agencies, and themes from Airtable
2. Validates data quality
3. Saves JSON files to public/data/
4. Triggers the nesting script to build the nested structure

Usage:
    python scripts/01_fetch_airtable.py
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List

from _utils import (
    fetch_all_records,
    log,
    setup_environment,
    validate_config,
)

# Field specifications for each table
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

# Optional fields that may be sparse in Airtable
OPTIONAL_ORGANIZATION_FIELDS = {
    "Link to Budget Source",
    "Org Description",
    "Org Mission",
    "Link to Data Products Overview",
    "Org IATI Name",
    "Org MPTFO Name",
    "Org MPTFO URL [Formula]",
    "Org Transparency Portal",
    "Org Programme Budget",
}


def save_json(data: Any, filename: str, output_dir: Path, script_name: str) -> Path:
    """Save data to JSON file with pretty formatting.
    
    Args:
        data: Data to save
        filename: Output filename
        output_dir: Output directory path
        script_name: Script name for logging
        
    Returns:
        Path to saved file
    """
    file_path = output_dir / filename
    
    # Remove Airtable internal timestamps
    if isinstance(data, list):
        for record in data:
            if isinstance(record, dict):
                record.pop("createdTime", None)
    elif isinstance(data, dict):
        data.pop("createdTime", None)
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    count = len(data) if isinstance(data, (list, dict)) else 1
    log(script_name, f"Saved {count} items to {file_path}")
    
    return file_path


def validate_data_quality(
    projects: List[Dict[str, Any]],
    organizations: List[Dict[str, Any]],
    script_name: str
) -> List[str]:
    """Validate fetched data meets quality requirements.
    
    Args:
        projects: List of project records
        organizations: List of organization records
        script_name: Script name for logging
        
    Returns:
        List of validation error messages (empty if all valid)
    """
    errors = []
    
    # Check minimum record counts
    if len(projects) < 100:
        errors.append(f"Insufficient projects: {len(projects)} (minimum 100 required)")
    
    if len(organizations) < 50:
        errors.append(f"Insufficient organizations: {len(organizations)} (minimum 50 required)")
    
    # Validate field presence in projects
    if projects:
        missing_fields = []
        for field in FIELDS["projects"]:
            found = any(field in rec.get("fields", {}) for rec in projects[:10])
            if not found:
                missing_fields.append(field)
        
        if missing_fields:
            errors.append(f"Missing project fields: {', '.join(missing_fields)}")
    
    # Validate field presence in organizations (excluding optional fields)
    if organizations:
        missing_fields = []
        for field in FIELDS["organizations"]:
            if field in OPTIONAL_ORGANIZATION_FIELDS:
                continue
            found = any(field in rec.get("fields", {}) for rec in organizations[:10])
            if not found:
                missing_fields.append(field)
        
        if missing_fields:
            errors.append(f"Missing organization fields: {', '.join(missing_fields)}")
    
    return errors


def main():
    """Main execution function."""
    script_name = "01_fetch_airtable"
    
    try:
        log(script_name, "Starting Airtable data fetch...")
        
        # Load configuration
        config = setup_environment()
        validate_config(config, ["api_key", "base_id", "table_projects"])
        
        output_dir = config["project_root"] / "public" / "data"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Fetch main tables
        log(script_name, f"Fetching projects from {config['table_projects']}")
        projects = fetch_all_records(
            config["base_id"],
            config["table_projects"],
            config["api_key"],
            FIELDS["projects"],
            script_name
        )
        save_json(projects, "ecosystem-table.json", output_dir, script_name)
        
        # Fetch organizations (if configured)
        organizations = []
        if config["table_organizations"]:
            try:
                log(script_name, f"Fetching organizations from {config['table_organizations']}")
                organizations = fetch_all_records(
                    config["base_id"],
                    config["table_organizations"],
                    config["api_key"],
                    FIELDS["organizations"],
                    script_name
                )
                save_json(organizations, "organizations-table.json", output_dir, script_name)
            except Exception as e:
                log(script_name, f"Failed to fetch organizations: {e}")
        
        # Fetch agencies (if configured)
        agencies_count = 0
        if config["table_agencies"]:
            try:
                log(script_name, f"Fetching agencies from {config['table_agencies']}")
                agencies = fetch_all_records(
                    config["base_id"],
                    config["table_agencies"],
                    config["api_key"],
                    FIELDS["agencies"],
                    script_name
                )
                save_json(agencies, "agencies-table.json", output_dir, script_name)
                agencies_count = len(agencies)
            except Exception as e:
                log(script_name, f"Failed to fetch agencies: {e}")
        
        # Fetch themes (if configured)
        themes_count = 0
        if config["table_themes"]:
            try:
                log(script_name, f"Fetching themes from {config['table_themes']}")
                themes = fetch_all_records(
                    config["base_id"],
                    config["table_themes"],
                    config["api_key"],
                    FIELDS["themes"],
                    script_name
                )
                save_json(themes, "themes-table.json", output_dir, script_name)
                themes_count = len(themes)
            except Exception as e:
                log(script_name, f"Failed to fetch themes: {e}")
        
        # Summary
        log(script_name, "FETCH SUMMARY:")
        log(script_name, f"  Projects: {len(projects)} records -> ecosystem-table.json")
        log(script_name, f"  Organizations: {len(organizations)} records -> organizations-table.json")
        log(script_name, f"  Agencies: {agencies_count} records -> agencies-table.json")
        log(script_name, f"  Themes: {themes_count} records -> themes-table.json")
        log(script_name, f"  Output directory: {output_dir}")
        
        # Data quality validation
        log(script_name, "Validating data quality...")
        validation_errors = validate_data_quality(projects, organizations, script_name)
        
        if validation_errors:
            log(script_name, "VALIDATION FAILED:")
            for error in validation_errors:
                log(script_name, f"  ERROR: {error}")
            log(script_name, "Aborting - data quality requirements not met")
            sys.exit(1)
        
        log(script_name, "Data validation passed")
        
        # Trigger nesting script
        log(script_name, "Triggering nesting script...")
        result = subprocess.run(
            [sys.executable, "scripts/02_build_nested_data.py"],
            cwd=config["project_root"]
        )
        
        if result.returncode == 0:
            log(script_name, "Pipeline completed successfully")
        else:
            log(script_name, f"Nesting script failed with code {result.returncode}")
            sys.exit(1)
        
    except Exception as err:
        log(script_name, f"Script failed: {err}")
        sys.exit(1)


if __name__ == "__main__":
    main()
