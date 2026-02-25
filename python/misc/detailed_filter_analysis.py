import json
from typing import List, Dict, Set, Any

# Load the data
with open('public/data/organizations-nested.json', 'r', encoding='utf-8') as f:
    organizations = json.load(f)

# Define the 7 Germany agencies from the UI
GERMANY_AGENCIES = [
    "Federal Foreign Office (FFO)",
    "Unspecified Agency",
    "German Corporation for International Cooperation (GIZ)",
    "Federal Ministry for Economic Cooperation and Development (BMZ)",
    "KfW Development Bank (KfW)",
    "Federal Agency for Technical Relief (THW)",
    "Federal Agency for Cartography and Geodesy (BKG)"
]

print("=" * 100)
print("DETAILED FILTERING LOGIC ANALYSIS")
print("=" * 100)

def get_org_level_donors(org: Dict) -> Set[str]:
    """Get all donor countries from org-level agencies"""
    donors = set()
    if 'agencies' in org and org['agencies']:
        for agency in org['agencies']:
            country = agency.get('fields', {}).get('Country Name')
            if country:
                donors.add(country)
    return donors

def get_project_level_donors(org: Dict) -> Set[str]:
    """Get all donor countries from project-level agencies"""
    donors = set()
    if 'projects' in org and org['projects']:
        for project in org['projects']:
            if 'agencies' in project and project['agencies']:
                for agency in project['agencies']:
                    country = agency.get('fields', {}).get('Country Name')
                    if country:
                        donors.add(country)
    return donors

def get_all_donors(org: Dict) -> Set[str]:
    """Get all donor countries (org-level + project-level)"""
    return get_org_level_donors(org) | get_project_level_donors(org)

def get_org_level_germany_agencies(org: Dict) -> List[str]:
    """Get Germany agency names at org level"""
    agencies = []
    if 'agencies' in org and org['agencies']:
        for agency in org['agencies']:
            if agency.get('fields', {}).get('Country Name') == 'Germany':
                agency_name = agency.get('fields', {}).get('Agency/Department Name', '')
                if agency_name:
                    agencies.append(agency_name)
    return agencies

def get_project_level_germany_agencies(project: Dict) -> List[str]:
    """Get Germany agency names at project level"""
    agencies = []
    if 'agencies' in project and project['agencies']:
        for agency in project['agencies']:
            if agency.get('fields', {}).get('Country Name') == 'Germany':
                agency_name = agency.get('fields', {}).get('Agency/Department Name', '')
                if agency_name:
                    agencies.append(agency_name)
    return agencies

def org_has_selected_agency(org: Dict, selected_agencies: List[str]) -> bool:
    """Check if org has any of the selected agencies at org-level"""
    org_agencies = get_org_level_germany_agencies(org)
    return any(agency in selected_agencies for agency in org_agencies)

def project_matches_agency_filter(project: Dict, selected_agencies: List[str], org_has_agency: bool) -> bool:
    """
    Simulate the projectMatchesAgencyFilter logic from data.ts
    
    From the code:
    - If org has the agency at org level, show all projects
    - Otherwise, check project-level agencies
    """
    if org_has_agency:
        return True
    
    # Check project-level agencies
    project_agencies = get_project_level_germany_agencies(project)
    return any(agency in selected_agencies for agency in project_agencies)

# === FILTER 1: Germany alone (no agency filter) ===
print("\n1. FILTER: Germany alone (no agency filter)")
print("-" * 100)

germany_only_orgs = []
germany_only_projects = 0

for org in organizations:
    all_donors = get_all_donors(org)
    
    # Check if "Germany" is in donors (either org-level or project-level)
    if 'Germany' in all_donors:
        germany_only_orgs.append(org)
        # Count all projects
        germany_only_projects += len(org.get('projects', []))

print(f"Organizations: {len(germany_only_orgs)}")
print(f"Total projects: {germany_only_projects}")

# === FILTER 2: Germany + all 7 agencies ===
print("\n2. FILTER: Germany + all 7 agencies")
print("-" * 100)

germany_with_agencies_orgs = []
germany_with_agencies_projects = 0
excluded_orgs = []

for org in organizations:
    all_donors = get_all_donors(org)
    
    # Check if "Germany" is in donors
    if 'Germany' not in all_donors:
        continue
    
    # Check if org has any of the selected agencies at org-level
    org_has_agency = org_has_selected_agency(org, GERMANY_AGENCIES)
    
    # Filter projects based on agency filter
    visible_projects = []
    for project in org.get('projects', []):
        if project_matches_agency_filter(project, GERMANY_AGENCIES, org_has_agency):
            visible_projects.append(project)
    
    # Decide if org should be shown
    # From data.ts line 818: shouldShowOrg = visibleProjects.length > 0 || (hasAgencyFilter && orgHasSelectedAgency())
    should_show = len(visible_projects) > 0 or org_has_agency
    
    if should_show:
        germany_with_agencies_orgs.append(org)
        germany_with_agencies_projects += len(visible_projects)
    else:
        excluded_orgs.append({
            'org': org,
            'org_agencies': get_org_level_germany_agencies(org),
            'project_count': len(org.get('projects', [])),
            'projects': org.get('projects', [])
        })

