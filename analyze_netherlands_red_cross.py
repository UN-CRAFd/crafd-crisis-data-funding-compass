import json

# Load the data
with open('public/data/organizations-nested.json', 'r', encoding='utf-8') as f:
    organizations = json.load(f)

# Find Netherlands Red Cross
for org in organizations:
    if org.get('name') == 'Netherlands Red Cross':
        print("=" * 100)
        print("NETHERLANDS RED CROSS - COMPLETE ANALYSIS")
        print("=" * 100)
        
        print(f"\nOrganization ID: {org.get('id')}")
        print(f"Organization Name: {org.get('name')}")
        
        print("\n--- ORG-LEVEL AGENCIES ---")
        if 'agencies' in org and org['agencies']:
            for agency in org['agencies']:
                country = agency.get('fields', {}).get('Country Name', 'Unknown')
                agency_name = agency.get('fields', {}).get('Agency/Department Name', 'Unknown')
                print(f"  • {country}: {agency_name}")
        else:
            print("  None")
        
        print("\n--- PROJECTS ---")
        for i, project in enumerate(org.get('projects', []), 1):
            project_name = project.get('fields', {}).get('Project/Product Name', 'Unknown')
            project_id = project.get('id', 'Unknown')
            
            print(f"\n{i}. {project_name}")
            print(f"   Project ID: {project_id}")
            
            # Project agencies
            print(f"   Project-level agencies:")
            if 'agencies' in project and project['agencies']:
                for agency in project['agencies']:
                    country = agency.get('fields', {}).get('Country Name', 'Unknown')
                    agency_name = agency.get('fields', {}).get('Agency/Department Name', 'Unknown')
                    print(f"      • {country}: {agency_name}")
            else:
                print(f"      None")
        
        break

# Let's also check if there are organizations with Germany at project-level but not org-level
print("\n" + "=" * 100)
print("ORGANIZATIONS WITH GERMANY AT PROJECT-LEVEL ONLY")
print("=" * 100)

for org in organizations:
    # Check org-level
    org_has_germany = False
    if 'agencies' in org and org['agencies']:
        for agency in org['agencies']:
            if agency.get('fields', {}).get('Country Name') == 'Germany':
                org_has_germany = True
                break
    
    # Check project-level
    project_has_germany = False
    germany_projects = []
    if 'projects' in org and org['projects']:
        for project in org['projects']:
            if 'agencies' in project and project['agencies']:
                for agency in project['agencies']:
                    if agency.get('fields', {}).get('Country Name') == 'Germany':
                        project_has_germany = True
                        germany_projects.append(project.get('fields', {}).get('Project/Product Name', 'Unknown'))
                        break
    
    # If Germany at project-level but NOT org-level
    if project_has_germany and not org_has_germany:
        org_name = org.get('name', 'Unknown')
        print(f"\n{org_name}")
        print(f"  Germany projects: {germany_projects}")
        print(f"  Org-level agencies:")
        if 'agencies' in org and org['agencies']:
            for agency in org['agencies']:
                country = agency.get('fields', {}).get('Country Name', 'Unknown')
                agency_name = agency.get('fields', {}).get('Agency/Department Name', 'Unknown')
                print(f"    • {country}: {agency_name}")
        else:
            print(f"    None")
