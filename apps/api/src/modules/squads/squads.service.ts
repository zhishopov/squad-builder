import { pool } from "../../database";

type Role = "COACH" | "PLAYER";

export async function createSquad(input: { name: string; coachId: number }) {
  const name = input.name.trim();

  const existingCoach = await pool.query(
    `SELECT id FROM squads WHERE coach_id=$1`,
    [input.coachId]
  );

  const count = existingCoach.rowCount ?? 0;

  if (count > 0) {
    throw Object.assign(new Error("Coach already owns a squad"), {
      status: 400,
    });
  }

  // Insert new squad into db
  const result = await pool.query(
    `INSERT INTO squads (name, coach_id)
     VALUES ($1, $2)
     RETURNING id, name, coach_id, created_at`,
    [name, input.coachId]
  );

  return result.rows[0];
}
