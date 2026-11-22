import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RunError, overlaps, runDemoValidation } from "./demo-run";

const sample = readFileSync(new URL("../../../public/sample-candidates.csv", import.meta.url), "utf8");
const campaign = { name: "Delhi dental opportunities", service: "redesign", industry: "Dentist", location: "Delhi" } as const;

describe("runDemoValidation", () => {
  it("keeps only rows that match the campaign industry and location", () => {
    const result = runDemoValidation(sample, campaign);
    const names = result.candidates.map((candidate) => candidate.businessName);
    expect(names).toContain("Northstar Dental Studio");
    expect(names).not.toContain("Jaipur Dental House");
    expect(result.stats.deterministicFiltered).toBeGreaterThan(0);
  });

  it("gives every candidate at least its source evidence, with a URL and a timestamp", () => {
    const result = runDemoValidation(sample, campaign);
    for (const candidate of result.candidates) {
      expect(candidate.evidence.length).toBeGreaterThan(0);
      for (const item of candidate.evidence) {
        expect(item.sourceUrl).toMatch(/^https?:\/\//);
        expect(Number.isNaN(Date.parse(item.observedAt))).toBe(false);
      }
    }
  });

  it("counts evidence observations and marks the run as simulated", () => {
    const result = runDemoValidation(sample, campaign);
    const total = result.candidates.reduce((sum, candidate) => sum + candidate.evidence.length, 0);
    expect(result.stats.evidenceCollected).toBe(total);
    expect(result.simulated).toBe(true);
  });

  it("rejects a file with missing columns", () => {
    expect(() => runDemoValidation("name,city\nA,B", campaign)).toThrow(RunError);
  });

  it("rejects a run where nothing matches", () => {
    expect(() => runDemoValidation(sample, { ...campaign, industry: "Plumber" })).toThrow(/No valid candidates matched/);
  });
});

describe("overlaps", () => {
  it("matches when either text contains the other, ignoring case", () => {
    expect(overlaps("dentist", "Dentist & Orthodontist")).toBe(true);
    expect(overlaps("Delhi", "New Delhi")).toBe(true);
    expect(overlaps("Pune", "Delhi")).toBe(false);
  });
});
