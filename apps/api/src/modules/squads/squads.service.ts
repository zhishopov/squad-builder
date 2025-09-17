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

export async function getSquadById(squadId: number) {
  // Fetch squad from db
  const squadResponse = await pool.query(
    `SELECT id, name, coach_id, created_at FROM squads WHERE id=$1`,
    [squadId]
  );

  const squad = squadResponse.rows[0];

  if (!squad) {
    throw Object.assign(new Error("Squad not found"), { status: 404 });
  }

  // Fetch members from db
  const membersResponse = await pool.query(
    `SELECT 
      sm.user_id,
      u.email,
      u.role,
      sm.preferred_position,
      sm.created_at
      FROM squad_memebers sm
      JOIN users u ON u.id=sm.user_id
      WHERE sm.squad_id=$1
      ORDER BY sm.created_at ASC`,
    [squadId]
  );

  return {
    id: squadId,
    name: squad.name,
    coachId: squad.coach_id,
    createdAt: squad.created_at,
    members: membersResponse.rows.map((member) => ({
      userId: member.user_id,
      email: member.email,
      role: member.role as Role,
      preferredPosition: member.preferred_position as string | null,
      joinedAt: member.created_at as Date,
    })),
  };
}
