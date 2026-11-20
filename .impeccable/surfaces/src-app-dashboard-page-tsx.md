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

Small web-development agencies monitoring asynchronous discovery and qualification work. The dashboard helps them understand what the selected campaign is doing now, where processing is blocked, how strong its evidence coverage is, and which campaign to open next.

## Task and content

- Lead with the selected campaign's five-stage processing movement.
- Keep validation queue and evidence health in a supporting rail.
- Follow with a complete campaign ledger showing stage, native progress, candidate count, and qualified-lead count.
- Preserve the illustrative-data disclosure and mark creation, search, archive, and campaign-detail behavior as planned and unavailable.

## Direction

**Campaign Observatory** in the **Daylight Control Room** world. The first viewport places the deep navy workspace rail at left, page title and disabled planned Create campaign control above, the selected campaign pipeline across the main field, and validation/evidence support at right. The memorable moment is the pipeline itself: a horizontal campaign trajectory on desktop that becomes a clear vertical sequence on mobile.

## Constraints

- Refuse an equal-weight metric-card grid; campaign movement is the dominant object.
- Blue means active, selected, or progressing; green means actually qualified or completed; red means failure or retry; purple is excluded.
- Current navigation and pipeline stages retain `aria-current`; coverage and campaign progress retain native `progress` semantics.
- Mobile campaign records remain complete stacked records with visible field labels; no desktop column is dropped or clipped.
- Do not imply that illustrative records or planned controls are live product capability.

## Unresolved decisions

Campaign creation, search, archive, campaign details, live data wiring, and destination behavior for campaign rows remain planned product work. This brief records no behavior for them.
