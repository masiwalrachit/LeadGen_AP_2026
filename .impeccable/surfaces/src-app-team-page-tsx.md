---
version: 1
slug: "src-app-team-page-tsx"
primary_target: "src/app/team/page.tsx"
related_targets: ["src/app/team/team.module.css", "src/app/team/invite-code.tsx"]
---

# Team surface brief

## Scope and mode

- **Mode:** Operate
- **Scope:** Authenticated workspace membership and owner invite-code visibility.

## Audience and job

Small web-development teams need to confirm who shares a workspace and give trusted teammates a clear path to join it.

## Task and content

- Show real workspace members, roles, usernames, and join dates.
- Let the owner copy the workspace join code with clear success and failure feedback.
- Tell non-owners why the code is unavailable.
- Explain that invitees join after authentication through the existing onboarding choice.

## Direction

Extend the established Daylight Control Room. The member directory is the dominant operational surface; the invite control is a narrower supporting panel. Blue communicates access and action, while green is reserved for the owner role as a completed authority state.

## Constraints

- Never show illustrative members.
- Never expose a join code to non-owners.
- Preserve complete member information on mobile without horizontal clipping.
- Keep workspace membership separate from campaign lead terminology.
