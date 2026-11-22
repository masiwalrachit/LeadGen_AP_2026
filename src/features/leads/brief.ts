import type { Evidence, ScoreDimension } from "@/lib/qualification/types";
import { serviceLabel } from "@/features/campaigns/services";
import { signalClaim, signalDimension, signalKind, signalLabel, type SignalKind } from "./signals";

export type BriefSource = {
  n: number;
  evidence: Evidence;
  kind: SignalKind;
  label: string;
  dimension: ScoreDimension;
};

export type BriefPart = { type: "text"; text: string } | { type: "claim"; text: string; n: number };

export type Brief = {
  parts: BriefPart[];
  sources: BriefSource[];
  needCount: number;
  /** The same sentence as plain text (for previews, screen-reader summaries and search). */
  plain: string;
};

const KIND_ORDER: Record<SignalKind, number> = { context: 0, need: 1, healthy: 2, blocked: 3 };

type BriefInput = {
  businessName: string;
  industry: string;
  location: string;
  evidence: Evidence[];
  recommendedService: string;
};

/**
 * Builds the "why this lead" sentence from a fixed template. Every highlighted clause comes from
 * exactly one stored signal and carries that signal's footnote number. Nothing here is free text
 * written by a model, so every claim on screen can be traced to a public source and a timestamp.
 */
export function buildBrief(record: BriefInput): Brief {
  const sources: BriefSource[] = [...record.evidence]
    .map((evidence) => ({ evidence, kind: signalKind(evidence) }))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
    .map(({ evidence, kind }, index) => ({
      n: index + 1,
      evidence,
      kind,
      label: signalLabel(evidence),
      dimension: signalDimension(evidence),
    }));

  const parts: BriefPart[] = [];
  const context = sources.find((source) => source.kind === "context");
  if (context) {
    parts.push({ type: "text", text: `${record.businessName} ` });
    parts.push({
      type: "claim",
      text: `is listed as an active ${record.industry.toLowerCase()} in ${record.location}`,
      n: context.n,
    });
  } else {
    parts.push({ type: "text", text: `${record.businessName} was found in the candidate file` });
  }

  const needs = sources
    .map((source) => ({ source, claim: signalClaim(source.evidence) }))
    .filter((item): item is { source: BriefSource; claim: string } => item.claim !== null);

  if (needs.length > 0) {
    parts.push({ type: "text", text: ", but " });
    needs.forEach(({ source, claim }, index) => {
      if (index > 0) parts.push({ type: "text", text: index === needs.length - 1 ? " and " : ", " });
      parts.push({ type: "claim", text: claim, n: source.n });
    });
    parts.push({
      type: "text",
      text: `. That is a checkable reason to pitch ${serviceLabel(record.recommendedService).toLowerCase()}.`,
    });
  } else if (sources.some((source) => source.kind === "blocked")) {
    parts.push({ type: "text", text: ", but the website checks could not run, so there is not enough evidence to call it a lead yet." });
  } else {
    parts.push({ type: "text", text: ". Its website passed every check we ran, so it stays a candidate." });
  }

  return {
    parts,
    sources,
    needCount: needs.length,
    plain: parts.map((part) => part.text).join(""),
  };
}

/** Footnote numbers that feed one score dimension (shown next to each score bar). */
export function citesFor(dimension: ScoreDimension, sources: BriefSource[], hasContactPath: boolean): number[] {
  if (dimension === "evidenceQuality") {
    return sources.filter((source) => source.kind !== "blocked").map((source) => source.n);
  }
  return sources
    .filter((source) => {
      if (source.kind === "blocked") return false;
      if (dimension === "fit") return source.kind === "context";
      if (dimension === "timing") return source.kind === "context" || source.dimension === "timing";
      if (dimension === "reachability") return source.dimension === "reachability" || (hasContactPath && source.kind === "context");
      return source.dimension === "need";
    })
    .map((source) => source.n);
}
