-- ============================================================
-- Junction / Relationship Tables
-- ============================================================

-- Agency funds a project
CREATE TABLE IF NOT EXISTS funding_compass.agency_project_funding (
    id UUID PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES funding_compass.agencies(id),
    project_id UUID NOT NULL REFERENCES funding_compass.projects(id),
    UNIQUE (agency_id, project_id)
);

-- Agency funds an organization
CREATE TABLE IF NOT EXISTS funding_compass.agency_organization_funding (
    id UUID PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES funding_compass.agencies(id),
    organization_id UUID NOT NULL REFERENCES funding_compass.organizations(id),
    UNIQUE (agency_id, organization_id)
);

-- Organization implements a project
CREATE TABLE IF NOT EXISTS funding_compass.organization_project (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES funding_compass.organizations(id),
    project_id UUID NOT NULL REFERENCES funding_compass.projects(id),
    UNIQUE (organization_id, project_id)
);

-- Project tagged with a theme
CREATE TABLE IF NOT EXISTS funding_compass.project_themes (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES funding_compass.projects(id),
    theme_id UUID NOT NULL REFERENCES funding_compass.themes(id),
    UNIQUE (project_id, theme_id)
);
