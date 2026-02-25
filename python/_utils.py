"""Shared utilities for data pipeline scripts.

This module provides common functionality used across all data fetching and processing scripts.
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import urllib.parse

import requests
from dotenv import load_dotenv


def setup_environment() -> Dict[str, Any]:
    """Load environment configuration from .env.local or .env file.
    
    Returns:
        Dict containing all configuration values
    
    Raises:
        SystemExit if required environment variables are missing
    """
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    
    # Try .env.local first, fall back to .env
    dotenv_path = project_root / ".env.local"
    if dotenv_path.exists():
        load_dotenv(dotenv_path, override=False)
    else:
        load_dotenv(project_root / ".env", override=False)
    
    return {
        "project_root": project_root,
        "api_key": os.getenv("AIRTABLE_API_KEY"),
        "base_id": os.getenv("AIRTABLE_BASE_ID"),
        "table_projects": os.getenv("AIRTABLE_TABLE_ID_PROJECTS") or os.getenv("AIRTABLE_TABLE_ID"),
        "table_organizations": os.getenv("AIRTABLE_TABLE_ID_ORGANIZATIONS"),
        "table_agencies": os.getenv("AIRTABLE_TABLED_ID_AGENCIES") or os.getenv("AIRTABLE_TABLE_ID_AGENCIES"),
        "table_themes": os.getenv("AIRTABLE_TABLE_ID_THEMES"),
        "timezone": os.getenv("AIRTABLE_TIMEZONE", "UTC"),
        "locale": os.getenv("AIRTABLE_USER_LOCALE", "en-US"),
    }


def validate_config(config: Dict[str, Any], required_keys: List[str]):
    """Validate that required configuration keys are present.
    
    Args:
        config: Configuration dictionary
        required_keys: List of required key names to check
        
    Raises:
        SystemExit if any required keys are missing
    """
    missing = [key for key in required_keys if not config.get(key)]
    if missing:
        print(f"Error: Missing required environment variables: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)


def log(script_name: str, *args):
    """Print formatted log message with script name prefix.
    
    Args:
        script_name: Name of the script (e.g., "fetch-airtable")
        *args: Arguments to print
    """
    print(f"[{script_name}]", *args)


def build_airtable_url(base_id: str, table_identifier: str, params: Optional[Dict[str, Any]] = None) -> str:
    """Build complete Airtable API URL with query parameters.
    
    Args:
        base_id: Airtable base ID
        table_identifier: Table name or ID
        params: Optional query parameters (supports lists for repeated params)
        
    Returns:
        Complete URL string
    """
    base_url = f"https://api.airtable.com/v0/{base_id}/{urllib.parse.quote(table_identifier, safe='')}"
    
    if not params:
        return base_url
    
    # Build query string, handling list values as repeated parameters
    parts = []
    for key, value in params.items():
        if value is None:
            continue
        if isinstance(value, list):
            for item in value:
                parts.append(f"{key}[]={urllib.parse.quote(str(item), safe='')}")
        else:
            parts.append(f"{key}={urllib.parse.quote(str(value), safe='')}")
    
    return base_url + ("?" + "&".join(parts) if parts else "")


def fetch_airtable_page(url: str, api_key: str) -> Dict[str, Any]:
    """Fetch a single page from Airtable API.
    
    Args:
        url: Complete API URL
        api_key: Airtable API key
        
    Returns:
        JSON response as dictionary
        
    Raises:
        RuntimeError if API request fails
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    response = requests.get(url, headers=headers, timeout=30)
    if not response.ok:
        raise RuntimeError(
            f"Airtable API error: {response.status_code} {response.reason}\n{response.text}"
        )
    
    return response.json()


def fetch_all_records(
    base_id: str,
    table_identifier: str,
    api_key: str,
    fields: Optional[List[str]] = None,
    script_name: str = "script"
) -> List[Dict[str, Any]]:
    """Fetch all records from an Airtable table with automatic pagination.
    
    Args:
        base_id: Airtable base ID
        table_identifier: Table name or ID
        api_key: Airtable API key
        fields: Optional list of field names to fetch
        script_name: Name for logging
        
    Returns:
        List of all records
    """
    all_records = []
    offset = None
    page = 0
    
    while True:
        params: Dict[str, Any] = {"pageSize": "100"}
        if fields:
            params["fields"] = fields  # type: ignore
        if offset:
            params["offset"] = offset
        
        url = build_airtable_url(base_id, table_identifier, params)
        page += 1
        
        data = fetch_airtable_page(url, api_key)
        records = data.get("records", [])
        all_records.extend(records)
        
        log(script_name, f"Fetched {len(records)} records (total {len(all_records)}) from {table_identifier} (page {page})")
        
        offset = data.get("offset")
        if not offset:
            break
    
    return all_records


def split_respecting_parentheses(text: str) -> List[str]:
    """Split string by commas/semicolons while respecting parentheses and quotes.
    
    Args:
        text: String to split
        
    Returns:
        List of split tokens
    """
    if not text:
        return []
    
    tokens = []
    current = ""
    depth = 0
    in_quotes = False
    quote_char = ""
    
    for char in text:
        # Handle quotes
        if char in ('"', "'") and not in_quotes:
            in_quotes = True
            quote_char = char
            current += char
            continue
        if char == quote_char and in_quotes:
            in_quotes = False
            quote_char = ""
            current += char
            continue
        
        # Handle parentheses
        if char == "(" and not in_quotes:
            depth += 1
            current += char
            continue
        if char == ")" and not in_quotes:
            depth = max(0, depth - 1)
            current += char
            continue
        
        # Split on comma/semicolon at depth 0
        if char in ",;" and not in_quotes and depth == 0:
            if current.strip():
                tokens.append(current.strip())
            current = ""
            continue
        
        current += char
    
    if current.strip():
        tokens.append(current.strip())
    
    # Clean quotes from tokens
    cleaned = []
    for token in tokens:
        token = token.strip()
        if (token.startswith('"') and token.endswith('"')) or \
           (token.startswith("'") and token.endswith("'")):
            token = token[1:-1].strip()
        cleaned.append(token)
    
    return cleaned


def sanitize_filename(name: str) -> str:
    """Sanitize string for use as filename.
    
    Args:
        name: Original name
        
    Returns:
        Safe filename string
    """
    # Replace invalid filename characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        name = name.replace(char, "_")
    
    # Clean up spaces and dots
    name = name.strip(". ")
    name = "_".join(name.split())
    
    return name


def detect_file_extension(content_type: str, url: str) -> str:
    """Detect file extension from content type or URL.
    
    Args:
        content_type: HTTP Content-Type header value
        url: File URL
        
    Returns:
        File extension including dot (e.g., ".png")
    """
    url_lower = url.lower()
    
    if "png" in content_type or url_lower.endswith(".png"):
        return ".png"
    elif "jpeg" in content_type or "jpg" in content_type or url_lower.endswith((".jpg", ".jpeg")):
        return ".jpg"
    elif "svg" in content_type or url_lower.endswith(".svg"):
        return ".svg"
    elif "webp" in content_type or url_lower.endswith(".webp"):
        return ".webp"
    else:
        return ".png"  # Default fallback
