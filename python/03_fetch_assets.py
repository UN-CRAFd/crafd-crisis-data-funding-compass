#!/usr/bin/env python3
"""Download organization logos and budget screenshots from Airtable.

This script:
1. Fetches organization records with Logo and Screenshot fields
2. Downloads images from attachment URLs
3. Saves files with org_key as filename
4. Handles multiple image formats (PNG, JPG, SVG, WebP)

Usage:
    uv run python python/03_fetch_assets.py [--logos] [--screenshots]
    
Options:
    --logos: Download only logos
    --screenshots: Download only screenshots
    (default: download both)
"""

import argparse
import time
from pathlib import Path
from typing import Optional

import requests

from _utils import (
    detect_file_extension,
    fetch_all_records,
    log,
    setup_environment,
    validate_config,
)

# Field specifications
LOGO_FIELDS = ["Logo", "org_key"]
SCREENSHOT_FIELDS = ["Budget Source Screenshot", "org_key"]


def download_file(url: str, filepath: Path, script_name: str) -> bool:
    """Download file from URL and save to disk.
    
    Args:
        url: File URL
        filepath: Destination file path
        script_name: Script name for logging
        
    Returns:
        True if successful, False otherwise
    """
    try:
        response = requests.get(url, timeout=30)
        if not response.ok:
            log(script_name, f"Download failed ({response.status_code}): {url}")
            return False
        
        with open(filepath, "wb") as f:
            f.write(response.content)
        
        return True
    
    except Exception as e:
        log(script_name, f"Error downloading {url}: {e}")
        return False


def fetch_logos(config: dict, script_name: str) -> tuple:
    """Fetch and download organization logos.
    
    Args:
        config: Configuration dictionary
        script_name: Script name for logging
        
    Returns:
        Tuple of (downloaded_count, skipped_count)
    """
    log(script_name, "Fetching organization logos...")
    
    output_dir = config["project_root"] / "public" / "logos"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Fetch records
    organizations = fetch_all_records(
        config["base_id"],
        config["table_organizations"],
        config["api_key"],
        LOGO_FIELDS,
        script_name
    )
    
    downloaded = 0
    skipped = 0
    
    for org in organizations:
        fields = org.get("fields", {})
        org_key = fields.get("org_key")
        
        if not org_key:
            skipped += 1
            continue
        
        # Get logo attachments
        logos = fields.get("Logo", [])
        if not logos or not isinstance(logos, list) or len(logos) == 0:
            skipped += 1
            continue
        
        # Download first logo
        first_logo = logos[0]
        logo_url = first_logo.get("url")
        
        if not logo_url:
            skipped += 1
            continue
        
        # Detect extension and build filename
        content_type = first_logo.get("type", "")
        extension = detect_file_extension(content_type, logo_url)
        filename = f"{org_key}{extension}"
        filepath = output_dir / filename
        
        # Download
        if download_file(logo_url, filepath, script_name):
            log(script_name, f"Downloaded logo: {filename}")
            downloaded += 1
        else:
            skipped += 1
        
        time.sleep(0.1)  # Rate limiting
    
    return downloaded, skipped


def fetch_screenshots(config: dict, script_name: str) -> tuple:
    """Fetch and download budget source screenshots.
    
    Args:
        config: Configuration dictionary
        script_name: Script name for logging
        
    Returns:
        Tuple of (downloaded_count, skipped_count)
    """
    log(script_name, "Fetching budget screenshots...")
    
    output_dir = config["project_root"] / "public" / "screenshots"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Fetch records
    organizations = fetch_all_records(
        config["base_id"],
        config["table_organizations"],
        config["api_key"],
        SCREENSHOT_FIELDS,
        script_name
    )
    
    downloaded = 0
    skipped = 0
    
    for org in organizations:
        fields = org.get("fields", {})
        org_key = fields.get("org_key")
        
        if not org_key:
            skipped += 1
            continue
        
        # Get screenshot attachments
        screenshots = fields.get("Budget Source Screenshot", [])
        if not screenshots or not isinstance(screenshots, list) or len(screenshots) == 0:
            skipped += 1
            continue
        
        # Download all screenshots (though typically just one)
        for idx, screenshot in enumerate(screenshots):
            screenshot_url = screenshot.get("url")
            
            if not screenshot_url:
                continue
            
            # Detect extension and build filename
            content_type = screenshot.get("type", "")
            extension = detect_file_extension(content_type, screenshot_url)
            filename = f"{org_key}{extension}"
            filepath = output_dir / filename
            
            # Download
            if download_file(screenshot_url, filepath, script_name):
                log(script_name, f"Downloaded screenshot: {filename}")
                downloaded += 1
            else:
                skipped += 1
            
            time.sleep(0.1)  # Rate limiting
    
    return downloaded, skipped


def main():
    """Main execution function."""
    script_name = "03_fetch_assets"
    
    # Parse arguments
    parser = argparse.ArgumentParser(description="Download organization logos and screenshots")
    parser.add_argument("--logos", action="store_true", help="Download only logos")
    parser.add_argument("--screenshots", action="store_true", help="Download only screenshots")
    args = parser.parse_args()
    
    # If neither flag specified, download both
    fetch_both = not args.logos and not args.screenshots
    
    try:
        log(script_name, "Starting asset download...")
        
        # Load configuration
        config = setup_environment()
        validate_config(config, ["api_key", "base_id", "table_organizations"])
        
        total_downloaded = 0
        total_skipped = 0
        
        # Fetch logos
        if args.logos or fetch_both:
            logo_downloaded, logo_skipped = fetch_logos(config, script_name)
            total_downloaded += logo_downloaded
            total_skipped += logo_skipped
            log(script_name, f"Logos: {logo_downloaded} downloaded, {logo_skipped} skipped")
        
        # Fetch screenshots
        if args.screenshots or fetch_both:
            screen_downloaded, screen_skipped = fetch_screenshots(config, script_name)
            total_downloaded += screen_downloaded
            total_skipped += screen_skipped
            log(script_name, f"Screenshots: {screen_downloaded} downloaded, {screen_skipped} skipped")
        
        # Summary
        log(script_name, "DOWNLOAD SUMMARY:")
        log(script_name, f"  Total downloaded: {total_downloaded}")
        log(script_name, f"  Total skipped: {total_skipped}")
        log(script_name, "Done")
        
    except Exception as err:
        log(script_name, f"Script failed: {err}")
        import sys
        sys.exit(1)


if __name__ == "__main__":
    main()
