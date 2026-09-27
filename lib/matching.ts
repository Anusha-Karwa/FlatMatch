/**
 * Deterministic matching engine. No LLM, no randomness: same inputs → same output.
 *
 *   1. Hard filter  — drop listings that break ANY member's dealbreaker.
 *   2. Score        — per person, weighted nice-to-haves + how much slack she has on budget/commute.
 *   3. Fairness     — prefer flats where compromises are spread out, and a shortlist where
 *                     the person giving up the most isn't the same every time.
 *   4. Near misses  — listings failing exactly ONE constraint, saying whose and by how much.
 *   + Conflicts     — plain-language summary of where the group's constraints collide.
 */
import { AREAS, matrixCommute, type Area, type CommuteProvider } from "./commute";
import { formatFloor, inr } from "./format";
import {
  NICE_TO_HAVE_LABELS,
  type ConstraintKind,
  type Fairness,
  type FlatMatch,
  type Furnishing,
  type Listing,
  type MatchResult,
  type MemberWithPrefs,
  type NearMiss,
  type NiceToHave,
  type PersonBreakdown,
  type Violation,
} from "./types";

/** A commute at or above this share of the limit counts as a compromise. */
export const TIGHT_COMMUTE_RATIO = 0.85;
/** A rent share at or above this share of the budget counts as a compromise. */
export const TIGHT_BUDGET_RATIO = 0.9;
/** How strongly within-flat score spread counts against a flat. */
const SPREAD_PENALTY = 0.5;
/** Shortlist penalty each time the same person would again be the worst-off. */
const REPEAT_WORST_OFF_PENALTY = 8;
export const MAX_SHORTLIST = 3;
export const MAX_NEAR_MISSES = 3;

const FURNISHING_RANK: Record<Furnishing, number> = { unfurnished: 0, semi: 1, full: 2 };
const FURNISHING_LABEL: Record<Furnishing, string> = { unfurnished: "unfurnished", semi: "semi-furnished", full: "fully furnished" };
const FURNISHED_CREDIT: Record<Furnishing, number> = { unfurnished: 0, semi: 0.5, full: 1 };

interface MemberEvaluation {
  violations: Violation[];
  person: PersonBreakdown;
}

