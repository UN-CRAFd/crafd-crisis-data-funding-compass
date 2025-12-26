from pathlib import Path
import pandas as pd


def main():
    # Resolve repo-root-relative paths reliably (works on Windows and UNIX)
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent

    input_csv = repo_root / "public" / "data" / "member-states.csv"
    output_csv = repo_root / "public" / "data" / "current_member_states.csv"

    if not input_csv.exists():
        raise FileNotFoundError(f"Member states CSV not found at {input_csv}")

    df = pd.read_csv(input_csv)

    # Select rows where 'End date' is NaN/empty and extract Member State names
    df_current = df[df["End date"].isna()]
    member_list = df_current["Member State"].tolist()
    member_list.append("USA")

    # Write a simple CSV with the current member states
    out_df = pd.DataFrame({"Member State": member_list})

    out_df.to_csv(output_csv, index=False)

    # Add USA to the list of current member states


if __name__ == "__main__":
    main()
