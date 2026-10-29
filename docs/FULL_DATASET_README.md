# Crisis Data Funding Compass – Dataset

**Export Date:**
**Source:** Complex Risk Analytics Fund (CRAF’d)

## Overview

This export contains data from the [**Crisis Data Funding Compass**](https://compass.crafd.io/), an overview of the crisis data funding ecosystem.

The dataset is a structured view of the global **crisis data and analytics funding ecosystem**. It records which donors and agencies fund which organizations and data products, and which themes those products cover.

The data is relational: the tables are linked by IDs and must be joined. It is intended to support exploratory analysis and strategic insights into the structure of the ecosystem.

## Dataset Structure

[Data dictionary](https://github.com/UN-CRAFd/crafd-crisis-data-funding-compass/blob/main/docs/DATA.md) defines every column.

### Core Entities

- **donors**: funders. Each is a country (e.g. Germany) or a group of funders (e.g. European Union, Foundations).
- **agencies**: the funding bodies behind each donor, e.g. a ministry or development agency.
- **organizations**: organizations that maintain crisis data products, e.g. UN entities, NGOs, research institutions.
- **projects**: the data products, platforms and initiatives those organizations maintain. The Compass calls them products.
- **themes**: thematic areas of the products.
- **types**: investment types, the higher-level categories that group themes.
- **organization_types**: classification of organizations, e.g. United Nations, NGO, Research.
- **countries**: reference list of donor and headquarters countries, with ISO 3166-1 alpha-3 codes.
- **un_member_states**: the 193 UN member states by ISO alpha-3 code. Join to countries on `iso_alpha3`.

### Relationship Tables

- **agency_project_funding**: which agencies fund which projects.
- **agency_organization_funding**: which agencies fund which organizations.
- **organization_project**: which organizations maintain which projects.
- **project_themes**: which themes each project covers.

## Data Characteristics

- Every row has an `id` (a UUID), and tables link to each other through `*_id` columns.
- Funding relationships are **binary**: they record that an agency funds an organization or project, not how much.
- Organization-level budget fields are included where available. `last_updated` is the year the budget information was last updated, stored as 1 January of that year.
  - `estimated_budget`
  - `programme_budget` (a link to the programme budget, not an amount)
  - `budget_source`
  - `budget_source_link`
- `funding_type` is `Core`, `Voluntary` or empty. `Core` marks organizations funded through core contributions.
- Each organization has one headquarters country, and each theme belongs to one type.
- Data coverage varies across entities and fields, and some fields are incomplete.

## Analytical Notes

- Relationships (who funds whom, and how actors connect) are central to the dataset.
- Budget data is indicative and may not be complete or comparable across organizations.
- Donors and countries include institutional actors as well as countries, e.g. "European Union" or "Foundations".
- Themes and types form a two-level hierarchy of areas of work.

## Data Limitations

- No funding amounts are given for individual funding relationships.
- Budget information is partial and comes from different sources.
- The dataset is a snapshot and may not capture all actors or relationships.
- Missing values indicate unavailable or unverified information.

## Source

Maintained by the **Complex Risk Analytics Fund (CRAF’d)**.

Learn more at [https://crafd.io](https://crafd.io). For the methodology, see [compass.crafd.io/methodology](https://compass.crafd.io/methodology).
