import { fi } from "zod/v4/locales";
import { pool } from "../../database";

type Role = "COACH" | "PLAYER";

export type Availability = "YES" | "NO" | "MAYBE";

export async function createFixture(input: {
  squadId: number;
  opponent: string;
  kickOffAt: string;
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
    [input.squadId, opponent, input.kickOffAt, location, notes]
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
    `SELCT id, squad_id, opponent, kickoff_at, location, created_at
     FROM fixtures WHERE squad_id=$1 ORDER BY kickoff_at ASC`,
    [squadId]
  );

  return fixtureResponse.rows;
}