export interface ListingEvaluation {
  listing: Listing;
  rentShare: number;
  violations: Violation[];
  people: PersonBreakdown[];
  groupScore: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function rentShare(listing: Listing, groupSize: number): number {
  return Math.round(listing.rent / groupSize);
}

export function evaluateForMember(
  listing: Listing,
  member: MemberWithPrefs,
  share: number,
  commute: CommuteProvider = matrixCommute,
): MemberEvaluation {
  const { name, slot } = member;
  const p = member.preferences;
  const d = p.dealbreakers;
  const violations: Violation[] = [];
  const gets: string[] = [];
  const compromises: string[] = [];
  const slacks: number[] = [];
  let cost = 0;

  const fail = (kind: ConstraintKind, message: string, relativeMiss: number) =>
    violations.push({ slot, name, kind, message, relativeMiss: Math.round(relativeMiss * 1000) / 1000 });

  // Budget
  if (share > p.maxRent) {
    fail("budget", `fails ${name}'s ${inr(p.maxRent)} budget by ${inr(share - p.maxRent)}`, (share - p.maxRent) / p.maxRent);
  } else {
    slacks.push((p.maxRent - share) / p.maxRent);
    if (share >= TIGHT_BUDGET_RATIO * p.maxRent) {
      compromises.push(share === p.maxRent ? `Rent share ${inr(share)}, right at her max` : `Rent share ${inr(share)}, close to her ${inr(p.maxRent)} max`);
      cost += 1;
    } else {
      gets.push(`Rent share ${inr(share)} (max ${inr(p.maxRent)})`);
    }
  }

  // Areas she won't consider
  if (p.excludedAreas.includes(listing.area)) {
    fail("area", `${listing.area} is on ${name}'s no-go list`, 1);
  }

  // Commute to each key place
  for (const a of p.anchors) {
    const mins = commute.minutes(listing.area, a.area);
    const place = `${a.label} (${a.area})`;
    if (mins > a.maxMinutes) {
      fail("commute", `fails ${name}'s ${a.maxMinutes}-min limit to ${place} by ${mins - a.maxMinutes} min`, (mins - a.maxMinutes) / a.maxMinutes);
    } else {
      slacks.push(1 - mins / a.maxMinutes);
      if (mins >= TIGHT_COMMUTE_RATIO * a.maxMinutes) {
        compromises.push(`${mins} min to ${place}, limit ${a.maxMinutes}`);
        cost += 1;
      } else {
        gets.push(`${mins} min to ${place}, well within ${a.maxMinutes}`);
      }
    }
  }

  // Lift / stairs
  if (d.maxFloorWithoutLift !== null) {
    if (listing.hasLift) {
      if (listing.floor > d.maxFloorWithoutLift) gets.push("Has a lift");
    } else if (listing.floor > d.maxFloorWithoutLift) {
      const over = listing.floor - d.maxFloorWithoutLift;
      fail(
        "lift",
        `${formatFloor(listing.floor)} with no lift. ${name} can't do stairs above the ${formatFloor(d.maxFloorWithoutLift)}`,
        over / (d.maxFloorWithoutLift + 1),
      );
    } else {
      gets.push(`${capitalize(formatFloor(listing.floor))}, no lift needed`);
    }
  }

  if (d.parking) {
    if (listing.parking) gets.push("Parking");
    else fail("parking", `no parking, and ${name} needs parking`, 1);
  }

  if (listing.bathrooms < d.minBathrooms) {
    fail("bathrooms", `only ${listing.bathrooms} bathroom${listing.bathrooms === 1 ? "" : "s"}, and ${name} needs ${d.minBathrooms}`, (d.minBathrooms - listing.bathrooms) / d.minBathrooms);
  } else if (d.minBathrooms > 1) {
    gets.push(`${listing.bathrooms} bathrooms (needs ${d.minBathrooms})`);
  }

  if (d.petFriendly) {
    if (listing.petFriendly) gets.push("Pet-friendly");
    else fail("pets", `not pet-friendly, and ${name} needs a pet-friendly flat`, 1);
  }

  if (FURNISHING_RANK[listing.furnished] < FURNISHING_RANK[d.minFurnishing]) {
    fail(
      "furnishing",
      `${FURNISHING_LABEL[listing.furnished]}, and ${name} needs at least ${FURNISHING_LABEL[d.minFurnishing]}`,
      (FURNISHING_RANK[d.minFurnishing] - FURNISHING_RANK[listing.furnished]) / 2,
    );
  }

  // Nice-to-haves
  let total = 0;
  let met = 0;
  const entries = Object.entries(p.niceToHaves) as [NiceToHave, 1 | 2 | 3][];
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [key, weight] of entries) {
    if (!weight) continue;
    total += weight;
    const credit = key === "furnished" ? FURNISHED_CREDIT[listing.furnished] : listing.amenities.includes(key) ? 1 : 0;
    met += weight * credit;
    const label = NICE_TO_HAVE_LABELS[key];
    const tag = `nice-to-have, weight ${weight}/3`;
    if (credit === 1) {
      gets.push(key === "furnished" ? "Fully furnished" : label);
    } else if (credit > 0) {
      compromises.push(`Only semi-furnished (${tag})`);
      cost += weight * (1 - credit);
    } else {
      compromises.push(key === "furnished" ? `Unfurnished (${tag})` : `No ${label.toLowerCase()} (${tag})`);
      cost += weight;
    }
  }

  const niceRatio = total > 0 ? met / total : 1;
  const slack = slacks.length ? slacks.reduce((s, x) => s + x, 0) / slacks.length : 1;
  const score = Math.round(100 * (0.7 * niceRatio + 0.3 * slack));

  return {
    violations,
    person: { slot, name, score, gets, compromises, compromiseCost: round1(cost) },
  };
}

export function evaluateListing(
  listing: Listing,
  members: MemberWithPrefs[],
  commute: CommuteProvider = matrixCommute,
): ListingEvaluation {
  const share = rentShare(listing, members.length);
  const evals = members.map((m) => evaluateForMember(listing, m, share, commute));
  const people = evals.map((e) => e.person);
  const scores = people.map((p) => p.score);
  const mean = scores.reduce((s, x) => s + x, 0) / scores.length;
  const spread = Math.max(...scores) - Math.min(...scores);
  return {
    listing,
    rentShare: share,
    violations: evals.flatMap((e) => e.violations),
    people,
    groupScore: round1(mean - SPREAD_PENALTY * spread),
  };
}

export function fairnessFor(people: PersonBreakdown[]): Fairness {
  const scores = people.map((p) => p.score);
  const spread = Math.max(...scores) - Math.min(...scores);
  const byCost = [...people].sort((a, b) => b.compromiseCost - a.compromiseCost);
  const top = byCost[0];
  const mostCompromising = top && top.compromiseCost > 0 && top.compromiseCost > (byCost[1]?.compromiseCost ?? 0) ? top.name : null;

  if (spread < 15) {
    return {
      level: "balanced",
      spread,
      label: "Balanced",
      note: mostCompromising ? `Fairly even. ${mostCompromising} gives up slightly more.` : "Compromises are spread evenly.",
      mostCompromising,
    };
  }
  const level = spread < 30 ? "uneven" : "lopsided";
  return {
    level,
    spread,
    label: level === "uneven" ? "Somewhat uneven" : "Uneven",
    note: mostCompromising ? `${mostCompromising} gives up the most here.` : "Some people get noticeably more than others.",
    mostCompromising,
  };
}

