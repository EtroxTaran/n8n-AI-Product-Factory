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
