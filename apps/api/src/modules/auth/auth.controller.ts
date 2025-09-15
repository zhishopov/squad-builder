import { NextFunction, Request, Response } from "express";
import { loginSchema, signupSchema } from "./auth.validators";
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

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const token = authService.login(data);

    const isProduction = process.env.NODE_ENV === "production";
    const cookieName = process.env.COOKIE_NAME || "auth_token";

    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
}
