export const SCORE_DIMENSIONS = [
  "fit",
  "need",
  "timing",
  "reachability",
  "evidenceQuality",
] as const;

export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

export type CandidateInput = {
  id: string;
  businessName: string;
  industry: string;
  location: string;
  website: string | null;
  description: string;
  sourceUrl: string;
  observedAt: string;
  contactPath: string | null;
};

export type Evidence = {
  id: string;
  sourceType: "csv-source" | "website" | "pagespeed";
  sourceUrl: string;
  observedAt: string;
  validator: string;
  signalCode: string;
  observation: string;
  extractedValue: string | number | boolean | null;
};

export type ValidatedCandidate = CandidateInput & { evidence: Evidence[] };

export type CandidateAssessment = {
  candidateId: string;
  intentLabel: "strong" | "possible" | "weak";
  recommendedService: "new-website" | "redesign" | "ecommerce" | "maintenance" | "unclear";
  needStrength: number;
  enoughInformation: boolean;
  supportingEvidenceIds: string[];
  summary: string;
};

export type QualifiedCandidate = ValidatedCandidate & {
  intentLabel: CandidateAssessment["intentLabel"];
  recommendedService: CandidateAssessment["recommendedService"];
  summary: string;
  supportingEvidenceIds: string[];
  scores: Record<ScoreDimension, number>;
  explanations: Record<ScoreDimension, string>;
  finalScore: number;
  qualified: boolean;
  reviewStatus: "new" | "saved" | "contacted" | "rejected";
};

export type CsvIssue = {
  row: number;
  message: string;
};
