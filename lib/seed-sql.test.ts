import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AREAS } from "./commute";
import { SEED_BEGIN, SEED_END, seedListingsSql } from "./seed-sql";
import { SEED_LISTINGS } from "./seed-listings";

describe("seed listings", () => {
  it("supabase/schema.sql is in sync with lib/seed-listings.ts (run `npm run seed:sql` if not)", () => {
    const sql = readFileSync(join(__dirname, "..", "supabase", "schema.sql"), "utf8").replace(/\r\n/g, "\n");
    const block = sql.slice(sql.indexOf(SEED_BEGIN) + SEED_BEGIN.length, sql.indexOf(SEED_END)).trim();
    expect(block).toBe(seedListingsSql());
  });

  it("has ~25 valid listings with unique ids in known areas", () => {
    expect(SEED_LISTINGS.length).toBeGreaterThanOrEqual(25);
    expect(new Set(SEED_LISTINGS.map((l) => l.id)).size).toBe(SEED_LISTINGS.length);
    for (const l of SEED_LISTINGS) {
      expect(AREAS).toContain(l.area);
      expect(l.floor).toBeLessThanOrEqual(l.totalFloors);
    }
  });
});
