import { describe, expect, it } from "vitest";
import { parseStoredResult } from "./stored-result";

const campaign = { name: "Delhi dental", serviceName: "Website redesign", industry: "Dentist", location: "Delhi" };
const stats = { rowsAccepted: 5, duplicatesRemoved: 0, validated: 4, evidenceCollected: 20 };

describe("parseStoredResult", () => {
  it("accepts what /api/qualify returns today: no leads and model null", () => {
    const result = parseStoredResult(JSON.stringify({ campaign, leads: [], model: null, stats }));
    expect(result).not.toBeNull();
    expect(result?.model).toBeNull();
    expect(result?.leads).toEqual([]);
  });

  it("keeps a model when one exists", () => {
    const model = { name: "m", scoringVersion: "v1", threshold: 60 };
    expect(parseStoredResult(JSON.stringify({ campaign, leads: [], model, stats }))?.model).toEqual(model);
  });

  it("defaults a missing leads array to empty", () => {
    expect(parseStoredResult(JSON.stringify({ campaign, model: null, stats }))?.leads).toEqual([]);
  });

  it.each([null, "", "not json", "null", "42", "{}", JSON.stringify({ campaign: {}, stats })])(
    "returns null for unusable value %s",
    (raw) => expect(parseStoredResult(raw)).toBeNull(),
  );
});
