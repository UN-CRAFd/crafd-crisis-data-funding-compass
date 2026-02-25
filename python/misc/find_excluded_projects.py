import json
from typing import List, Dict, Set

# Load the data
with open('public/data/organizations-nested.json', 'r', encoding='utf-8') as f:
    organizations = json.load(f)

GERMANY_AGENCIES = [
    "Federal Foreign Office (FFO)",
    "Unspecified Agency",
    "German Corporation for International Cooperation (GIZ)",
    "Federal Ministry for Economic Cooperation and Development (BMZ)",
    "KfW Development Bank (KfW)",
    "Federal Agency for Technical Relief (THW)",
    "Federal Agency for Cartography and Geodesy (BKG)"
]

def get_all_donors(org: Dict) -> Set[str]:
    """Get all donor countries (org-level + project-level)"""
    donors = set()
    if 'agencies' in org and org['agencies']:
        for agency in org['agencies']:
            country = agency.get('fields', {}).get('Country Name')
            if country:
                donors.add(country)
    if 'projects' in org and org['projects']:
        for project in org['projects']:
            if 'agencies' in project and project['agencies']:
                for agency in project['agencies']:
                    country = agency.get('fields', {}).get('Country Name')
                    if country:
                        donors.add(country)
    return donors

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

def org_has_selected_agency(org: Dict) -> bool:
    """Check if org has any of the selected agencies at org-level"""
    org_agencies = get_org_level_germany_agencies(org)
    return any(agency in GERMANY_AGENCIES for agency in org_agencies)

def project_matches_agency_filter(project: Dict, org_has_agency: bool) -> bool:
    """Check if project matches agency filter"""
    if org_has_agency:
        return True
    project_agencies = get_project_level_germany_agencies(project)
    return any(agency in GERMANY_AGENCIES for agency in project_agencies)

print("=" * 100)
print("FINDING EXCLUDED PROJECTS")
print("=" * 100)

excluded_projects_info = []

for org in organizations:
    all_donors = get_all_donors(org)
    
    if 'Germany' not in all_donors:
        continue
    
    org_has_agency = org_has_selected_agency(org)
    org_name = org.get('name', 'Unknown')
    
    for project in org.get('projects', []):
        project_name = project.get('fields', {}).get('Project/Product Name', 'Unknown')
        project_id = project.get('id', 'Unknown')
        
        matches_filter = project_matches_agency_filter(project, org_has_agency)
        
        if not matches_filter:
            proj_agencies = get_project_level_germany_agencies(project)
            
            # Get ALL agencies for this project (not just Germany)
            all_proj_agencies = []
            if 'agencies' in project and project['agencies']:
                for agency in project['agencies']:
                    country = agency.get('fields', {}).get('Country Name', '?')
                    agency_name = agency.get('fields', {}).get('Agency/Department Name', '?')
                    all_proj_agencies.append(f"{country}: {agency_name}")
            
            excluded_projects_info.append({
                'org_name': org_name,
                'org_id': org.get('id'),
                'org_has_agency': org_has_agency,
                'org_germany_agencies': get_org_level_germany_agencies(org),
                'project_name': project_name,
                'project_id': project_id,
                'project_germany_agencies': proj_agencies,
                'all_project_agencies': all_proj_agencies
            })

print(f"\nFound {len(excluded_projects_info)} project(s) excluded by agency filter:\n")

for i, info in enumerate(excluded_projects_info, 1):
    print(f"{i}. Project: {info['project_name']}")
    print(f"   Project ID: {info['project_id']}")
    print(f"   Organization: {info['org_name']}")
    print(f"   Organization ID: {info['org_id']}")
    print(f"   Org has selected agency at org-level: {info['org_has_agency']}")
    print(f"   Org-level Germany agencies: {info['org_germany_agencies']}")
    print(f"   Project-level Germany agencies: {info['project_germany_agencies']}")
    if not info['project_germany_agencies']:
        print(f"   ⚠️  This project has NO Germany agencies!")
    print(f"   All project agencies: {info['all_project_agencies']}")
    print()

# Let's also check how many projects each org with Germany has
print("=" * 100)
print("PROJECT COUNTS BY ORGANIZATION (Germany donors)")
print("=" * 100)

for org in organizations:
    all_donors = get_all_donors(org)
    
    if 'Germany' not in all_donors:
        continue
    
    org_name = org.get('name', 'Unknown')
    total_projects = len(org.get('projects', []))
    
    org_has_agency = org_has_selected_agency(org)
    visible_projects = sum(1 for p in org.get('projects', []) 
                          if project_matches_agency_filter(p, org_has_agency))
    
    if visible_projects < total_projects:
        print(f"\n{org_name}:")
        print(f"  Total projects: {total_projects}")
        print(f"  Visible with agency filter: {visible_projects}")
        print(f"  Excluded: {total_projects - visible_projects}")
        print(f"  Org-level Germany agencies: {get_org_level_germany_agencies(org)}")
