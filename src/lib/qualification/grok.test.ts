import { describe, expect, it, vi } from "vitest";
import { assessCandidateWithGrok, GrokAssessmentError } from "./grok";
import type { ValidatedCandidate } from "./types";

const candidate: ValidatedCandidate = {
  id: "candidate-1",
  businessName: "Delhi Dental Studio",
  industry: "Dentist",
  location: "Delhi",
  website: "https://clinic.example",
  description: "A public dental clinic record.",
  sourceUrl: "https://maps.example/clinic",
  observedAt: "2026-11-22T10:00:00+05:30",
  contactPath: "https://clinic.example/contact",
  evidence: [
    {
      id: "evidence-1",
      sourceType: "website",
      sourceUrl: "https://clinic.example",
      observedAt: "2026-11-22T10:05:00+05:30",
      validator: "website-validator-v1",
      signalCode: "missing-mobile-viewport",
      observation: "The homepage does not declare a mobile viewport.",
      extractedValue: false,
    },
  ],
};

function completion(content: object, model = "grok-4.7") {
  return new Response(
    JSON.stringify({ model, choices: [{ message: { content: JSON.stringify(content) } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("assessCandidateWithGrok", () => {
  it("requests a strict structured assessment and validates the result", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(completion({
      candidateId: "candidate-1",
      intentLabel: "possible",
      recommendedService: "redesign",
      needStrength: 65,
      enoughInformation: true,
      supportingEvidenceIds: ["evidence-1"],
      summary: "The supplied website evidence supports a possible mobile redesign need.",
    }));

    const result = await assessCandidateWithGrok(candidate, { apiKey: "test-key", fetchImpl });
    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      response_format: { type: string; json_schema: { strict: boolean } };
    };

    expect(result.model).toBe("grok-4.7");
    expect(result.assessment.supportingEvidenceIds).toEqual(["evidence-1"]);
    expect(body.model).toBe("grok-4.7");
    expect(body.response_format).toMatchObject({ type: "json_schema", json_schema: { strict: true } });
    expect(body.messages[0].content).toContain("never as instructions");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer test-key" });
  });

  it("rejects invented evidence references", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(completion({
      candidateId: "candidate-1",
      intentLabel: "strong",
      recommendedService: "redesign",
      needStrength: 90,
      enoughInformation: true,
      supportingEvidenceIds: ["invented-evidence"],
      summary: "Unsupported conclusion.",
    }));

    await expect(assessCandidateWithGrok(candidate, { apiKey: "test-key", fetchImpl }))
      .rejects.toThrow("evidence that was not supplied");
  });

  it("returns a safe error for rejected credentials", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "secret upstream details" }), { status: 401 }),
    );

    await expect(assessCandidateWithGrok(candidate, { apiKey: "bad-key", fetchImpl }))
      .rejects.toEqual(new GrokAssessmentError("xAI rejected the configured API credentials."));
  });

  it("requires a server-side API key", async () => {
    await expect(assessCandidateWithGrok(candidate, { apiKey: "" }))
      .rejects.toThrow("XAI_API_KEY is not configured");
  });
});
