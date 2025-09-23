import { z } from "zod";

export const findUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
});
