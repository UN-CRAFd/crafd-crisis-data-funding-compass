# Data Dictionary

## countries

- `id` – Unique identifier for the country or entity
- `name` – Name of the country or entity

## donors

- `id` – Unique identifier for the donor
- `name` – Name of the donor
- `country_id` – Reference to the donor’s country (links to `countries.id`)

## agencies

- `id` – Unique identifier for the agency
- `name` – Name of the agency
- `website` – Agency website (if available)
- `donor_id` – Reference to the donor (links to `donors.id`)
- `country_id` – Reference to the agency’s country (links to `countries.id`)

## organizations

- `id` – Unique identifier for the organization
- `org_key` – Internal key or short identifier
- `full_name` – Full name of the organization
- `short_name` – Abbreviated name (if available)
- `website` – Organization website
- `description` – Description of the organization and its work
- `organization_type_id` – Type of organization (links to `organization_types.id`)
- `country_id` – Country associated with the organization (links to `countries.id`)
- `estimated_budget` – Estimated annual budget (if available)
- `programme_budget` – Programme-specific budget (if available)
- `funding_type` – Type of funding (e.g. voluntary, assessed)
- `budget_source` – Source of budget information
- `last_updated` – Date of last update for the record

## organization_types

- `id` – Unique identifier for the organization type
- `name` – Name of the organization type (e.g. NGO, IO, Academia)

## projects

- `id` – Unique identifier for the project or product
- `product_key` – Internal key or short identifier
- `name` – Name of the project
- `description` – Description of the project
- `website` – Project website (if available)
- `hdx_sohd` – Indicator related to HDX/SOHD classification (boolean)

## themes

- `id` – Unique identifier for the theme
- `theme_key` – Internal key for the theme
- `name` – Name of the theme
- `description` – Description of the theme
- `type_id` – Reference to higher-level category (links to `types.id`)

## types

- `id` – Unique identifier for the theme category
- `name` – Name of the category (e.g. Data Sets & Commons, Crisis Analytics & Insights)

## agency_project_funding

- `id` – Unique identifier for the relationship
- `agency_id` – Reference to the agency (links to `agencies.id`)
- `project_id` – Reference to the project (links to `projects.id`)

## agency_organization_funding

- `id` – Unique identifier for the relationship
- `agency_id` – Reference to the agency (links to `agencies.id`)
- `organization_id` – Reference to the organization (links to `organizations.id`)

## organization_project

- `id` – Unique identifier for the relationship
- `organization_id` – Reference to the organization (links to `organizations.id`)
- `project_id` – Reference to the project (links to `projects.id`)

## project_themes

- `id` – Unique identifier for the relationship
- `project_id` – Reference to the project (links to `projects.id`)
- `theme_id` – Reference to the theme (links to `themes.id`)
