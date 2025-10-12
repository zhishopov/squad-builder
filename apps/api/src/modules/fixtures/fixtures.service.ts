import { pool } from "../../database";
import { httpError } from "../../utils/httpError";

type Role = "COACH" | "PLAYER";

export type Availability = "YES" | "NO" | "MAYBE";

export async function createFixture(input: {
  squadId: number;
  opponent: string;
  kickoffAt: string;
  actingCoachId: number;
  location?: string;
  notes?: string;
}) {
  const opponent = input.opponent.trim();
  const location = input.location?.trim() || null;
  const notes = input.notes?.trim() || null;

  const squadResponse = await pool.query(
    `SELECT id, coach_id FROM squads WHERE id=$1`,
    [input.squadId]
  );

  const squad = squadResponse.rows[0];
  if (!squad) {
    throw httpError(404, "Squad not found");
  }

  if (Number(squad.coach_id) !== Number(input.actingCoachId)) {
    throw httpError(403, "Forbidden: you do not own this squad");
  }

  const fixture = await pool.query(
    `INSERT INTO fixtures (squad_id, opponent, kickoff_at, location, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, squad_id, opponent, kickoff_at, location, notes, created_at`,
    [input.squadId, opponent, input.kickoffAt, location, notes]
  );

  return fixture.rows[0];
}

export async function getFixtureById(fixtureId: number) {
  const fixtureResponse = await pool.query(
    `SELECT id, squad_id, opponent, kickoff_at, location, notes, created_at
     FROM fixtures WHERE id=$1`,
    [fixtureId]
  );

  const fixture = fixtureResponse.rows[0];
  if (!fixture) {
    throw httpError(404, "Fixture not found");
  }

  const availabilityResponse = await pool.query(
    `SELECT fa.user_id, u.email, u.role, fa.availability, fa.updated_at
     FROM fixture_availability fa JOIN users u ON u.id=fa.user_id WHERE fa.fixture_id=$1
     ORDER BY fa.updated_at DESC`,
    [fixtureId]
  );

  return {
    id: fixture.id,
    squadId: fixture.squad_id,
    opponent: fixture.opponent,
    kickoffAt: fixture.kickoff_at as Date,
    location: fixture.location as string | null,
    notes: fixture.notes as string | null,
    createdAt: fixture.created_at as Date,
    availability: availabilityResponse.rows.map((row) => ({
      userId: row.user_id,
      email: row.email as string,
      role: row.role as Role,
      availability: row.availability as Availability,
      updatedAt: row.updated_at as Date,
    })),
  };
}

export async function listFixturesForSquad(squadId: number) {
  const fixtureResponse = await pool.query(
    `SELECT id, squad_id, opponent, kickoff_at, location, notes, created_at
     FROM fixtures WHERE squad_id=$1 ORDER BY kickoff_at ASC`,
    [squadId]
  );

  return fixtureResponse.rows;
}

export async function setAvailability(input: {
  fixtureId: number;
  userId: number;
  availability: Availability;
  actingUserId?: number;
  actingUserRole?: Role;
}) {
  const fixtureResponse = await pool.query(
    `SELECT id, squad_id FROM fixtures WHERE id=$1`,
    [input.fixtureId]
  );

  const fixture = fixtureResponse.rows[0];
  if (!fixture) {
    throw httpError(404, "Fixture not found");
  }

  let targetUserId = input.userId;
  if (input.actingUserRole === "PLAYER") {
    if (!input.actingUserId) {
      throw httpError(401, "Unauthorized");
    }
    targetUserId = input.actingUserId;
  } else if (input.actingUserRole === "COACH") {
    targetUserId = input.userId;
  }

  const userResponse = await pool.query(
    `SELECT id, role FROM users WHERE id=$1`,
    [targetUserId]
  );

  const user = userResponse.rows[0];
  if (!user) {
    throw httpError(400, "User not found");
  }
  if (user.role !== "PLAYER") {
    throw httpError(403, "Only players can set availability");
  }

  const memberResponse = await pool.query(
    `SELECT id FROM squad_members WHERE squad_id=$1 AND user_id=$2`,
    [fixture.squad_id, targetUserId]
  );

  const memberCount = memberResponse.rowCount ?? 0;
  if (memberCount === 0) {
    throw httpError(403, "You are not a member of the fixture's squad");
  }

  const updateResponse = await pool.query(
    `UPDATE fixture_availability SET availability=$1, updated_at=now() WHERE fixture_id=$2 AND user_id=$3`,
    [input.availability, input.fixtureId, targetUserId]
  );

  const updatedCount = updateResponse.rowCount ?? 0;
  if (updatedCount === 0) {
    const insertResponse = await pool.query(
      `INSERT INTO fixture_availability (fixture_id, user_id, availability)
       VALUES ($1, $2, $3)
       RETURNING id, fixture_id, user_id, availability, updated_at`,
      [input.fixtureId, targetUserId, input.availability]
    );

    return insertResponse.rows[0];
  }

  const finalResponse = await pool.query(
    `SELECT id, fixture_id, user_id, availability, updated_at FROM fixture_availability
     WHERE fixture_id=$1 AND user_id=$2`,
    [input.fixtureId, targetUserId]
  );

  return finalResponse.rows[0];
}

