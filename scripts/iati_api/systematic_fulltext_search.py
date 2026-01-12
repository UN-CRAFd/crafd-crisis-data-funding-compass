import pandas as pd
from src.iati_api.fetch_iati_api import query_activity_narrative_fulltext
from sankey_plot import create_sankey_plot
from sankey_process_data import process_sankey_data

narrative_search = "afrobarometer"
iati_json_parsed = query_activity_narrative_fulltext(
    narrative_search, overwrite_cache=True, endpoint="transaction"
)
df = pd.DataFrame(iati_json_parsed)

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

existing_columns = [col for col in selected_columns if col in df.columns]
df_selected = df[existing_columns]
# df_selected


# Set pandas display options
pd.set_option("display.max_columns", None)
pd.set_option("display.max_rows", None)
pd.set_option("display.max_colwidth", None)

# Print the DataFrame
search_df = df[
    [
        "reporting_org_narrative",
        "title_narrative",
        "description_narrative",
        "participating_org_narrative",
    ]
]

# search_df


# Process the data for the Sankey diagram
sankey_data = process_sankey_data(iati_json_parsed)

# Create the Sankey plot
sankey_plot = create_sankey_plot(
    sankey_data, org_name=narrative_search, transaction_type="receiver"
)

# Display the Sankey plot
sankey_plot.show()
