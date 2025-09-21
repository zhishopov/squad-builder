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
  players: z
    .array(
      z.object({
        userId: z.number().int().positive("userId must be a positive integer"),
        position: PositionEnum,
        order: z.number().int().min(1).max(11),
      })
    )
    .min(1, "At least 1 player is required")
    .max(11, "No more than 11 players are allowed"),
});
