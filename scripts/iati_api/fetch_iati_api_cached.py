import os
import sqlite3
import time
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

data_folder = Path("data")
DB_PATH = data_folder / "databases" / "iati.db"


# DEPRECATED?
def _save_to_database(
    df: pd.DataFrame, table_name: str = "activities", db_path: str = DB_PATH
):
    """
    Save the given DataFrame to the SQLite database, de-duplicating based on 'iati_identifier'.

    Parameters:
    df (pd.DataFrame): The DataFrame containing the data to be saved.
    """

    # Data Preprocessing: Convert list type columns to string
    for col in df.columns:
        if df[col].apply(type).eq(list).any():
            df[col] = df[col].apply(str)

    # Connect to Database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # get all `iati_identifier` from the existing database
    try:
        df_existing = pd.read_sql(f"SELECT iati_identifier FROM {table_name}", conn)
        print("Data fetched successfully!")
    except Exception as e:
        # if the table does not exist yet, create it and exit.
        # print(f"An error occurred: {e}")
        print(f"Table '{table_name}' does not exist yet. Creating a new table...")
        print(f"Saving {len(df)} new records to the database...")

        df.to_sql(table_name, conn, if_exists="replace", index=False)
        conn.close()
        return  # exit functions

    # Step 1: Get the existing columns from the database
    cursor.execute(f"PRAGMA table_info({table_name});")
    existing_columns = {col[1] for col in cursor.fetchall()}  # Set of column names

    # Step 2: Identify new columns that are missing
    new_columns = set(df.columns) - existing_columns

    # Step 3: Add missing columns dynamically
    if new_columns:
        print(f"New columns to be added: {new_columns}")
        try:
            for column in new_columns:
                cursor.execute(
                    f"ALTER TABLE {table_name} ADD COLUMN {column} TEXT;"
                )  # Change TEXT if needed

        except Exception as e:
            print(f"An error occured while adding new variables: {e}")

    # Save changes to the database
    conn.commit()

    # Deduplication of activity records: Filter the new data to exclude already existing identifiers
    df.drop_duplicates(subset="iati_identifier", inplace=True)
    df_new = df[~df["iati_identifier"].isin(df_existing["iati_identifier"])]

    # Append the new data to the database
    print(f"Appending {len(df_new)} new records to the database...")
    df_new.to_sql(table_name, conn, if_exists="append", index=False)

    conn.close()


def update_database(
    df: pd.DataFrame,
    db_path: str = DB_PATH,
    table_name: str = "activities",
    add_new_cols=False,
):
    """
    Updates the SQLite database table with new data, dynamically adding columns if necessary.

    Parameters:
    df (pd.DataFrame): The DataFrame containing the data to be saved.
    table_name (str): The name of the table to update in the SQLite database.
    """

    # Preprocessing: Convert list type columns to string
    for col in df.columns:
        if df[col].apply(type).eq(list).any():
            df[col] = df[col].apply(str)

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        # first run initialization
        # Step 1: Check if table exists and fetch existing identifiers
        try:
            df_existing = pd.read_sql(f"SELECT iati_identifier FROM {table_name}", conn)
            print("Database fetched successfully!")
        except Exception:
            # first run innitialization
            print(f"Table '{table_name}' does not exist yet. Creating a new table...")
            print(f"Saving {len(df)} new records to the database...")
            df.to_sql(table_name, conn, if_exists="replace", index=False)
            return  # Exit function as table is newly created

        # Step 2: Get existing columns
        cursor.execute(f"PRAGMA table_info({table_name});")
        existing_columns = {col[1] for col in cursor.fetchall()}

        # Step 3: Identify and add missing columns
        new_columns = set(df.columns) - existing_columns

        if add_new_cols and new_columns:
            print(f"New columns to be added: {new_columns}")
            alter_statements = [
                f"ALTER TABLE {table_name} ADD COLUMN {col} TEXT DEFAULT '';"
                for col in new_columns
            ]

            try:
                for statement in alter_statements:
                    cursor.execute(statement)
            except Exception as e:
                print(f"An error occured while adding new variables: {e}")

        conn.commit()  # Save changes
        cursor.close()

        # Step 4: Remove duplicates and filter out existing identifiers
        df.drop_duplicates(subset=["iati_identifier"], inplace=True)
        df_new = df[~df["iati_identifier"].isin(df_existing["iati_identifier"])]

        if not add_new_cols:
            df_new = df_new[df_new.columns.intersection(existing_columns)]

        # Step 5: Append new records
        if not df_new.empty:
            print(f"Appending {len(df_new)} new records to the database...")
            df_new.to_sql(table_name, conn, if_exists="append", index=False)
        else:
            print("No new records to append.")

    print("Database update complete.")


################################################################################################

load_dotenv()
API_KEY = os.getenv("IATI_PRIMARY_KEY")
BASE_URL = "https://api.iatistandard.org/datastore"


# Main function
def query_iati_api_cached(query, endpoint: str = "activity", save=True):
    valid_endpoints = ["activity", "transaction", "budget"]
    if endpoint in valid_endpoints:
        url = f"{BASE_URL}/{endpoint}/select"
    else:
        raise ValueError(f"Invalid query type. Must be one of {valid_endpoints}.")

    ###
    if not API_KEY:
        raise ValueError("API key is missing. Check your environment variables.")
    headers = {"Ocp-Apim-Subscription-Key": API_KEY}

    # default params
    query["start"] = 0
    query["rows"] = 1000  # max rows
    query["fl"] = "*"  # all fields

    ## Pagination
    page = 0
    data = {}
    all_docs = []

    try:
        while True:
            response = requests.get(url, params=query, headers=headers)

            if response.status_code == 200:
                data = response.json()

                # query report on first page
                if page == 0:
                    num_found = data.get("response", {}).get("numFound", 0)
                    print(f"Found a total of {num_found} reccords.")
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

    df = pd.DataFrame(all_docs)

    if not df.empty and save:
        df["query_q"] = query["q"]
        df["url"] = url
        df["endpoint"] = endpoint
        df["query_datetime"] = pd.Timestamp.now()
        update_database(df, table_name="activities")
    else:
        print("No changes to the database.")

    return all_docs
