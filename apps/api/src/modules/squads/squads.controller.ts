import { Request, Response, NextFunction } from "express";
import * as squadsService from "./squads.service";
import {
  createSquadSchema,
  squadIdParamSchema,
  addMemberSchema,
} from "./squads.validators";

type Role = "COACH" | "PLAYER";

type ReqUser = {
  id: number;
  email: string;
  role: Role;
};

export async function createSquad(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = createSquadSchema.parse(req.body);

    const user = (req as any).user as ReqUser | undefined;
    if (!user) {
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }

    if (user.role !== "COACH") {
      return next(
        Object.assign(new Error("Forbidden: Coach only"), { status: 403 })
      );
    }

    const squad = await squadsService.createSquad({
      name: data.name,
      coachId: user.id,
    });

    res.status(201).json({
      id: squad.id,
      name: squad.name,
      coachId: squad.coach_id,
      createdAt: squad.created_at,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSquad(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = squadIdParamSchema.parse(req.params);

    const user = (req as any).user as ReqUser | undefined;
    if (!user) {
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }

    const squad = await squadsService.getSquadById(id);

    const isOwner =
      user.role === "COACH" && Number(squad.coachId) === Number(user.id);
    const isMember = squad.members.some(
      (member) => Number(member.userId) === Number(user.id)
    );

    if (!isOwner && !isMember) {
      return next(Object.assign(new Error("Forbidden"), { status: 403 }));
    }

    res.json(squad);
  } catch (error) {
    next(error);
  }
}

export async function addMember(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = squadIdParamSchema.parse(req.params);

    const body = addMemberSchema.parse(req.body);

    const user = (req as any).user as ReqUser | undefined;
    if (!user) {
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }
    if (user.role !== "COACH") {
      return next(
        Object.assign(new Error("Forbidden: Coach only"), { status: 403 })
      );
    }

    const member = await squadsService.addMember({
      squadId: id,
      userId: body.userId,
      preferredPosition: body.preferredPosition,
      actingCoachId: user.id,
    });

    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
}

export async function getMySquad(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user as ReqUser | undefined;
    if (!user) {
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }

    const squad = await squadsService.getSquadForUser({
      userId: user.id,
      role: user.role,
    });

    res.json(squad || null);
  } catch (error) {
    next(error);
  }
}
