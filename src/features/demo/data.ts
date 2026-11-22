/**
 * ILLUSTRATIVE DEMO DATA. Every business, URL and score below is invented for the course demo.
 * All URLs use the reserved `.example` domain so none of them points at a real business.
 * Signal codes and validator names match the real deterministic validators in
 * src/lib/qualification/website-validator.ts, so the demo shows exactly what real evidence looks like.
 * Final scores are computed from the five dimensions by computeFinalScore (demo weights), never typed in.
 */
import type { Evidence, QualifiedCandidate, ScoreDimension } from "@/lib/qualification/types";
import type { ServiceCode } from "@/features/campaigns/services";
import { buildBrief } from "@/features/leads/brief";
import { DEMO_SCORING, computeFinalScore } from "@/features/leads/scoring";

export type CampaignStatus = "validating" | "scoring" | "completed" | "failed";

export type DemoCampaign = {
  id: string;
  name: string;
  service: ServiceCode;
  industry: string;
  location: string;
  status: CampaignStatus;
  createdAt: string;
  finishedAt: string | null;
  rowsImported: number;
  duplicatesRemoved: number;
  invalidRows: number;
  filteredOut: number;
  validated: number;
  /** Shown for failed campaigns; plain description of what stopped. */
  problem?: string;
};

export type DemoRecord = QualifiedCandidate & { campaignId: string };

const CHECKED_AT = "2026-11-21T04:12:00+05:30";

export const DEMO_CAMPAIGNS: DemoCampaign[] = [
  {
    id: "delhi-dental",
    name: "Delhi dental practices",
    service: "redesign",
    industry: "Dentist",
    location: "Delhi",
    status: "completed",
    createdAt: "2026-11-21T03:58:00+05:30",
    finishedAt: "2026-11-21T04:13:00+05:30",
    rowsImported: 14,
    duplicatesRemoved: 2,
    invalidRows: 1,
    filteredOut: 2,
    validated: 9,
  },
  {
    id: "jaipur-boutiques",
    name: "Jaipur independent boutiques",
    service: "ecommerce",
    industry: "Boutique",
    location: "Jaipur",
    status: "scoring",
    createdAt: "2026-11-21T03:40:00+05:30",
    finishedAt: null,
    rowsImported: 11,
    duplicatesRemoved: 1,
    invalidRows: 0,
    filteredOut: 3,
    validated: 7,
  },
  {
    id: "gurugram-consultancies",
    name: "Gurugram consultancies",
    service: "new-website",
    industry: "Consultancy",
    location: "Gurugram",
    status: "validating",
    createdAt: "2026-11-21T04:05:00+05:30",
    finishedAt: null,
    rowsImported: 8,
    duplicatesRemoved: 0,
    invalidRows: 0,
    filteredOut: 1,
    validated: 4,
  },
  {
    id: "pune-cafes",
    name: "Pune cafés",
    service: "maintenance",
    industry: "Café",
    location: "Pune",
    status: "failed",
    createdAt: "2026-11-20T18:20:00+05:30",
    finishedAt: "2026-11-20T18:31:00+05:30",
    rowsImported: 6,
    duplicatesRemoved: 0,
    invalidRows: 4,
    filteredOut: 0,
    validated: 0,
    problem: "4 of 6 rows had no observed_at timestamp, and the 2 remaining sites timed out. Fix the file and run it again.",
  },
];

type EvidenceInput = [
  signalCode: string,
  validator: string,
  sourceUrl: string,
  observation: string,
  extractedValue: Evidence["extractedValue"],
  observedAt?: string,
];

type RecordInput = {
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
  checks: EvidenceInput[];
};

