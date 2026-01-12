#!/usr/bin/env python3
"""Check donor statistics in the nested data."""

import json
from pathlib import Path

DATA_FILE = Path(__file__).parent.parent / "public" / "data" / "organizations-nested.json"

with open(DATA_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

orgs_with_donors = [o for o in data if o.get('donor_countries')]
total_agencies = sum(len(o.get("agencies", [])) for o in data)
total_projects = sum(len(o.get("projects", [])) for o in data)
total_project_agencies = sum(
    len(p.get("agencies", [])) 
    for o in data 
    for p in o.get("projects", [])
)

print(f"Organizations with donors: {len(orgs_with_donors)}/{len(data)}")
print(f"Total donor agencies matched: {total_agencies}")
print(f"Total projects: {total_projects}")
print(f"Total project-level donor agencies: {total_project_agencies}")

# Show a few examples
print("\nSample organizations with donors:")
for org in orgs_with_donors[:5]:
    print(f"- {org['name']}: {len(org['agencies'])} agencies, countries: {org['donor_countries']}")
