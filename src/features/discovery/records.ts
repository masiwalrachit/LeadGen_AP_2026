import type { DemoCampaign } from "@/features/demo/data";
import { makeRecord, type DemoRecord } from "@/features/demo/record";
import { buildBrief } from "@/features/leads/brief";
import { scoreBand } from "@/features/leads/scoring";
import { DISCOVERY_AREA, type LatLng } from "./area";
import { DEMO_BUSINESSES, listingUrl } from "./businesses";
import { DISCOVERY_CHECKED_AT, contactPathFor, evidenceFor } from "./evidence";
import { scoreBusiness } from "./score";

export const DISCOVERY_CAMPAIGN_ID = "south-delhi-map";

/** Every seeded business, scored by rules and shaped exactly like the other demo leads. */
export const DISCOVERY_RECORDS: DemoRecord[] = DEMO_BUSINESSES.map((business) => {
  const checks = evidenceFor(business);
  const { scores, explanations, service } = scoreBusiness(business.category, business.locality, checks);
  return makeRecord({
    id: business.id,
    campaignId: DISCOVERY_CAMPAIGN_ID,
    businessName: business.name,
    industry: business.category,
    location: `${business.locality}, ${DISCOVERY_AREA.city}`,
    website: business.website,
    contactPath: contactPathFor(business),
    sourceUrl: listingUrl(business),
    observedAt: business.listedAt,
    description: business.description,
    recommendedService: service,
    scores,
    explanations,
    listingValidator: "map-discovery",
    checks,
  });
});

const leads = DISCOVERY_RECORDS.filter((record) => record.qualified).length;

export const DISCOVERY_CAMPAIGN: DemoCampaign = {
  id: DISCOVERY_CAMPAIGN_ID,
  name: "South Delhi map search",
  service: "redesign",
  industry: "Local businesses",
  location: DISCOVERY_AREA.name,
  status: "completed",
  createdAt: "2026-11-22T10:24:00+05:30",
  finishedAt: DISCOVERY_CHECKED_AT,
  rowsImported: DISCOVERY_RECORDS.length,
  duplicatesRemoved: 0,
  invalidRows: 0,
  filteredOut: DISCOVERY_RECORDS.length - leads,
  validated: DISCOVERY_RECORDS.length,
};

export type PinBand = "strong" | "good" | "fair" | "candidate";

/** The small, serialisable slice of a record the map needs (sent to the browser). */
export type MapPoint = {
  id: string;
  name: string;
  category: string;
  locality: string;
  position: LatLng;
  score: number;
  band: PinBand;
  qualified: boolean;
  reason: string;
  hasWebsite: boolean;
};

export function pinBand(record: Pick<DemoRecord, "qualified" | "finalScore">): PinBand {
  if (!record.qualified) return "candidate";
  return scoreBand(record.finalScore).toLowerCase() as PinBand;
}

export function mapPoints(): MapPoint[] {
  return DEMO_BUSINESSES.map((business) => {
    const record = DISCOVERY_RECORDS.find((item) => item.id === business.id)!;
    const brief = buildBrief(record);
    const reason =
      brief.sources.find((source) => source.kind === "need")?.label ??
      (brief.sources.some((source) => source.kind === "blocked") ? "Website checks couldn't run" : "No website problems found");
    return {
      id: business.id,
      name: business.name,
      category: business.category,
      locality: business.locality,
      position: business.position as LatLng,
      score: record.finalScore,
      band: pinBand(record),
      qualified: record.qualified,
      reason,
      hasWebsite: business.website !== null,
    };
  }).sort((a, b) => b.score - a.score);
}
