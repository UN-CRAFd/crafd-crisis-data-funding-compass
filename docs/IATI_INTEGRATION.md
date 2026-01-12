# IATI Integration for Crisis Data Funding Compass

This document describes the IATI (International Aid Transparency Initiative) data integration for the Crisis Data Funding Compass.

## Overview

The IATI integration allows the Crisis Data Funding Compass to display international aid activities and transactions for organizations that publish data to the IATI standard. This provides a comprehensive view of:

- **Activities/Projects**: Development and humanitarian aid activities
- **Transactions**: Financial flows between donors, implementers, and recipients
- **Budgets**: Planned and actual budgets for aid activities

## Architecture

The IATI integration consists of:

1. **Data Fetching Script** (`scripts/05_fetch_iati.py`)
2. **Data Integration** (Modified `scripts/02_build_nested_data.py`)
3. **TypeScript Types** (`src/types/iati.ts`)
4. **UI Components** (`src/components/IATIProjectsList.tsx`, `src/components/IATITransactionsSummary.tsx`)
5. **Display Integration** (Modified `src/components/OrganizationModal.tsx`)

## Setup

### 1. Get an IATI API Key

1. Visit https://developer.iatistandard.org/
2. Register for an account
3. Subscribe to the IATI Datastore API
4. Copy your subscription key (Primary or Secondary)

### 2. Configure Environment

Add to your `.env.local`:

```bash
IATI_PRIMARY_KEY=your_iati_api_key_here
```

### 3. Add IATI Org Keys to Airtable

In your Airtable organizations table, add an "IATI Org Key" field with the organization's IATI identifier.

Example IATI identifiers:
- `US-EIN-45-4535664` (Harvard Humanitarian Initiative)
- `XI-IATI-EC_ECHO` (European Commission - ECHO)
- `GB-GOV-1` (UK FCDO)
- `NO-BRC-977538319` (Norwegian Refugee Council)

You can find IATI identifiers at:
- https://d-portal.org/
- https://iatiregistry.org/

## Usage

### Fetching IATI Data

Run the IATI fetch script:

```bash
python scripts/05_fetch_iati.py
```

This will:
1. Read organizations from `organizations-table.json`
2. Filter organizations with IATI Org Keys
3. Query IATI API for each organization's:
   - Activities (projects/programs)
   - Transactions (financial flows)
4. Save results to `public/data/iati-data.json`
5. Cache API responses in `scripts/cache/iati/` for faster re-runs

### Integrating IATI Data

After fetching IATI data, re-run the nesting script to integrate it:

```bash
python scripts/02_build_nested_data.py
```

This merges IATI data into `organizations-nested.json`, which is used by the web application.

### Viewing IATI Data

IATI data appears automatically in organization modals when:
1. The organization has an IATI Org Key in Airtable
2. IATI data has been fetched for that organization
3. The nesting script has integrated the data

The organization modal will show:
- **IATI Projects section**: List of activities with titles, descriptions, sectors, countries, and budgets
- **IATI Transactions section**: Summary of financial transactions by type, with total values

## API Rate Limits

The IATI API has the following limits:
- **Rate Limit**: 5 requests per second
- **Daily Quota**: 25,000 requests per day
- Only successful responses (200-399) count toward the quota

The script respects these limits with a 250ms delay between requests.

## Data Structure

### IATI Data File Format

`public/data/iati-data.json`:

```json
{
  "org_key_1": {
    "org_ref": "US-EIN-45-4535664",
    "org_name": "Harvard Humanitarian Initiative",
    "activities": [ ... ],
    "transactions": [ ... ],
    "stats": {
      "total_activities": 10,
      "total_transactions": 50
    }
  },
  "org_key_2": { ... }
}
```

### Integrated in organizations-nested.json

Each organization with IATI data will have an additional `iati_data` field:

```json
{
  "id": "rec18TzPP5pYZ8ezX",
  "name": "Harvard Humanitarian Initiative",
  "fields": { ... },
  "agencies": [ ... ],
  "projects": [ ... ],
  "donor_countries": [ ... ],
  "iati_data": {
    "org_ref": "US-EIN-45-4535664",
    "org_name": "Harvard Humanitarian Initiative",
    "activities": [ ... ],
    "transactions": [ ... ],
    "stats": { ... }
  }
}
```

## Troubleshooting

### No IATI data appearing

1. **Check API Key**: Ensure `IATI_PRIMARY_KEY` is set in `.env.local`
2. **Check IATI Org Keys**: Verify organizations have valid IATI identifiers in Airtable
3. **Check fetch output**: Run `python scripts/05_fetch_iati.py` and check for errors
4. **Check integration**: Run `python scripts/02_build_nested_data.py` to integrate data
5. **Check files**: Verify `public/data/iati-data.json` and `organizations-nested.json` exist

### API quota exceeded

If you hit the daily quota:
1. Wait 24 hours for quota reset
2. Use cached data (delete specific cache files in `scripts/cache/iati/` to re-fetch)
3. Reduce the number of organizations with IATI Org Keys

### Slow fetching

- IATI API queries can be slow for organizations with many activities
- The script uses caching to avoid re-fetching
- To re-fetch specific organizations, delete their cache files in `scripts/cache/iati/`
- Consider fetching during off-peak hours

## Components Reference

### IATIProjectsList

Displays IATI activities as collapsible cards with:
- Project title and description
- Budget information
- Activity status
- Sectors and recipient countries
- Date information
- Link to D-Portal for more details

### IATITransactionsSummary

Shows transaction summary with:
- Total transaction value
- Breakdown by transaction type (incoming, outgoing, disbursement, etc.)
- Recent transactions list with dates and amounts

## Future Enhancements

Potential improvements:
1. **Filtering**: Filter IATI activities by date, country, or sector
2. **Visualization**: Charts showing transaction flows and budget trends
3. **Search**: Search within IATI activities and descriptions
4. **Export**: Export IATI data to CSV/Excel
5. **Real-time Updates**: Periodic background updates of IATI data
6. **Detailed Views**: Dedicated pages for detailed IATI activity exploration
7. **Network Graphs**: Visualize funding flows between organizations using transaction data

## Related Resources

- **IATI Standard**: https://iatistandard.org/
- **IATI Datastore API**: https://developer.iatistandard.org/
- **D-Portal**: https://d-portal.org/ (IATI data explorer)
- **IATI Registry**: https://iatiregistry.org/
- **IATI Documentation**: https://iatistandard.org/en/iati-standard/

## Support

For issues or questions about IATI integration:
1. Check this documentation
2. Review error messages in script output
3. Consult IATI API documentation
4. Check IATI community forum: https://discuss.iatistandard.org/
