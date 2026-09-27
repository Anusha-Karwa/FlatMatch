/**
 * Approximate peak-hour travel times (minutes, by car/two-wheeler) between Pune areas.
 *
 * This is a hand-built stand-in for a maps API. Everything in the app asks a
 * `CommuteProvider` for times, so a Google Maps Distance Matrix provider can replace
 * `matrixCommute` later: fetch the matrix once for the areas involved, then answer
 * `minutes()` synchronously from that cache (the matching engine stays deterministic).
 */

export const AREAS = [
  "Hinjewadi",
  "Wakad",
  "Pimple Saudagar",
  "Balewadi",
  "Baner",
  "Aundh",
  "Pashan",
  "Bavdhan",
  "Kothrud",
  "Shivajinagar",
  "Camp",
  "Koregaon Park",
  "Kalyani Nagar",
  "Viman Nagar",
  "Kharadi",
  "Hadapsar",
] as const;

export type Area = (typeof AREAS)[number];

export function isArea(value: unknown): value is Area {
  return typeof value === "string" && (AREAS as readonly string[]).includes(value);
}

/** Travel within the same area. */
const SAME_AREA_MINUTES = 10;

/**
 * Upper triangle of the symmetric matrix. Row i lists times from AREAS[i] to AREAS[i+1..].
 * Rough peak-traffic estimates; tune freely.
 */
const UPPER: number[][] = [
  // Hinjewadi → Wakad, Pimple Saudagar, Balewadi, Baner, Aundh, Pashan, Bavdhan, Kothrud, Shivajinagar, Camp, Koregaon Park, Kalyani Nagar, Viman Nagar, Kharadi, Hadapsar
  [20, 30, 32, 45, 45, 40, 35, 55, 60, 75, 80, 80, 85, 95, 95],
  // Wakad → Pimple Saudagar … Hadapsar
  [15, 18, 20, 24, 30, 30, 45, 45, 60, 65, 65, 70, 80, 80],
  // Pimple Saudagar → Balewadi … Hadapsar
  [20, 22, 18, 30, 35, 45, 40, 50, 55, 55, 60, 70, 70],
  // Balewadi → Baner … Hadapsar
  [10, 18, 20, 25, 40, 35, 50, 55, 55, 60, 70, 70],
  // Baner → Aundh … Hadapsar
  [15, 12, 20, 35, 30, 45, 50, 50, 55, 65, 65],
  // Aundh → Pashan … Hadapsar
  [18, 25, 35, 20, 35, 40, 40, 45, 55, 55],
  // Pashan → Bavdhan … Hadapsar
  [15, 30, 30, 45, 50, 50, 55, 65, 60],
  // Bavdhan → Kothrud … Hadapsar
  [20, 35, 45, 50, 55, 60, 70, 60],
  // Kothrud → Shivajinagar … Hadapsar
  [25, 35, 40, 45, 50, 60, 50],
  // Shivajinagar → Camp … Hadapsar
  [20, 25, 25, 30, 40, 40],
  // Camp → Koregaon Park … Hadapsar
  [15, 20, 25, 35, 25],
  // Koregaon Park → Kalyani Nagar … Hadapsar
  [12, 20, 25, 25],
  // Kalyani Nagar → Viman Nagar, Kharadi, Hadapsar
  [12, 20, 30],
  // Viman Nagar → Kharadi, Hadapsar
  [18, 35],
  // Kharadi → Hadapsar
  [25],
];

function buildMatrix(): Record<Area, Record<Area, number>> {
  const m = {} as Record<Area, Record<Area, number>>;
  for (const a of AREAS) m[a] = {} as Record<Area, number>;
  AREAS.forEach((from, i) => {
    m[from][from] = SAME_AREA_MINUTES;
    UPPER[i]?.forEach((mins, k) => {
      const to = AREAS[i + 1 + k];
      m[from][to] = mins;
      m[to][from] = mins;
    });
  });
  return m;
}

export const TRAVEL_MATRIX = buildMatrix();

export interface CommuteProvider {
  /** Minutes from a flat in `from` to a place in `to`. Must be synchronous and deterministic. */
  minutes(from: Area, to: Area): number;
}

export const matrixCommute: CommuteProvider = {
  minutes(from, to) {
    const v = TRAVEL_MATRIX[from]?.[to];
    if (v === undefined) throw new Error(`No travel time for ${from} → ${to}`);
    return v;
  },
};
