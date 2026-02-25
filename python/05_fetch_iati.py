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

RATE_LIMIT_DELAY = 0.5  # 500ms between requests (safer to avoid 429 errors)


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
    use_cache: bool = True,
    max_records: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Query IATI API with pagination and caching.
    
    Args:
        query: Query parameters for the API
        endpoint: API endpoint (activity, transaction, or budget)
        api_key: IATI API key
        use_cache: Whether to use cached results
        max_records: Maximum number of records to fetch (None for all)
        
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
    
    # Request only the fields we actually need based on endpoint
    if endpoint == "activity":
        query["fl"] = ",".join([
            "iati_identifier",
            "title_narrative",
            "description_narrative",
            "activity_status_code",
            "activity_date_iso_date",
            "activity_date_type",
            "sector_code",
            "sector_narrative",
            "recipient_country_code",
            "recipient_country_narrative",
            "budget_value",
            "transaction_value",
            "reporting_org_ref",
            "reporting_org_narrative"
        ])
    elif endpoint == "transaction":
        query["fl"] = ",".join([
            "iati_identifier",
            "transaction_type_code",
            "transaction_date_iso_date",
            "transaction_value",
            "transaction_value_currency"
        ])
    else:
        query["fl"] = "*"  # fallback
    
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
                    
                    # Check if we've hit the max_records limit
                    if max_records and len(all_docs) >= max_records:
                        print(f"    Reached max_records limit ({max_records})")
                        all_docs = all_docs[:max_records]
                        break
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
        Dictionary containing activities, transactions, and summary statistics
    """
    print(f"Fetching IATI data for: {org_name} ({org_ref})")
    
    # Query for activities where the org is reporting or participating
    # Limit to 100 activities max, we'll filter to the 50 most relevant
    activity_query = {
        "q": f'reporting_org_ref:"{org_ref}" OR participating_org_ref:"{org_ref}"'
    }
    
    activities = query_iati_api(activity_query, "activity", api_key, max_records=100)
    
    # Limit activities to most recent/relevant 50 to reduce data size
    # Sort by presence of budget value (funded projects first) and limit
    activities_with_budget = [a for a in activities if a.get("budget_value")]
    activities_without_budget = [a for a in activities if not a.get("budget_value")]
    limited_activities = (activities_with_budget[:30] + activities_without_budget[:20])[:50]
    
    # Query transactions where this org is provider or receiver
    # Limit to 5000 transactions max to avoid overwhelming the API and data storage
    transaction_query = {
        "q": f'transaction_provider_org_ref:"{org_ref}" OR transaction_receiver_org_ref:"{org_ref}"'
    }
    
    transactions = query_iati_api(transaction_query, "transaction", api_key, max_records=5000)
    
    # Aggregate transaction data instead of storing all raw transactions
    transaction_summary = aggregate_transactions(transactions)
    
    # Aggregate activity data
    activity_summary = aggregate_activities(limited_activities)
    
    return {
        "org_ref": org_ref,
        "org_name": org_name,
        "activities": limited_activities,  # Limited to 50 most relevant
        "transaction_summary": transaction_summary,  # Aggregated, not raw
        "activity_summary": activity_summary,
        "stats": {
            "total_activities": len(activities),  # Total found
            "stored_activities": len(limited_activities),  # Actually stored
            "total_transactions": len(transactions)
        }
    }


def aggregate_transactions(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate transaction data into summary statistics.
    
    Args:
        transactions: List of transaction records
        
    Returns:
        Dictionary with aggregated transaction statistics
    """
    if not transactions:
        return {
            "total_value": 0,
            "by_type": {},
            "by_currency": {},
            "by_year": {},
            "count": 0
        }
    
    by_type: Dict[str, Dict[str, Any]] = {}
    by_currency: Dict[str, float] = {}
    by_year: Dict[str, float] = {}
    total_value = 0.0
    
    for txn in transactions:
        # Aggregate by type
        txn_type = txn.get("transaction_type_code", "unknown")
        
        # Handle transaction_value which could be int, float, or list
        raw_value = txn.get("transaction_value", 0)
        if isinstance(raw_value, list):
            txn_value = raw_value[0] if raw_value else 0
        else:
            txn_value = raw_value or 0
        
        # Handle transaction_currency which could be string or list
        raw_currency = txn.get("transaction_value_currency", "USD")
        if isinstance(raw_currency, list):
            txn_currency = raw_currency[0] if raw_currency else "USD"
        else:
            txn_currency = raw_currency or "USD"
        
        if txn_type not in by_type:
            by_type[txn_type] = {"count": 0, "total_value": 0}
        by_type[txn_type]["count"] += 1
        by_type[txn_type]["total_value"] += txn_value
        
        # Aggregate by currency
        if txn_currency not in by_currency:
            by_currency[txn_currency] = 0
        by_currency[txn_currency] += txn_value
        
        # Aggregate by year
        raw_date = txn.get("transaction_date_iso_date", "")
        if isinstance(raw_date, list):
            txn_date = raw_date[0] if raw_date else ""
        else:
            txn_date = raw_date or ""
            
        if txn_date and len(txn_date) >= 4:
            year = txn_date[:4]
            if year not in by_year:
                by_year[year] = 0
            by_year[year] += txn_value
        
        total_value += txn_value
    
    return {
        "total_value": total_value,
        "by_type": by_type,
        "by_currency": by_currency,
        "by_year": by_year,
        "count": len(transactions)
    }


