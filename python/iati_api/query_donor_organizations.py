from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests_cache
from dotenv import load_dotenv

from src.iati_api.fetch_iati_api_cached import query_iati_api_cached

load_dotenv()

## Setup API cache ##
data_folder = Path("data")
db_path = data_folder / "databases" / "api_cache.sqlite"

requests_cache.install_cache(
    cache_name=str(db_path),
    backend="sqlite",
    expire_after=timedelta(weeks=2),
)

## clear cache
# session = requests_cache.CachedSession(str(db_path))
# session.cache.clear()


ENDPOINT = "activity"

### Ref-based queries ###
ORG_REF = "NO-BRC-977538319"

query = {
    "q": f'reporting_org_ref:"{ORG_REF}" OR participating_org_ref:"{ORG_REF}" OR transaction_provider_org_ref:"{ORG_REF}"'
}


iati_json_parsed = query_iati_api_cached(query, ENDPOINT)
df_ref = pd.DataFrame(iati_json_parsed)

current_date = datetime.now().strftime("%Y%m%d")
df_ref.to_pickle(data_folder / "output" / f"{ORG_REF}_activities_{current_date}.pkl")
df_ref.to_csv(
    data_folder / "output" / f"{ORG_REF}_activities_{current_date}.csv", index=False
)


### Narrative-based queries ###

ORG_NAME = "Norad - Norwegian Agency for Development Cooperation"

query = {
    "q": f'reporting_org_narrative:"{ORG_NAME}" OR participating_org_narrative:"{ORG_NAME}" OR transaction_provider_org_narrative:"{ORG_NAME}"'
}

iati_json_narrative = query_iati_api_cached(query, ENDPOINT)
df_name = pd.DataFrame(iati_json_narrative)

# did not yield any new ones


# "Norwegian Refugee Council"

## title_narrative

# title_narrative = ORG_NAME
# query = {"q": f'title_narrative:("{title_narrative}")'}
# iati_json_parsed = query_iati_api_cached(query, ENDPOINT)


### 1. Download All Activities --------------------------------------------------------------------

# Define a dictionary of CRAF’d donor organizations and their references
# organizations = {
# "European Commission - Humanitarian Aid & Civil Protection": "XI-IATI-EC_ECHO",
# "European Commission - International Partnerships": "XI-IATI-EC_INTPA",
# "European Commission - Service for Foreign Policy Instruments": "XI-IATI-EC_FPI",
# "Finland - Ministry for Foreign Affairs": "FI-3",
# "Germany - Federal Foreign Office": "XM-DAC-5-7",
# "Germany - Ministry for Economic Cooperation and Development": "DE-1",
# "Germany GIZ Non BMZ": "XM-DAC-5-52",
# "Netherlands - Ministry of Foreign Affairs": "XM-DAC-7",
# "UK - Foreign, Commonwealth and Development Office": "GB-GOV-1",
# "United States Agency for International Development (USAID)": "US-GOV-1",
# "United States Department of State": "US-GOV-11",
# }


# def get_activities_for_org_ref(org_ref, endpoint):
#     query = {
#         "q": f'reporting_org_ref:"{org_ref}" OR participating_org_ref:"{org_ref}" OR transaction_provider_org_ref:"{org_ref}"'
#     }
#     return query_iati_api_cached(query, endpoint)

# # Batch query: Get all activities for orgs in organizations
# def get_all_activities(organizations, endpoint):
#     all_activities = {}
#     for org_name, org_ref in organizations.items():
#         print(f"Fetching activities for organization: {org_name}")
#         all_activities[org_name] = get_activities_for_org_ref(org_ref, endpoint)
#     return all_activities

# all_activities = get_all_activities(organizations, endpoint)
