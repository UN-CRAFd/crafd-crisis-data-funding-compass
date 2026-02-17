-- ============================================================
-- Lookup / Reference Tables
-- ============================================================

-- Countries (extracted from agencies + organizations)
CREATE TABLE IF NOT EXISTS funding_compass.countries (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
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
