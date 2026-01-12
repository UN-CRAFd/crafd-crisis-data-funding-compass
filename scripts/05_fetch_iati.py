"""
Fetch IATI (International Aid Transparency Initiative) data for organizations.

This script:
- Reads organizations from organizations-table.json
- For each organization with an IATI Org Key, fetches their activities/projects
- Saves IATI data to public/data/iati-data.json
- Uses caching to avoid redundant API calls

IATI API Limits:
- Rate Limit: 5 API requests/1 second
- Quota: 25,000 API requests/1 day
- Only successful HTTP response codes (200-399) count toward quota
"""

import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

from _utils import setup_environment, validate_config

# Configuration
CACHE_DIR = Path(__file__).parent / "cache" / "iati"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

RATE_LIMIT_DELAY = 0.25  # 250ms between requests (safer than 200ms for 5/second limit)


def load_iati_api_key() -> str:
    """Load IATI API key from environment.
    
    Returns:
        IATI API key
        
    Raises:
        SystemExit if API key is missing
    """
    load_dotenv(Path(__file__).parent.parent / ".env.local", override=False)
    api_key = os.getenv("IATI_PRIMARY_KEY")
    
    if not api_key:
        print("ERROR: IATI_PRIMARY_KEY not found in .env.local")
        print("Please add: IATI_PRIMARY_KEY=your_api_key")
        print("Get your key from: https://developer.iatistandard.org/")
        raise SystemExit(1)
    
    return api_key


def query_iati_api(
    query: Dict[str, Any],
    endpoint: str,
    api_key: str,
    use_cache: bool = True
) -> List[Dict[str, Any]]:
    """Query IATI API with pagination and caching.
    
    Args:
        query: Query parameters for the API
        endpoint: API endpoint (activity, transaction, or budget)
        api_key: IATI API key
        use_cache: Whether to use cached results
        
    Returns:
        List of documents from the API
    """
    valid_endpoints = ["activity", "transaction", "budget"]
    if endpoint not in valid_endpoints:
        raise ValueError(f"Invalid endpoint. Must be one of {valid_endpoints}.")
    
    # Create cache filename based on query and endpoint
    cache_key = f"{endpoint}_{hash(str(sorted(query.items())))}.json"
    cache_file = CACHE_DIR / cache_key
    
    # Try to load from cache
    if use_cache and cache_file.exists():
        print(f"  Loading from cache: {cache_key}")
        with open(cache_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    # Query the API
    base_url = f"https://api.iatistandard.org/datastore/{endpoint}/select"
    headers = {"Ocp-Apim-Subscription-Key": api_key}
    all_docs = []
    
    query["start"] = 0
    query["rows"] = 1000  # max rows per request
    query["fl"] = "*"  # all fields
    
    try:
        print(f"  Querying IATI API: {endpoint}")
        page = 0
        
        while True:
            time.sleep(RATE_LIMIT_DELAY)  # Rate limiting
            response = requests.get(base_url, params=query, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if page == 0:
                    num_found = data.get("response", {}).get("numFound", 0)
                    print(f"    Found {num_found} total records")
                
                docs = data.get("response", {}).get("docs", [])
                if docs:
                    all_docs.extend(docs)
                    query["start"] += len(docs)
                    page += 1
                    if page % 5 == 0:
                        print(f"    Downloaded {len(all_docs)} records...")
                else:
                    break
            else:
                print(f"  ERROR: {response.status_code} - {response.reason}")
                break
                
        print(f"    Completed: {len(all_docs)} records downloaded")
        
        # Save to cache
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(all_docs, f, ensure_ascii=False, indent=2)
        
        return all_docs
        
    except requests.exceptions.RequestException as e:
        print(f"  ERROR: {e}")
        return []


def fetch_iati_activities_for_org(
    org_ref: str,
    org_name: str,
    api_key: str
) -> Dict[str, Any]:
    """Fetch IATI activities for a single organization.
    
    Args:
        org_ref: Organization reference/identifier in IATI
        org_name: Organization name (for display)
        api_key: IATI API key
        
    Returns:
        Dictionary containing activities, transactions, and budgets
    """
    print(f"Fetching IATI data for: {org_name} ({org_ref})")
    
    # Query for activities where the org is reporting, participating, or providing transactions
    activity_query = {
        "q": f'reporting_org_ref:"{org_ref}" OR participating_org_ref:"{org_ref}"'
    }
    
    activities = query_iati_api(activity_query, "activity", api_key)
    
    # Also query transactions where this org is provider or receiver
    transaction_query = {
        "q": f'transaction_provider_org_ref:"{org_ref}" OR transaction_receiver_org_ref:"{org_ref}"'
    }
    
    transactions = query_iati_api(transaction_query, "transaction", api_key)
    
    return {
        "org_ref": org_ref,
        "org_name": org_name,
        "activities": activities,
        "transactions": transactions,
        "stats": {
            "total_activities": len(activities),
            "total_transactions": len(transactions)
        }
    }


def main():
    """Main execution function."""
    print("=" * 80)
    print("IATI Data Fetching Script")
    print("=" * 80)
    
    # Setup
    config = setup_environment()
    api_key = load_iati_api_key()
    
    # Load organizations
    orgs_file = config["project_root"] / "public" / "data" / "organizations-table.json"
    if not orgs_file.exists():
        print(f"ERROR: Organizations file not found: {orgs_file}")
        print("Please run 01_fetch_airtable.py first")
        raise SystemExit(1)
    
    with open(orgs_file, 'r', encoding='utf-8') as f:
        organizations = json.load(f)
    
    print(f"\nLoaded {len(organizations)} organizations")
    
    # Filter organizations with IATI Org Key
    orgs_with_iati = [
        org for org in organizations
        if org.get("fields", {}).get("IATI Org Key")
    ]
    
    print(f"Found {len(orgs_with_iati)} organizations with IATI Org Keys")
    
    if not orgs_with_iati:
        print("\nNo organizations with IATI keys found. Nothing to fetch.")
        return
    
    # Fetch IATI data for each organization
    iati_data = {}
    
    for i, org in enumerate(orgs_with_iati, 1):
        org_key = org["fields"].get("org_key", org["id"])
        iati_org_ref = org["fields"]["IATI Org Key"]
        org_name = org["fields"].get("Org Full Name", org["fields"].get("Org Short Name", "Unknown"))
        
        print(f"\n[{i}/{len(orgs_with_iati)}] Processing: {org_name}")
        
        org_data = fetch_iati_activities_for_org(iati_org_ref, org_name, api_key)
        iati_data[org_key] = org_data
    
    # Save results
    output_file = config["project_root"] / "public" / "data" / "iati-data.json"
    
    print(f"\n{'=' * 80}")
    print("Saving IATI data...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(iati_data, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Saved IATI data to: {output_file}")
    
    # Print summary
    total_activities = sum(org["stats"]["total_activities"] for org in iati_data.values())
    total_transactions = sum(org["stats"]["total_transactions"] for org in iati_data.values())
    
    print(f"\n{'=' * 80}")
    print("SUMMARY")
    print(f"{'=' * 80}")
    print(f"Organizations processed: {len(iati_data)}")
    print(f"Total activities: {total_activities}")
    print(f"Total transactions: {total_transactions}")
    print(f"{'=' * 80}")
    
    print("\n✓ IATI data fetch completed successfully!")


if __name__ == "__main__":
    main()
