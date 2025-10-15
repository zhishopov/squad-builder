import { z } from "zod";

export const AvailabilityEnum = z.enum(["YES", "NO", "MAYBE"]);
export type Availability = z.infer<typeof AvailabilityEnum>;

export const fixtureIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "id must be a number")
    .transform((value) => Number(value)),
});

export const squadIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "id must be a number")
    .transform((value) => Number(value)),
});

export const createFixtureSchema = z.object({
  opponent: z
    .string()
    .trim()
    .min(2, "Opponent name must be at least 2 characters")
    .max(100, "Opponent name must be 100 characters or less"),
  kickoffAt: z
    .string()
    .trim()
    .refine((dateString) => !Number.isNaN(Date.parse(dateString)), {
      message: "kickoffAt must be a valid date-time string",
    }),
  location: z
    .string()
    .trim()
    .max(120, "Location must be 120 characters or less")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes must be 1000 characters or less")
    .optional(),
});

export const setAvailabilitySchema = z.object({
  availability: AvailabilityEnum,
  userId: z.number().int().positive().optional(),
});

export const updateFixtureSchema = z
  .object({
    opponent: z
      .string()
      .trim()
      .min(2, "Opponent name must be at least 2 characters")
      .max(100, "Opponent name must be 100 characters or less")
      .optional(),
    kickoffAt: z
      .string()
      .trim()
      .refine((dateString) => !Number.isNaN(Date.parse(dateString)), {
        message: "kickoffAt must be a valid date-time string",
      })
      .optional(),
    location: z
      .string()
      .trim()
      .max(120, "Location must be 120 characters or less")
      .optional(),
    notes: z
      .string()
      .trim()
      .max(1000, "Notes must be 1000 characters or less")
      .optional(),
  })
  .refine(
    (body) =>
      body.opponent !== undefined ||
      body.kickoffAt !== undefined ||
      body.location !== undefined ||
      body.notes !== undefined,
    { message: "At least one field is required" }
  );