function makeRecord(input: RecordInput): DemoRecord {
  const evidence: Evidence[] = [
    {
      id: `${input.id}-csv`,
      sourceType: "csv-source",
      sourceUrl: input.sourceUrl,
      observedAt: input.observedAt,
      validator: "csv-import",
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

export const DEMO_RECORDS: DemoRecord[] = [
  makeRecord({
    id: "northstar-dental",
    campaignId: "delhi-dental",
    businessName: "Northstar Dental Studio",
    industry: "Dental clinic",
    location: "Delhi",
    website: "https://northstar-dental.example",
    contactPath: "https://northstar-dental.example/contact",
    sourceUrl: "https://directory.example/delhi/northstar-dental",
    observedAt: "2026-11-18T10:30:00+05:30",
    description: "Active clinic listing with opening hours updated this week. Reviews mention booking by phone only.",
    recommendedService: "redesign",
    scores: { fit: 92, need: 90, timing: 70, reachability: 74, evidenceQuality: 86 },
    explanations: {
      fit: "Dental clinic in Delhi, the campaign's exact target.",
      need: "Three separate website problems: phones, a broken contact page and slow mobile speed.",
      timing: "Listing updated this week; site content not updated since 2019.",
      reachability: "Contact page is linked, but it currently returns an error.",
      evidenceQuality: "Five website checks plus the listing, all from the last 3 days.",
    },
    checks: [
      ["website_loads", "http-status", "https://northstar-dental.example/", "Official website returned HTTP 200.", 200],
      ["mobile_viewport_missing", "mobile-viewport", "https://northstar-dental.example/", "No mobile viewport declaration was found.", false],
      ["important_page_broken", "important-page-status", "https://northstar-dental.example/contact", "Important page returned HTTP 404.", 404],
      ["copyright_stale", "content-freshness", "https://northstar-dental.example/", "Newest detected copyright year: 2019.", 2019],
      ["mobile_performance_score", "pagespeed-mobile", "https://pagespeed.web.dev/analysis?url=northstar-dental.example", "Mobile performance score: 38/100", 38],
    ],
  }),
  makeRecord({
    id: "old-town-dental",
    campaignId: "delhi-dental",
    businessName: "Old Town Dental",
    industry: "Dental clinic",
    location: "Delhi",
    website: null,
    contactPath: "https://directory.example/delhi/old-town-dental",
    sourceUrl: "https://directory.example/delhi/old-town-dental",
    observedAt: "2026-11-20T11:45:00+05:30",
    description: "Current public listing with phone number and opening hours. No official website is linked.",
    recommendedService: "new-website",
    reviewStatus: "saved",
    scores: { fit: 90, need: 88, timing: 72, reachability: 52, evidenceQuality: 64 },
    explanations: {
      fit: "Dental clinic in Delhi.",
      need: "No website at all, so patients can only find the directory listing.",
      timing: "Listing was updated yesterday, so the clinic is clearly active.",
      reachability: "Only a phone number on the directory listing.",
      evidenceQuality: "One source plus one check; enough to qualify, but thin.",
    },
    checks: [
      ["official_website_missing", "website-presence", "https://directory.example/delhi/old-town-dental", "No official website URL was supplied by the source record.", true],
    ],
  }),
  makeRecord({
    id: "smile-arc",
    campaignId: "delhi-dental",
    businessName: "Smile Arc Dental Clinic",
    industry: "Dental clinic",
    location: "Delhi",
    website: "https://smilearc-dental.example",
    contactPath: null,
    sourceUrl: "https://directory.example/delhi/smile-arc",
    observedAt: "2026-11-19T16:05:00+05:30",
    description: "Listing shows the clinic open six days a week; the linked website is the only online booking route.",
    recommendedService: "redesign",
    scores: { fit: 88, need: 86, timing: 66, reachability: 48, evidenceQuality: 70 },
    explanations: {
      fit: "Dental clinic in Delhi.",
      need: "The website shows a server error, so online bookings are failing.",
      timing: "Error observed today; listing confirmed active two days ago.",
      reachability: "No contact path could be checked while the site is down.",
      evidenceQuality: "Listing plus one direct HTTP check.",
    },
    checks: [
      ["website_http_error", "http-status", "https://smilearc-dental.example/", "Official website returned HTTP 503.", 503],
    ],
  }),
  makeRecord({
    id: "lotus-family-dental",
    campaignId: "delhi-dental",
    businessName: "Lotus Family Dental",
    industry: "Dental clinic",
    location: "Delhi",
    website: "https://lotus-family.example",
    contactPath: "hello@lotus-family.example",
    sourceUrl: "https://directory.example/delhi/lotus-family-dental",
    observedAt: "2026-11-17T14:15:00+05:30",
    description: "Active clinic listing with a public enquiry email.",
    recommendedService: "redesign",
    reviewStatus: "contacted",
    scores: { fit: 90, need: 58, timing: 64, reachability: 86, evidenceQuality: 84 },
    explanations: {
      fit: "Dental clinic in Delhi.",
      need: "Works on phones, but it is slow and visibly out of date.",
      timing: "Footer last updated in 2020.",
      reachability: "Public enquiry email and a linked contact page.",
      evidenceQuality: "Listing plus five website checks.",
    },
    checks: [
      ["website_loads", "http-status", "https://lotus-family.example/", "Official website returned HTTP 200.", 200],
      ["mobile_viewport_present", "mobile-viewport", "https://lotus-family.example/", "A mobile viewport declaration is present.", true],
      ["contact_link_present", "contact-path", "https://lotus-family.example/", "A public contact-related link was detected.", true],
      ["copyright_stale", "content-freshness", "https://lotus-family.example/", "Newest detected copyright year: 2020.", 2020],
      ["mobile_performance_score", "pagespeed-mobile", "https://pagespeed.web.dev/analysis?url=lotus-family.example", "Mobile performance score: 41/100", 41],
    ],
  }),
  makeRecord({
    id: "saket-family-dentistry",
    campaignId: "delhi-dental",
    businessName: "Saket Family Dentistry",
    industry: "Dental clinic",
    location: "Delhi",
    website: "https://saket-dentistry.example",
    contactPath: "https://saket-dentistry.example/contact",
    sourceUrl: "https://directory.example/delhi/saket-family-dentistry",
    observedAt: "2026-11-16T09:20:00+05:30",
    description: "Family dental practice listing; mentions online appointment booking.",
    recommendedService: "redesign",
    scores: { fit: 86, need: 64, timing: 52, reachability: 82, evidenceQuality: 80 },
    explanations: {
      fit: "Dental practice in Delhi.",
      need: "The appointments page the listing promotes is broken, and mobile speed is low.",
      timing: "Listing is five days old.",
      reachability: "A working contact form.",
      evidenceQuality: "Listing plus five website checks.",
    },
    checks: [
      ["website_loads", "http-status", "https://saket-dentistry.example/", "Official website returned HTTP 200.", 200],
      ["mobile_viewport_present", "mobile-viewport", "https://saket-dentistry.example/", "A mobile viewport declaration is present.", true],
      ["contact_form_present", "contact-path", "https://saket-dentistry.example/", "A public contact or booking form was detected.", true],
      ["important_page_broken", "important-page-status", "https://saket-dentistry.example/appointments", "Important page returned HTTP 404.", 404],
      ["mobile_performance_score", "pagespeed-mobile", "https://pagespeed.web.dev/analysis?url=saket-dentistry.example", "Mobile performance score: 46/100", 46],
    ],
  }),
  makeRecord({
    id: "greenpark-dental",
    campaignId: "delhi-dental",
    businessName: "Greenpark Dental Care",
    industry: "Dental clinic",
    location: "Delhi",
    website: "https://greenpark-dental.example",
    contactPath: null,
    sourceUrl: "https://directory.example/delhi/greenpark-dental",
    observedAt: "2026-11-15T12:00:00+05:30",
    description: "Clinic listing with address and hours; no email listed.",
    recommendedService: "redesign",
    scores: { fit: 84, need: 70, timing: 48, reachability: 36, evidenceQuality: 76 },
    explanations: {
      fit: "Dental clinic in Delhi.",
      need: "No way to get in touch from the site, and the slowest mobile score in the campaign.",
      timing: "Listing is six days old; no dated content on the site.",
      reachability: "No contact form, link or email found anywhere.",
      evidenceQuality: "Listing plus four website checks.",
    },
    checks: [
      ["website_loads", "http-status", "https://greenpark-dental.example/", "Official website returned HTTP 200.", 200],
      ["mobile_viewport_present", "mobile-viewport", "https://greenpark-dental.example/", "A mobile viewport declaration is present.", true],
      ["contact_path_missing", "contact-path", "https://greenpark-dental.example/", "No contact form or contact-related link was detected.", false],
      ["mobile_performance_score", "pagespeed-mobile", "https://pagespeed.web.dev/analysis?url=greenpark-dental.example", "Mobile performance score: 29/100", 29],
    ],
  }),
  makeRecord({
    id: "clearsmile-care",
    campaignId: "delhi-dental",
    businessName: "ClearSmile Care",
    industry: "Dental clinic",
    location: "Delhi",
    website: "https://clearsmile.example",
    contactPath: "https://clearsmile.example/contact",
    sourceUrl: "https://directory.example/delhi/clearsmile-care",
    observedAt: "2026-11-19T09:00:00+05:30",
    description: "Modern clinic listing with online booking and recently updated service pages.",
    recommendedService: "redesign",
    scores: { fit: 90, need: 12, timing: 30, reachability: 90, evidenceQuality: 88 },
    explanations: {
      fit: "Dental clinic in Delhi.",
      need: "Every website check passed; there is no problem to pitch.",
      timing: "Content is current (2026).",
      reachability: "Working contact form.",
      evidenceQuality: "Listing plus six website checks.",
    },
    checks: [
      ["website_loads", "http-status", "https://clearsmile.example/", "Official website returned HTTP 200.", 200],
      ["mobile_viewport_present", "mobile-viewport", "https://clearsmile.example/", "A mobile viewport declaration is present.", true],
      ["contact_form_present", "contact-path", "https://clearsmile.example/", "A public contact or booking form was detected.", true],
      ["copyright_current", "content-freshness", "https://clearsmile.example/", "Newest detected copyright year: 2026.", 2026],
      ["important_page_healthy", "important-page-status", "https://clearsmile.example/services", "Important page returned HTTP 200.", 200],
      ["mobile_performance_score", "pagespeed-mobile", "https://pagespeed.web.dev/analysis?url=clearsmile.example", "Mobile performance score: 88/100", 88],
    ],
  }),
  makeRecord({
    id: "rajouri-dental-hub",
    campaignId: "delhi-dental",
    businessName: "Rajouri Dental Hub",
    industry: "Dental clinic",
    location: "Delhi",
    website: "https://rajouri-dental.example",
    contactPath: null,
    sourceUrl: "https://directory.example/delhi/rajouri-dental-hub",
    observedAt: "2026-11-18T13:10:00+05:30",
    description: "Clinic listing with a linked website.",
    recommendedService: "redesign",
    scores: { fit: 86, need: 20, timing: 40, reachability: 30, evidenceQuality: 22 },
    explanations: {
      fit: "Dental clinic in Delhi.",
      need: "Unknown: the site asks automated tools not to check it, so we respected that.",
      timing: "Only the listing date is known.",
      reachability: "Not checked.",
      evidenceQuality: "Only one usable source.",
    },
    checks: [
      ["robots_disallowed", "robots-policy", "https://rajouri-dental.example/robots.txt", "robots.txt disallows automated validation of the website root.", true],
    ],
  }),
  makeRecord({
    id: "vasant-kunj-dental",
    campaignId: "delhi-dental",
    businessName: "Vasant Kunj Dental Studio",
    industry: "Dental clinic",
    location: "Delhi",
    website: "https://vk-dental.example",
    contactPath: null,
    sourceUrl: "https://directory.example/delhi/vasant-kunj-dental",
    observedAt: "2026-11-20T10:00:00+05:30",
    description: "New clinic listing opened this month.",
    recommendedService: "redesign",
    scores: { fit: 88, need: 30, timing: 40, reachability: 30, evidenceQuality: 20 },
    explanations: {
      fit: "Dental clinic in Delhi.",
      need: "Unknown until the website can be reached.",
      timing: "Listing is new this month.",
      reachability: "Not checked.",
      evidenceQuality: "The website check timed out; needs a retry.",
    },
    checks: [
      ["website_unreachable", "http-status", "https://vk-dental.example/", "The operation was aborted due to timeout.", null],
    ],
  }),
  makeRecord({
    id: "pink-city-threads",
    campaignId: "jaipur-boutiques",
    businessName: "Pink City Threads",
    industry: "Boutique",
    location: "Jaipur",
    website: "https://pinkcitythreads.example",
    contactPath: "https://pinkcitythreads.example/contact",
    sourceUrl: "https://directory.example/jaipur/pink-city-threads",
    observedAt: "2026-11-20T17:30:00+05:30",
    description: "Boutique listing says orders are taken through Instagram messages; the website has no shop.",
    recommendedService: "ecommerce",
    scores: { fit: 88, need: 72, timing: 60, reachability: 78, evidenceQuality: 80 },
    explanations: {
      fit: "Independent boutique in Jaipur.",
      need: "Slow on phones and out of date; sales happen in Instagram messages instead of the site.",
      timing: "Footer last updated in 2021.",
      reachability: "Contact page is linked.",
      evidenceQuality: "Listing plus five website checks.",
    },
    checks: [
      ["website_loads", "http-status", "https://pinkcitythreads.example/", "Official website returned HTTP 200.", 200],
      ["mobile_viewport_present", "mobile-viewport", "https://pinkcitythreads.example/", "A mobile viewport declaration is present.", true],
      ["contact_link_present", "contact-path", "https://pinkcitythreads.example/", "A public contact-related link was detected.", true],
      ["copyright_stale", "content-freshness", "https://pinkcitythreads.example/", "Newest detected copyright year: 2021.", 2021],
      ["mobile_performance_score", "pagespeed-mobile", "https://pagespeed.web.dev/analysis?url=pinkcitythreads.example", "Mobile performance score: 33/100", 33],
    ],
  }),
  makeRecord({
    id: "johari-weaves",
    campaignId: "jaipur-boutiques",
    businessName: "Johari Weaves",
    industry: "Boutique",
    location: "Jaipur",
    website: null,
    contactPath: "https://directory.example/jaipur/johari-weaves",
    sourceUrl: "https://directory.example/jaipur/johari-weaves",
    observedAt: "2026-11-20T15:10:00+05:30",
    description: "Listing says orders are taken on WhatsApp. No online store or website is linked.",
    recommendedService: "ecommerce",
    scores: { fit: 84, need: 86, timing: 58, reachability: 56, evidenceQuality: 60 },
    explanations: {
      fit: "Independent boutique in Jaipur.",
      need: "No website at all; orders go through WhatsApp.",
      timing: "Listing updated yesterday.",
      reachability: "WhatsApp number on the directory listing only.",
      evidenceQuality: "One source plus one check.",
    },
    checks: [
      ["official_website_missing", "website-presence", "https://directory.example/jaipur/johari-weaves", "No official website URL was supplied by the source record.", true],
    ],
  }),
];

export function getCampaign(id: string): DemoCampaign | undefined {
  return DEMO_CAMPAIGNS.find((campaign) => campaign.id === id);
}

export function getRecord(id: string): DemoRecord | undefined {
  return DEMO_RECORDS.find((record) => record.id === id);
}

export function recordsForCampaign(campaignId: string): DemoRecord[] {
  return DEMO_RECORDS.filter((record) => record.campaignId === campaignId);
}

export function leadsByScore(): DemoRecord[] {
  return DEMO_RECORDS.filter((record) => record.qualified).sort((a, b) => b.finalScore - a.finalScore);
}
