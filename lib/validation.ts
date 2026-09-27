import { z } from "zod";
import { AREAS } from "./commute";
import { AMENITIES, NICE_TO_HAVES } from "./types";

const area = z.enum(AREAS);
const furnishing = z.enum(["unfurnished", "semi", "full"]);
const weight = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const preferencesSchema = z.object({
  maxRent: z.number().int().min(1000).max(500000),
  excludedAreas: z.array(area).max(AREAS.length),
  anchors: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40),
        area,
        maxMinutes: z.number().int().min(5).max(180),
      }),
    )
    .max(5),
  dealbreakers: z.object({
    maxFloorWithoutLift: z.number().int().min(0).max(50).nullable(),
    parking: z.boolean(),
    minBathrooms: z.number().int().min(1).max(5),
    petFriendly: z.boolean(),
    minFurnishing: furnishing,
  }),
  niceToHaves: z.record(z.enum(NICE_TO_HAVES), weight),
});

export const listingInputSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    area,
    bhk: z.number().int().min(1).max(6),
    rent: z.number().int().min(1000).max(1000000),
    floor: z.number().int().min(0).max(80),
    totalFloors: z.number().int().min(0).max(80),
    hasLift: z.boolean(),
    parking: z.boolean(),
    bathrooms: z.number().int().min(1).max(6),
    petFriendly: z.boolean(),
    furnished: furnishing,
    amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length),
    description: z.string().trim().max(1000).optional(),
    source: z.enum(["manual", "pasted"]).optional(),
  })
  .refine((l) => l.floor <= l.totalFloors, {
    message: "Floor can't be above the building's total floors",
    path: ["floor"],
  });

export const createGroupSchema = z.object({
  names: z.array(z.string().trim().min(1).max(30)).length(3),
});

export const groupCodeSchema = z.string().regex(/^[A-Z0-9]{6}$/);
export const slotSchema = z.coerce.number().int().min(1).max(3);
