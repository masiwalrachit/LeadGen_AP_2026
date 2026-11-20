import { describe, expect, it } from "vitest";
import { validateWebsite } from "./website-validator";
import type { CandidateInput } from "./types";

const base: CandidateInput = {
  id: "row-2", businessName: "Example Dental", industry: "Dentist", location: "Delhi",
  website: null, description: "A public listing does not provide an official business website.",
  sourceUrl: "https://example.com/listing", observedAt: "2026-11-19T10:00:00.000Z", contactPath: null,
};

describe("validateWebsite", () => {
  it("stores the CSV observation and a missing-site signal", async () => {
    const result = await validateWebsite(base);
    expect(result.evidence.map((item) => item.signalCode)).toEqual(["source_description", "official_website_missing"]);
    expect(result.evidence.every((item) => item.sourceUrl.length > 0)).toBe(true);
  });

  it("blocks local network website targets", async () => {
    const result = await validateWebsite({ ...base, website: "http://127.0.0.1:3000" });
    expect(result.evidence.at(-1)?.signalCode).toBe("website_unreachable");
    expect(result.evidence.at(-1)?.observation).toContain("Private network");
  });
});
