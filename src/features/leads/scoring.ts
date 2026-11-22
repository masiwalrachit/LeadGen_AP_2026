import type { ScoreDimension } from "@/lib/qualification/types";

/**
 * DEMO ONLY. Real scoring weights and the qualification threshold are a product decision owned by
 * Rachit (README "Qualification model") and are not implemented yet. These illustrative values exist
 * so the demo's numbers are internally consistent: every final score is computed here in application
 * code from the five visible dimensions, never typed in by hand and never produced by an LLM.
 */
export const DEMO_SCORING = {
  version: "demo-v0",
  threshold: 60,
  weights: {
    fit: 0.2,
    need: 0.35,
    timing: 0.15,
    reachability: 0.15,
    evidenceQuality: 0.15,
  } satisfies Record<ScoreDimension, number>,
} as const;

export const DIMENSIONS: Array<{ key: ScoreDimension; label: string; meaning: string }> = [
  { key: "fit", label: "Fit", meaning: "Matches the campaign's industry and location" },
  { key: "need", label: "Need", meaning: "Strength of the website problems found" },
  { key: "timing", label: "Timing", meaning: "How recent and current the signals are" },
  { key: "reachability", label: "Contact", meaning: "A public way to contact the business" },
  { key: "evidenceQuality", label: "Evidence", meaning: "How many independent, fresh sources agree" },
];

export function computeFinalScore(scores: Record<ScoreDimension, number>): number {
  const total = DIMENSIONS.reduce((sum, { key }) => sum + scores[key] * DEMO_SCORING.weights[key], 0);
  return Math.round(total);
}

/**
 * Plain-word label shown next to a score, so "84" means something without relying on colour.
 * DEMO ONLY: the cut-offs are illustrative; real bands are a product decision owned by Rachit.
 */
export function scoreBand(score: number): "Strong" | "Good" | "Fair" {
  if (score >= 80) return "Strong";
  if (score >= 70) return "Good";
  return "Fair";
}
