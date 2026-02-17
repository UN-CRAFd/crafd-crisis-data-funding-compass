-- ============================================================
-- Core Entity Tables
-- ============================================================

-- Donors (derived from agency country/donor names)
CREATE TABLE IF NOT EXISTS funding_compass.donors (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    country_id UUID REFERENCES funding_compass.countries(id)
);

-- Agencies
CREATE TABLE IF NOT EXISTS funding_compass.agencies (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    website TEXT,
    donor_id UUID REFERENCES funding_compass.donors(id),
    country_id UUID REFERENCES funding_compass.countries(id)
);

-- Themes
CREATE TABLE IF NOT EXISTS funding_compass.themes (
    id UUID PRIMARY KEY,
    theme_key TEXT,
    name TEXT NOT NULL,
    description TEXT,
    type_id UUID REFERENCES funding_compass.types(id)
);

-- Organizations
CREATE TABLE IF NOT EXISTS funding_compass.organizations (
    id UUID PRIMARY KEY,
    org_key TEXT,
    full_name TEXT,
    short_name TEXT,
    website TEXT,
    description TEXT,
    organization_type_id UUID REFERENCES funding_compass.organization_types(id),
    country_id UUID REFERENCES funding_compass.countries(id),
    estimated_budget FLOAT,
    programme_budget FLOAT,
    budget_source TEXT,
    budget_source_link TEXT,
    hdx_org_key TEXT,
    iati_org_key TEXT,
    mptfo_name TEXT,
    mptfo_url TEXT,
    transparency_portal_url TEXT,
    data_products_overview_url TEXT,
    funding_type TEXT,
    last_updated DATE
);

-- Projects
CREATE TABLE IF NOT EXISTS funding_compass.projects (
    id UUID PRIMARY KEY,
    product_key TEXT,
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    hdx_sohd BOOLEAN
);
