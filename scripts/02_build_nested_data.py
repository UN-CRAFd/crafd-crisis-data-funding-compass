#!/usr/bin/env python3
"""Build nested organization structure with projects and agencies.

This script:
1. Reads organizations, agencies, and projects from JSON files
2. Matches agencies to organizations
3. Matches projects to organizations
4. Creates comprehensive nested structure with donor countries
5. Saves to organizations-nested.json

Usage:
    python scripts/02_build_nested_data.py
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Set

from _utils import log, split_respecting_parentheses

# File paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "public" / "data"


def load_json_file(filename: str) -> List[Dict[str, Any]]:
    """Load JSON file from data directory.
    
    Args:
        filename: JSON filename to load
        
    Returns:
        List of records, or empty list if file not found
    """
    path = DATA_DIR / filename
    if not path.exists():
        print(f"Warning: {path} not found, returning empty list")
        return []
    
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_agency_indices(agencies: List[Dict[str, Any]]) -> tuple:
    """Build lookup indices for agencies.
    
    Args:
        agencies: List of agency records
        
    Returns:
        Tuple of (agencies_by_id, agencies_by_name) dictionaries
    """
    agencies_by_id = {}
    agencies_by_name = {}
    
    name_fields = [
        "Name", "Agency Name", "Agency/Department Name",
        "Org Full Name", "Org Short Name", "Title"
    ]
    
    for agency in agencies:
        agency_id = agency.get("id")
        fields = agency.get("fields", {})
        
        # Index by ID
        if agency_id:
            agencies_by_id[agency_id] = agency
        
        # Index by name (normalized to lowercase)
        for field in name_fields:
            name = fields.get(field)
            if isinstance(name, str) and name.strip():
                normalized = name.strip().lower()
                agencies_by_name.setdefault(normalized, []).append(agency)
                break
    
    return agencies_by_id, agencies_by_name


def build_project_index(projects: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Build lookup index for projects by provider organization.
    
    Args:
        projects: List of project records
        
    Returns:
        Dictionary mapping organization identifiers to their projects
    """
    projects_by_org = {}
    
    for project in projects:
        fields = project.get("fields", {})
        providers = fields.get("Provider Orgs Full Name") or \
                   fields.get("Provider Org") or \
                   fields.get("Organization")
        
        if not providers:
            continue
        
        # Handle different provider formats
        if isinstance(providers, str):
            # Parse as list or split by delimiters
            if providers.startswith("[") and providers.endswith("]"):
                try:
                    import ast
                    provider_list = ast.literal_eval(providers)
                    if isinstance(provider_list, list):
                        for provider_id in provider_list:
                            if isinstance(provider_id, str):
                                projects_by_org.setdefault(provider_id.strip(), []).append(project)
                except:
                    parts = split_respecting_parentheses(providers)
                    for part in parts:
                        projects_by_org.setdefault(part.strip(), []).append(project)
            else:
                parts = split_respecting_parentheses(providers)
                for part in parts:
                    projects_by_org.setdefault(part.strip(), []).append(project)
        elif isinstance(providers, list):
            for provider_id in providers:
                if isinstance(provider_id, str):
                    projects_by_org.setdefault(provider_id.strip(), []).append(project)
    
    return projects_by_org


def match_agencies(
    org_fields: Dict[str, Any],
    agencies_by_name: Dict[str, List[Dict[str, Any]]]
) -> List[Dict[str, Any]]:
    """Match agencies to an organization.
    
    Args:
        org_fields: Organization field data
        agencies_by_name: Agency lookup by name
        
    Returns:
        List of matched agency records
    """
    matched = []
    
    # Get donor agencies field (various possible names)
    donor_field = org_fields.get("Org Donor Agencies") or \
                  org_fields.get("Org Donor Agencies (Linked)") or \
                  org_fields.get("Org Donor Agencies (from Agency)")
    
    if not donor_field:
        return matched
    
    # Parse donor names
    donor_tokens = []
    if isinstance(donor_field, str) and donor_field.strip():
        donor_tokens = split_respecting_parentheses(donor_field)
    elif isinstance(donor_field, list):
        for item in donor_field:
            if isinstance(item, str) and item.strip():
                donor_tokens.extend(split_respecting_parentheses(item))
    
    # Match tokens to agencies
    for token in donor_tokens:
        normalized = token.strip().lower()
        if normalized in agencies_by_name:
            matched.extend(agencies_by_name[normalized])
    
    return matched


