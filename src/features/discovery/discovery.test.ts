import { describe, expect, it } from "vitest";
import { DEMO_RECORDS, getCampaign, getRecord } from "@/features/demo/data";
import type { EvidenceInput } from "@/features/demo/record";
import { DEMO_SCORING } from "@/features/leads/scoring";
import { isInsideArea, type LatLng } from "./area";
import { DEMO_BUSINESSES, businessSchema } from "./businesses";
import { evidenceFor } from "./evidence";
import { DISCOVERY_CAMPAIGN_ID, DISCOVERY_RECORDS, mapPoints } from "./records";
import { scoreBusiness } from "./score";

describe("seed businesses", () => {
  it("has 25 to 30 businesses with unique ids", () => {
    expect(DEMO_BUSINESSES.length).toBeGreaterThanOrEqual(25);
    expect(DEMO_BUSINESSES.length).toBeLessThanOrEqual(30);
    expect(new Set(DEMO_BUSINESSES.map((business) => business.id)).size).toBe(DEMO_BUSINESSES.length);
  });

  it("only uses reserved .example websites and pins inside the area", () => {
    for (const business of DEMO_BUSINESSES) {
      if (business.website) expect(new URL(business.website).hostname.endsWith(".example")).toBe(true);
      expect(isInsideArea(business.position as LatLng)).toBe(true);
    }
  });

  it("rejects a real-looking website and a pin outside the area", () => {
    const valid = DEMO_BUSINESSES[0];
    expect(businessSchema.safeParse({ ...valid, website: "https://realclinic.com" }).success).toBe(false);
    expect(businessSchema.safeParse({ ...valid, position: [28.7, 77.1] }).success).toBe(false);
  });
});

describe("evidence", () => {
  it("stops after the first check when the site cannot be checked, like the real validator", () => {
    const blocked = DEMO_BUSINESSES.find((business) => business.site.status === "robots-blocked")!;
    expect(evidenceFor(blocked).map(([code]) => code)).toEqual(["robots_disallowed"]);
  });
});

describe("rule-based scoring", () => {
  it("gives the same scores every time", () => {
    const business = DEMO_BUSINESSES[0];
    const first = scoreBusiness(business.category, business.locality, evidenceFor(business));
    const second = scoreBusiness(business.category, business.locality, evidenceFor(business));
    expect(second).toEqual(first);
  });

  it("scores more need when more website problems are found", () => {
    const healthy = scoreBusiness("Café", "Saket", [
      ["website_loads", "http-status", "https://a.example/", "", 200],
      ["mobile_viewport_present", "mobile-viewport", "https://a.example/", "", true],
      ["contact_form_present", "contact-path", "https://a.example/", "", true],
    ]);
    const broken = scoreBusiness("Café", "Saket", [
      ["website_loads", "http-status", "https://a.example/", "", 200],
      ["mobile_viewport_missing", "mobile-viewport", "https://a.example/", "", false],
      ["contact_path_missing", "contact-path", "https://a.example/", "", false],
    ]);
    expect(broken.scores.need).toBeGreaterThan(healthy.scores.need);
  });

  it("pitches a new website or an online shop when there is no website", () => {
    const none: EvidenceInput = ["official_website_missing", "website-presence", "https://maps.example/x", "", true];
    expect(scoreBusiness("Dental clinic", "Saket", [none]).service).toBe("new-website");
    expect(scoreBusiness("Bakery", "Saket", [none]).service).toBe("ecommerce");
  });

  it("keeps every score between 0 and 100", () => {
    for (const record of DISCOVERY_RECORDS) {
      for (const value of Object.values(record.scores)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("discovered leads", () => {
  it("finds both leads and businesses that stay candidates", () => {
    const leads = DISCOVERY_RECORDS.filter((record) => record.qualified);
    expect(leads.length).toBeGreaterThanOrEqual(10);
    expect(DISCOVERY_RECORDS.length - leads.length).toBeGreaterThanOrEqual(5);
  });

  it("never turns a healthy or unchecked website into a lead", () => {
    for (const business of DEMO_BUSINESSES) {
      const record = getRecord(business.id)!;
      const healthy = business.site.status === "loads" && business.site.mobileFriendly && business.site.contact !== "missing"
        && !business.site.brokenPage && (business.site.mobileSpeed ?? 100) >= 50 && (business.site.copyrightYear ?? 2026) >= 2024;
      const unchecked = business.site.status === "robots-blocked" || business.site.status === "unreachable";
      if (healthy || unchecked) expect(record.qualified).toBe(false);
    }
  });

  it("joins the lead inbox under its own campaign", () => {
    expect(getCampaign(DISCOVERY_CAMPAIGN_ID)).toBeDefined();
    for (const record of DISCOVERY_RECORDS) expect(DEMO_RECORDS).toContain(record);
    expect(DISCOVERY_RECORDS.every((record) => record.finalScore >= 0 && (record.qualified ? record.finalScore >= DEMO_SCORING.threshold : true))).toBe(true);
  });

  it("gives the map one point per business, highest score first", () => {
    const points = mapPoints();
    expect(points).toHaveLength(DEMO_BUSINESSES.length);
    const scores = points.map((point) => point.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});
