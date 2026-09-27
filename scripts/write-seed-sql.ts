/** Rewrites the seed block in supabase/schema.sql from lib/seed-listings.ts. Run: npm run seed:sql */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SEED_BEGIN, SEED_END, seedListingsSql } from "../lib/seed-sql";

const file = join(__dirname, "..", "supabase", "schema.sql");
const sql = readFileSync(file, "utf8");
const start = sql.indexOf(SEED_BEGIN);
const end = sql.indexOf(SEED_END);
if (start === -1 || end === -1) throw new Error("Seed markers not found in schema.sql");
const next = `${sql.slice(0, start)}${SEED_BEGIN}\n${seedListingsSql()}\n${sql.slice(end)}`;
writeFileSync(file, next);
console.log("Updated supabase/schema.sql seed block");