def match_projects(
    org_name: str,
    org_id: str,
    projects_by_org: Dict[str, List[Dict[str, Any]]]
) -> List[Dict[str, Any]]:
    """Match projects to an organization.
    
    Args:
        org_name: Organization name
        org_id: Organization ID
        projects_by_org: Project lookup by organization
        
    Returns:
        List of matched project records (deduplicated)
    """
    matched = []
    
    # Try name and ID lookups
    if org_name and org_name in projects_by_org:
        matched.extend(projects_by_org[org_name])
    
    if org_id and org_id in projects_by_org:
        matched.extend(projects_by_org[org_id])
    
    # Try case-insensitive name matching
    if org_name:
        org_name_lower = org_name.lower()
        for key, projects in projects_by_org.items():
            if key.lower() == org_name_lower:
                matched.extend(projects)
                break
    
    # Deduplicate by project ID
    seen_ids = set()
    unique = []
    for project in matched:
        project_id = project.get("id")
        if project_id not in seen_ids:
            seen_ids.add(project_id)
            unique.append(project)
    
    return unique


def extract_donor_countries(agencies: List[Dict[str, Any]]) -> Set[str]:
    """Extract unique donor country names from agencies.
    
    Args:
        agencies: List of agency records
        
    Returns:
        Set of country names
    """
    countries = set()
    
    for agency in agencies:
        fields = agency.get("fields", {})
        country_data = fields.get("Country Name")
        
        if isinstance(country_data, list):
            for item in country_data:
                if isinstance(item, str) and item.strip():
                    countries.add(item.strip())
        elif isinstance(country_data, str) and country_data.strip():
            countries.add(country_data.strip())
    
    return countries


def nest_project_agencies(
    projects: List[Dict[str, Any]],
    agencies_by_id: Dict[str, Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Add nested agency data to projects.
    
    Args:
        projects: List of project records
        agencies_by_id: Agency lookup by ID
        
    Returns:
        List of projects with nested agencies
    """
    enhanced = []
    
    for project in projects:
        project_copy = project.copy()
        fields = project_copy.get("fields", {})
        
        # Get project donor agencies
        project_agencies = []
        donor_agency_ids = fields.get("Project Donor Agencies", [])
        
        if isinstance(donor_agency_ids, list):
            for agency_id in donor_agency_ids:
                if isinstance(agency_id, str) and agency_id in agencies_by_id:
                    project_agencies.append(agencies_by_id[agency_id])
        elif isinstance(donor_agency_ids, str):
            # Handle comma-separated IDs
            for agency_id in donor_agency_ids.split(","):
                agency_id = agency_id.strip()
                if agency_id in agencies_by_id:
                    project_agencies.append(agencies_by_id[agency_id])
        
        project_copy["agencies"] = project_agencies
        enhanced.append(project_copy)
    
    return enhanced


def main():
    """Main execution function."""
    script_name = "02_build_nested_data"
    
    log(script_name, "Building nested organization structure...")
    
    # Load data files
    organizations = load_json_file("organizations-table.json")
    agencies = load_json_file("agencies-table.json")
    projects = load_json_file("ecosystem-table.json")
    
    log(script_name, f"Loaded {len(organizations)} organizations")
    log(script_name, f"Loaded {len(agencies)} agencies")
    log(script_name, f"Loaded {len(projects)} projects")
    
    # Build indices
    agencies_by_id, agencies_by_name = build_agency_indices(agencies)
    projects_by_org = build_project_index(projects)
    
    # Build nested structure
    nested = []
    
    for org in organizations:
        org_id = org.get("id")
        org_fields = org.get("fields", {})
        org_name = org_fields.get("Org Full Name") or \
                   org_fields.get("Org Short Name") or \
                   org_fields.get("Organization") or \
                   org_id
        
        # Match agencies
        matched_agencies = match_agencies(org_fields, agencies_by_name)
        
        # Extract donor countries
        donor_countries = extract_donor_countries(matched_agencies)
        
        # Match and enhance projects
        matched_projects = match_projects(str(org_name or ""), str(org_id or ""), projects_by_org)
        enhanced_projects = nest_project_agencies(matched_projects, agencies_by_id)
        
        # Build nested entry
        entry = {
            "id": org_id,
            "name": org_name,
            "fields": org_fields,
            "agencies": matched_agencies,
            "projects": enhanced_projects,
            "donor_countries": sorted(list(donor_countries)),
        }
        
        nested.append(entry)
    
    # Save result
    output_path = DATA_DIR / "organizations-nested.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(nested, f, indent=2, ensure_ascii=False)
    
    log(script_name, f"Saved nested structure to {output_path}")
    log(script_name, f"Total organizations: {len(nested)}")
    log(script_name, "Done")


if __name__ == "__main__":
    main()
