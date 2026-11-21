import { afterEach, describe, expect, it, vi } from "vitest";
import { hasContactLink, isPrivateAddress, newestCopyrightYear, validateWebsite } from "./website-validator";
import type { CandidateInput } from "./types";

// Like real DNS: an IP literal resolves to itself; a name resolves to a fixed address.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (host: string) => [
    { address: /^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : host === "private.example" ? "10.0.0.5" : "93.184.216.34", family: 4 },
  ]),
}));

const base: CandidateInput = {
  id: "row-2", businessName: "Example Dental", industry: "Dentist", location: "Delhi",
  website: null, description: "A public listing does not provide an official business website.",
  sourceUrl: "https://example.com/listing", observedAt: "2026-11-19T10:00:00.000Z", contactPath: null,
};

afterEach(() => vi.unstubAllGlobals());

describe("validateWebsite", () => {
  it("stores the CSV observation and a missing-site signal", async () => {
    const result = await validateWebsite(base);
    expect(result.evidence.map((item) => item.signalCode)).toEqual(["source_description", "official_website_missing"]);
    expect(result.evidence.every((item) => item.sourceUrl.length > 0)).toBe(true);
  });

  it("blocks local network website targets", async () => {
    const result = await validateWebsite({ ...base, website: "http://127.0.0.1:3000" });
    expect(result.evidence.at(-1)?.signalCode).toBe("website_unreachable");
    expect(result.evidence.at(-1)?.observation).toContain("Private network");
  });

  it("blocks hostnames that resolve to a private address", async () => {
    const result = await validateWebsite({ ...base, website: "http://private.example" });
    expect(result.evidence.at(-1)?.signalCode).toBe("website_unreachable");
  });

  it("does not invent a PageSpeed score when the API returns none", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: URL | string) => {
      const url = String(input);
      if (url.includes("pagespeedonline")) return Response.json({ lighthouseResult: { categories: { performance: {} } } });
      if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
      return new Response("<html><head></head><body></body></html>", { status: 200, headers: { "content-type": "text/html" } });
    }));
    const result = await validateWebsite({ ...base, website: "https://clinic.example" }, "test-key");
    const codes = result.evidence.map((item) => item.signalCode);
    expect(codes).toContain("pagespeed_unavailable");
    expect(codes).not.toContain("mobile_performance_score");
  });

  it("falls back to GET when a server rejects HEAD, so healthy pages are not called broken", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: URL | string, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
      if (url.endsWith("/contact")) return new Response("ok", { status: init?.method === "HEAD" ? 405 : 200 });
      return new Response('<html><head><meta name="viewport" content="x"></head><body><a href="/contact">Contact us</a></body></html>', { status: 200, headers: { "content-type": "text/html" } });
    }));
    const result = await validateWebsite({ ...base, website: "https://clinic.example" });
    const page = result.evidence.find((item) => item.validator === "important-page-status");
    expect(page?.signalCode).toBe("important_page_healthy");
    expect(page?.extractedValue).toBe(200);
  });
});

describe("isPrivateAddress", () => {
  it.each(["::", "::1", "10.1.2.3", "127.0.0.1", "0.0.0.0", "169.254.1.1", "172.20.0.1", "192.168.1.1", "100.64.0.1", "198.18.0.1", "192.0.0.8", "224.0.0.1", "255.255.255.255", "fd00::1", "fe80::1", "ff02::1", "::ffff:10.0.0.1"])(
    "treats %s as private",
    (address) => expect(isPrivateAddress(address)).toBe(true),
  );

  it.each(["93.184.216.34", "8.8.8.8", "172.32.0.1", "198.20.0.1", "2606:4700:4700::1111"])(
    "treats %s as public",
    (address) => expect(isPrivateAddress(address)).toBe(false),
  );
});

describe("hasContactLink", () => {
  it("is false for a page that only mentions services or about in text", () => {
    expect(hasContactLink("<body><p>About our services</p><a href='/team'>Our team</a></body>")).toBe(false);
  });

  it("is true for a real contact or booking link", () => {
    expect(hasContactLink("<a href='/contact-us'>Reach us</a>")).toBe(true);
    expect(hasContactLink("<a href='/x'>Book an appointment</a>")).toBe(true);
  });
});

describe("newestCopyrightYear", () => {
  it("reads the © character, the &copy; entity and the word copyright", () => {
    expect(newestCopyrightYear("<footer>© 2019 Clinic</footer>")).toBe(2019);
    expect(newestCopyrightYear("<footer>&copy; 2021 Clinic</footer>")).toBe(2021);
    expect(newestCopyrightYear("<footer>Copyright 2018 Clinic</footer>")).toBe(2018);
  });

  it("uses the end of a year range", () => {
    expect(newestCopyrightYear("&copy; 2015-2024 Clinic")).toBe(2024);
  });

  it("returns null when no notice exists", () => {
    expect(newestCopyrightYear("<p>No notice here, founded in 2010.</p>")).toBeNull();
  });
});
