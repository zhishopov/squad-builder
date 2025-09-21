import { Request, Response, NextFunction } from "express";
import { pool } from "../../database";
import * as lineupsService from "./lineups.service";
import { createLineupSchema, fixtureIdParamSchema } from "./lineups.validators";

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
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }
    if (user.role !== "COACH") {
      return next(
        Object.assign(new Error("Forbidden: Coach only"), { status: 403 })
      );
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
      return next(
        Object.assign(new Error("Fixture not found"), { status: 404 })
      );
    }
    if (Number(fixture.coach_id) !== Number(user.id)) {
      return next(Object.assign(new Error("Forbidden"), { status: 403 }));
    }

    const savedLineup = await lineupsService.createLineup({
      fixtureId,
      actingCoachId: user.id,
      players: body.players.map((player) => ({
        userId: player.userId,
        position: player.position,
        order: player.order,
      })),
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
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
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
      return next(
        Object.assign(new Error("Fixture not found"), { status: 404 })
      );
    }

    if (user.role === "COACH") {
      if (Number(fixture.coach_id) !== Number(user.id)) {
        return next(Object.assign(new Error("Forbidden"), { status: 403 }));
      }
    } else {
      const memberResponse = await pool.query(
        `SELECT id FROM squad_members WHERE squad_id=$1 AND user_id=$2`,
        [fixture.squad_id, user.id]
      );
      if ((memberResponse.rowCount ?? 0) === 0) {
        return next(Object.assign(new Error("Forbidden"), { status: 403 }));
      }
    }

    const lineup = await lineupsService.getLineup(fixtureId);
    res.json(lineup);
  } catch (error) {
    next(error);
  }
}