/** The person this flat asks the most of: lowest score, then highest compromise cost, then slot. */
function worstOff(people: PersonBreakdown[]): PersonBreakdown {
  return [...people].sort((a, b) => a.score - b.score || b.compromiseCost - a.compromiseCost || a.slot - b.slot)[0];
}

const byTieBreak = (a: ListingEvaluation, b: ListingEvaluation) => a.listing.rent - b.listing.rent || a.listing.id.localeCompare(b.listing.id);

/** Greedy pick: best group score, penalising options where the same person is again the worst-off. */
function pickShortlist(passing: ListingEvaluation[]): ListingEvaluation[] {
  const remaining = [...passing];
  const picked: ListingEvaluation[] = [];
  const worstCounts = new Map<number, number>();
  while (picked.length < MAX_SHORTLIST && remaining.length) {
    let bestIdx = 0;
    let bestAdj = -Infinity;
    remaining.forEach((e, i) => {
      const adj = e.groupScore - REPEAT_WORST_OFF_PENALTY * (worstCounts.get(worstOff(e.people).slot) ?? 0);
      if (adj > bestAdj || (adj === bestAdj && byTieBreak(e, remaining[bestIdx]) < 0)) {
        bestAdj = adj;
        bestIdx = i;
      }
    });
    const [chosen] = remaining.splice(bestIdx, 1);
    picked.push(chosen);
    const w = worstOff(chosen.people).slot;
    worstCounts.set(w, (worstCounts.get(w) ?? 0) + 1);
  }
  return picked;
}

/** Closest misses first, but try to name a different person's constraint in each one. */
function pickNearMisses(candidates: ListingEvaluation[]): ListingEvaluation[] {
  const sorted = [...candidates].sort(
    (a, b) => a.violations[0].relativeMiss - b.violations[0].relativeMiss || b.groupScore - a.groupScore || byTieBreak(a, b),
  );
  const picked: ListingEvaluation[] = [];
  const seen = new Set<number>();
  for (const e of sorted) {
    if (picked.length >= MAX_NEAR_MISSES) break;
    if (seen.has(e.violations[0].slot)) continue;
    picked.push(e);
    seen.add(e.violations[0].slot);
  }
  for (const e of sorted) {
    if (picked.length >= MAX_NEAR_MISSES) break;
    if (!picked.includes(e)) picked.push(e);
  }
  return picked;
}

function shortlistFairnessNote(shortlist: FlatMatch[]): string | null {
  if (shortlist.length < 2) return null;
  const names = shortlist.map((f) => worstOff(f.people).name);
  const counts = new Map<string, number>();
  names.forEach((n) => counts.set(n, (counts.get(n) ?? 0) + 1));
  if (counts.size === names.length) {
    return `Each option asks the most of a different person (${names.join(", ")}), so no one is always the one compromising.`;
  }
  const [topName, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCount === names.length) return `${topName} compromises the most in every option. Worth talking about.`;
  return `${topName} compromises the most in ${topCount} of ${names.length} options.`;
}

// ---------- conflicts ----------

/** Areas a member would accept as a flat location: not excluded, and every commute within limit. */
export function acceptableAreas(member: MemberWithPrefs, commute: CommuteProvider = matrixCommute): Area[] {
  const p = member.preferences;
  return AREAS.filter((a) => !p.excludedAreas.includes(a) && p.anchors.every((an) => commute.minutes(a, an.area) <= an.maxMinutes));
}

function describeAreaLimits(m: MemberWithPrefs): string {
  const anchors = m.preferences.anchors;
  if (!anchors.length) return `${m.name}'s areas`;
  const labels = anchors.map((a) => a.label.toLowerCase()).join(" and ");
  return `${m.name}'s ${labels} commute`;
}

const listAreas = (areas: Area[]) => [...areas].sort().join(", ");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const DEALBREAKER_LABEL: Partial<Record<ConstraintKind, string>> = {
  lift: "lift requirement",
  parking: "parking requirement",
  bathrooms: "bathroom minimum",
  pets: "pet-friendly requirement",
  furnishing: "furnishing requirement",
};

