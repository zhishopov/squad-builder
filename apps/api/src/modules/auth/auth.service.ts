import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../database";
import { Request } from "express";

type Role = "COACH" | "PLAYER";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_dev";
const COOKIE_NAME = process.env.COOKIE_NAME || "auth_token";

export async function signup(input: {
  email: string;
  password: string;
  role: Role;
}) {
  const email = input.email.toLowerCase().trim();
  const hash = await bcrypt.hash(input.password, 10);

  // Insert user into db
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, email, role`,
    [email, hash, input.role]
  );

  return result.rows[0];
}

export async function login(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();

  const result = await pool.query(
    `SELECT id, email, role, password_hash FROM users WHERE email=$1`,
    [email]
  );

  const user = result.rows[0];
  if (!user) {
    // attach status so the middleware doesn't always default to 500 - server error (this is a client error)
    throw Object.assign(new Error("Invalid credentials"), { status: 400 });
  }

  const isValidPassword = await bcrypt.compare(
    input.password,
    user.password_hash
  );

  if (!isValidPassword) {
    // client error so we attach a status
    throw Object.assign(new Error("Invalid credentials"), { status: 400 });
  }

  const token = jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role as Role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return token;
}

export async function getCurrentUserFromCookie(req: Request) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      email: string;
      role: Role;
      iat: number;
      exp: number;
    };

    return payload;
  } catch {
    return null;
  }
}
