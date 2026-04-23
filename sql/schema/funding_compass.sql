create table if not exists countries (
    id uuid not null primary key,
    name text not null unique
);
create table if not exists organization_types (
    id uuid not null primary key,
    name text not null unique
);
create table if not exists types (
    id uuid not null primary key,
    name text not null unique
);
create table if not exists donors (
    id uuid not null primary key,
    name text not null unique,
    country_id uuid references countries
);
create table if not exists agencies (
    id uuid not null primary key,
    name text not null,
    website text,
    donor_id uuid references donors,
    country_id uuid references countries
);
create table if not exists themes (
    id uuid not null primary key,
    theme_key text,
    name text not null,
    description text,
    type_id uuid references types
);
create table if not exists organizations (
    id uuid not null primary key,
    org_key text,
    full_name text,
    short_name text,
    website text,
    description text,
    organization_type_id uuid references organization_types,
    country_id uuid references countries,
    estimated_budget double precision,
    programme_budget double precision,
    budget_source text,
    budget_source_link text,
    hdx_org_key text,
    iati_org_key text,
    mptfo_name text,
    mptfo_url text,
    transparency_portal_url text,
    data_products_overview_url text,
    funding_type text,
    last_updated date
);
create table if not exists projects (
    id uuid not null primary key,
    product_key text,
    name text not null,
    description text,
    website text,
    hdx_sohd boolean
);
create table if not exists agency_project_funding (
    id uuid not null primary key,
    agency_id uuid not null references agencies,
    project_id uuid not null references projects,
    unique (agency_id, project_id)
);
create table if not exists agency_organization_funding (
    id uuid not null primary key,
    agency_id uuid not null references agencies,
    organization_id uuid not null references organizations,
    unique (agency_id, organization_id)
);
create table if not exists organization_project (
    id uuid not null primary key,
    organization_id uuid not null references organizations,
    project_id uuid not null references projects,
    unique (organization_id, project_id)
);
create table if not exists project_themes (
    id uuid not null primary key,
    project_id uuid not null references projects,
    theme_id uuid not null references themes,
    unique (project_id, theme_id)
);