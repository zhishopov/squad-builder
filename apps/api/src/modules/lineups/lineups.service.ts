import { pool } from "../../database";

type Role = "COACH" | "PLAYER";

export type Position =
  | "GK"
  | "RB"
  | "CB"
  | "LB"
  | "RWB"
  | "LWB"
  | "CDM"
  | "CM"
  | "CAM"
  | "RW"
  | "LW"
  | "ST"
  | "CF"
  | "UNASSIGNED";

export async function createLineup(input: {
  fixtureId: number;
  actingCoachId: number;
  players: Array<{ userId: number; position: Position; order: number }>;
}) {
  const fixtureResponse = await pool.query(
    `SELECT f.id, f.squad_id, s.coach_id FROM fixtures f JOIN squads s ON s.id = f.squad_id WHERE f.id=$1`,
    [input.fixtureId]
  );

  const fixture = fixtureResponse.rows[0];

  if (!fixture) {
    throw Object.assign(new Error("Fixture not found"), { status: 404 });
  }

  if (Number(fixture.coach_id) !== Number(input.actingCoachId)) {
    throw Object.assign(new Error("Forbidden: you do not own this squad"), {
      status: 403,
    });
  }

  if (!Array.isArray(input.players) || input.players.length === 0) {
    throw Object.assign(new Error("players is required"), { status: 400 });
  }

  if (input.players.length > 11) {
    throw Object.assign(new Error("Lineup cannot be more than 11 players"), {
      status: 400,
    });
  }

  const seenUsers = new Set<number>();
  const seenOrders = new Set<number>();

  for (const player of input.players) {
    if (seenUsers.has(player.userId)) {
      throw Object.assign(new Error("Duplicate player in lineup"), {
        status: 400,
      });
    }

    if (seenOrders.has(player.order)) {
      throw Object.assign(new Error("Duplicate order slot in lineup"), {
        status: 400,
      });
    }
    seenUsers.add(player.userId);
    seenOrders.add(player.order);
  }

  for (const player of input.players) {
    const userResponse = await pool.query(
      `SELECT id, role FROM users WHERE id=$1`,
      [player.userId]
    );

    const user = userResponse.rows[0];

    if (!user) {
      throw Object.assign(new Error("Player not found"), { status: 400 });
    }

    if (user.role !== "PLAYER") {
      throw Object.assign(new Error("Only PLAYER users can be in the lineup"), {
        status: 400,
      });
    }

    const memberResponse = await pool.query(
      `SELECT id FROM squad_members WHERE squad_id=$1 AND user_id=$2`,
      [fixture.squad_id, player.userId]
    );

    if ((memberResponse.rowCount ?? 0) === 0) {
      throw Object.assign(new Error("Player is not a member of this squad"), {
        status: 400,
      });
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingFixtureResponse = await client.query(
      `SELECT id FROM lineups WHERE fixture_id=$1`,
      [input.fixtureId]
    );

    let lineupId: number;

    if ((existingFixtureResponse.rowCount ?? 0) === 0) {
      const insertLineupResponse = await client.query(
        `INSERT INTO lineups (fixture_id)
         VALUES ($1)
         RETURNING id`,
        [input.fixtureId]
      );
      lineupId = insertLineupResponse.rows[0].id;
    } else {
      lineupId = existingFixtureResponse.rows[0].id;
      await client.query(`DELETE FROM lineup_players WHERE lineup_id=$1`, [
        lineupId,
      ]);
    }

    for (const player of input.players) {
      await client.query(
        `INSERT INTO lineup_players (lineup_id, user_id, position, order_index)
         VALUES ($1, $2, $3, $4)`,
        [lineupId, player.userId, player.position, player.order]
      );
    }

    await client.query("COMMIT");

    const rowsResponse = await pool.query(
      `SELECT lp.user_id, u.email, lp.position, lp.order_index
         FROM lineup_players lp
         JOIN users u ON u.id = lp.user_id
        WHERE lp.lineup_id=$1
        ORDER BY lp.order_index ASC`,
      [lineupId]
    );

    return {
      fixtureId: input.fixtureId,
      lineupId: lineupId,
      players: rowsResponse.rows.map((row) => ({
        userId: row.user_id,
        email: row.email as string,
        position: row.position as string,
        order: Number(row.order_index),
      })),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}
