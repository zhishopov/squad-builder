import { NextFunction, Request, Response } from "express";
import { signupSchema } from "./auth.validators";
import * as authService from "./auth.service";

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const data = signupSchema.parse(req.body);
    const user = await authService.signup(data);

    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (error) {
    next(error);
  }
}
