# Run: python scripts/fetch-screenshots.py

import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

# Load .env.local from project root (one level up from scripts/)
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DOTENV_PATH = PROJECT_ROOT / ".env.local"
if DOTENV_PATH.exists():
    load_dotenv(DOTENV_PATH, override=False)
else:
    # fall back to default .env if present
    load_dotenv(PROJECT_ROOT / ".env", override=False)

# Configuration from env
API_KEY = os.getenv("AIRTABLE_API_KEY")
BASE_ID = os.getenv("AIRTABLE_BASE_ID")
ORGANIZATIONS_TABLE_IDENTIFIER = os.getenv("AIRTABLE_TABLE_ID_ORGANIZATIONS")

AIRTABLE_TIMEZONE = os.getenv("AIRTABLE_TIMEZONE", "UTC")
AIRTABLE_USER_LOCALE = os.getenv("AIRTABLE_USER_LOCALE", "en-US")

if not API_KEY or not BASE_ID or not ORGANIZATIONS_TABLE_IDENTIFIER:
    print(
        "Error: Ensure AIRTABLE_API_KEY, AIRTABLE_BASE_ID and AIRTABLE_TABLE_ID_ORGANIZATIONS are set in .env.local",
        file=sys.stderr,
    )
    sys.exit(1)

# Output directory for screenshots
OUTPUT_DIR = PROJECT_ROOT / "public" / "screenshots"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Fields to fetch - only Funding Screenshots and org_key for identification
FIELDS_SCREENSHOTS = [
    "Budget Source Screenshot",
    "org_key",
]


# Utilities
def log(*args):
    print("[screenshot-fetch]", *args)


HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}


def airtable_fetch(url: str) -> Dict[str, Any]:
    """Fetch data from Airtable API"""
    resp = requests.get(url, headers=HEADERS, timeout=30)
    if not resp.ok:
        raise RuntimeError(
            f"Airtable API error: {resp.status_code} {resp.reason}\n{resp.text}"
        )
    return resp.json()


def add_basic_params(params: Dict[str, str]):
    """Add basic pagination parameters"""
    params["pageSize"] = "100"


def build_table_url(
    table_identifier: str, extra_params: Optional[Dict[str, Any]] = None
) -> str:
    """Build Airtable API URL with parameters"""
    base = f"https://api.airtable.com/v0/{BASE_ID}/{requests.utils.quote(table_identifier, safe='')}"
    params = {}
    add_basic_params(params)
    if extra_params:
        for k, v in extra_params.items():
            if v is None:
                continue
            if isinstance(v, list):
                params[k] = v
            else:
                params[k] = str(v)
    
    # Build query string allowing repeated keys
    parts = []
    for k, v in params.items():
        if isinstance(v, list):
            for item in v:
                parts.append(
                    f"{requests.utils.quote(k)}={requests.utils.quote(str(item))}"
                )
        else:
            parts.append(f"{requests.utils.quote(k)}={requests.utils.quote(str(v))}")
    
    if parts:
        return base + "?" + "&".join(parts)
    else:
        return base


def fetch_airtable_table(
    table_identifier: str, extra_params: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """Fetch all records from an Airtable table with pagination"""
    all_records: List[Dict[str, Any]] = []
    offset = None
    page = 0
    while True:
        params = dict(extra_params or {})
        if offset:
            params["offset"] = offset
        url = build_table_url(table_identifier, params)
        page += 1
        data = airtable_fetch(url)
        records = data.get("records", [])
        count = len(records)
        all_records.extend(records)
        offset = data.get("offset") or None
        log(
            f"Fetched {count} records (total {len(all_records)}) from {table_identifier} (page {page})"
        )
        if not offset:
            break
        time.sleep(0.2)  # Rate limiting
    return all_records


def sanitize_filename(name: str) -> str:
    """Sanitize organization name for use as filename"""
    # Remove or replace characters that are invalid in filenames
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        name = name.replace(char, '_')
    # Remove leading/trailing spaces and dots
    name = name.strip('. ')
    # Replace multiple spaces with single underscore
    name = '_'.join(name.split())
    return name


def download_screenshot(screenshot_url: str, org_key: str, index: int) -> Optional[Path]:
    """Download a screenshot image from URL and save it"""
    try:
        response = requests.get(screenshot_url, timeout=30)
        if not response.ok:
            log(f"Failed to download screenshot for {org_key}: {response.status_code}")
            return None
        
        # Detect file extension from Content-Type or URL
        content_type = response.headers.get('content-type', '')
        if 'png' in content_type or screenshot_url.lower().endswith('.png'):
            ext = '.png'
        elif 'jpeg' in content_type or 'jpg' in content_type or screenshot_url.lower().endswith(('.jpg', '.jpeg')):
            ext = '.jpg'
        elif 'svg' in content_type or screenshot_url.lower().endswith('.svg'):
            ext = '.svg'
        elif 'webp' in content_type or screenshot_url.lower().endswith('.webp'):
            ext = '.webp'
        else:
            # Default to png
            ext = '.png'
        
        # Create filename from org_key and index (since multiple screenshots per org)
        filename = f"{org_key}_screenshot_{index}{ext}"
        filepath = OUTPUT_DIR / filename
        
        # Save the file
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        log(f"Downloaded screenshot {index} for {org_key} -> {filename}")
        return filepath
        
    except Exception as e:
        log(f"Error downloading screenshot {index} for {org_key}: {e}")
        return None


def main():
    log("Starting screenshot fetch from Airtable...")
    log(f"Output directory: {OUTPUT_DIR}")
    
    # Fetch organizations with Funding Screenshots field
    extra_params = {
        "fields[]": FIELDS_SCREENSHOTS,
    }
    
    organizations = fetch_airtable_table(ORGANIZATIONS_TABLE_IDENTIFIER, extra_params)
    
    log(f"Found {len(organizations)} organizations")
    
    downloaded_count = 0
    skipped_count = 0
    
    for org in organizations:
        fields = org.get("fields", {})
        
        # Get org_key
        org_key = fields.get("org_key")
        if not org_key:
            log(f"Skipping organization with no org_key: {org.get('id')}")
            skipped_count += 1
            continue
        
        # Get screenshot attachments
        screenshot_attachments = fields.get("Funding Screenshots", [])
        
        if not screenshot_attachments or not isinstance(screenshot_attachments, list) or len(screenshot_attachments) == 0:
            log(f"No screenshots found for: {org_key}")
            skipped_count += 1
            continue
        
        # Download all screenshot attachments
        for idx, screenshot in enumerate(screenshot_attachments):
            screenshot_url = screenshot.get("url")
            
            if not screenshot_url:
                log(f"No URL in screenshot attachment {idx} for: {org_key}")
                continue
            
            result = download_screenshot(screenshot_url, org_key, idx)
            if result:
                downloaded_count += 1
            else:
                skipped_count += 1
            
            # Small delay to be nice to servers
            time.sleep(0.1)
    
    log(f"Screenshot download complete!")
    log(f"Downloaded: {downloaded_count} screenshots")
    log(f"Skipped: {skipped_count} organizations")


if __name__ == "__main__":
    main()
