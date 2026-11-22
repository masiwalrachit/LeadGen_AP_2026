---
version: 1
slug: "src-app-dashboard-page-tsx"
primary_target: "src/app/dashboard/page.tsx"
related_targets: ["src/app/dashboard/dashboard.module.css"]
---

# Dashboard surface brief

## Scope and mode

- **Primary target:** `src/app/dashboard/page.tsx`
- **Related target:** `src/app/dashboard/dashboard.module.css`
- **Mode:** Operate
- **Scope:** Authenticated dashboard and application shell only. Authentication remains a separate dark, atmospheric visual world.

## Audience and job

Small web-development agencies choosing between discovery and analysis while monitoring asynchronous qualification work. The dashboard makes Find Leads and Analyze Leads immediately distinct, then helps users understand current processing and evidence coverage.

## Task and content

- Lead with direct access to Find Leads and Analyze Leads, followed by the selected run's five-stage processing movement.
- Keep validation queue and evidence health in a supporting rail.
- Follow with a complete campaign ledger showing stage, native progress, candidate count, and qualified-lead count.
- Preserve the illustrative-data disclosure and mark creation, search, archive, and campaign-detail behavior as planned and unavailable.

## Direction

**Lead Workspace** in the **Daylight Control Room** world. The deep navy rail separates Find Leads and Analyze Leads as sibling destinations, keeps Team and Settings available, and places the current user with sign out directly beneath the brand. The first viewport then exposes both primary actions above the selected processing pipeline and its validation/evidence support.

## Constraints

- Refuse an equal-weight metric-card grid; campaign movement is the dominant object.
- Blue means active, selected, or progressing; green means actually qualified or completed; red means failure or retry; purple is excluded.
- Current navigation and pipeline stages retain `aria-current`; coverage and campaign progress retain native `progress` semantics.
- Mobile campaign records remain complete stacked records with visible field labels; no desktop column is dropped or clipped.
- Do not imply that illustrative records or planned controls are live product capability.

## Unresolved decisions

Campaign creation, search, archive, campaign details, live data wiring, and destination behavior for campaign rows remain planned product work. This brief records no behavior for them.
