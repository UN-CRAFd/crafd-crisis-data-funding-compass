-- ============================================================
-- Lookup / Reference Tables
-- ============================================================

-- Countries (extracted from agencies + organizations)
-- iso_alpha3 is NULL for donor groups (European Union, Foundations, …) and
-- sub-national donors (Scotland).
CREATE TABLE IF NOT EXISTS funding_compass.countries (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    iso_alpha3 TEXT
);

-- UN member states (static reference list from data/un_member_states.csv).
-- Join to countries on iso_alpha3, never on name.
CREATE TABLE IF NOT EXISTS funding_compass.un_member_states (
    iso_alpha3 TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- Organization types (extracted from organizations)
CREATE TABLE IF NOT EXISTS funding_compass.organization_types (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Investment types (extracted from themes)
CREATE TABLE IF NOT EXISTS funding_compass.types (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
