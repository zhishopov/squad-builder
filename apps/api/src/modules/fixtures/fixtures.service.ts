import { pool } from "../../database";

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
    throw Object.assign(new Error("Squad not found"), { status: 404 });
  }

  if (Number(squad.coach_id) !== Number(input.actingCoachId)) {
    throw Object.assign(new Error("Forbidden: you do not own this squad"), {
      status: 403,
    });
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
    throw Object.assign(new Error("Fixture not found"), { status: 404 });
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
    `SELECT id, squad_id, opponent, kickoff_at, location, created_at
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
    throw Object.assign(new Error("Fixture not found"), { status: 404 });
  }

  let targetUserId = input.userId;
  if (input.actingUserRole === "PLAYER") {
    if (!input.actingUserId) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
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
    throw Object.assign(new Error("User not found"), { status: 400 });
  }
  if (user.role !== "PLAYER") {
    throw Object.assign(new Error("Only players can set availability"), {
      status: 403,
    });
  }

  const memberResponse = await pool.query(
    `SELECT id FROM squad_members WHERE squad_id=$1 AND user_id=$2`,
    [fixture.squad_id, targetUserId]
  );

  const memberCount = memberResponse.rowCount ?? 0;
  if (memberCount === 0) {
    throw Object.assign(
      new Error("You are not a member of the fixture's squad"),
      { status: 403 }
    );
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