print(f"Organizations: {len(germany_with_agencies_orgs)}")
print(f"Total projects: {germany_with_agencies_projects}")

# === DISCREPANCY ANALYSIS ===
print("\n3. DISCREPANCY")
print("-" * 100)
org_diff = len(germany_only_orgs) - len(germany_with_agencies_orgs)
proj_diff = germany_only_projects - germany_with_agencies_projects

print(f"Organizations excluded: {org_diff}")
print(f"Projects excluded: {proj_diff}")

# === DETAILED EXCLUSION ANALYSIS ===
print(f"\n4. ORGANIZATIONS EXCLUDED BY AGENCY FILTER ({len(excluded_orgs)})")
print("=" * 100)

for item in excluded_orgs:
    org = item['org']
    org_name = org.get('name', 'Unknown')
    org_agencies = item['org_agencies']
    project_count = item['project_count']
    projects = item['projects']
    
    print(f"\n📌 Organization: {org_name}")
    print(f"   ID: {org.get('id')}")
    print(f"   Total projects: {project_count}")
    print(f"   Org-level Germany agencies: {org_agencies if org_agencies else '[]'}")
    
    # Check project-level Germany agencies
    all_project_germany_agencies = set()
    for project in projects:
        proj_agencies = get_project_level_germany_agencies(project)
        all_project_germany_agencies.update(proj_agencies)
    
    if all_project_germany_agencies:
        print(f"   Project-level Germany agencies found: {list(all_project_germany_agencies)}")
        # Check which are in the 7 selected
        matching = [a for a in all_project_germany_agencies if a in GERMANY_AGENCIES]
        not_matching = [a for a in all_project_germany_agencies if a not in GERMANY_AGENCIES]
        if matching:
            print(f"   ✓ Matching selected agencies: {matching}")
        if not_matching:
            print(f"   ✗ Non-matching agencies: {not_matching}")
    else:
        print(f"   ⚠️  NO Germany agencies at project level!")
    
    # Show first few projects
    if projects:
        print(f"\n   Projects:")
        for i, project in enumerate(projects[:3]):
            proj_name = project.get('fields', {}).get('Project/Product Name', 'Unknown')
            proj_agencies = get_project_level_germany_agencies(project)
            print(f"      {i+1}. {proj_name}")
            if proj_agencies:
                print(f"         Germany agencies: {proj_agencies}")
            else:
                print(f"         No Germany agencies")
        if len(projects) > 3:
            print(f"      ... and {len(projects) - 3} more projects")

# === UNIQUE GERMANY AGENCIES ===
print("\n" + "=" * 100)
print("5. ALL UNIQUE GERMANY AGENCY NAMES IN ORGANIZATIONS DATA")
print("=" * 100)

all_germany_agencies = set()
for org in organizations:
    # Org-level
    all_germany_agencies.update(get_org_level_germany_agencies(org))
    # Project-level
    for project in org.get('projects', []):
        all_germany_agencies.update(get_project_level_germany_agencies(project))

print(f"\nFound {len(all_germany_agencies)} unique Germany agency names:")
for agency_name in sorted(all_germany_agencies):
    in_list = "✓" if agency_name in GERMANY_AGENCIES else "✗"
    print(f"  {in_list} {agency_name}")

print("\n" + "=" * 100)
print("SUMMARY")
print("=" * 100)
print(f"• When filtering by 'Germany' alone:")
print(f"  → {len(germany_only_orgs)} organizations, {germany_only_projects} projects")
print(f"\n• When filtering by 'Germany + all 7 agencies':")
print(f"  → {len(germany_with_agencies_orgs)} organizations, {germany_with_agencies_projects} projects")
print(f"\n• Discrepancy:")
print(f"  → {org_diff} organization(s) excluded")
print(f"  → {proj_diff} project(s) excluded")
print(f"\n• Root cause:")
print(f"  The agency filter requires organizations to either:")
print(f"  1. Have at least one of the 7 selected agencies at org-level, OR")
print(f"  2. Have projects with at least one of the 7 selected agencies at project-level")
print(f"\n  Organizations funded by Germany but with NONE of the 7 agencies are excluded.")
print("=" * 100)
