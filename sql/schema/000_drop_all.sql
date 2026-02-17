-- ============================================================
-- Drop all tables (for clean re-creation)
-- Run this BEFORE the create scripts for a full reset.
-- ============================================================

DROP TABLE IF EXISTS funding_compass.project_themes CASCADE;
DROP TABLE IF EXISTS funding_compass.organization_project CASCADE;
DROP TABLE IF EXISTS funding_compass.agency_organization_funding CASCADE;
DROP TABLE IF EXISTS funding_compass.agency_project_funding CASCADE;
DROP TABLE IF EXISTS funding_compass.projects CASCADE;
DROP TABLE IF EXISTS funding_compass.organizations CASCADE;
DROP TABLE IF EXISTS funding_compass.themes CASCADE;
DROP TABLE IF EXISTS funding_compass.agencies CASCADE;
DROP TABLE IF EXISTS funding_compass.donors CASCADE;
DROP TABLE IF EXISTS funding_compass.types CASCADE;
DROP TABLE IF EXISTS funding_compass.organization_types CASCADE;
DROP TABLE IF EXISTS funding_compass.countries CASCADE;
