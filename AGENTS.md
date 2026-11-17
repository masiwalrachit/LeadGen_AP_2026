<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## LeadGen project rules

Before modifying this repository, read `README.md`, `PRODUCT.md`, `DESIGN.md`, and `CONTRIBUTING.md` completely. `README.md` defines the agreed MVP terminology, user journey, discovery pipeline, architecture, states, and non-negotiable engineering constraints.

Do not invent or silently broaden product flows. In particular:

- The initial product serves web-development agencies, not every vendor category.
- A discovered record is a candidate, not a lead, until it passes evidence-backed qualification.
- Preserve the public source URL and observation timestamp behind every surfaced signal.
- Run deterministic filters before limited APIs or LLM assessment.
- The LLM never owns the final score and must not invent facts or sources.
- Do not scrape authenticated platforms, bypass access controls, or automate outreach in the MVP.
- Mark planned features as planned; never imply they are already implemented.

If a requested change conflicts with the documented flow or requires a new product decision, stop and ask Rachit.
