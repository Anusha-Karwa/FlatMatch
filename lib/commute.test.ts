import { describe, expect, it } from "vitest";
import { AREAS, matrixCommute, TRAVEL_MATRIX } from "./commute";

describe("commute matrix", () => {
  it("has a symmetric time for every pair of areas", () => {
    for (const a of AREAS) {
      for (const b of AREAS) {
        const t = matrixCommute.minutes(a, b);
        expect(t, `${a} → ${b}`).toBeGreaterThan(0);
        expect(t).toBe(TRAVEL_MATRIX[b][a]);
      }
    }
  });

  it("matches the case study", () => {
    expect(matrixCommute.minutes("Baner", "Hinjewadi")).toBe(45); // Kavita's rejected Baner flat
    expect(matrixCommute.minutes("Kothrud", "Aundh")).toBeGreaterThan(20); // across town for Riya
  });
});
