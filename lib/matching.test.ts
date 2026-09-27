import { describe, expect, it } from "vitest";
import type { CommuteProvider } from "./commute";
import { acceptableAreas, evaluateListing, fairnessFor, matchListings } from "./matching";
import { SAMPLE_MEMBERS } from "./sample-group";
import { SEED_LISTINGS } from "./seed-listings";
import type { Listing, MemberWithPrefs, PersonBreakdown, Preferences } from "./types";

// ---------- helpers ----------

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: overrides.id ?? "l1",
    title: "Test flat",
    area: "Balewadi",
    bhk: 3,
    rent: 30000,
    floor: 2,
    totalFloors: 10,
    hasLift: true,
    parking: true,
    bathrooms: 2,
    petFriendly: true,
    furnished: "semi",
    amenities: [],
    source: "seed",
    ...overrides,
  };
}

function member(slot: number, name: string, overrides: Partial<Preferences> = {}): MemberWithPrefs {
  return {
    slot,
    name,
    preferences: {
      maxRent: 20000,
      excludedAreas: [],
      anchors: [],
      dealbreakers: { maxFloorWithoutLift: null, parking: false, minBathrooms: 1, petFriendly: false, minFurnishing: "unfurnished" },
      niceToHaves: {},
      ...overrides,
    },
  };
}

const easyGroup = () => [member(1, "A"), member(2, "B"), member(3, "C")];

const withDealbreakers = (d: Partial<Preferences["dealbreakers"]>): Partial<Preferences> => ({
  dealbreakers: { maxFloorWithoutLift: null, parking: false, minBathrooms: 1, petFriendly: false, minFurnishing: "unfurnished", ...d },
});

const kinds = (l: Listing, members: MemberWithPrefs[]) => evaluateListing(l, members).violations.map((v) => v.kind);

// ---------- the case study ----------

