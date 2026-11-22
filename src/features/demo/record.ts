import type { Evidence, QualifiedCandidate, ScoreDimension } from "@/lib/qualification/types";
import type { ServiceCode } from "@/features/campaigns/services";
import { buildBrief } from "@/features/leads/brief";
import { DEMO_SCORING, computeFinalScore } from "@/features/leads/scoring";

export type DemoRecord = QualifiedCandidate & { campaignId: string };

const CHECKED_AT = "2026-11-21T04:12:00+05:30";

export type EvidenceInput = [
  signalCode: string,
  validator: string,
  sourceUrl: string,
  observation: string,
  extractedValue: Evidence["extractedValue"],
  observedAt?: string,
];

export type RecordInput = {
  id: string;
  campaignId: string;
  businessName: string;
  industry: string;
  location: string;
  website: string | null;
  contactPath: string | null;
  sourceUrl: string;
  observedAt: string;
  description: string;
  recommendedService: ServiceCode;
  scores: Record<ScoreDimension, number>;
  explanations: Record<ScoreDimension, string>;
  reviewStatus?: QualifiedCandidate["reviewStatus"];
  /** Where the listing came from. Defaults to the CSV import used by the Analyze leads flow. */
  listingValidator?: string;
  checks: EvidenceInput[];
};

export function makeRecord(input: RecordInput): DemoRecord {
  const evidence: Evidence[] = [
    {
      id: `${input.id}-csv`,
      sourceType: "csv-source",
      sourceUrl: input.sourceUrl,
      observedAt: input.observedAt,
      validator: input.listingValidator ?? "csv-import",
      signalCode: "source_description",
      observation: input.description,
      extractedValue: input.description,
    },
    ...input.checks.map(([signalCode, validator, sourceUrl, observation, extractedValue, observedAt], index) => ({
      id: `${input.id}-web-${index + 1}`,
      sourceType: validator.startsWith("pagespeed") ? ("pagespeed" as const) : ("website" as const),
      sourceUrl,
      observedAt: observedAt ?? CHECKED_AT,
      validator,
      signalCode,
      observation,
      extractedValue,
    })),
  ];
  const brief = buildBrief({ ...input, evidence });
  const finalScore = computeFinalScore(input.scores);
  const qualified = finalScore >= DEMO_SCORING.threshold && brief.needCount > 0;
  const need = input.scores.need;
  return {
    id: input.id,
    campaignId: input.campaignId,
    businessName: input.businessName,
    industry: input.industry,
    location: input.location,
    website: input.website,
    description: input.description,
    sourceUrl: input.sourceUrl,
    observedAt: input.observedAt,
    contactPath: input.contactPath,
    evidence,
    intentLabel: need >= 75 ? "strong" : need >= 50 ? "possible" : "weak",
    recommendedService: input.recommendedService,
    summary: brief.plain,
    supportingEvidenceIds: brief.sources.filter((source) => source.kind === "need").map((source) => source.evidence.id),
    scores: input.scores,
    explanations: input.explanations,
    finalScore,
    qualified,
    reviewStatus: input.reviewStatus ?? "new",
  };
}

