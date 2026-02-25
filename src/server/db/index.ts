/**
 * Database Connection Pool
 *
 * Singleton PostgreSQL connection pool for the funding_compass schema.
 * All queries go through this pool. Never import `pg` directly elsewhere.
 */

import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";

const SCHEMA = "funding_compass";

function buildPoolConfig(): PoolConfig {
  // Set search_path at connection startup via the PostgreSQL options parameter
  // instead of a separate SET query, to avoid pg deprecation warnings.
  const pgOptions = `-c search_path=${SCHEMA},public`;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Strip sslmode from the connection string to avoid pg-connection-string
    // SSL warnings; SSL behaviour is controlled explicitly via ssl option below.
    const url = new URL(databaseUrl);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("uselibpqcompat");
    return {
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
      options: pgOptions,
      // Vercel serverless: keep max=1 to avoid exhausting Azure PostgreSQL's
      // connection limit. Each cold start creates a new pool, so multiple
      // concurrent function instances × a larger pool = connection storm.
      max: 1,
      allowExitOnIdle: true,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    };
  }

  // Fallback to individual env vars (matching the Python ingest script)
  const host = process.env.AZURE_POSTGRES_HOST;
  const port = parseInt(process.env.AZURE_POSTGRES_PORT ?? "5432", 10);
  const database = process.env.AZURE_POSTGRES_DB ?? "crafd";
  const user = process.env.AZURE_POSTGRES_USER;
  const password = process.env.AZURE_POSTGRES_PASSWORD;

  if (!host || !user || !password) {
    throw new Error(
      "Database configuration missing. Set DATABASE_URL or AZURE_POSTGRES_HOST/USER/PASSWORD.",
    );
  }

  return {
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
    options: pgOptions,
    max: 1,
    allowExitOnIdle: true,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  };
}

// Singleton pool — created lazily on first use, reused across requests
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool(buildPoolConfig());

    pool.on("error", (err) => {
      console.error("Unexpected database pool error:", err);
    });
  }
  return pool;
}

/**
 * Execute a parameterized query against the funding_compass schema.
 * All SQL in the application goes through this function.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/**
 * Execute a parameterized query and return only the rows.
 */
export async function queryRows<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

/**
 * Execute a parameterized query and return the first row or null.
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] ?? null;
}

/**
 * Run multiple queries inside a transaction.
 */
export async function withTransaction<T>(
  fn: (query: typeof queryRows) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const txQuery = async <R extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[],
    ): Promise<R[]> => {
      const result = await client.query<R>(text, params);
      return result.rows;
    };

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

/**
 * Gracefully close the connection pool.
 * Call this during server shutdown if needed.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