describe("Riya / Meera / Kavita scenario", () => {
  const result = matchListings(SAMPLE_MEMBERS, SEED_LISTINGS);
  const ids = result.shortlist.map((f) => f.listing.id);
  const card = (id: string) => result.shortlist.find((f) => f.listing.id === id)!;
  const person = (id: string, name: string) => card(id).people.find((p) => p.name === name)!;

  it("shortlists 2–3 flats, all in the only areas that work for everyone", () => {
    expect(result.shortlist.length).toBeGreaterThanOrEqual(2);
    expect(result.shortlist.length).toBeLessThanOrEqual(3);
    expect(new Set(ids)).toEqual(new Set(["seed-01", "seed-02", "seed-03"]));
    for (const f of result.shortlist) expect(["Balewadi", "Pimple Saudagar", "Pashan"]).toContain(f.listing.area);
  });

  it("never shortlists a flat that breaks anyone's dealbreaker", () => {
    for (const f of result.shortlist) {
      expect(evaluateListing(f.listing, SAMPLE_MEMBERS).violations).toEqual([]);
    }
  });

  it("rejects the flats from the WhatsApp thread for the same reasons they did", () => {
    const byId = (id: string) => SEED_LISTINGS.find((l) => l.id === id)!;
    // Baner, 45 min to Hinjewadi → Kavita's commute
    const baner = evaluateListing(byId("seed-05"), SAMPLE_MEMBERS).violations;
    expect(baner).toHaveLength(1);
    expect(baner[0]).toMatchObject({ name: "Kavita", kind: "commute" });
    // Kothrud → Riya's no-go list and her 20-min gym/family limit
    const kothrud = evaluateListing(byId("seed-09"), SAMPLE_MEMBERS).violations.filter((v) => v.name === "Riya");
    expect(kothrud.map((v) => v.kind).sort()).toEqual(["area", "commute"]);
    // 3rd floor walk-up → Meera's knee
    const walkup = evaluateListing(byId("seed-06"), SAMPLE_MEMBERS).violations;
    expect(walkup).toEqual([expect.objectContaining({ name: "Meera", kind: "lift" })]);
  });

  it("shows per-person gets and compromises with the numbers", () => {
    expect(person("seed-03", "Kavita").compromises).toContain("40 min to Office (Hinjewadi), limit 40");
    expect(person("seed-02", "Riya").compromises).toContain("No balcony (nice-to-have, weight 3/3)");
    expect(person("seed-01", "Meera").compromises).toContain("Only semi-furnished (nice-to-have, weight 3/3)");
    expect(person("seed-01", "Meera").gets).toContain("Has a lift");
    expect(person("seed-01", "Kavita").gets).toContain("Pet-friendly");
    for (const f of result.shortlist) expect(f.rentShare).toBe(Math.round(f.listing.rent / 3));
  });

  it("names whose constraint each near miss fails, and by how much", () => {
    const messages = result.nearMisses.map((m) => m.violation.message);
    expect(messages).toContain("fails Riya's 20-min limit to Gym & family (Aundh) by 4 min");
    expect(messages).toContain("fails Kavita's 40-min limit to Office (Hinjewadi) by 5 min");
    expect(messages).toContain("fails Meera's ₹15,000 budget by ₹1,000");
    // one near miss per person when possible
    expect(new Set(result.nearMisses.map((m) => m.violation.name)).size).toBe(3);
    expect(result.nearMissesArePrimary).toBe(false);
  });

  it("summarises where the three conflict", () => {
    expect(result.conflicts).toContain("Only 3 areas work for all three: Balewadi, Pashan, Pimple Saudagar.");
    expect(result.conflicts).toContain(
      "Riya's gym & family commute and Kavita's office commute overlap in only 3 areas: Balewadi, Pashan, Pimple Saudagar.",
    );
    expect(result.conflicts.some((c) => c.startsWith("Rent is split 3 ways, so Meera's ₹15,000 limit caps total rent at ₹45,000"))).toBe(true);
    expect(result.conflicts.some((c) => c.includes("Meera's lift requirement rules out"))).toBe(true);
  });

  it("gives each shortlisted flat a fairness indicator", () => {
    for (const f of result.shortlist) {
      expect(["balanced", "uneven", "lopsided"]).toContain(f.fairness.level);
      expect(f.fairness.label).toBeTruthy();
    }
    expect(result.shortlistFairnessNote).toBeTruthy();
  });

  it("is deterministic regardless of listing order", () => {
    const shuffled = [...SEED_LISTINGS].reverse();
    expect(matchListings(SAMPLE_MEMBERS, shuffled)).toEqual(result);
  });
});

// ---------- step 1: hard filter ----------

describe("hard filter", () => {
  it("splits rent three ways and checks each budget", () => {
    const group = [member(1, "A", { maxRent: 12000 }), member(2, "B"), member(3, "C")];
    expect(kinds(listing({ rent: 36000 }), group)).toEqual([]); // exactly 12,000 each
    const v = evaluateListing(listing({ rent: 39000 }), group).violations;
    expect(v).toEqual([expect.objectContaining({ kind: "budget", name: "A", message: "fails A's ₹12,000 budget by ₹1,000" })]);
  });

  it("drops excluded areas", () => {
    const group = [member(1, "A", { excludedAreas: ["Kothrud"] }), member(2, "B"), member(3, "C")];
    expect(kinds(listing({ area: "Kothrud" }), group)).toEqual(["area"]);
    expect(kinds(listing({ area: "Baner" }), group)).toEqual([]);
  });

  it("checks every commute limit using the provider", () => {
    const fixed: CommuteProvider = { minutes: () => 25 };
    const group = [member(1, "A", { anchors: [{ label: "Office", area: "Hinjewadi", maxMinutes: 20 }] }), member(2, "B"), member(3, "C")];
    const v = evaluateListing(listing(), group, fixed).violations;
    expect(v).toEqual([expect.objectContaining({ kind: "commute", message: "fails A's 20-min limit to Office (Hinjewadi) by 5 min" })]);
    expect(evaluateListing(listing(), group, { minutes: () => 20 }).violations).toEqual([]);
  });

  it("applies the lift rule by floor", () => {
    const group = [member(1, "Meera", withDealbreakers({ maxFloorWithoutLift: 1 })), member(2, "B"), member(3, "C")];
    expect(kinds(listing({ hasLift: false, floor: 0 }), group)).toEqual([]);
    expect(kinds(listing({ hasLift: false, floor: 1 }), group)).toEqual([]);
    expect(kinds(listing({ hasLift: false, floor: 2 }), group)).toEqual(["lift"]);
    expect(kinds(listing({ hasLift: true, floor: 12 }), group)).toEqual([]);
  });

  it("applies parking, bathrooms, pets and furnishing dealbreakers", () => {
    const group = [
      member(1, "A", withDealbreakers({ parking: true, minBathrooms: 3 })),
      member(2, "B", withDealbreakers({ petFriendly: true })),
      member(3, "C", withDealbreakers({ minFurnishing: "full" })),
    ];
    const bad = listing({ parking: false, bathrooms: 2, petFriendly: false, furnished: "semi" });
    expect(kinds(bad, group).sort()).toEqual(["bathrooms", "furnishing", "parking", "pets"]);
    const good = listing({ parking: true, bathrooms: 3, petFriendly: true, furnished: "full" });
    expect(kinds(good, group)).toEqual([]);
  });

  it("only considers flats with a bedroom each", () => {
    const r = matchListings(easyGroup(), [listing({ id: "two", bhk: 2 }), listing({ id: "three", bhk: 3 })]);
    expect(r.stats.considered).toBe(1);
    expect(r.shortlist.map((f) => f.listing.id)).toEqual(["three"]);
  });
});

