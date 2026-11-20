import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { CandidateInput, Evidence, ValidatedCandidate } from "./types";

const MAX_BODY_BYTES = 1_000_000;
const IMPORTANT_LINK = /\b(contact|about|services?|appointments?|booking)\b/i;

function isPrivateAddress(address: string): boolean {
  if (address === "::1" || address === "0.0.0.0") return true;
  if (address.startsWith("fc") || address.startsWith("fd") || /^fe[89ab]/i.test(address)) return true;
  const mapped = address.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  const value = mapped ?? address;
  if (isIP(value) !== 4) return false;
  const [a, b] = value.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127);
}

async function assertPublicUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only public HTTP(S) URLs can be validated.");
  if (url.username || url.password || url.hostname === "localhost") throw new Error("Local or credentialed URLs are not allowed.");
  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Private network destinations are not allowed.");
  return url;
}

async function readLimitedText(response: Response): Promise<string> {
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_BODY_BYTES) throw new Error("Website response exceeds the 1 MB validation limit.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) { await reader.cancel(); throw new Error("Website response exceeds the 1 MB validation limit."); }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

async function fetchPublicPage(rawUrl: string, method: "GET" | "HEAD" = "GET") {
  let url = await assertPublicUrl(rawUrl);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(url, {
      method, redirect: "manual", signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "LeadGenEvidenceValidator/0.1 (+public website validation)" },
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      url = await assertPublicUrl(new URL(response.headers.get("location")!, url).toString());
      continue;
    }
    return { response, url, body: method === "GET" ? await readLimitedText(response) : "" };
  }
  throw new Error("Website redirected too many times.");
}

function evidence(candidate: CandidateInput, index: number, values: Omit<Evidence, "id" | "observedAt">): Evidence {
  return { id: `${candidate.id}-web-${index}`, observedAt: new Date().toISOString(), ...values };
}

function extractImportantLinks(html: string, pageUrl: URL): string[] {
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const urls = links.filter((match) => IMPORTANT_LINK.test(`${match[1]} ${match[2].replace(/<[^>]+>/g, " ")}`)).flatMap((match) => {
    try { const url = new URL(match[1], pageUrl); return url.origin === pageUrl.origin ? [url.toString()] : []; } catch { return []; }
  });
  return [...new Set(urls)].slice(0, 3);
}

async function robotsBlocksValidation(website: string): Promise<{ blocked: boolean; url: string }> {
  const robotsUrl = new URL("/robots.txt", website).toString();
  try {
    const { response, body, url } = await fetchPublicPage(robotsUrl);
    if (!response.ok) return { blocked: false, url: url.toString() };
    const groups = body.split(/\n\s*\n/);
    const wildcardGroup = groups.find((group) => /user-agent\s*:\s*\*/i.test(group));
    return { blocked: Boolean(wildcardGroup && /^\s*disallow\s*:\s*\/\s*$/im.test(wildcardGroup)), url: url.toString() };
  } catch {
    return { blocked: false, url: robotsUrl };
  }
}

async function pageSpeedEvidence(candidate: CandidateInput, website: string, apiKey?: string): Promise<Evidence[]> {
  if (!apiKey) return [];
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", website); endpoint.searchParams.set("strategy", "mobile"); endpoint.searchParams.set("category", "performance"); endpoint.searchParams.set("key", apiKey);
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`PageSpeed returned ${response.status}`);
    const payload = await response.json() as { lighthouseResult?: { categories?: { performance?: { score?: number } } } };
    const score = Math.round((payload.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
    return [{ id: `${candidate.id}-pagespeed`, sourceType: "pagespeed", sourceUrl: endpoint.toString().replace(apiKey, "[redacted]"), observedAt: new Date().toISOString(), validator: "pagespeed-mobile", signalCode: "mobile_performance_score", observation: `Mobile performance score: ${score}/100`, extractedValue: score }];
  } catch (error) {
    return [{ id: `${candidate.id}-pagespeed-error`, sourceType: "pagespeed", sourceUrl: website, observedAt: new Date().toISOString(), validator: "pagespeed-mobile", signalCode: "pagespeed_unavailable", observation: error instanceof Error ? error.message : "PageSpeed check failed.", extractedValue: null }];
  }
}

