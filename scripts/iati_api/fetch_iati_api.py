"""
Full access to all Public IATI APIs with the following limits:

Rate Limit: 5 API requests/1 second
Quota: 25,000 API requests/1 day
Only successful HTTP response codes (200 - 399) are counted towards the quota.
"""

import json
import os
import time

import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("IATI_PRIMARY_KEY")


def _query_iati_api(query, endpoint):
    valid_endpoints = ["activity", "transaction", "budget"]
    if endpoint in valid_endpoints:
        base_url = f"https://api.iatistandard.org/datastore/{endpoint}/select"
    else:
        raise ValueError(f"Invalid query type. Must be one of {valid_endpoints}.")

    headers = {"Ocp-Apim-Subscription-Key": API_KEY}
    all_docs = []
    page = 0

    query["start"] = 0
    query["rows"] = 1000  # max rows
    query["fl"] = "*"  # all fields

    try:
        while True:
            response = requests.get(base_url, params=query, headers=headers)

            if response.status_code == 200:
                data = response.json()

                if page == 0:
                    num_found = data.get("response", {}).get("numFound", 0)
                    print(f"Found a total of {num_found} records.")
                    print("Downloading...")

                docs = data.get("response", {}).get("docs", [])
                if docs:
                    all_docs.extend(docs)
                    query["start"] += len(docs)
                    page += 1
                    time.sleep(0.2)  # rate throttling
                else:
                    break
            else:
                print(f"Error: {response.status_code} - {response.reason}")
                break
    except requests.exceptions.RequestException as e:
        print("Error:", e)

    print(f"Total of {data.get('response', {}).get('numFound')} results downloaded.")
    return all_docs


def query_transaction_receiver_org_fixed(
    transaction_receiver_org_ref: str,
    transaction_receiver_org_narrative: str,
    overwrite_cache=False,
):
    output_file = os.path.join(
        os.path.dirname(__file__),
        "..",
        "data",
        "output",
        "json",
        "transaction",
        "receiver",
        "fixed",
        f"transactions_to_{transaction_receiver_org_ref}.json",
    )

    if os.path.exists(output_file) and not overwrite_cache:
        print(
            f"Receiver data for '{transaction_receiver_org_narrative}' already exists. Loading from cache."
        )
        with open(output_file, mode="r", encoding="utf-8") as file:
            all_docs = json.load(file)
        print(f"Loaded {len(all_docs)} records from cache.")
        return all_docs

    else:
        print(f"Querrying receiver data for '{transaction_receiver_org_narrative}'.")

        query = {
            "q": f'transaction_receiver_org_ref:("{transaction_receiver_org_ref}") OR transaction_receiver_org_narrative:("{transaction_receiver_org_narrative}")'
        }
        all_docs = _query_iati_api(query, "transaction")

        with open(output_file, mode="w", encoding="utf-8") as file:
            json.dump(all_docs, file, ensure_ascii=False, indent=4)

    return all_docs


def query_transaction_receiver_org_fulltext(
    transaction_receiver_org_narrative: str,
    overwrite_cache=False,
):
    output_file = os.path.join(
        os.path.dirname(__file__),
        "..",
        "data",
        "output",
        "json",
        "transaction",
        "receiver",
        "fulltext",
        f"transactions_to_{transaction_receiver_org_narrative}.json",
    )

    if os.path.exists(output_file) and not overwrite_cache:
        print(
            f"Receiver data for '{transaction_receiver_org_narrative}' already exists. Loading from cache."
        )
        with open(output_file, mode="r", encoding="utf-8") as file:
            all_docs = json.load(file)
        print(f"Loaded {len(all_docs)} records from cache.")
        return all_docs

    else:
        print(
            f"Querrying receiver data for text '{transaction_receiver_org_narrative}'."
        )

        query = {
            "q": f'transaction_receiver_org_narrative:("{transaction_receiver_org_narrative}")'
        }
        all_docs = _query_iati_api(query, "transaction")

        with open(output_file, mode="w", encoding="utf-8") as file:
            json.dump(all_docs, file, ensure_ascii=False, indent=4)

    return all_docs


###################################################################################


def query_transaction_provider_org_fixed(
    transaction_provider_org_ref: str,
    transaction_provider_org_narrative: str,
    overwrite_cache=False,
):
    output_file = os.path.join(
        os.path.dirname(__file__),
        "..",
        "data",
        "output",
        "json",
        "transaction",
        "provider",
        "fixed",
        f"transactions_from_{transaction_provider_org_ref}.json",
    )

    if os.path.exists(output_file) and not overwrite_cache:
        print(
            f"Provider Data for '{transaction_provider_org_ref}' already exists. Loading from cache."
        )
        with open(output_file, mode="r", encoding="utf-8") as file:
            all_docs = json.load(file)
        print(f"Loaded {len(all_docs)} records from cache.")
        return all_docs

    else:
        print(f"Querrying provider data for '{transaction_provider_org_narrative}'.")

        query = {
            "q": f'transaction_provider_org_ref:("{transaction_provider_org_ref}") OR transaction_provider_org_narrative:("{transaction_provider_org_narrative}")'
        }
        all_docs = _query_iati_api(query, "transaction")

        with open(output_file, mode="w", encoding="utf-8") as file:
            json.dump(all_docs, file, ensure_ascii=False, indent=4)

    return all_docs


####################################################


def query_title_narrative_fulltext(
    title_narrative: str, overwrite_cache=False, endpoint="activity"
):
    output_file = os.path.join(
        os.path.dirname(__file__),
        "..",
        "data",
        "output",
        "json",
        f"{endpoint}",
        "fulltext",
        f"fulltext_{endpoint}_{title_narrative}.json",
    )

    if os.path.exists(output_file) and not overwrite_cache:
        print(
            f"Fulltext data for title_narrative '{title_narrative}' already exists. Loading from cache."
        )
        with open(output_file, mode="r", encoding="utf-8") as file:
            all_docs = json.load(file)
        print(f"Loaded {len(all_docs)} records from cache.")
        return all_docs

    else:
        print(f"Querrying fulltext data for title_narrative '{title_narrative}'.")

        query = {"q": f'title_narrative:("{title_narrative}")'}
        all_docs = _query_iati_api(query, endpoint)

        with open(output_file, mode="w", encoding="utf-8") as file:
            json.dump(all_docs, file, ensure_ascii=False, indent=4)

    return all_docs


def query_activity_narrative_fulltext(
    narrative: str, overwrite_cache=False, endpoint="activity"
):
    output_file = os.path.join(
        os.path.dirname(__file__),
        "..",
        "data",
        "output",
        "json",
        f"{endpoint}",
        "fulltext",
        f"fulltext_{endpoint}_{narrative}.json",
    )

    if os.path.exists(output_file) and not overwrite_cache:
        print(
            f"Fulltext data for narrative '{narrative}' already exists. Loading from cache."
        )
        with open(output_file, mode="r", encoding="utf-8") as file:
            all_docs = json.load(file)
        print(f"Loaded {len(all_docs)} records from cache.")
        return all_docs

    else:
        print(f"Querrying fulltext data for narrative '{narrative}'.")

        # FIXME: compare with d-portal results, see how to change query for improved full text search
        query = {
            "q": f'title_narrative:("{narrative}") OR description_narrative:("{narrative}") OR participating_org_narrative:("{narrative}")'
        }
        all_docs = _query_iati_api(query, endpoint)

        with open(output_file, mode="w", encoding="utf-8") as file:
            json.dump(all_docs, file, ensure_ascii=False, indent=4)

    return all_docs
