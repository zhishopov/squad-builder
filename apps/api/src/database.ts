import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper
export async function checkDatabaseConnection(): Promise<boolean> {
  const response = await pool.query("SELECT 1 as ok;");
  return response.rows?.[0].ok === 1;
}
