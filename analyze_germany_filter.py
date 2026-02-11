import json
from collections import defaultdict

# Load the data
with open('public/data/organizations-nested.json', 'r', encoding='utf-8') as f:
    organizations = json.load(f)

# Define the 7 Germany agencies
GERMANY_AGENCIES = [
    "Federal Foreign Office (FFO)",
    "Unspecified Agency",
    "German Corporation for International Cooperation (GIZ)",
    "Federal Ministry for Economic Cooperation and Development (BMZ)",
    "KfW Development Bank (KfW)",
    "Federal Agency for Technical Relief (THW)",
    "Federal Agency for Cartography and Geodesy (BKG)"
]

print("=" * 80)
print("GERMANY FILTERING ANALYSIS")
print("=" * 80)

# Filter 1: Organizations with ANY Germany agency
germany_orgs = []
for org in organizations:
    has_germany = False
    if 'agencies' in org and org['agencies']:
        for agency in org['agencies']:
            if agency.get('fields', {}).get('Country Name') == 'Germany':
                has_germany = True
                break
    if has_germany:
        germany_orgs.append(org)

print(f"\n1. Organizations funded by Germany (any agency): {len(germany_orgs)}")

# Count total projects from Germany orgs
total_projects_germany = 0
for org in germany_orgs:
    if 'projects' in org and org['projects']:
        total_projects_germany += len(org['projects'])

print(f"   Total projects from these organizations: {total_projects_germany}")

# Filter 2: Organizations with Germany agencies that match the 7 specific agencies
germany_orgs_with_specific_agencies = []
orgs_excluded = []

for org in germany_orgs:
    has_matching_agency = False
    germany_agency_names = []
    
    if 'agencies' in org and org['agencies']:
        for agency in org['agencies']:
            if agency.get('fields', {}).get('Country Name') == 'Germany':
                agency_name = agency.get('fields', {}).get('Agency/Department Name', '')
                germany_agency_names.append(agency_name)
                if agency_name in GERMANY_AGENCIES:
                    has_matching_agency = True
    
    if has_matching_agency:
        germany_orgs_with_specific_agencies.append(org)
    else:
        orgs_excluded.append({
            'org': org,
            'germany_agencies': germany_agency_names
        })

print(f"\n2. Organizations funded by Germany with at least one of the 7 specified agencies: {len(germany_orgs_with_specific_agencies)}")

# Count projects from these filtered orgs
filtered_projects = 0
for org in germany_orgs_with_specific_agencies:
    if 'projects' in org and org['projects']:
        filtered_projects += len(org['projects'])

print(f"   Total projects from these organizations: {filtered_projects}")

# Calculate discrepancy
org_discrepancy = len(germany_orgs) - len(germany_orgs_with_specific_agencies)
project_discrepancy = total_projects_germany - filtered_projects

print(f"\n3. DISCREPANCY:")
print(f"   Organizations: {org_discrepancy} fewer when filtering by specific agencies")
print(f"   Projects: {project_discrepancy} fewer when filtering by specific agencies")

# Analyze excluded organizations
print(f"\n4. EXCLUDED ORGANIZATIONS ({len(orgs_excluded)}):")
print("=" * 80)

for item in orgs_excluded:
    org = item['org']
    germany_agencies = item['germany_agencies']
    org_name = org.get('name', 'Unknown')
    project_count = len(org.get('projects', []))
    
    print(f"\nOrganization: {org_name}")
    print(f"  - ID: {org.get('id')}")
    print(f"  - Projects: {project_count}")
    print(f"  - Germany agencies found: {germany_agencies}")
    
    # Show all agencies for this org
    if 'agencies' in org and org['agencies']:
        print(f"  - All agencies ({len(org['agencies'])}):")
        for agency in org['agencies']:
            country = agency.get('fields', {}).get('Country Name', 'Unknown')
            agency_name = agency.get('fields', {}).get('Agency/Department Name', 'Unknown')
            print(f"      • {country}: {agency_name}")
    else:
        print(f"  - No agencies array found!")
    
    # Show project-level agencies
    if 'projects' in org and org['projects']:
        print(f"  - Projects ({len(org['projects'])}):")
        for project in org['projects'][:5]:  # Show first 5 projects
            proj_name = project.get('fields', {}).get('Project/Product Name', 'Unknown')
            print(f"      • {proj_name}")
            # Check if project has Germany agencies
            if 'agencies' in project and project['agencies']:
                proj_germany_agencies = []
                for agency in project['agencies']:
                    if agency.get('fields', {}).get('Country Name') == 'Germany':
                        agency_name = agency.get('fields', {}).get('Agency/Department Name', 'Unknown')
                        proj_germany_agencies.append(agency_name)
                if proj_germany_agencies:
                    print(f"        → Project-level Germany agencies: {proj_germany_agencies}")
        if len(org['projects']) > 5:
            print(f"      ... and {len(org['projects']) - 5} more")

# Analyze all unique Germany agency names
print("\n" + "=" * 80)
print("5. ALL UNIQUE GERMANY AGENCY NAMES IN DATA:")
print("=" * 80)

all_germany_agencies = set()
for org in organizations:
    if 'agencies' in org and org['agencies']:
        for agency in org['agencies']:
            if agency.get('fields', {}).get('Country Name') == 'Germany':
                agency_name = agency.get('fields', {}).get('Agency/Department Name', '')
                if agency_name:
                    all_germany_agencies.add(agency_name)

print(f"\nFound {len(all_germany_agencies)} unique Germany agency names:")
for agency_name in sorted(all_germany_agencies):
    in_list = "✓" if agency_name in GERMANY_AGENCIES else "✗"
    print(f"  {in_list} {agency_name}")

print("\n" + "=" * 80)
print("SUMMARY:")
print("=" * 80)
print(f"Expected results when filtering by 'Germany + all 7 agencies': {len(germany_orgs_with_specific_agencies)} orgs, {filtered_projects} products")
print(f"Actual results when filtering by 'Germany' alone: {len(germany_orgs)} orgs, {total_projects_germany} products")
print(f"\nThe discrepancy is caused by {len(orgs_excluded)} organization(s) with Germany agencies NOT in the list of 7.")