export async function updateFixture(input: {
  fixtureId: number;
  actingCoachId: number;
  changes: {
    opponent?: string;
    kickoffAt?: string;
    location?: string;
    notes?: string;
  };
}) {
  const fixtureResponse = await pool.query(
    `SELECT f.id, f.squad_id, s.coach_id
       FROM fixtures f
       JOIN squads s ON s.id = f.squad_id
      WHERE f.id=$1`,
    [input.fixtureId]
  );

  const fixture = fixtureResponse.rows[0];
  if (!fixture) {
    throw httpError(404, "Fixture not found");
  }

  if (Number(fixture.coach_id) !== Number(input.actingCoachId)) {
    throw httpError(403, "Forbidden: you do not own this squad");
  }

  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  if (typeof input.changes.opponent === "string") {
    updateFields.push(`opponent=$${paramIndex++}`);
    updateValues.push(input.changes.opponent.trim());
  }

  if (typeof input.changes.kickoffAt === "string") {
    updateFields.push(`kickoff_at=$${paramIndex++}`);
    updateValues.push(input.changes.kickoffAt.trim());
  }

  if (typeof input.changes.location === "string") {
    const fixtureLocation = input.changes.location.trim();
    updateFields.push(`location=$${paramIndex++}`);
    updateValues.push(fixtureLocation.length > 0 ? fixtureLocation : null);
  }

  if (typeof input.changes.notes === "string") {
    const fixtureNotes = input.changes.notes.trim();
    updateFields.push(`notes=$${paramIndex++}`);
    updateValues.push(fixtureNotes.length > 0 ? fixtureNotes : null);
  }

  if (updateFields.length === 0) {
    throw httpError(400, "No fields to update");
  }

  updateValues.push(input.fixtureId);

  const updatedFixtureResponse = await pool.query(
    `UPDATE fixtures SET ${updateFields.join(", ")} WHERE id=$${paramIndex}
     RETURNING id, squad_id, opponent, kickoff_at, location, notes, created_at`,
    updateValues
  );

  return updatedFixtureResponse.rows[0];
}

export async function deleteFixture(input: {
  fixtureId: number;
  actingCoachId: number;
}) {
  const fixtureResponse = await pool.query(
    `SELECT f.id, f.squad_id, s.coach_id
       FROM fixtures f
       JOIN squads s ON s.id = f.squad_id
      WHERE f.id=$1`,
    [input.fixtureId]
  );

  const fixture = fixtureResponse.rows[0];
  if (!fixture) {
    throw httpError(404, "Fixture not found");
  }

  if (Number(fixture.coach_id) !== Number(input.actingCoachId)) {
    throw httpError(403, "Forbidden: you do not own this squad");
  }

  const deleteResponse = await pool.query(
    `DELETE FROM fixtures WHERE id=$1 RETURNING id`,
    [input.fixtureId]
  );

  if ((deleteResponse.rowCount ?? 0) === 0) {
    throw httpError(400, "Nothing deleted");
  }

  return { id: deleteResponse.rows[0].id as number, deleted: true };
}
