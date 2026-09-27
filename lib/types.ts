import type { Area } from "./commute";

export type Furnishing = "unfurnished" | "semi" | "full";

export const AMENITIES = [
  "balcony",
  "gym",
  "near_metro",
  "pool",
  "power_backup",
  "security",
  "garden",
] as const;
export type Amenity = (typeof AMENITIES)[number];

/** Nice-to-haves a member can weight. "furnished" is derived from Listing.furnished, the rest from amenities. */
export const NICE_TO_HAVES = ["balcony", "gym", "near_metro", "furnished", "pool", "power_backup", "security", "garden"] as const;
export type NiceToHave = (typeof NICE_TO_HAVES)[number];

export const NICE_TO_HAVE_LABELS: Record<NiceToHave, string> = {
  balcony: "Balcony",
  gym: "Gym in society",
  near_metro: "Near metro",
  furnished: "Furnished",
  pool: "Swimming pool",
  power_backup: "Power backup",
  security: "Gated / security",
  garden: "Garden / open space",
};

export interface Listing {
  id: string;
  title: string;
  area: Area;
  bhk: number;
  rent: number; // total ₹/month
  floor: number; // 0 = ground
  totalFloors: number;
  hasLift: boolean;
  parking: boolean;
  bathrooms: number;
  petFriendly: boolean;
  furnished: Furnishing;
  amenities: Amenity[];
  description?: string;
  source: "seed" | "manual" | "pasted";
  groupId?: string | null;
}

export type ListingInput = Omit<Listing, "id" | "source" | "groupId"> & { source?: "manual" | "pasted" };

export interface Anchor {
  label: string; // e.g. "Office", "Gym & family"
  area: Area;
  maxMinutes: number;
}

export interface Dealbreakers {
  /** null = doesn't mind stairs. Otherwise the highest floor she accepts when there is no lift (0 = ground only). */
  maxFloorWithoutLift: number | null;
  parking: boolean;
  minBathrooms: number;
  petFriendly: boolean;
  minFurnishing: Furnishing; // "unfurnished" = any
}

export interface Preferences {
  maxRent: number; // max contribution per person, ₹/month
  excludedAreas: Area[];
  anchors: Anchor[];
  dealbreakers: Dealbreakers;
  /** weight 1–3; absent = don't care */
  niceToHaves: Partial<Record<NiceToHave, 1 | 2 | 3>>;
}

export interface Member {
  slot: number; // 1..3
  name: string;
}

export interface MemberWithPrefs extends Member {
  preferences: Preferences;
}

// ---------- match results ----------

export type ConstraintKind = "budget" | "area" | "commute" | "lift" | "parking" | "bathrooms" | "pets" | "furnishing";

export interface Violation {
  slot: number;
  name: string;
  kind: ConstraintKind;
  /** full sentence, e.g. "fails Riya's 20-min limit to Gym & family (Aundh) by 4 min" */
  message: string;
  /** how far over, relative to the limit (0.2 = 20% over). Used to rank near misses. */
  relativeMiss: number;
}

export interface PersonBreakdown {
  slot: number;
  name: string;
  score: number; // 0..100, personal satisfaction with this flat
  gets: string[]; // ✅
  compromises: string[]; // ⚠️
  compromiseCost: number; // weighted size of what she gives up
}

export type FairnessLevel = "balanced" | "uneven" | "lopsided";

export interface Fairness {
  level: FairnessLevel;
  spread: number; // max - min personal score
  label: string; // "Balanced", …
  note: string; // "Riya gives up the most here"
  mostCompromising: string | null; // name
}

export interface FlatMatch {
  listing: Listing;
  rentShare: number;
  groupScore: number;
  people: PersonBreakdown[];
  fairness: Fairness;
}

export interface NearMiss {
  listing: Listing;
  rentShare: number;
  violation: Violation;
  people: PersonBreakdown[];
}

export interface MatchResult {
  shortlist: FlatMatch[];
  nearMisses: NearMiss[];
  /** true when fewer than 2 flats passed and near misses are the main suggestion */
  nearMissesArePrimary: boolean;
  conflicts: string[];
  shortlistFairnessNote: string | null;
  stats: {
    totalListings: number;
    considered: number; // with enough bedrooms
    passing: number;
    eliminatedBy: Record<string, number>; // name -> listings failing her dealbreakers
  };
}
