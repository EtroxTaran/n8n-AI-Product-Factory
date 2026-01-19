import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function query<T>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

export async function execute(
  sql: string,
  params?: unknown[]
): Promise<number> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rowCount || 0;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query<{ now: Date }>("SELECT NOW()");
    return result.length > 0;
  } catch {
    return false;
  }
}

/**
 * Execute a callback within a database transaction.
 *
 * The callback receives a client that is already in a transaction.
 * If the callback completes successfully, the transaction is committed.
 * If the callback throws an error, the transaction is rolled back.
 *
 * @param callback - Function to execute within the transaction
 * @returns The result of the callback
 * @throws Re-throws any error from the callback after rolling back
 *
 * @example
 * ```typescript
 * const result = await withTransaction(async (client) => {
 *   await client.query('INSERT INTO table1 ...');
 *   await client.query('INSERT INTO table2 ...');
 *   return { success: true };
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a query using a specific client (for use within transactions).
 *
 * @param client - The database client to use
 * @param sql - The SQL query to execute
 * @param params - Optional query parameters
 * @returns Array of rows
 */
export async function queryWithClient<T>(
  client: pg.PoolClient,
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await client.query(sql, params);
  return result.rows as T[];
}

/**
 * Execute a statement using a specific client (for use within transactions).
 *
 * @param client - The database client to use
 * @param sql - The SQL statement to execute
 * @param params - Optional query parameters
 * @returns Number of affected rows
 */
export async function executeWithClient(
  client: pg.PoolClient,
  sql: string,
  params?: unknown[]
): Promise<number> {
  const result = await client.query(sql, params);
  return result.rowCount || 0;
}

// Project-specific queries
export async function getProjects() {
  return query(`
    SELECT
      id, project_id, project_name, current_phase, phase_status,
      last_iteration_score, total_iterations, created_at, updated_at,
      completed_at,
      CASE current_phase
        WHEN 0 THEN 'Scavenging'
        WHEN 1 THEN 'Vision Loop'
        WHEN 2 THEN 'Architecture Loop'
        WHEN 3 THEN 'Completed'
        ELSE 'Unknown'
      END AS phase_name,
      (SELECT COUNT(*) FROM decision_log_entries WHERE project_id = project_state.project_id) AS decision_count,
      (SELECT MAX(created_at) FROM decision_log_entries WHERE project_id = project_state.project_id) AS last_decision_at
    FROM project_state
    ORDER BY updated_at DESC
  `);
}

export async function getProject(projectId: string) {
  return queryOne(
    "SELECT * FROM project_state WHERE project_id = $1",
    [projectId]
  );
}

export async function getDecisionLogEntries(projectId: string) {
  return query(
    `SELECT * FROM decision_log_entries
     WHERE project_id = $1
     ORDER BY created_at DESC`,
    [projectId]
  );
}

export async function getChatMessages(projectId: string) {
  return query(
    `SELECT * FROM chat_messages
     WHERE project_id = $1
     ORDER BY created_at ASC`,
    [projectId]
  );
}

export async function insertChatMessage(
  projectId: string,
  sessionId: string | null,
  role: "user" | "assistant" | "system",
  content: string,
  executionId?: string,
  responseTimeMs?: number
) {
  return execute(
    `INSERT INTO chat_messages
     (project_id, session_id, role, content, n8n_execution_id, response_time_ms)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [projectId, sessionId, role, content, executionId, responseTimeMs]
  );
}
