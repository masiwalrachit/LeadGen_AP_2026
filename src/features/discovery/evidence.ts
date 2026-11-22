import type { EvidenceInput } from "@/features/demo/record";
import { listingUrl, type DemoBusiness } from "./businesses";

/** When the simulated website checks ran. One fixed time keeps the demo identical on every load. */
export const DISCOVERY_CHECKED_AT = "2026-11-22T10:30:00+05:30";

/**
 * Turns a business's hand-written website findings into evidence rows with the same signal codes,
 * validator names and wording the real validator produces, in the same order it runs its checks.
 */
export function evidenceFor(business: DemoBusiness): EvidenceInput[] {
  const { site, website } = business;
  const at = DISCOVERY_CHECKED_AT;

  if (site.status === "none" || !website) {
    return [["official_website_missing", "website-presence", listingUrl(business), "No official website URL was supplied by the source record.", true, at]];
  }
  if (site.status === "robots-blocked") {
    return [["robots_disallowed", "robots-policy", `${website}/robots.txt`, "robots.txt disallows automated validation of the website root.", true, at]];
  }
  if (site.status === "unreachable") {
    return [["website_unreachable", "http-status", website, "The website did not respond within 10 seconds.", null, at]];
  }
  if (site.status === "http-error") {
    return [["website_http_error", "http-status", `${website}/`, `Official website returned HTTP ${site.code}.`, site.code, at]];
  }

  const home = `${website}/`;
  const rows: EvidenceInput[] = [
    ["website_loads", "http-status", home, "Official website returned HTTP 200.", 200, at],
    site.mobileFriendly
      ? ["mobile_viewport_present", "mobile-viewport", home, "A mobile viewport declaration is present.", true, at]
      : ["mobile_viewport_missing", "mobile-viewport", home, "No mobile viewport declaration was found.", false, at],
    site.contact === "form"
      ? ["contact_form_present", "contact-path", home, "A public contact or booking form was detected.", true, at]
      : site.contact === "link"
        ? ["contact_link_present", "contact-path", home, "A public contact-related link was detected.", true, at]
        : ["contact_path_missing", "contact-path", home, "No contact form or contact-related link was detected.", false, at],
  ];
  if (site.copyrightYear) {
    const stale = site.copyrightYear < 2024;
    rows.push([stale ? "copyright_stale" : "copyright_current", "content-freshness", home, `Newest detected copyright year: ${site.copyrightYear}.`, site.copyrightYear, at]);
  }
  if (site.brokenPage) {
    rows.push(["important_page_broken", "important-page-status", `${website}/${site.brokenPage.path}`, `Important page returned HTTP ${site.brokenPage.code}.`, site.brokenPage.code, at]);
  }
  if (site.mobileSpeed !== undefined) {
    const host = new URL(website).host;
    rows.push(["mobile_performance_score", "pagespeed-mobile", `https://pagespeed.web.dev/analysis?url=${host}`, `Mobile performance score: ${site.mobileSpeed}/100`, site.mobileSpeed, at]);
  }
  return rows;
}

/** The public way to reach the business: the site's contact page if it has one, else the listing. */
export function contactPathFor(business: DemoBusiness): string | null {
  const { site, website } = business;
  if (site.status === "loads" && website && site.contact !== "missing") return `${website}/contact`;
  return listingUrl(business);
}
