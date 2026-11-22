import { describe, expect, it } from "vitest";
import { DEMO_RECORDS, leadsByScore } from "@/features/demo/data";
import { buildBrief, citesFor } from "./brief";
import { DEMO_SCORING, DIMENSIONS, computeFinalScore, scoreBand } from "./scoring";

describe("computeFinalScore", () => {
  it("is the weighted sum of the five dimensions, rounded", () => {
    const score = computeFinalScore({ fit: 100, need: 100, timing: 100, reachability: 100, evidenceQuality: 100 });
    expect(score).toBe(100);
    expect(computeFinalScore({ fit: 0, need: 0, timing: 0, reachability: 0, evidenceQuality: 0 })).toBe(0);
  });

  it("uses weights that add up to 1", () => {
    const total = DIMENSIONS.reduce((sum, { key }) => sum + DEMO_SCORING.weights[key], 0);
    expect(total).toBeCloseTo(1);
  });
});

describe("buildBrief", () => {
  it("cites every claim with a footnote that exists in the sources", () => {
    for (const record of DEMO_RECORDS) {
      const brief = buildBrief(record);
      const numbers = brief.sources.map((source) => source.n);
      for (const part of brief.parts) {
        if (part.type === "claim") expect(numbers).toContain(part.n);
      }
    }
  });

  it("only treats a record as a lead when it has a website problem on file and clears the threshold", () => {
    for (const record of DEMO_RECORDS) {
      const needs = buildBrief(record).needCount;
      expect(record.qualified).toBe(record.finalScore >= DEMO_SCORING.threshold && needs > 0);
    }
  });

  it("lists leads from highest to lowest score", () => {
    const scores = leadsByScore().map((record) => record.finalScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("gives every score dimension at least one citing source on a lead", () => {
    const lead = leadsByScore()[0];
    const brief = buildBrief(lead);
    for (const { key } of DIMENSIONS) {
      expect(citesFor(key, brief.sources, Boolean(lead.contactPath)).length).toBeGreaterThan(0);
    }
  });
});

describe("scoreBand", () => {
  it("names the band at each cut-off", () => {
    expect(scoreBand(100)).toBe("Strong");
    expect(scoreBand(80)).toBe("Strong");
    expect(scoreBand(79)).toBe("Good");
    expect(scoreBand(70)).toBe("Good");
    expect(scoreBand(69)).toBe("Fair");
    expect(scoreBand(0)).toBe("Fair");
  });
});
