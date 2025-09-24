import { Request, Response, NextFunction } from "express";
import { pool } from "../../database";
import * as lineupsService from "./lineups.service";
import {
  createLineupSchema,
  fixtureIdParamSchema,
  updateLineupStatusSchema,
} from "./lineups.validators";
import { httpError } from "../../utils/httpError";

type Role = "COACH" | "PLAYER";
type RequestUser = { id: number; email: string; role: Role };

export async function saveLineup(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user as RequestUser | undefined;
    if (!user) {
      return next(httpError(401, "Unauthorized"));
    }
    if (user.role !== "COACH") {
      return next(httpError(403, "Forbidden: Coach only"));
    }

    const { id: fixtureId } = fixtureIdParamSchema.parse(req.params);
    const body = createLineupSchema.parse(req.body);

    const fixtureResponse = await pool.query(
      `SELECT f.squad_id, s.coach_id
         FROM fixtures f
         JOIN squads s ON s.id = f.squad_id
        WHERE f.id=$1`,
      [fixtureId]
    );

    const fixture = fixtureResponse.rows[0];
    if (!fixture) {
      return next(httpError(404, "Fixture not found"));
    }
    if (Number(fixture.coach_id) !== Number(user.id)) {
      return next(httpError(403, "Forbidden"));
    }

    const savedLineup = await lineupsService.createLineup({
      fixtureId,
      actingCoachId: user.id,
      players: body.players.map((player) => ({
        userId: player.userId,
        position: player.position,
        order: player.order,
        starter: player.starter ?? false,
      })),
      ...(body.formation !== undefined ? { formation: body.formation } : {}),
    });

    res.status(201).json(savedLineup);
  } catch (error) {
    next(error);
  }
}

export async function getLineup(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user as RequestUser | undefined;
    if (!user) {
      return next(httpError(401, "Unauthorized"));
    }

    const { id: fixtureId } = fixtureIdParamSchema.parse(req.params);

    const fixtureResponse = await pool.query(
      `SELECT f.squad_id, s.coach_id
         FROM fixtures f
         JOIN squads s ON s.id = f.squad_id
        WHERE f.id=$1`,
      [fixtureId]
    );
    const fixture = fixtureResponse.rows[0];
    if (!fixture) {
      return next(httpError(404, "Fixture not found"));
    }

    if (user.role === "COACH") {
      if (Number(fixture.coach_id) !== Number(user.id)) {
        return next(httpError(403, "Forbidden"));
      }
    } else {
      const memberResponse = await pool.query(
        `SELECT id FROM squad_members WHERE squad_id=$1 AND user_id=$2`,
        [fixture.squad_id, user.id]
      );
      if ((memberResponse.rowCount ?? 0) === 0) {
        return next(httpError(403, "Forbidden"));
      }
    }

    const lineup = await lineupsService.getLineup(fixtureId);
    res.json(lineup);
  } catch (error) {
    next(error);
  }
}

export async function updateLineupStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user as RequestUser | undefined;
    if (!user) {
      return next(httpError(401, "Unauthorized"));
    }
    if (user.role !== "COACH") {
      return next(httpError(403, "Forbidden: Coach only"));
    }

    const { id: fixtureId } = fixtureIdParamSchema.parse(req.params);
    const { status } = updateLineupStatusSchema.parse(req.body);

    const fixtureResponse = await pool.query(
      `SELECT f.squad_id, s.coach_id
         FROM fixtures f
         JOIN squads s ON s.id = f.squad_id
        WHERE f.id=$1`,
      [fixtureId]
    );
    const fixture = fixtureResponse.rows[0];
    if (!fixture) {
      return next(httpError(404, "Fixture not found"));
    }
    if (Number(fixture.coach_id) !== Number(user.id)) {
      return next(httpError(403, "Forbidden"));
    }

    const updatedLineup = await lineupsService.updateLineupStatus({
      fixtureId,
      actingCoachId: user.id,
      status,
    });

    res.json(updatedLineup);
  } catch (error) {
    next(error);
  }
}
