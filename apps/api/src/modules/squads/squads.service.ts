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

  const result = await pool.query(
    `INSERT INTO squads (name, coach_id)
     VALUES ($1, $2)
     RETURNING id, name, coach_id, created_at`,
    [name, input.coachId]
  );

  return result.rows[0];
}

export async function getSquadById(squadId: number) {
  const squadResponse = await pool.query(
    `SELECT id, name, coach_id, created_at FROM squads WHERE id=$1`,
    [squadId]
  );

  const squad = squadResponse.rows[0];
  if (!squad) {
    throw Object.assign(new Error("Squad not found"), { status: 404 });
  }

  const membersResponse = await pool.query(
    `SELECT 
      sm.user_id,
      u.email,
      u.role,
      sm.preferred_position,
      sm.created_at
     FROM squad_members sm
     JOIN users u ON u.id = sm.user_id
    WHERE sm.squad_id=$1
    ORDER BY sm.created_at ASC`,
    [squadId]
  );

  return {
    id: squad.id,
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

export async function addMember(input: {
  squadId: number;
  userId: number;
  preferredPosition: string;
  actingCoachId: number;
}) {
  const squadResponse = await pool.query(
    `SELECT id, coach_id FROM squads WHERE id=$1`,
    [input.squadId]
  );
  const squad = squadResponse.rows[0];

  if (!squad) {
    throw Object.assign(new Error("Squad not found"), { status: 404 });
  }
  if (Number(squad.coach_id) !== Number(input.actingCoachId)) {
    throw Object.assign(new Error("Forbidden: you do not own this squad"), {
      status: 403,
    });
  }

  const userResponse = await pool.query(
    `SELECT id, role, email FROM users WHERE id=$1`,
    [input.userId]
  );
  const user = userResponse.rows[0];

  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 400 });
  }
  if (user.role !== "PLAYER") {
    throw Object.assign(new Error("Only players can be added to a squad"), {
      status: 400,
    });
  }

  const playerExistsResponse = await pool.query(
    `SELECT id FROM squad_members WHERE squad_id=$1 AND user_id=$2`,
    [input.squadId, input.userId]
  );

  const count = playerExistsResponse.rowCount ?? 0;
  if (count > 0) {
    throw Object.assign(new Error("User is already a member of this squad"), {
      status: 400,
    });
  }

  const result = await pool.query(
    `INSERT INTO squad_members (squad_id, user_id, preferred_position)
     VALUES ($1, $2, $3)
     RETURNING id, squad_id, user_id, preferred_position, created_at`,
    [input.squadId, input.userId, input.preferredPosition]
  );

  const member = result.rows[0];

  return {
    id: member.id,
    squadId: member.squad_id,
    userId: member.user_id,
    email: user.email as string,
    preferredPosition: member.preferred_position as string | null,
    createdAt: member.created_at as Date,
  };
}

export async function getSquadForUser(input: { userId: number; role: Role }) {
  if (input.role === "COACH") {
    const response = await pool.query(
      `SELECT id, name, coach_id, created_at FROM squads WHERE coach_id=$1`,
      [input.userId]
    );

    return response.rows[0] || null;
  }

  const response = await pool.query(
    `SELECT s.id, s.name, s.coach_id, s.created_at
       FROM squad_members sm
       JOIN squads s ON s.id = sm.squad_id
      WHERE sm.user_id = $1
      ORDER BY sm.created_at ASC
      LIMIT 1`,
    [input.userId]
  );

  return response.rows[0] || null;
}
