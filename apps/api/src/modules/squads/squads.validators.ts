import { z } from "zod";

export const PositionEnum = z.enum([
  "GK",
  "RB",
  "CB",
  "LB",
  "RWB",
  "LWB",
  "CDM",
  "CM",
  "CAM",
  "RW",
  "LW",
  "ST",
  "CF",
  "UNASSIGNED",
]);

export const createSquadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or less"),
});

export const squadIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "ID must be a number")
    .transform((value) => Number(value)),
});

export type Position = z.infer<typeof PositionEnum>;

export const addMemberSchema = z.object({
  userId: z.number().int().positive("userId must be a positive integer"),
  preferredPosition: PositionEnum,
});
