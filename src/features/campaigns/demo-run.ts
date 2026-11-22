import { CsvFormatError, parseCandidateCsv } from "@/lib/qualification/csv";
import type { CsvIssue, Evidence, ValidatedCandidate } from "@/lib/qualification/types";
import { DEMO_RECORDS } from "@/features/demo/data";
import type { ServiceCode } from "./services";

export type CampaignInput = { name: string; service: ServiceCode; industry: string; location: string };

export type RunStats = {
  rowsAccepted: number;
  duplicatesRemoved: number;
  invalidRows: number;
  deterministicFiltered: number;
  validated: number;
  evidenceCollected: number;
};

export type RunResult = {
  campaign: CampaignInput;
  stats: RunStats;
  candidates: ValidatedCandidate[];
  issues: CsvIssue[];
  /** True in demo mode: the CSV is really parsed, but website checks are simulated from sample evidence. */
  simulated: boolean;
};

/** A problem the user can fix (bad file, no matches). Carries row-level issues so each cites its rule. */
export class RunError extends Error {
  constructor(
    message: string,
    readonly issues: CsvIssue[] = [],
  ) {
    super(message);
    this.name = "RunError";
  }
}

// Same limits as POST /api/qualify.
export const MAX_FILE_BYTES = 1_000_000;
export const MAX_MATCHING_ROWS = 15;

/** Same industry/location rule as the API route: either text may contain the other. */
export function overlaps(target: string, value: string): boolean {
  const a = target.toLowerCase().trim();
  const b = value.toLowerCase().trim();
  return b.includes(a) || a.includes(b);
}

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Demo-mode stand-in for POST /api/qualify. The file is parsed, deduplicated and filtered by the real
 * code (src/lib/qualification/csv.ts); only the website checks are simulated, by reusing the sample
 * evidence for businesses that exist in the demo dataset. Nothing is fetched and nothing is stored.
 */
export function runDemoValidation(csvText: string, campaign: CampaignInput): RunResult {
  let parsed: ReturnType<typeof parseCandidateCsv>;
  try {
    parsed = parseCandidateCsv(csvText);
  } catch (error) {
    if (error instanceof CsvFormatError) throw new RunError(error.message);
    throw error;
  }

  const relevant = parsed.candidates.filter(
    (candidate) => overlaps(campaign.industry, candidate.industry) && overlaps(campaign.location, candidate.location),
  );
  const filtered = parsed.candidates.length - relevant.length;

  if (relevant.length === 0) {
    throw new RunError("No valid candidates matched the campaign industry and location.", parsed.issues);
  }
  if (relevant.length > MAX_MATCHING_ROWS) {
    throw new RunError(`Website validation accepts up to ${MAX_MATCHING_ROWS} matching candidates per run. Split this file into smaller files.`);
  }

  const candidates: ValidatedCandidate[] = relevant.map((candidate) => {
    const sample = DEMO_RECORDS.find((record) => normalise(record.businessName) === normalise(candidate.businessName));
    const evidence: Evidence[] = sample
      ? sample.evidence
      : [
          {
            id: `${candidate.id}-csv`,
            sourceType: "csv-source",
            sourceUrl: candidate.sourceUrl,
            observedAt: candidate.observedAt,
            validator: "csv-import",
            signalCode: "source_description",
            observation: candidate.description,
            extractedValue: candidate.description,
          },
        ];
    return { ...candidate, evidence };
  });

  return {
    campaign,
    stats: {
      rowsAccepted: parsed.candidates.length,
      duplicatesRemoved: parsed.duplicateCount,
      invalidRows: parsed.issues.length,
      deterministicFiltered: filtered,
      validated: candidates.length,
      evidenceCollected: candidates.reduce((total, candidate) => total + candidate.evidence.length, 0),
    },
    candidates,
    issues: parsed.issues,
    simulated: true,
  };
}
