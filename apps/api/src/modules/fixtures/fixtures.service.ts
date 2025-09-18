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
