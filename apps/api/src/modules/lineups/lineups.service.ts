import { pool } from "../../database";
import { httpError } from "../../utils/httpError";

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
  players: Array<{
    userId: number;
    position: Position;
    order: number;
    starter?: boolean;
  }>;
  formation?: string;
}) {
  const fixtureResponse = await pool.query(
    `SELECT f.id, f.squad_id, s.coach_id FROM fixtures f JOIN squads s ON s.id = f.squad_id WHERE f.id=$1`,
    [input.fixtureId]
  );

  const fixture = fixtureResponse.rows[0];

  if (!fixture) {
    throw httpError(404, "Fixture not found");
  }

  if (Number(fixture.coach_id) !== Number(input.actingCoachId)) {
    throw httpError(403, "Forbidden: you do not own this squad");
  }

  if (!Array.isArray(input.players) || input.players.length === 0) {
    throw httpError(400, "players is required");
  }

  if (input.players.length > 18) {
    throw httpError(400, "Lineup cannot be more than 18 players");
  }

  const seenUsers = new Set<number>();
  const seenOrders = new Set<number>();
  let startersCount = 0;

  for (const player of input.players) {
    if (player.starter === true) {
      startersCount += 1;
    }

    if (seenUsers.has(player.userId)) {
      throw httpError(400, "Duplicate player in lineup");
    }

    if (seenOrders.has(player.order)) {
      throw httpError(400, "Duplicate order slot in lineup");
    }
    seenUsers.add(player.userId);
    seenOrders.add(player.order);
  }

  if (startersCount > 11) {
    throw httpError(400, "You can have maximum of 11 starters");
  }

  for (const player of input.players) {
    const userResponse = await pool.query(
      `SELECT id, role FROM users WHERE id=$1`,
      [player.userId]
    );

    const user = userResponse.rows[0];

    if (!user) {
      throw httpError(400, "Player not found");
    }

    if (user.role !== "PLAYER") {
      throw httpError(400, "Only PLAYER users can be in the lineup");
    }

    const memberResponse = await pool.query(
      `SELECT id FROM squad_members WHERE squad_id=$1 AND user_id=$2`,
      [fixture.squad_id, player.userId]
    );

    if ((memberResponse.rowCount ?? 0) === 0) {
      throw httpError(400, "Player is not a member of this squad");
    }
  }

  const formation =
    typeof input.formation === "string" && input.formation.trim().length > 0
      ? input.formation.trim()
      : null;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingFixtureResponse = await client.query(
      `SELECT id, status, formation FROM lineups WHERE fixture_id=$1`,
      [input.fixtureId]
    );

    let lineupId: number;
    let currentStatus: string | null = null;

    if ((existingFixtureResponse.rowCount ?? 0) === 0) {
      const insertLineupResponse = await client.query(
        `INSERT INTO lineups (fixture_id, formation)
         VALUES ($1, $2)
         RETURNING id, status, formation`,
        [input.fixtureId, formation]
      );
      lineupId = insertLineupResponse.rows[0].id;
      currentStatus = insertLineupResponse.rows[0].status as string;
    } else {
      lineupId = existingFixtureResponse.rows[0].id;
      currentStatus = existingFixtureResponse.rows[0].status as string;

      await client.query(`UPDATE lineups SET formation=$1 WHERE id=$2`, [
        formation,
        lineupId,
      ]);

      await client.query(`DELETE FROM lineup_players WHERE lineup_id=$1`, [
        lineupId,
      ]);
    }

    for (const player of input.players) {
      const starter = player.starter === true;
      await client.query(
        `INSERT INTO lineup_players (lineup_id, user_id, position, order_index, starter)
         VALUES ($1, $2, $3, $4, $5)`,
        [lineupId, player.userId, player.position, player.order, starter]
      );
    }

    await client.query("COMMIT");

    const rowsResponse = await pool.query(
      `SELECT lp.user_id, u.email, lp.position, lp.order_index, lp.starter
         FROM lineup_players lp
         JOIN users u ON u.id = lp.user_id
        WHERE lp.lineup_id=$1
        ORDER BY lp.order_index ASC`,
      [lineupId]
    );

    return {
      fixtureId: input.fixtureId,
      lineupId: lineupId,
      status: currentStatus,
      formation: formation,
      players: rowsResponse.rows.map((row) => ({
        userId: row.user_id,
        email: row.email as string,
        position: row.position as string,
        order: Number(row.order_index),
        starter: Boolean(row.starter),
      })),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getLineup(fixtureId: number) {
  const lineupResponse = await pool.query(
    `SELECT id, status, formation FROM lineups WHERE fixture_id=$1`,
    [fixtureId]
  );

  if ((lineupResponse.rowCount ?? 0) === 0) {
    return {
      fixtureId,
      lineupId: null,
      status: null as string | null,
      formation: null as string | null,
      players: [] as Array<{
        userId: number;
        email: string;
        position: string;
        order: number;
        starter: boolean;
      }>,
    };
  }

  const lineupId = lineupResponse.rows[0].id;
  const currentStatus = lineupResponse.rows[0].status as string;
  const formation = (lineupResponse.rows[0].formation as string) ?? null;

  const rowsResponse = await pool.query(
    `SELECT lp.user_id, u.email, lp.position, lp.order_index, lp.starter
     FROM lineup_players lp
     JOIN users u ON u.id = lp.user_id
     WHERE lp.lineup_id=$1
     ORDER BY lp.order_index ASC`,
    [lineupId]
  );

  return {
    fixtureId,
    lineupId,
    status: currentStatus,
    formation: formation,
    players: rowsResponse.rows.map((row) => ({
      userId: row.user_id,
      email: row.email as string,
      position: row.position as string,
      order: Number(row.order_index),
      starter: Boolean(row.starter),
    })),
  };
}

export async function updateLineupStatus(input: {
  fixtureId: number;
  actingCoachId: number;
  status: "DRAFT" | "PUBLISHED";
}) {
  const fixtureResponse = await pool.query(
    `SELECT f.id, f.squad_id, s.coach_id FROM fixtures f JOIN squads s ON s.id = f.squad_id WHERE f.id=$1`,
    [input.fixtureId]
  );

  const fixture = fixtureResponse.rows[0];
  if (!fixture) {
    throw httpError(404, "Fixture not found");
  }
  if (Number(fixture.coach_id) !== Number(input.actingCoachId)) {
    throw httpError(403, "Forbidden: you do not own this squad");
  }

  const lineupResponse = await pool.query(
    `SELECT id FROM lineups WHERE fixture_id=$1`,
    [input.fixtureId]
  );
  if ((lineupResponse.rowCount ?? 0) === 0) {
    throw httpError(400, "No lineup to update");
  }

  const lineupId = lineupResponse.rows[0].id;

  const updateResponse = await pool.query(
    `UPDATE lineups SET status=$1 WHERE id=$2 RETURNING id, status, formation`,
    [input.status, lineupId]
  );

  return {
    fixtureId: input.fixtureId,
    lineupId: updateResponse.rows[0].id as number,
    status: updateResponse.rows[0].status as string,
    formation: (updateResponse.rows[0].formation as string) ?? null,
  };
}
