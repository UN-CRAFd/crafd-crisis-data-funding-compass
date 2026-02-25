import csv
from pathlib import Path

import pandas as pd
from src.iati_api.fetch_iati_api import query_title_narrative_fulltext

# survey
# data
# index
# monitoring
# digital
# analytics

# information
# ICT (information and communications technology)
# IS (information systems)
# ICT4D (ICT for Development)

title_narrative_search = "OpenStreetMap"
iati_json_parsed = query_title_narrative_fulltext(
    title_narrative=title_narrative_search, overwrite_cache=False
)


df = pd.DataFrame(iati_json_parsed)
# narrative_columns = df.filter(like='narrative')

selected_columns = [
    "iati_identifier",
    "reporting_org_narrative",
    "title_narrative",
    "description_narrative",
    "participating_org_narrative",
    "activity_date_iso_date",
    "sector_narrative",
    "policy_marker_narrative",
    "recipient_country_code",
    "transaction_provider_org_narrative",
    "transaction_description_narrative",
    "transaction_receiver_org_narrative",
    "transaction_transaction_date_iso_date",
    "transaction_ref",
    "contact_info_website",
    "budget_value",
]

# Ensure the selected columns exist in the DataFrame
existing_columns = [col for col in selected_columns if col in df.columns]
df_selected = df[existing_columns]


#### Graph Network ####

orgs_df = df[["reporting_org_narrative", "participating_org_narrative"]]

# remove duplicates in cells
orgs_df = orgs_df.map(lambda x: list(set(x)) if isinstance(x, list) else x)


edge_list = []
for _, row in orgs_df.iterrows():
    reporting_orgs = row["reporting_org_narrative"]
    participating_orgs = row["participating_org_narrative"]
    if not isinstance(reporting_orgs, list) or not isinstance(participating_orgs, list):
        continue
    for a in reporting_orgs:
        for b in participating_orgs:
            if a != b:
                edge_list.append((a, b))


data_folder = Path("data")

# Ensure the output directory exists

# Save to CSV file
with open(
    data_folder / "output" / f"edge_list{title_narrative_search}.csv", "w", newline=""
) as f:
    writer = csv.writer(f)
    writer.writerow(["Source", "Target"])  # Optional header
    writer.writerows(edge_list)

# network.py

##########################

projects_df = df[
    [
        "title_narrative",
        "description_narrative",
        "reporting_org_narrative",
        "participating_org_narrative",
    ]
]
# remove duplicates in cells
projects_df = projects_df.map(lambda x: list(set(x)) if isinstance(x, list) else x)


# Search for "Afrobarometer" in description_narrative
afrobarometer_projects = projects_df[
    projects_df["description_narrative"].apply(
        lambda x: "Afrobarometer" in x if isinstance(x, list) else False
    )
]

afrobarometer_projects
