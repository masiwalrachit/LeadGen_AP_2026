import { z } from "zod";
import type { CandidateInput, CsvIssue } from "./types";

const REQUIRED_HEADERS = [
  "business_name",
  "industry",
  "location",
  "description",
  "source_url",
  "observed_at",
] as const;

const rowSchema = z.object({
  business_name: z.string().trim().min(2).max(200),
  industry: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(150),
  website: z.union([z.url(), z.literal("")]).optional().default(""),
  description: z.string().trim().min(10).max(2_000),
  source_url: z.url(),
  observed_at: z.iso.datetime({ offset: true }),
  contact_path: z.union([z.url(), z.email(), z.literal("")]).optional().default(""),
});

function parseRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const next = csv[index + 1];

    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unclosed quoted value.");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function candidateKey(candidate: CandidateInput): string {
  if (candidate.website) {
    return new URL(candidate.website).hostname.replace(/^www\./, "").toLowerCase();
  }
  return `${candidate.businessName}|${candidate.location}`.toLowerCase();
}

export function parseCandidateCsv(csv: string): {
  candidates: CandidateInput[];
  issues: CsvIssue[];
  duplicateCount: number;
} {
  const rows = parseRows(csv.replace(/^\uFEFF/, ""));
  if (rows.length === 0) throw new Error("The CSV file is empty.");

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(", ")}.`);
  }

  const candidates: CandidateInput[] = [];
  const issues: CsvIssue[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;

  rows.slice(1).forEach((values, rowIndex) => {
    const raw = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const result = rowSchema.safeParse(raw);
    const rowNumber = rowIndex + 2;

    if (!result.success) {
      issues.push({
        row: rowNumber,
        message: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      });
      return;
    }

    const candidate: CandidateInput = {
      id: `row-${rowNumber}`,
      businessName: result.data.business_name,
      industry: result.data.industry,
      location: result.data.location,
      website: result.data.website || null,
      description: result.data.description,
      sourceUrl: result.data.source_url,
      observedAt: new Date(result.data.observed_at).toISOString(),
      contactPath: result.data.contact_path || null,
    };
    const key = candidateKey(candidate);
    if (seen.has(key)) {
      duplicateCount += 1;
      return;
    }
    seen.add(key);
    candidates.push(candidate);
  });

  return { candidates, issues, duplicateCount };
}
