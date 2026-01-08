#!/usr/bin/env python3
"""Clean member states data by filtering current members.

This script:
1. Reads member-states.csv
2. Filters rows where 'End date' is empty (current members)
3. Adds USA to the list
4. Saves to current_member_states.csv

Usage:
    python scripts/04_clean_member_states.py
"""

from pathlib import Path

import pandas as pd


def main():
    """Main execution function."""
    script_name = "04_clean_member_states"
    
    # Setup paths
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    input_csv = project_root / "public" / "data" / "member-states.csv"
    output_csv = project_root / "public" / "data" / "current_member_states.csv"
    
    print(f"[{script_name}] Cleaning member states data...")
    
    # Validate input exists
    if not input_csv.exists():
        raise FileNotFoundError(f"Input file not found: {input_csv}")
    
    # Read CSV
    df = pd.read_csv(input_csv)
    print(f"[{script_name}] Loaded {len(df)} total member states")
    
    # Filter current members (End date is NaN/empty)
    df_current = df[df["End date"].isna()]
    member_list = df_current["Member State"].tolist()
    
    # Add USA
    member_list.append("USA")
    
    print(f"[{script_name}] Found {len(member_list)} current member states")
    
    # Create output dataframe
    out_df = pd.DataFrame({"Member State": member_list})
    
    # Save to CSV
    out_df.to_csv(output_csv, index=False)
    
    print(f"[{script_name}] Saved to {output_csv}")
    print(f"[{script_name}] Done")


if __name__ == "__main__":
    main()
