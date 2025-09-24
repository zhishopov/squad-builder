import { Request, Response, NextFunction } from "express";
import * as usersService from "./users.service";
import { findUserSchema } from "./users.validators";
import { httpError } from "../../utils/httpError";

type Role = "COACH" | "PLAYER";
type ReqUser = { id: number; email: string; role: Role };

export async function findUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user as ReqUser | undefined;
    if (!user) {
      return next(httpError(401, "Unauthorized"));
    }

    if (user.role !== "COACH") {
      return next(httpError(403, "Forbidden: Coach only"));
    }

    const body = findUserSchema.parse(req.body);
    const foundUser = await usersService.findUserByEmail(body.email);

    if (!foundUser) {
      return next(httpError(404, "User not found"));
    }

    res.json(foundUser);
  } catch (error) {
    next(error);
  }
}
