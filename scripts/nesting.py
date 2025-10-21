#!/usr/bin/env python3
"""Build comprehensive nested organizations table by merging agencies and ecosystem projects.

Reads:
- public/data/organizations-table.json
- public/data/agencies-table.json  
- public/data/ecosystem-table.json

Produces:
- public/data/organizations-nested.json (comprehensive nested structure)
- public/data/organizations-with-agencies-and-projects.json (alternative format)

"""
import json
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / 'public' / 'data'

def load_json(name: str) -> List[Dict[str, Any]]:
    path = DATA_DIR / name
    if not path.exists():
        print(f"Missing {path}; returning empty list")
        return []
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def split_respecting_parentheses(s: str) -> List[str]:
    """Split string by commas and semicolons while respecting parentheses."""
    if not s:
        return []
    
    tokens = []
    current_token = ""
    paren_depth = 0
    
    for char in s:
        if char == '(':
            paren_depth += 1
            current_token += char
        elif char == ')':
            paren_depth -= 1
            current_token += char
        elif char in ',;' and paren_depth == 0:
            if current_token.strip():
                tokens.append(current_token.strip())
            current_token = ""
        else:
            current_token += char
    
    if current_token.strip():
        tokens.append(current_token.strip())
    
    return tokens

def match_agencies_to_organization(org_fields: Dict[str, Any], agencies_by_name: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """Match agencies to an organization using the Org Donor Agencies field."""
    matched_agencies = []
    
    # Check various agency field names
    agency_field_candidates = [
        'Org Donor Agencies', 
        'Org Donor Agencies (Linked)', 
        'Donor Agencies',
        'Project Donor Agencies'
    ]
    
    donor_agencies_raw = None
    for field_name in agency_field_candidates:
        if field_name in org_fields:
            donor_agencies_raw = org_fields[field_name]
            break
    
    if not donor_agencies_raw:
        return matched_agencies
    
    # Handle both string and list formats
    agency_tokens = []
    if isinstance(donor_agencies_raw, str) and donor_agencies_raw.strip():
        agency_tokens = split_respecting_parentheses(donor_agencies_raw)
    elif isinstance(donor_agencies_raw, list):
        for item in donor_agencies_raw:
            if isinstance(item, str) and item.strip():
                agency_tokens.extend(split_respecting_parentheses(item))
    
    # Match tokens to agencies
    for token in agency_tokens:
        normalized_token = token.strip().lower()
        if normalized_token in agencies_by_name:
            matched_agencies.extend(agencies_by_name[normalized_token])
    
    return matched_agencies

def match_projects_to_organization(org_name: str, org_id: str, projects_by_org: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """Match projects to an organization by provider org name."""
    matched_projects = []
    
    # Try exact org name match first
    if org_name and org_name in projects_by_org:
        matched_projects.extend(projects_by_org[org_name])
    
    # Try org id as fallback
    if org_id and org_id in projects_by_org:
        matched_projects.extend(projects_by_org[org_id])
    
    # Try partial matching for variations
    if org_name:
        org_name_lower = org_name.lower()
        for proj_org_key, projects in projects_by_org.items():
            if proj_org_key.lower() == org_name_lower:
                matched_projects.extend(projects)
                break
    
    # Remove duplicates while preserving order
    seen_ids = set()
    unique_projects = []
    for proj in matched_projects:
        proj_id = proj.get('id')
        if proj_id not in seen_ids:
            seen_ids.add(proj_id)
            unique_projects.append(proj)
    
    return unique_projects
    out = []
    cur = ''
    depth = 0
    in_quotes = False
    quote_char = ''
    for ch in s:
        if (ch == '"' or ch == "'") and not in_quotes:
            in_quotes = True
            quote_char = ch
            cur += ch
            continue
        if ch == quote_char and in_quotes:
            in_quotes = False
            quote_char = ''
            cur += ch
            continue
        if ch == '(' and not in_quotes:
            depth += 1
            cur += ch
            continue
        if ch == ')' and not in_quotes:
            depth = max(0, depth - 1)
            cur += ch
            continue
        if ch == ',' and not in_quotes and depth == 0:
            if cur.strip():
                out.append(cur.strip())
            cur = ''
            continue
        cur += ch
    if cur.strip():
        out.append(cur.strip())
    # clean quotes
    cleaned = []
    for item in out:
        it = item.strip()
        if (it.startswith('"') and it.endswith('"')) or (it.startswith("'") and it.endswith("'")):
            it = it[1:-1].strip()
        cleaned.append(it)
    return cleaned

def main():
    orgs = load_json('organizations-table.json')
    agencies = load_json('agencies-table.json')
    projects = load_json('ecosystem-table.json')

    # Index agencies by name or id for quick lookup
    agencies_by_org: Dict[str, List[Dict[str, Any]]] = {}
    agencies_by_name: Dict[str, List[Dict[str, Any]]] = {}
    # Build both indices: by owner field and by agency name tokens
    name_keys = ('Name', 'Agency Name', 'Org Full Name', 'Org Short Name', 'Provider Orgs Full Name', 'Title')
    for a in agencies:
        fields = a.get('fields', {}) or {}
        # try owner-like fields
        owner = None
        for key in ('Organization', 'Org Full Name', 'Provided By', 'Provider Orgs Full Name'):
            val = fields.get(key)
            if isinstance(val, str) and val.strip():
                owner = val.strip()
                break
        if not owner:
            owner = fields.get('Org Full Name') or fields.get('Organization Name') or None
        if owner:
            agencies_by_org.setdefault(str(owner), []).append(a)
        else:
            agencies_by_org.setdefault(str(a.get('id')), []).append(a)

        # index by potential agency name values
        found_name = None
        for k in name_keys:
            v = fields.get(k)
            if isinstance(v, str) and v.strip():
                found_name = v.strip()
                break
        if not found_name:
            # try id
            found_name = a.get('id')
        normalized = str(found_name).strip().lower()
        agencies_by_name.setdefault(normalized, []).append(a)

    # Index projects by provider org (may be record IDs or names)
    projects_by_org: Dict[str, List[Dict[str, Any]]] = {}
    for p in projects:
        fields = p.get('fields', {}) or {}
        prov = fields.get('Provider Orgs Full Name') or fields.get('Provider Org') or fields.get('Organization')
        
        if isinstance(prov, str) and prov.strip():
            # Handle string format (could be names or IDs)
            if prov.startswith('[') and prov.endswith(']'):
                # Parse as JSON array of record IDs
                try:
                    import ast
                    provider_ids = ast.literal_eval(prov)
                    if isinstance(provider_ids, list):
                        for provider_id in provider_ids:
                            if isinstance(provider_id, str):
                                projects_by_org.setdefault(provider_id.strip(), []).append(p)
                except:
                    # If parsing fails, treat as plain string
                    parts = split_respecting_parentheses(prov)
                    for part in parts:
                        projects_by_org.setdefault(part.strip(), []).append(p)
            else:
                # Handle as comma-separated names
                parts = split_respecting_parentheses(prov)
                for part in parts:
                    projects_by_org.setdefault(part.strip(), []).append(p)
        elif isinstance(prov, list):
            # Handle list format (already parsed record IDs)
            for provider_id in prov:
                if isinstance(provider_id, str):
                    projects_by_org.setdefault(provider_id.strip(), []).append(p)
        else:
            projects_by_org.setdefault(str(p.get('id')), []).append(p)

    # Create an index of agencies by ID for project nesting
    agencies_by_id: Dict[str, Dict[str, Any]] = {}
    for agency in agencies:
        agencies_by_id[agency.get('id', '')] = agency

    nested = []
    for o in orgs:
        ofields = o.get('fields', {}) or {}
        org_name = ofields.get('Org Full Name') or ofields.get('Org Short Name') or ofields.get('Organization') or o.get('id')
        
        # attach agencies matching by Org Donor Agencies mapping first
        donor_agencies_raw = ofields.get('Org Donor Agencies') or ofields.get('Org Donor Agencies (Linked)') or ofields.get('Org Donor Agencies (from Agency)')
        attached_agencies: List[Dict[str, Any]] = []
        if isinstance(donor_agencies_raw, str) and donor_agencies_raw.strip():
            tokens = split_respecting_parentheses(donor_agencies_raw)
            for t in tokens:
                key = t.strip().lower()
                if key in agencies_by_name:
                    attached_agencies.extend(agencies_by_name[key])
        elif isinstance(donor_agencies_raw, list):
            for item in donor_agencies_raw:
                if isinstance(item, str):
                    key = item.strip().lower()
                    if key in agencies_by_name:
                        attached_agencies.extend(agencies_by_name[key])

        # fallback: attach by agencies_by_org lookups
        if not attached_agencies:
            org_id_str = str(o.get('id', '')) if o.get('id') else ''
            attached_agencies = agencies_by_org.get(org_name or '') or agencies_by_org.get(org_id_str) or []

        # Extract donor countries from "Country Name" field only
        donor_countries = set()
        for agency in attached_agencies:
            agency_fields = agency.get('fields', {})
            
            # Only use "Country Name" field
            country_data = agency_fields.get('Country Name')
            if country_data:
                if isinstance(country_data, list):
                    for item in country_data:
                        if isinstance(item, str) and item.strip():
                            donor_countries.add(item.strip())
                elif isinstance(country_data, str) and country_data.strip():
                    donor_countries.add(country_data.strip())

        # attach projects and nest agencies into each project
        org_id_str = str(o.get('id', '')) if o.get('id') else ''
        projs = projects_by_org.get(org_name or '') or projects_by_org.get(org_id_str) or []
        
        # For each project, add nested agencies based on "Project Donor Agencies"
        enhanced_projects = []
        for proj in projs:
            proj_copy = proj.copy()
            proj_fields = proj_copy.get('fields', {})
            
            # Get project donor agencies
            project_donor_agencies = proj_fields.get('Project Donor Agencies', [])
            project_agencies = []
            
            if isinstance(project_donor_agencies, list):
                for agency_id in project_donor_agencies:
                    if isinstance(agency_id, str) and agency_id in agencies_by_id:
                        project_agencies.append(agencies_by_id[agency_id])
            elif isinstance(project_donor_agencies, str):
                # Handle string case - might be comma-separated IDs
                agency_ids = [aid.strip() for aid in project_donor_agencies.split(',')]
                for agency_id in agency_ids:
                    if agency_id in agencies_by_id:
                        project_agencies.append(agencies_by_id[agency_id])
            
            # Add nested agencies to project
            proj_copy['agencies'] = project_agencies
            enhanced_projects.append(proj_copy)

        # Build org entry with new donor_countries field
        entry = {
            'id': o.get('id'),
            'name': org_name,
            'fields': ofields,
            'agencies': attached_agencies,
            'projects': enhanced_projects,
            'donor_countries': sorted(list(donor_countries))  # New field with deduplicated country names
        }

        nested.append(entry)

    out_path = DATA_DIR / 'organizations-nested.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(nested, f, indent=2, ensure_ascii=False)

    print(f'Wrote nested organizations to {out_path} (orgs={len(nested)})')

if __name__ == '__main__':
    main()
