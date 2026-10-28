# Data Dictionary

The tables in the PostgreSQL schema `funding_compass`. The schema is defined in [`sql/schema/`](../sql/schema/), and [`python/01b_fetch_airtable_to_sql.py`](../python/01b_fetch_airtable_to_sql.py) rebuilds and fills it from Airtable on every run. Airtable field names are given in quotes.

All IDs are deterministic UUIDs:

- **Entities and junction rows:** IDs come from the Airtable record IDs. Entities are agencies, themes, organizations and projects.
- **Lookup tables:** IDs come from the name. These are countries, organization types, types and donors. Renaming one of these in Airtable therefore changes its ID.

## countries

- `id`: unique identifier.
- `name`: country or entity name. Collected from agencies' "Country Name" and organizations' "Org HQ Country".

## donors

- `id`: unique identifier.
- `name`: donor name. There is one donor per unique agency "Country Name", so a donor is a country or a group of funders (e.g. European Union, Foundations), not an individual agency.
- `country_id`: the country with the same name (links to `countries.id`).

## agencies

The funding bodies behind each donor, e.g. a ministry, development agency or foundation.

- `id`: unique identifier.
- `name`: "Agency/Department Name".
- `website`: "Agency Website", falling back to "Agency Data Portal".
- `donor_id`: the donor the agency belongs to (links to `donors.id`).
- `country_id`: the agency's country (links to `countries.id`).

## organizations

Organizations that maintain crisis data products.

- `id`: unique identifier.
- `org_key`: short slug. Used in URLs (`?org=`) and as the file name of the organization's logo and budget screenshot in `public/`.
- `full_name`: full name of the organization.
- `short_name`: abbreviated name (if available).
- `website`: organization website.
- `description`: description of the organization and its work.
- `organization_type_id`: type of organization (links to `organization_types.id`).
- `country_id`: headquarters country (links to `countries.id`). If several are given in Airtable, only the first is stored.
- `estimated_budget`: estimated annual budget, from "Est. Org Budget".
- `programme_budget`: programme budget, from "Org Programme Budget".
- `budget_source`: source of the budget figures.
- `budget_source_link`: link to the budget source.
- `funding_type`: `Core`, `Voluntary`, or empty. When the dashboard is filtered by UN member states, those states count as donors to every `Core`-funded organization.
- `hdx_org_key`: the organization's identifier on the Humanitarian Data Exchange (HDX).
- `iati_org_key`: the organization's IATI publisher identifier. The organization page links to its d-portal profile (see [IATI_INTEGRATION.md](IATI_INTEGRATION.md)).
- `mptfo_name`: the organization's name on the UN Multi-Partner Trust Fund Office (MPTFO) Gateway.
- `mptfo_url`: link to the organization's MPTFO page.
- `transparency_portal_url`: link to the organization's own transparency portal.
- `data_products_overview_url`: link to an overview of the organization's data products.
- `last_updated`: the year the budget information was last updated. Airtable holds only a year, so it is stored as 1 January of that year.

## organization_types

- `id`: unique identifier.
- `name`: type of organization, e.g. United Nations, NGO, Research.

## projects

The data products shown in the Compass. The app calls them products.

- `id`: unique identifier.
- `product_key`: short slug. Used in URLs (`?asset=`).
- `name`: name of the product.
- `description`: description of the product.
- `website`: product website (if available).
- `hdx_sohd`: whether the product is part of an HDX Data Grid. The product page shows a badge if so.

## themes

- `id`: unique identifier.
- `theme_key`: short slug.
- `name`: name of the theme.
- `description`: description of the theme.
- `type_id`: the investment type the theme belongs to (links to `types.id`). If several are given in Airtable, only the first is stored.

## types

Investment types: the top-level categories themes belong to.

- `id`: unique identifier.
- `name`: name of the type, e.g. Data Sets & Commons, Crisis Analytics & Insights. The app's display names and descriptions for each type are set in `src/config/`.

## Relationship tables

Each relationship table has its own `id` plus two foreign keys, and stores each pair only once.

| Table                         | Links                            | Built from the Airtable field                     |
| ----------------------------- | -------------------------------- | ------------------------------------------------- |
| `agency_project_funding`      | `agency_id` → `project_id`       | Projects: "Project Donor Agencies"                |
| `agency_organization_funding` | `agency_id` → `organization_id`  | Organizations: "Org Donor Agencies"               |
| `organization_project`        | `organization_id` → `project_id` | Organizations: "Provided Data Ecosystem Projects" |
| `project_themes`              | `project_id` → `theme_id`        | Themes: "Data Ecosystem Projects"                 |
