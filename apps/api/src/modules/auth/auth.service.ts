import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../database";

type Role = "COACH" | "PLAYER";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_dev";
const COOKIE_NAME = process.env.COOKIE_NAME || "auth_token";

export async function signup(input: {
  email: string;
  password: string;
  role: Role;
}) {
  const email = input.email.toLowerCase();
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
