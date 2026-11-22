import type { Evidence, ScoreDimension } from "@/lib/qualification/types";

/**
 * Plain-language copy for every signal code the deterministic validators can produce
 * (see src/lib/qualification/website-validator.ts). The UI shows the plain label first and
 * the machine code underneath, so a reader never has to decode `mobile_viewport_missing`.
 *
 * kind:
 * - need:    a website problem that supports outreach
 * - healthy: a check that passed (argues against need)
 * - context: who/where the business is (supports fit)
 * - blocked: the check could not run, so it adds no evidence either way
 */
export type SignalKind = "need" | "healthy" | "context" | "blocked";

type SignalCopy = {
  kind: SignalKind | ((evidence: Evidence) => SignalKind);
  dimension: ScoreDimension;
  label: (evidence: Evidence) => string;
  /** Lower-case clause used inside the "why this lead" sentence. Only need/context signals have one. */
  claim?: (evidence: Evidence) => string;
};

function pagePath(evidence: Evidence): string {
  try {
    const path = new URL(evidence.sourceUrl).pathname.replace(/^\/+|\/+$/g, "");
    return path || "home";
  } catch {
    return "key";
  }
}

const SLOW_MOBILE_THRESHOLD = 50;

const SIGNALS: Record<string, SignalCopy> = {
  source_description: {
    kind: "context",
    dimension: "fit",
    label: () => "Public business listing",
  },
  official_website_missing: {
    kind: "need",
    dimension: "need",
    label: () => "No official website",
    claim: () => "it has no official website",
  },
  website_http_error: {
    kind: "need",
    dimension: "need",
    label: (e) => `Website returns an error (HTTP ${e.extractedValue ?? "error"})`,
    claim: () => "its website shows an error page",
  },
  website_unreachable: {
    kind: "blocked",
    dimension: "evidenceQuality",
    label: () => "Website could not be reached",
  },
  website_loads: {
    kind: "healthy",
    dimension: "need",
    label: () => "Website loads",
  },
  mobile_viewport_missing: {
    kind: "need",
    dimension: "need",
    label: () => "Site doesn't adapt to phones",
    claim: () => "the site doesn't adapt to phones",
  },
  mobile_viewport_present: {
    kind: "healthy",
    dimension: "need",
    label: () => "Mobile-friendly layout",
  },
  contact_form_present: {
    kind: "healthy",
    dimension: "reachability",
    label: () => "Contact form on the site",
  },
  contact_link_present: {
    kind: "healthy",
    dimension: "reachability",
    label: () => "Contact page linked",
  },
  contact_path_missing: {
    kind: "need",
    dimension: "need",
    label: () => "No way to contact them from the site",
    claim: () => "visitors have no way to contact them from the site",
  },
  copyright_stale: {
    kind: "need",
    dimension: "timing",
    label: (e) => `Footer still says © ${e.extractedValue}`,
    claim: (e) => `the footer still says © ${e.extractedValue}`,
  },
  copyright_current: {
    kind: "healthy",
    dimension: "timing",
    label: (e) => `Content dated ${e.extractedValue}`,
  },
  important_page_broken: {
    kind: "need",
    dimension: "need",
    label: (e) => `${capitalise(pagePath(e))} page is broken (HTTP ${e.extractedValue || "error"})`,
    claim: (e) => `its ${pagePath(e)} page is broken`,
  },
  important_page_healthy: {
    kind: "healthy",
    dimension: "need",
    label: (e) => `${capitalise(pagePath(e))} page loads`,
  },
  robots_disallowed: {
    kind: "blocked",
    dimension: "evidenceQuality",
    label: () => "Site asks bots not to check it (robots.txt)",
  },
  mobile_performance_score: {
    kind: (e) => (Number(e.extractedValue) < SLOW_MOBILE_THRESHOLD ? "need" : "healthy"),
    dimension: "need",
    label: (e) => `Mobile speed score ${e.extractedValue}/100`,
    claim: (e) => `it scores only ${e.extractedValue}/100 for mobile speed`,
  },
  pagespeed_unavailable: {
    kind: "blocked",
    dimension: "evidenceQuality",
    label: () => "Speed check unavailable",
  },
};

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function signalKind(evidence: Evidence): SignalKind {
  const copy = SIGNALS[evidence.signalCode];
  if (!copy) return "context";
  return typeof copy.kind === "function" ? copy.kind(evidence) : copy.kind;
}

export function signalLabel(evidence: Evidence): string {
  return SIGNALS[evidence.signalCode]?.label(evidence) ?? evidence.observation;
}

export function signalDimension(evidence: Evidence): ScoreDimension {
  return SIGNALS[evidence.signalCode]?.dimension ?? "evidenceQuality";
}

/** Clause for the "why this lead" sentence, or null when this signal should not be claimed. */
export function signalClaim(evidence: Evidence): string | null {
  const copy = SIGNALS[evidence.signalCode];
  if (!copy?.claim || signalKind(evidence) !== "need") return null;
  return copy.claim(evidence);
}
