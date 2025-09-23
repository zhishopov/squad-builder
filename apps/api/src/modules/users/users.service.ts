import { pool } from "../../database";

type Role = "COACH" | "PLAYER";

export async function findUserByEmail(email: string) {
  const formatEmail = email.toLowerCase().trim();

  const userResponse = await pool.query(
    `SELECT id, email, role FROM users WHERE email=$1`,
    [formatEmail]
  );

  const userRow = userResponse.rows[0];
  if (!userRow) return null;

  return {
    id: userRow.id as number,
    email: userRow.email as string,
    role: userRow.role as Role,
  };
}
