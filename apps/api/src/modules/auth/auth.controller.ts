import { NextFunction, Request, Response } from "express";
import { loginSchema, signupSchema } from "./auth.validators";
import * as authService from "./auth.service";

const isProduction = process.env.NODE_ENV === "production";
const cookieName = process.env.COOKIE_NAME || "auth_token";
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    domain: cookieDomain,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  } as const;
}

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
    const token = await authService.login(data);
    res.cookie(cookieName, token, cookieOptions());
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { maxAge, ...clearOpts } = cookieOptions();
    res.clearCookie(cookieName, clearOpts);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const payload = await authService.getCurrentUserFromCookie(req);
    if (!payload) {
      return res.status(401).json({ error: "Not Authenticated" });
    }
    res.json({ id: payload.sub, email: payload.email, role: payload.role });
  } catch (error) {
    next(error);
  }
}