function buildConflicts(members: MemberWithPrefs[], evaluations: ListingEvaluation[], commute: CommuteProvider): string[] {
  const out: string[] = [];
  const perMember = members.map((m) => acceptableAreas(m, commute));
  const everyone = AREAS.filter((a) => perMember.every((set) => set.includes(a)));

  if (everyone.length === 0) {
    out.push("No Pune area satisfies everyone's area and commute limits at once, so at least one limit will have to stretch.");
  } else if (everyone.length <= 5) {
    out.push(`Only ${plural(everyone.length, "area")} work${everyone.length === 1 ? "s" : ""} for all three: ${listAreas(everyone)}.`);
  } else {
    out.push(`${everyone.length} areas work for everyone: ${listAreas(everyone)}.`);
  }

  // Pairs whose area/commute limits genuinely squeeze each other.
  const pairs: { text: string; size: number }[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const overlap = perMember[i].filter((a) => perMember[j].includes(a));
      const squeezes = overlap.length < Math.min(perMember[i].length, perMember[j].length);
      if (!squeezes || overlap.length > 5) continue;
      const who = `${describeAreaLimits(members[i])} and ${describeAreaLimits(members[j])}`;
      pairs.push({
        size: overlap.length,
        text: overlap.length
          ? `${capitalize(who)} overlap in only ${plural(overlap.length, "area")}: ${listAreas(overlap)}.`
          : `${capitalize(who)} don't overlap in any area.`,
      });
    }
  }
  pairs.sort((a, b) => a.size - b.size || a.text.localeCompare(b.text));
  out.push(...pairs.slice(0, 2).map((p) => p.text));

  // Budget: rent is split equally, so the lowest budget sets the cap.
  const minRent = Math.min(...members.map((m) => m.preferences.maxRent));
  const lowest = members.filter((m) => m.preferences.maxRent === minRent).map((m) => m.name);
  const cap = minRent * members.length;
  const inShared = evaluations.filter((e) => everyone.includes(e.listing.area));
  const overCap = inShared.filter((e) => e.listing.rent > cap).length;
  let budget = `Rent is split ${members.length} ways, so ${lowest.join(" and ")}'s ${inr(minRent)} limit caps total rent at ${inr(cap)}`;
  budget += overCap ? `. That rules out ${overCap} of ${inShared.length} listings in the areas that work for everyone.` : ".";
  out.push(budget);

  // The single strongest dealbreaker per member.
  const blockers: string[] = [];
  for (const m of members) {
    const counts = new Map<ConstraintKind, number>();
    for (const e of evaluations) {
      const kinds = new Set(e.violations.filter((v) => v.slot === m.slot && DEALBREAKER_LABEL[v.kind]).map((v) => v.kind));
      kinds.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (top) blockers.push(`${m.name}'s ${DEALBREAKER_LABEL[top[0]]} rules out ${plural(top[1], "listing")}`);
  }
  if (blockers.length) out.push(`${blockers.join("; ")}.`);

  return out;
}

// ---------- main entry ----------

export function matchListings(
  members: MemberWithPrefs[],
  listings: Listing[],
  commute: CommuteProvider = matrixCommute,
): MatchResult {
  if (!members.length) throw new Error("matchListings needs at least one member");
  const sortedMembers = [...members].sort((a, b) => a.slot - b.slot);

  // Everyone needs their own bedroom.
  const considered = listings.filter((l) => l.bhk >= sortedMembers.length);
  const evaluations = considered.map((l) => evaluateListing(l, sortedMembers, commute));

  const passing = evaluations.filter((e) => e.violations.length === 0);
  const shortlist: FlatMatch[] = pickShortlist(passing).map((e) => ({
    listing: e.listing,
    rentShare: e.rentShare,
    groupScore: e.groupScore,
    people: e.people,
    fairness: fairnessFor(e.people),
  }));

  const nearMisses: NearMiss[] = pickNearMisses(evaluations.filter((e) => e.violations.length === 1)).map((e) => ({
    listing: e.listing,
    rentShare: e.rentShare,
    violation: e.violations[0],
    people: e.people,
  }));

  const eliminatedBy: Record<string, number> = {};
  for (const m of sortedMembers) {
    eliminatedBy[m.name] = evaluations.filter((e) => e.violations.some((v) => v.slot === m.slot)).length;
  }

  return {
    shortlist,
    nearMisses,
    nearMissesArePrimary: passing.length < 2,
    conflicts: buildConflicts(sortedMembers, evaluations, commute),
    shortlistFairnessNote: shortlistFairnessNote(shortlist),
    stats: { totalListings: listings.length, considered: considered.length, passing: passing.length, eliminatedBy },
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
