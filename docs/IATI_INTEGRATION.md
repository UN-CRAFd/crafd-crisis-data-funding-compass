# IATI Integration

The [International Aid Transparency Initiative (IATI)](https://iatistandard.org/) publishes data on aid activities, budgets and transactions. The Compass links organizations to their IATI data. Fetching and showing that data inside the app was built for the old JSON-based setup, and it is currently switched off.

## What works today

Organizations with an **IATI Org Key** in Airtable (their IATI publisher identifier) get a **"View Funding on IATI"** button on their organization page. The button opens the organization's profile on [d-portal](https://d-portal.org/).

The key flows through the normal pipeline:

1. The "IATI Org Key" field on the Airtable Organizations table
2. `organizations.iati_org_key` in the database (via `python/01b_fetch_airtable_to_sql.py`)
3. `fields["IATI Org Key"]` in the app
4. The link in `src/components/OrganizationModal.tsx`

To add or fix the link for an organization, set its IATI Org Key in Airtable. The next daily sync picks it up.

### Finding an organization's IATI identifier

Search for the organization on [d-portal](https://d-portal.org/) or the [IATI Registry](https://iatiregistry.org/). Identifiers look like `GB-GOV-1` (UK FCDO) or `XM-DAC-41114` (UNDP).

## What is not connected

These parts were written to show IATI activities and transactions directly in the organization page. None of them currently receives data:

- **`python/05_fetch_iati.py`** queries the IATI Datastore API for every organization with an IATI Org Key. It reads organizations from `public/data/organizations-table.json` and writes `public/data/iati-data.json`, and neither file exists any more.
- **`src/components/IATIProjectsList.tsx` and `IATIActivitySummaryCard.tsx`** render the fetched data. `OrganizationModal.tsx` shows them only when the organization has `iati_data`, and nothing on the server sets that field. A third component, `IATITransactionsSummary.tsx`, isn't used anywhere.
- **`src/types/iati.ts`** and `IATIOrganizationDataDTO` in `src/server/dto/index.ts` describe the data shape.
- **`python/iati_api/`** holds exploratory queries against the same API.

### Reconnecting it

Reconnecting would take roughly these steps:

1. Change `05_fetch_iati.py` to read organizations and their `iati_org_key` from the database instead of the JSON file.
2. Store the results in the database, e.g. a new table or a JSON column added in `sql/schema/`, rather than in `public/data/`.
3. Load the results in a repository, include them in `getCoreData()`, and attach them to organizations as `iati_data`.
4. Decide how often the data refreshes. The IATI API has a daily quota, so it probably shouldn't run inside the daily Airtable sync.

## IATI Datastore API

- **API key:** register at [developer.iatistandard.org](https://developer.iatistandard.org/) and subscribe to the IATI Datastore API. Put the key in `.env.local` as `IATI_PRIMARY_KEY`.
- **Limits:** 5 requests per second and 25,000 requests per day. Only successful responses (HTTP 200–399) count toward the quota.
- **Caching:** `05_fetch_iati.py` waits 500 ms between requests. It caches responses in `python/cache/iati/`, so delete a cache file to re-fetch that query.

## Resources

- [IATI Standard documentation](https://iatistandard.org/en/iati-standard/)
- [IATI Datastore API](https://developer.iatistandard.org/)
- [d-portal](https://d-portal.org/), an IATI data explorer
- [IATI Registry](https://iatiregistry.org/)
