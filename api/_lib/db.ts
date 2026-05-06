import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { requireEnv } from "./env.js";

declare global {
  // eslint-disable-next-line no-var
  var __linkgrowthPool: Pool | undefined;
}

function buildPool(): Pool {
  return new Pool({
    connectionString: requireEnv("DATABASE_URL"),
    max: 10,
  });
}

export function getPool(): Pool {
  if (!global.__linkgrowthPool) {
    global.__linkgrowthPool = buildPool();
  }
  return global.__linkgrowthPool;
}

export async function sql<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
