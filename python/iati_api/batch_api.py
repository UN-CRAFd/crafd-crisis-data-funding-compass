from pathlib import Path

import pandas as pd
from src.iati_api.fetch_iati_api import (
    query_transaction_provider_org_fixed,
    query_transaction_receiver_org_fixed,
)
from tqdm import tqdm

data_folder = Path("data")


matched_org_names_with_ids = pd.read_csv(
    data_folder / "output" / "matchings" / "matched_org_names_with_ids.csv"
)


for _, row in tqdm(
    matched_org_names_with_ids.iterrows(), total=len(matched_org_names_with_ids)
):
    query_transaction_receiver_org_fixed(
        transaction_receiver_org_ref=row["organization_id"],
        transaction_receiver_org_narrative=row["organization_name"],
        overwrite_cache=False,
    )


######


matched_org_names_with_ids = matched_org_names_with_ids.head(5)

for _, row in tqdm(
    matched_org_names_with_ids.iterrows(), total=len(matched_org_names_with_ids)
):
    query_transaction_provider_org_fixed(
        transaction_provider_org_ref=row["organization_id"],
        transaction_provider_org_narrative=row["organization_name"],
        overwrite_cache=False,
    )
