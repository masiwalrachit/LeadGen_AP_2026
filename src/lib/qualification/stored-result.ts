import type { QualifiedCandidate } from "./types";

export const RESULTS_STORAGE_KEY = "leadgen.csvQualification.v1";

export type StoredResult = {
  campaign: { name: string; serviceName: string; industry: string; location: string };
  leads: QualifiedCandidate[];
  stats: {
    rowsAccepted: number;
    duplicatesRemoved: number;
    validated?: number;
    assessed?: number;
    qualified?: number;
    evidenceCollected?: number;
  };
  /** null until an LLM assessment and scoring step exists; /api/qualify currently always returns null. */
  model: { name: string; scoringVersion: string; threshold: number } | null;
};

/**
 * Reads a saved qualification response. Returns null for anything that is not
 * usable, so a stale or hand-edited browser value can never crash the page.
 */
export function parseStoredResult(raw: string | null): StoredResult | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredResult> | null;
    if (!value || typeof value !== "object") return null;
    if (!value.campaign || typeof value.campaign.name !== "string") return null;
    if (!value.stats || typeof value.stats !== "object") return null;
    const model = value.model && typeof value.model === "object" ? value.model : null;
    return {
      campaign: value.campaign,
      leads: Array.isArray(value.leads) ? value.leads : [],
      stats: value.stats,
      model,
    };
  } catch {
    return null;
  }
}
