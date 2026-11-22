import type { EvidenceInput } from "@/features/demo/record";
import type { ServiceCode } from "@/features/campaigns/services";
import type { ScoreDimension } from "@/lib/qualification/types";

/**
 * DEMO ONLY: rule-based scoring for the map search. Each of the five dimensions is worked out from
 * the evidence rows with fixed rules, so the same business always gets the same score. No AI is
 * involved here; the final score still goes through computeFinalScore (src/features/leads/scoring.ts).
 */

/** How well each kind of business fits a web agency's pitch: booking- and trust-driven trades score higher. */
const CATEGORY_FIT: Record<string, number> = {
  "Dental clinic": 94,
  "Physiotherapy clinic": 90,
  "Pet clinic": 88,
  Preschool: 88,
  "Coaching centre": 86,
  Salon: 86,
  "Photo studio": 85,
  Restaurant: 84,
  Café: 82,
  Boutique: 84,
  Optician: 82,
  "Yoga studio": 82,
  Gym: 82,
  Bakery: 78,
  Florist: 78,
  "Sweet shop": 76,
  Bookshop: 74,
  "Grocery store": 72,
  Tailor: 70,
  "Hardware store": 66,
};

/** Businesses that sell products, so "no website" means "no online shop" too. */
const SELLS_PRODUCTS = new Set(["Boutique", "Bakery", "Sweet shop", "Café", "Grocery store", "Florist", "Bookshop"]);

const CURRENT_YEAR = 2026;
const SLOW_MOBILE = 50;

type Scored = {
  scores: Record<ScoreDimension, number>;
  explanations: Record<ScoreDimension, string>;
  service: ServiceCode;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function scoreBusiness(category: string, locality: string, rows: EvidenceInput[]): Scored {
  const code = (signal: string) => rows.find(([signalCode]) => signalCode === signal);
  const has = (signal: string) => code(signal) !== undefined;
  const value = (signal: string) => Number(code(signal)?.[4]);

  const noWebsite = has("official_website_missing");
  const siteDown = has("website_http_error");
  const blocked = has("robots_disallowed") || has("website_unreachable");
  const speed = has("mobile_performance_score") ? value("mobile_performance_score") : null;
  const slow = speed !== null && speed < SLOW_MOBILE;
  const staleYear = has("copyright_stale") ? value("copyright_stale") : null;
  const brokenPage = code("important_page_broken");

  // Fit: the kind of business, and it sits inside the searched area.
  const fit = CATEGORY_FIT[category] ?? 72;
  const fitWhy = `${category} in ${locality}, inside the searched area.`;

  // Need: how many separate website problems were found, and how serious they are.
  let need: number;
  const problems: string[] = [];
  if (noWebsite) {
    need = 88;
    problems.push("no website at all");
  } else if (siteDown) {
    need = 82;
    problems.push(`the homepage returns HTTP ${value("website_http_error")}`);
  } else if (blocked) {
    need = 15;
  } else {
    need = 20;
    if (has("mobile_viewport_missing")) {
      need += 30;
      problems.push("doesn't adapt to phones");
    }
    if (has("contact_path_missing")) {
      need += 18;
      problems.push("no contact path");
    }
    if (brokenPage) {
      need += 22;
      problems.push(`a broken ${new URL(brokenPage[2]).pathname.slice(1)} page`);
    }
    if (slow && speed !== null) {
      need += (SLOW_MOBILE - speed) * 0.8;
      problems.push(`mobile speed ${speed}/100`);
    }
  }
  const needWhy = blocked
    ? "The site could not be checked, so no problems are on file."
    : problems.length === 0
      ? "Every website check passed."
      : `${problems.length === 1 ? "One problem" : `${problems.length} problems`}: ${problems.join(", ")}.`;

  // Timing: how out of date the site looks right now.
  let timing: number;
  let timingWhy: string;
  if (staleYear) {
    timing = 50 + 7 * (CURRENT_YEAR - staleYear);
    timingWhy = `Footer still says © ${staleYear}; the listing itself was updated this month.`;
  } else if (has("copyright_current")) {
    timing = 30;
    timingWhy = `Site content is dated ${value("copyright_current")}, so it was updated recently.`;
  } else if (noWebsite) {
    timing = 62;
    timingWhy = "Listing is active this month but nothing exists online yet.";
  } else if (siteDown) {
    timing = 72;
    timingWhy = "The site is down right now.";
  } else if (blocked) {
    timing = 40;
    timingWhy = "No dated signals could be collected.";
  } else {
    timing = 45;
    timingWhy = "No copyright year found on the site.";
  }

  // Contact: is there a public way to reach them?
  let reachability: number;
  let contactWhy: string;
  if (has("contact_form_present")) {
    reachability = 92;
    contactWhy = "Contact or booking form on the site.";
  } else if (has("contact_link_present")) {
    const contactBroken = brokenPage && new URL(brokenPage[2]).pathname === "/contact";
    reachability = contactBroken ? 52 : 80;
    contactWhy = contactBroken ? "Contact page is linked, but it currently returns an error." : "Contact page is linked.";
  } else if (has("contact_path_missing")) {
    reachability = 58;
    contactWhy = "Nothing on the site; phone number on the map listing only.";
  } else {
    reachability = noWebsite ? 60 : 52;
    contactWhy = "Phone number on the map listing only.";
  }

  // Evidence: how many independent checks back the result.
  const checks = rows.length + 1; // +1 for the map listing itself
  const evidenceQuality = blocked ? 30 : 45 + 9 * checks;
  const evidenceWhy = blocked
    ? "Only the listing; the website checks could not run."
    : `The map listing plus ${rows.length} website ${rows.length === 1 ? "check" : "checks"}, all from this week.`;

  // Which service to pitch, decided by the same evidence.
  let service: ServiceCode;
  if (noWebsite) service = SELLS_PRODUCTS.has(category) ? "ecommerce" : "new-website";
  else if (siteDown) service = "maintenance";
  else if (has("mobile_viewport_missing") || staleYear || brokenPage) service = "redesign";
  else if (slow) service = "maintenance";
  else service = "redesign";

  return {
    scores: {
      fit: clamp(fit),
      need: clamp(Math.min(need, 96)),
      timing: clamp(Math.min(timing, 92)),
      reachability: clamp(reachability),
      evidenceQuality: clamp(Math.min(evidenceQuality, 95)),
    },
    explanations: {
      fit: fitWhy,
      need: needWhy,
      timing: timingWhy,
      reachability: contactWhy,
      evidenceQuality: evidenceWhy,
    },
    service,
  };
}