export async function validateWebsite(candidate: CandidateInput, pageSpeedApiKey?: string): Promise<ValidatedCandidate> {
  const collected: Evidence[] = [{ id: `${candidate.id}-csv`, sourceType: "csv-source", sourceUrl: candidate.sourceUrl, observedAt: candidate.observedAt, validator: "csv-import", signalCode: "source_description", observation: candidate.description, extractedValue: candidate.description }];
  if (!candidate.website) {
    collected.push(evidence(candidate, 1, { sourceType: "website", sourceUrl: candidate.sourceUrl, validator: "website-presence", signalCode: "official_website_missing", observation: "No official website URL was supplied by the source record.", extractedValue: true }));
    return { ...candidate, evidence: collected };
  }

  try {
    const robots = await robotsBlocksValidation(candidate.website);
    if (robots.blocked) {
      collected.push(evidence(candidate, 1, { sourceType: "website", sourceUrl: robots.url, validator: "robots-policy", signalCode: "robots_disallowed", observation: "robots.txt disallows automated validation of the website root.", extractedValue: true }));
      return { ...candidate, evidence: collected };
    }
    const { response, url, body } = await fetchPublicPage(candidate.website);
    const sourceUrl = url.toString();
    collected.push(evidence(candidate, 1, { sourceType: "website", sourceUrl, validator: "http-status", signalCode: response.ok ? "website_loads" : "website_http_error", observation: `Official website returned HTTP ${response.status}.`, extractedValue: response.status }));
    if (response.ok && /text\/html/i.test(response.headers.get("content-type") ?? "text/html")) {
      const mobile = /<meta\b[^>]*name=["']viewport["']/i.test(body);
      const contactForm = /<form\b/i.test(body) && /(contact|enquiry|appointment|booking)/i.test(body);
      const contactLink = IMPORTANT_LINK.test(body);
      collected.push(evidence(candidate, 2, { sourceType: "website", sourceUrl, validator: "mobile-viewport", signalCode: mobile ? "mobile_viewport_present" : "mobile_viewport_missing", observation: mobile ? "A mobile viewport declaration is present." : "No mobile viewport declaration was found.", extractedValue: mobile }));
      collected.push(evidence(candidate, 3, { sourceType: "website", sourceUrl, validator: "contact-path", signalCode: contactForm ? "contact_form_present" : contactLink ? "contact_link_present" : "contact_path_missing", observation: contactForm ? "A public contact or booking form was detected." : contactLink ? "A public contact-related link was detected." : "No contact form or contact-related link was detected.", extractedValue: contactForm || contactLink }));
      const years = [...body.matchAll(/(?:©|copyright)[^\d]{0,20}(20\d{2})/gi)].map((match) => Number(match[1]));
      if (years.length > 0) {
        const newestYear = Math.max(...years);
        collected.push(evidence(candidate, 4, { sourceType: "website", sourceUrl, validator: "content-freshness", signalCode: newestYear < new Date().getUTCFullYear() - 2 ? "copyright_stale" : "copyright_current", observation: `Newest detected copyright year: ${newestYear}.`, extractedValue: newestYear }));
      }
      const links = extractImportantLinks(body, url);
      const results = await Promise.allSettled(links.map((link) => fetchPublicPage(link, "HEAD")));
      results.forEach((result, index) => {
        const status = result.status === "fulfilled" ? result.value.response.status : 0;
        collected.push(evidence(candidate, 5 + index, { sourceType: "website", sourceUrl: links[index], validator: "important-page-status", signalCode: status >= 400 || status === 0 ? "important_page_broken" : "important_page_healthy", observation: status ? `Important page returned HTTP ${status}.` : "Important page could not be reached.", extractedValue: status }));
      });
    }
  } catch (error) {
    collected.push(evidence(candidate, 1, { sourceType: "website", sourceUrl: candidate.website, validator: "http-status", signalCode: "website_unreachable", observation: error instanceof Error ? error.message : "Official website could not be validated.", extractedValue: null }));
  }
  collected.push(...await pageSpeedEvidence(candidate, candidate.website, pageSpeedApiKey));
  return { ...candidate, evidence: collected };
}

export async function validateCandidateWebsites(candidates: CandidateInput[], pageSpeedApiKey?: string): Promise<ValidatedCandidate[]> {
  const output: ValidatedCandidate[] = [];
  for (let index = 0; index < candidates.length; index += 3) {
    output.push(...await Promise.all(candidates.slice(index, index + 3).map((candidate) => validateWebsite(candidate, pageSpeedApiKey))));
  }
  return output;
}
