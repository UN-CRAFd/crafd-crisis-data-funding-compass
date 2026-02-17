-- ============================================================
-- CRAF'd Funding Compass Schema
-- Schema: funding_compass
-- ============================================================
-- This schema stores the normalized Airtable data for the
-- Crisis Data & Analytics Funding Compass.
-- All IDs are UUIDs generated deterministically from Airtable
-- record IDs to ensure idempotent re-runs.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS funding_compass;
