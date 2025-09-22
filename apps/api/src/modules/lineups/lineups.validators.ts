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

export const fixtureIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "id must be a number")
    .transform((value) => Number(value)),
});

export const createLineupSchema = z.object({
  formation: z
    .string()
    .trim()
    .max(20, "formation must be 20 characters or less")
    .optional(),
  players: z
    .array(
      z.object({
        userId: z.number().int().positive("userId must be a positive integer"),
        position: PositionEnum,
        order: z.number().int().min(1).max(20),
        starter: z.boolean().optional(),
      })
    )
    .min(1, "At least 1 player is required")
    .max(20, "No more than 20 players are allowed"),
});

export const lineupStatusEnum = z.enum(["DRAFT", "PUBLISHED"]);

export const updateLineupStatusSchema = z.object({
  status: lineupStatusEnum,
});
