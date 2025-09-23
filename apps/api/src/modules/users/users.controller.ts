import { Request, Response, NextFunction } from "express";
import * as usersService from "./users.service";
import { findUserSchema } from "./users.validators";

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
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }

    if (user.role !== "COACH") {
      return next(
        Object.assign(new Error("Forbidden: Coach only"), { status: 403 })
      );
    }

    const body = findUserSchema.parse(req.body);
    const foundUser = await usersService.findUserByEmail(body.email);

    if (!foundUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(foundUser);
  } catch (error) {
    next(error);
  }
}
