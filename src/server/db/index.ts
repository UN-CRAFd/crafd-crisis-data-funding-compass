/**
 * Singleton PostgreSQL connection pool for the funding_compass schema.
 * All queries go through this module — never import `pg` directly elsewhere.
 */

import { Pool, type QueryResult, type QueryResultRow } from "pg";

// ── Config ────────────────────────────────────────────────────────────────────

const SHARED: object = {
  ssl: { rejectUnauthorized: false },
  // max=1 per serverless instance avoids connection storms on Azure PostgreSQL.
  max: 1,
  allowExitOnIdle: true,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 10_000,
};

function buildConfig() {
  const { DATABASE_URL } = process.env;

  if (!DATABASE_URL) {
    throw new Error("Database configuration missing — set DATABASE_URL.");
  }

  // Strip driver-only params that confuse pg-connection-string.
  const url = new URL(DATABASE_URL);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("uselibpqcompat");
  return { ...SHARED, connectionString: url.toString() };
}

// ── Pool ──────────────────────────────────────────────────────────────────────

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  pool = new Pool(buildConfig());
  pool.on("error", (err) => console.error("DB pool error:", err));

  // Verify connectivity on first use so misconfigurations surface immediately.
  pool
    .query("SELECT 1")
    .then(() => console.log("✓ Database connected."))
    .catch((err: Error) =>
      console.error(
        `✗ Database connection failed: ${err.message}\n  Check DATABASE_URL and network access.`,
      ),
    );

  return pool;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function queryRows<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  return (await query<T>(text, params)).rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  return (await query<T>(text, params)).rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (query: typeof queryRows) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const txQuery = async <R extends QueryResultRow>(
      text: string,
      params?: unknown[],
    ) => (await client.query<R>(text, params)).rows;
    const result = await fn(txQuery as typeof queryRows);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
