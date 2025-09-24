import { NextFunction, Request, Response } from "express";
import * as authService from "../modules/auth/auth.service";

type Role = "COACH" | "PLAYER";

type RequestUser = {
  id: number;
  email: string;
  role: Role;
};

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user as RequestUser | undefined;

    if (!user) {
      const payload = await authService.getCurrentUserFromCookie(req);
      if (!payload) {
        const error = Object.assign(new Error("Unauthorized"), { status: 401 });
        return next(error);
      }
      (req as any).user = {
        id: Number(payload.sub),
        email: payload.email,
        role: payload.role,
      } as RequestUser;
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function requireCoach(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as RequestUser | undefined;

  if (!user) {
    const error = Object.assign(new Error("Unauthorized"), { status: 401 });
    return next(error);
  }

  if (user.role !== "COACH") {
    const error = Object.assign(new Error("Forbidden: Coach only"), {
      status: 403,
    });
    return next(error);
  }
  next();
}

export async function setUserFromCookie(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const payload = await authService.getCurrentUserFromCookie(req);

    if (payload) {
      (req as any).user = {
        id: Number(payload.sub),
        email: payload.email,
        role: payload.role,
      } as RequestUser;
    } else {
      (req as any).user = undefined;
    }

    next();
  } catch (_err) {
    (req as any).user = undefined;
    next();
  }
}
