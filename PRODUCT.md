# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated and confirmed through product discussion: TypeScript, Next.js, Tailwind CSS, Supabase PostgreSQL/Auth/Storage, Trigger.dev background jobs, Brave Search, Google Places API, PageSpeed Insights, and Gemini structured outputs.

## Users

Small web-development agencies, initially teams of roughly 2–20 people, that need a repeatable way to find businesses likely to need web-development work.

## Product Purpose

The product turns an agency's service, target industry, and location into evidence-backed lead opportunities. It discovers candidate organizations, inspects public web information, identifies service-specific signals, and returns leads with a transparent reason, source evidence, and public business contact path.

Success means agencies receive a small set of leads they would genuinely contact, rather than a large generic contact list.

## Positioning

LeadGen focuses on “why this business, why this service, and why now.” Its useful output is an evidence-backed opportunity tied to a specific web-development service, not an unexplained contact record.

## Operating Context

An agency creates a campaign for a client or its own business, selects a service playbook, defines an industry and location, waits while discovery and validation run asynchronously, and then reviews a lead inbox. Users save, reject, mark contacted, and export leads while providing feedback that improves campaign ranking.

## Capabilities and Constraints

- Initial service playbooks: new website, website redesign, e-commerce development, and website maintenance/performance.
- Initial discovery sources: Brave Search, Google Places, permitted public business websites, sitemaps, and RSS where available.
- Website validation uses HTTP/HTML checks and PageSpeed Insights.
- Gemini performs structured intent classification only after deterministic filtering.
- Every recommendation must retain source evidence and confidence.
- The first release does not automate outreach, scrape authenticated social platforms, bypass access controls, or promise guaranteed buying intent.
- Collection must respect source terms, robots.txt, rate limits, retention requirements, and public-business-data boundaries.

## Brand Commitments

“LeadGen” is a working product name, not a confirmed final brand. Voice should be direct, evidence-led, practical, and honest about confidence.

## Evidence on Hand

No customer testimonials, conversion benchmarks, logos, brand assets, or production lead data exist yet. Demonstration data must be labeled as illustrative and commercial claims must not be invented.

## Product Principles

1. Evidence before volume.
2. Explain every score.
3. Show useful results progressively while deeper checks continue.
4. Use cheap deterministic checks before paid or limited AI calls.
5. Keep humans in control of qualification and outreach.

## Accessibility & Inclusion

The web interface should meet WCAG 2.2 AA expectations, support keyboard navigation, visible focus states, reduced motion, and readable responsive layouts.
