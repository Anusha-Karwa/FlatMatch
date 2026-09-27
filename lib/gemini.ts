import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AREAS, type Area } from "./commute";
import type { ResultsView } from "./groups";
import { AMENITIES, type Amenity, type Furnishing, type ListingInput } from "./types";

/**
 * Gemini is used for exactly two things, never for filtering or ranking:
 *   (a) neutral tradeoff paragraphs written from the deterministic match results
 *   (b) turning pasted listing text into structured fields the user then reviews
 */

export function isGeminiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function model(systemInstruction: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(key).getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    systemInstruction,
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });
}

const EXPLAIN_SYSTEM = `You explain flat-hunting tradeoffs to a group of three flatmates.
Rules:
- Stay strictly neutral. Never recommend, rank, favour or pick a flat, and never say which one is "best" or what they "should" do.
- Use ONLY the facts in the JSON you are given. Never invent details (no amenities, distances, prices or opinions that are not in the data).
- For each flat, write one short paragraph (2-4 sentences) naming, per person, what she gets and what she gives up, with the numbers given.
- Plain, warm, concise English. No bullet points, no markdown.
Respond with JSON: {"explanations":[{"id":"<flat id>","text":"<paragraph>"}]}`;

export async function explainTradeoffs(view: ResultsView): Promise<Record<string, string>> {
  const flats = view.result.shortlist.map((f) => ({
    id: f.listing.id,
    title: f.listing.title,
    area: f.listing.area,
    totalRent: f.listing.rent,
    rentSharePerPerson: f.rentShare,
    fairness: `${f.fairness.label}: ${f.fairness.note}`,
    people: f.people.map((p) => ({ name: p.name, gets: p.gets, givesUp: p.compromises })),
  }));
  if (!flats.length) return {};
  const res = await model(EXPLAIN_SYSTEM).generateContent(JSON.stringify({ flats }));
  const parsed = JSON.parse(res.response.text()) as { explanations?: { id: string; text: string }[] };
  const known = new Set(flats.map((f) => f.id));
  const out: Record<string, string> = {};
  for (const e of parsed.explanations ?? []) {
    if (known.has(e.id) && typeof e.text === "string") out[e.id] = e.text.trim().slice(0, 1500);
  }
  return out;
}

const PARSE_SYSTEM = `You extract structured data from a pasted Indian rental listing (Pune).
Only use information present in the text. If a field is not mentioned, use null. Do not guess.
Return JSON with exactly these keys:
{"title": string|null, "area": string|null, "bhk": number|null, "rent": number|null (total monthly rent in rupees, e.g. "45k" -> 45000),
 "floor": number|null (0 for ground), "totalFloors": number|null, "hasLift": boolean|null, "parking": boolean|null,
 "bathrooms": number|null, "petFriendly": boolean|null, "furnished": "unfurnished"|"semi"|"full"|null,
 "amenities": string[] (subset of: ${AMENITIES.join(", ")}), "description": string|null (one-line summary)}
For "area", use the Pune locality name as written (e.g. "Baner", "Wakad", "Pimple Saudagar").`;

export interface ParsedListing {
  fields: Partial<ListingInput>;
  warnings: string[];
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined);
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);

export function matchArea(raw: string | null | undefined): Area | undefined {
  if (!raw) return undefined;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const r = norm(raw);
  return AREAS.find((a) => norm(a) === r) ?? AREAS.find((a) => r.includes(norm(a)) || norm(a).includes(r));
}

export async function parseListingText(text: string): Promise<ParsedListing> {
  const res = await model(PARSE_SYSTEM).generateContent(text.slice(0, 6000));
  const raw = JSON.parse(res.response.text()) as Record<string, unknown>;
  const warnings: string[] = [];
  const fields: Partial<ListingInput> = { source: "pasted" };

  if (typeof raw.title === "string") fields.title = raw.title.slice(0, 120);
  const area = matchArea(typeof raw.area === "string" ? raw.area : null);
  if (area) fields.area = area;
  else if (raw.area) warnings.push(`"${String(raw.area)}" isn't one of the supported areas. Pick the closest one.`);
  fields.bhk = num(raw.bhk);
  fields.rent = num(raw.rent);
  fields.floor = num(raw.floor);
  fields.totalFloors = num(raw.totalFloors);
  fields.hasLift = bool(raw.hasLift);
  fields.parking = bool(raw.parking);
  fields.bathrooms = num(raw.bathrooms);
  fields.petFriendly = bool(raw.petFriendly);
  if (raw.furnished === "unfurnished" || raw.furnished === "semi" || raw.furnished === "full") fields.furnished = raw.furnished as Furnishing;
  if (Array.isArray(raw.amenities)) {
    fields.amenities = raw.amenities.filter((a): a is Amenity => (AMENITIES as readonly string[]).includes(a as string));
  }
  if (typeof raw.description === "string") fields.description = raw.description.slice(0, 1000);

  const missing = (["area", "bhk", "rent", "floor", "hasLift", "parking", "bathrooms", "petFriendly", "furnished"] as const).filter(
    (k) => fields[k] === undefined,
  );
  if (missing.length) warnings.push(`Not found in the text, please fill in: ${missing.join(", ")}.`);
  return { fields, warnings };
}