// ---------- step 2: scoring ----------

describe("scoring", () => {
  it("ranks survivors by weighted nice-to-haves", () => {
    const group = [
      member(1, "A", { niceToHaves: { balcony: 3 } }),
      member(2, "B", { niceToHaves: { balcony: 3 } }),
      member(3, "C", { niceToHaves: { balcony: 3 } }),
    ];
    const r = matchListings(group, [listing({ id: "plain" }), listing({ id: "balcony", amenities: ["balcony"] })]);
    expect(r.shortlist[0].listing.id).toBe("balcony");
    expect(r.shortlist[1].people[0].compromises).toContain("No balcony (nice-to-have, weight 3/3)");
  });

  it("gives half credit for semi-furnished", () => {
    const group = [member(1, "A", { niceToHaves: { furnished: 2 } }), member(2, "B"), member(3, "C")];
    const semi = evaluateListing(listing({ furnished: "semi" }), group).people[0];
    const full = evaluateListing(listing({ furnished: "full" }), group).people[0];
    expect(full.score).toBeGreaterThan(semi.score);
    expect(semi.compromiseCost).toBe(1);
  });

  it("flags tight commutes and budgets as compromises", () => {
    const group = [
      member(1, "A", { maxRent: 10500, anchors: [{ label: "Office", area: "Hinjewadi", maxMinutes: 40 }] }),
      member(2, "B"),
      member(3, "C"),
    ];
    const a = evaluateListing(listing({ rent: 30000 }), group, { minutes: () => 38 }).people[0];
    expect(a.compromises).toContain("38 min to Office (Hinjewadi), limit 40");
    expect(a.compromises).toContain("Rent share ₹10,000, close to her ₹10,500 max");
  });
});

// ---------- step 3: fairness ----------

