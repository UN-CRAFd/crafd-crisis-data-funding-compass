# Crisis Data Funding Compass – Dataset

**Export Date:** 
**Source:** Complex Risk Analytics Fund (CRAF’d)

## Overview

This export contains data from the [**Crisis Data Funding Compass**](https://compass.crafd.io/), an overview of the crisis data funding ecosystem.

This dataset provides a structured view of the global **crisis data and analytics funding ecosystem**. It captures relationships between donors, agencies, organizations, projects, and thematic areas.

The data is relational and reflects how different actors are connected through funding and collaboration. It is intended to support exploratory analysis and strategic insights into the structure of the ecosystem.

## Dataset Structure

The dataset is organized across multiple tables. Key entities and relationships include:

### Core Entities

- **countries** – Reference list of countries and entities
- **donors** – Funding entities, linked to countries
- **agencies** – Implementing or intermediary agencies linked to donors
- **organizations** – Data and analytics providers (e.g. NGOs, IOs, academia)
- **projects** – Data products, platforms, or initiatives
- **themes** – Thematic areas associated with projects
- **types** – Higher-level categories of themes
- **organization_types** – Classification of organizations (e.g. NGO, IO, Academia)

### Relationship Tables

- **agency_project_funding** – Links agencies to projects
- **agency_organization_funding** – Links agencies to organizations
- **organization_project** – Links organizations to projects
- **project_themes** – Links projects to thematic areas

## Data Characteristics

- The dataset is **relational** and requires joining across tables
- Funding relationships are **binary** (no monetary amounts at project level)
- Organization-level budget fields are included where available:
  - `estimated_budget`
  - `programme_budget`

- Data coverage varies across entities and fields
- Some fields may be incomplete or inconsistently populated

## Analytical Notes

- Relationships (who funds whom, and how actors connect) are central to the dataset
- Budget data is indicative and may not be complete or comparable across organizations
- Countries may include both geographic entities and institutional actors
- Themes and types provide a hierarchical view of areas of work

## Data Limitations

- No direct funding amounts at the project level
- Budget information is partial and sourced from different references
- The dataset represents a snapshot and may not capture all actors or relationships
- Missing values indicate unavailable or unverified information

## Source

Maintained by the **Complex Risk Analytics Fund (CRAF’d)**

Learn more at [https://crafd.io](https://crafd.io)