def aggregate_activities(activities: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate activity data into summary statistics.
    
    Args:
        activities: List of activity records
        
    Returns:
        Dictionary with aggregated activity statistics
    """
    if not activities:
        return {
            "total_budget": 0,
            "by_status": {},
            "by_sector": {},
            "by_country": {},
            "count": 0
        }
    
    by_status: Dict[str, int] = {}
    by_sector: Dict[str, int] = {}
    by_country: Dict[str, int] = {}
    total_budget = 0.0
    
    for activity in activities:
        # Aggregate by status
        status = activity.get("activity_status_code", "unknown")
        by_status[status] = by_status.get(status, 0) + 1
        
        # Aggregate budget
        budget = activity.get("budget_value")
        if budget:
            if isinstance(budget, list):
                total_budget += sum(budget)
            else:
                total_budget += budget
        
        # Aggregate by sector
        sectors = activity.get("sector_narrative", [])
        if sectors:
            if not isinstance(sectors, list):
                sectors = [sectors]
            for sector in sectors[:3]:  # Top 3 sectors per activity
                by_sector[sector] = by_sector.get(sector, 0) + 1
        
        # Aggregate by country
        countries = activity.get("recipient_country_code", [])
        if countries:
            if not isinstance(countries, list):
                countries = [countries]
            for country in countries[:3]:  # Top 3 countries per activity
                by_country[country] = by_country.get(country, 0) + 1
    
    # Sort and limit sectors/countries to top 10
    top_sectors = dict(sorted(by_sector.items(), key=lambda x: x[1], reverse=True)[:10])
    top_countries = dict(sorted(by_country.items(), key=lambda x: x[1], reverse=True)[:10])
    
    return {
        "total_budget": total_budget,
        "by_status": by_status,
        "by_sector": top_sectors,
        "by_country": top_countries,
        "count": len(activities)
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
    stored_activities = sum(org["stats"]["stored_activities"] for org in iati_data.values())
    total_transactions = sum(org["stats"]["total_transactions"] for org in iati_data.values())
    
    print(f"\n{'=' * 80}")
    print("SUMMARY")
    print(f"{'=' * 80}")
    print(f"Organizations processed: {len(iati_data)}")
    print(f"Total activities found: {total_activities}")
    print(f"Activities stored (limited): {stored_activities}")
    print(f"Total transactions (summarized): {total_transactions}")
    print(f"{'=' * 80}")
    
    print("\n✓ IATI data fetch completed successfully!")


if __name__ == "__main__":
    main()