describe("fairness", () => {
  const p = (slot: number, score: number, cost: number): PersonBreakdown => ({
    slot,
    name: `P${slot}`,
    score,
    gets: [],
    compromises: [],
    compromiseCost: cost,
  });

  it("labels spread of personal scores", () => {
    expect(fairnessFor([p(1, 70, 1), p(2, 65, 1), p(3, 60, 2)]).level).toBe("balanced");
    expect(fairnessFor([p(1, 80, 0), p(2, 60, 1), p(3, 58, 2)]).level).toBe("uneven");
    const lopsided = fairnessFor([p(1, 90, 0), p(2, 85, 0), p(3, 30, 6)]);
    expect(lopsided.level).toBe("lopsided");
    expect(lopsided.mostCompromising).toBe("P3");
  });

  it("prefers spread-out compromises even over a higher average", () => {
    const group = [
      member(1, "A", { niceToHaves: { balcony: 3, garden: 3 } }),
      member(2, "B", { niceToHaves: { gym: 3, security: 3 } }),
      member(3, "C", { niceToHaves: { pool: 3, power_backup: 3 } }),
    ];
    // "lopsided": A and B get everything, C nothing (higher average). "spread": everyone gets half.
    const lopsided = listing({ id: "lopsided", amenities: ["balcony", "garden", "gym", "security"] });
    const spread = listing({ id: "spread", amenities: ["balcony", "gym", "pool"] });
    const avg = (id: string) => {
      const e = evaluateListing(id === "spread" ? spread : lopsided, group);
      return e.people.reduce((s, p) => s + p.score, 0) / 3;
    };
    expect(avg("lopsided")).toBeGreaterThan(avg("spread"));
    const r = matchListings(group, [lopsided, spread]);
    expect(r.shortlist[0].listing.id).toBe("spread");
    expect(r.shortlist[1].fairness).toMatchObject({ level: "lopsided", mostCompromising: "C" });
  });

  it("avoids a shortlist where the same person always compromises most", () => {
    const group = [
      member(1, "A", { niceToHaves: { balcony: 3 } }),
      member(2, "B", { niceToHaves: { gym: 3 } }),
      member(3, "C", { niceToHaves: { pool: 3 } }),
    ];
    const listings = [
      listing({ id: "x1", amenities: ["balcony", "gym"] }), // C worst
      listing({ id: "x2", amenities: ["balcony", "gym"], rent: 30500 }), // C worst again
      listing({ id: "y", amenities: ["gym", "pool"], rent: 31000 }), // A worst
    ];
    const r = matchListings(group, listings);
    expect(r.shortlist.slice(0, 2).map((f) => f.listing.id)).toEqual(["x1", "y"]);
  });
});

// ---------- step 4: near misses ----------

describe("near misses", () => {
  it("become the main suggestion when fewer than 2 flats pass", () => {
    const group = [member(1, "Riya", { maxRent: 10000 }), member(2, "B"), member(3, "C", withDealbreakers({ petFriendly: true }))];
    const r = matchListings(group, [
      listing({ id: "ok", rent: 30000 }),
      listing({ id: "pricey", rent: 31500 }), // Riya over by 500
      listing({ id: "double", rent: 33000, petFriendly: false }), // two failures → not a near miss
    ]);
    expect(r.shortlist.map((f) => f.listing.id)).toEqual(["ok"]);
    expect(r.nearMissesArePrimary).toBe(true);
    expect(r.nearMisses.map((m) => m.listing.id)).toEqual(["pricey"]);
    expect(r.nearMisses[0].violation.message).toBe("fails Riya's ₹10,000 budget by ₹500");
  });

  it("orders by how close the miss is", () => {
    const group = [member(1, "A", { anchors: [{ label: "Gym", area: "Aundh", maxMinutes: 20 }] }), member(2, "B"), member(3, "C")];
    const commute: CommuteProvider = { minutes: (from) => (from === "Wakad" ? 24 : from === "Kothrud" ? 35 : 10) };
    const r = matchListings(group, [listing({ id: "far", area: "Kothrud" }), listing({ id: "close", area: "Wakad" })], commute);
    expect(r.nearMisses.map((m) => m.listing.id)).toEqual(["close", "far"]);
  });
});

describe("conflicts", () => {
  it("reports when no area works for everyone", () => {
    const group = [
      member(1, "A", { anchors: [{ label: "Office", area: "Hinjewadi", maxMinutes: 20 }] }),
      member(2, "B", { anchors: [{ label: "Office", area: "Kharadi", maxMinutes: 20 }] }),
      member(3, "C"),
    ];
    const r = matchListings(group, [listing()]);
    expect(r.conflicts[0]).toMatch(/No Pune area satisfies everyone/);
    expect(r.conflicts.some((c) => c.includes("don't overlap in any area"))).toBe(true);
  });

  it("computes acceptable areas from exclusions and commute limits", () => {
    const riya = SAMPLE_MEMBERS[0];
    expect(acceptableAreas(riya)).toEqual(["Pimple Saudagar", "Balewadi", "Baner", "Aundh", "Pashan", "Shivajinagar"]);
  });
});
