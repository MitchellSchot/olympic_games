import { describe, it, expect } from "vitest";
import { emptyTally, addTo, perMillion, perHundredBn } from "@/lib/data";

describe("medal calculations", () => {
  it("medal score is 3×gold + 2×silver + 1×bronze", () => {
    const t = emptyTally();
    addTo(t, "gold", 2); addTo(t, "silver", 1); addTo(t, "bronze", 3);
    expect(t.score).toBe(11);
  });
  it("per capita is per 1 million inhabitants", () => {
    expect(perMillion(30, 11_800_000)).toBeCloseTo(2.542, 3);
  });
  it("per GDP is per US$100 billion", () => {
    expect(perHundredBn(33, 6.6e11)).toBeCloseTo(5, 6);
  });
});
