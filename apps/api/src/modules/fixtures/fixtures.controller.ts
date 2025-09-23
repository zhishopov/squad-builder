import { Request, Response, NextFunction } from "express";
import { pool } from "../../database";
import * as fixturesService from "./fixtures.service";
import {
  createFixtureSchema,
  fixtureIdParamSchema,
  squadIdParamSchema,
  setAvailabilitySchema,
  updateFixtureSchema,
} from "./fixtures.validators";

type Role = "COACH" | "PLAYER";
type ReqUser = { id: number; email: string; role: Role };

export async function createFixture(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user as ReqUser | undefined;
    if (!user) {
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }
    if (user.role !== "COACH") {
      return next(
        Object.assign(new Error("Forbidden: Coach only"), { status: 403 })
      );
    }

    const body = createFixtureSchema.parse(req.body);

    const squadId = Number(req.body?.squadId);
    if (!squadId || Number.isNaN(squadId)) {
      return next(
        Object.assign(new Error("squadId is required and must be a number"), {
          status: 400,
        })
      );
    }

    const payload: {
      squadId: number;
      opponent: string;
      kickoffAt: string;
      actingCoachId: number;
      location?: string;
      notes?: string;
    } = {
      squadId,
      opponent: body.opponent,
      kickoffAt: body.kickoffAt,
      actingCoachId: user.id,
    };

    if (body.location) {
      payload.location = body.location;
    }
    if (body.notes) {
      payload.notes = body.notes;
    }

    const fixture = await fixturesService.createFixture(payload);

    res.status(201).json(fixture);
  } catch (error) {
    next(error);
  }
}

export async function getFixture(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user as ReqUser | undefined;
    if (!user) {
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }

    const { id: fixtureId } = fixtureIdParamSchema.parse(req.params);
    const fixture = await fixturesService.getFixtureById(fixtureId);

    if (user.role === "COACH") {
      const owns = await pool.query(
        `SELECT id FROM squads WHERE id=$1 AND coach_id=$2`,
        [fixture.squadId, user.id]
      );
      if ((owns.rowCount ?? 0) === 0) {
        return next(Object.assign(new Error("Forbidden"), { status: 403 }));
      }
    } else {
      const member = await pool.query(
        `SELECT id FROM squad_members WHERE squad_id=$1 AND user_id=$2`,
        [fixture.squadId, user.id]
      );
      if ((member.rowCount ?? 0) === 0) {
        return next(Object.assign(new Error("Forbidden"), { status: 403 }));
      }
    }

    res.json(fixture);
  } catch (error) {
    next(error);
  }
}

export async function listFixturesForSquad(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user as ReqUser | undefined;
    if (!user) {
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }

    const { id: squadId } = squadIdParamSchema.parse(req.params);

    if (user.role === "COACH") {
      const owns = await pool.query(
        `SELECT id FROM squads WHERE id=$1 AND coach_id=$2`,
        [squadId, user.id]
      );
      if ((owns.rowCount ?? 0) === 0) {
        return next(Object.assign(new Error("Forbidden"), { status: 403 }));
      }
    } else {
      const member = await pool.query(
        `SELECT id FROM squad_members WHERE squad_id=$1 AND user_id=$2`,
        [squadId, user.id]
      );
      if ((member.rowCount ?? 0) === 0) {
        return next(Object.assign(new Error("Forbidden"), { status: 403 }));
      }
    }

    const fixtures = await fixturesService.listFixturesForSquad(squadId);
    res.json(fixtures);
  } catch (error) {
    next(error);
  }
}

export async function setAvailability(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user as ReqUser | undefined;
    if (!user) {
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }

    const { id: fixtureId } = fixtureIdParamSchema.parse(req.params);
    const body = setAvailabilitySchema.parse(req.body);

    if (user.role === "COACH") {
      const fx = await pool.query(`SELECT squad_id FROM fixtures WHERE id=$1`, [
        fixtureId,
      ]);
      const row = fx.rows[0];
      if (!row) {
        return next(
          Object.assign(new Error("Fixture not found"), { status: 404 })
        );
      }
      const owns = await pool.query(
        `SELECT id FROM squads WHERE id=$1 AND coach_id=$2`,
        [row.squad_id, user.id]
      );
      if ((owns.rowCount ?? 0) === 0) {
        return next(Object.assign(new Error("Forbidden"), { status: 403 }));
      }
      if (!body.userId) {
        return next(
          Object.assign(new Error("userId is required for coach updates"), {
            status: 400,
          })
        );
      }
    }

    const saved = await fixturesService.setAvailability({
      fixtureId,
      userId: body.userId ?? user.id,
      availability: body.availability,
      actingUserId: user.id,
      actingUserRole: user.role,
    });

    res.status(200).json(saved);
  } catch (error) {
    next(error);
  }
}

export async function updateFixture(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user as ReqUser | undefined;
    if (!user) {
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }

    if (user.role !== "COACH") {
      return next(
        Object.assign(new Error("Forbidden: Coach only"), { status: 403 })
      );
    }

    const { id: fixtureId } = fixtureIdParamSchema.parse(req.params);
    const body = updateFixtureSchema.parse(req.body);

    const changes: {
      opponent?: string;
      kickoffAt?: string;
      location?: string;
      notes?: string;
    } = {};

    if (body.opponent !== undefined) {
      changes.opponent = body.opponent;
    }
    if (body.kickoffAt !== undefined) {
      changes.kickoffAt = body.kickoffAt;
    }
    if (body.location !== undefined) {
      changes.location = body.location;
    }
    if (body.notes !== undefined) {
      changes.notes = body.notes;
    }

    const updatedFixture = await fixturesService.updateFixture({
      fixtureId,
      actingCoachId: user.id,
      changes: changes,
    });

    res.json(updatedFixture);
  } catch (error) {
    next(error);
  }
}

export async function deleteFixture(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user as ReqUser | undefined;
    if (!user) {
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }
    if (user.role !== "COACH") {
      return next(
        Object.assign(new Error("Forbidden: Coach only"), { status: 403 })
      );
    }

    const { id: fixtureId } = fixtureIdParamSchema.parse(req.params);

    const result = await fixturesService.deleteFixture({
      fixtureId,
      actingCoachId: user.id,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
