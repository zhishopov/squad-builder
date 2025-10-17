import { NextFunction, Request, Response } from "express";
import * as authService from "../modules/auth/auth.service";
import jwt from "jsonwebtoken";

type Role = "COACH" | "PLAYER";

export interface RequestUser {
  id: number;
  email: string;
  role: Role;
}

function extractBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.authorization;
  if (!authorizationHeader) return null;

  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader);
  if (!match || !match[1]) return null;

  return match[1];
}

function decodeJwtToken(
  token: string
): { sub: string | number; email: string; role: Role } | null {
  try {
    const decodedPayload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decodedPayload && decodedPayload.sub ? decodedPayload : null;
  } catch {
    return null;
  }
}

async function identifyUserFromRequest(
  request: Request
): Promise<RequestUser | undefined> {
  const cookiePayload = await authService
    .getCurrentUserFromCookie(request)
    .catch(() => undefined);
  if (cookiePayload) {
    return {
      id: Number(cookiePayload.sub),
      email: cookiePayload.email,
      role: cookiePayload.role,
    };
  }

  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    const decodedToken = decodeJwtToken(bearerToken);
    if (decodedToken?.sub) {
      return {
        id: Number(decodedToken.sub),
        email: decodedToken.email,
        role: decodedToken.role,
      };
    }
  }

  return undefined;
}

export async function requireAuth(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  try {
    const existingUser = (request as any).user as RequestUser | undefined;
    if (existingUser) return next();

    const authenticatedUser = await identifyUserFromRequest(request);
    if (!authenticatedUser) {
      return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
    }

    (request as any).user = authenticatedUser;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireCoach(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const authenticatedUser = (request as any).user as RequestUser | undefined;

  if (!authenticatedUser) {
    return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
  }

  if (authenticatedUser.role !== "COACH") {
    return next(
      Object.assign(new Error("Forbidden: Coach only"), { status: 403 })
    );
  }

  next();
}

export async function setUserFromCookie(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const identifiedUser = await identifyUserFromRequest(request);
    (request as any).user = identifiedUser;
    next();
  } catch {
    (request as any).user = undefined;
    next();
  }
}
