---
name: LeadGen
description: An evidence-led campaign control room for web-development agencies.
colors:
  auth-ink: "#0a0b0d"
  auth-paper: "#f4f2ec"
  auth-muted: "#aaa69b"
  auth-signal: "#e763a9"
  auth-verified: "#c9f06b"
  app-canvas: "oklch(0.973 0.012 247)"
  app-surface: "oklch(1 0 0)"
  app-navy: "oklch(0.235 0.058 257)"
  app-ink: "oklch(0.25 0.045 257)"
  app-muted: "oklch(0.53 0.035 257)"
  app-line: "oklch(0.89 0.018 250)"
  app-blue: "oklch(0.58 0.2 258)"
  app-blue-deep: "oklch(0.48 0.19 258)"
  app-blue-soft: "oklch(0.95 0.035 250)"
  app-green: "oklch(0.57 0.15 155)"
  app-green-soft: "oklch(0.95 0.045 150)"
  app-red: "oklch(0.58 0.19 25)"
  app-red-soft: "oklch(0.95 0.035 25)"
typography:
  display:
    fontFamily: "Manrope Variable, Avenir Next, sans-serif"
    fontSize: "clamp(31px, 3vw, 44px)"
    fontWeight: 680
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Manrope Variable, Avenir Next, sans-serif"
    fontSize: "clamp(21px, 2.2vw, 29px)"
    fontWeight: 675
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope Variable, Avenir Next, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Manrope Variable, Avenir Next, sans-serif"
    fontSize: "12px"
    fontWeight: 700
rounded:
  control: "12px"
  surface: "16px"
  pill: "999px"
spacing:
  xs: "5px"
  sm: "10px"
  md: "20px"
  lg: "28px"
components:
  app-planned-action:
    backgroundColor: "{colors.app-blue}"
    textColor: "{colors.app-surface}"
    rounded: "{rounded.control}"
    height: "43px"
    padding: "0 17px"
  app-surface:
    backgroundColor: "{colors.app-surface}"
    textColor: "{colors.app-ink}"
    rounded: "{rounded.surface}"
    padding: "28px"
  status-active:
    backgroundColor: "{colors.app-blue-soft}"
    textColor: "{colors.app-blue-deep}"
    rounded: "{rounded.pill}"
    padding: "5px 8px"
  status-qualified:
    backgroundColor: "{colors.app-green-soft}"
    textColor: "{colors.app-green}"
    rounded: "{rounded.pill}"
    padding: "5px 9px"
---

# Design System: LeadGen

## Overview

**Creative North Star: "Daylight Control Room"**

LeadGen's authenticated application is a bright, evidence-led workspace for sustained campaign monitoring. Ice-white canvas, deep navy navigation, white operational surfaces, and precise blue-gray rules make campaign movement legible without turning the product into a generic grid of equal-weight metrics. The design should feel like an observatory: one active process dominates, while validation, evidence quality, and the campaign ledger support it.

Authentication is a separate, scoped visual world. It retains the dark, atmospheric evidence-desk treatment and its pink signal color; those choices must not leak into the authenticated application. Across both worlds, the voice remains direct, analytical, and honest about confidence.

**Key Characteristics:**

- Campaign movement is the dominant object in authenticated views.
- White operational planes sit on an ice-blue field beside a deep navy workspace rail.
- Cobalt communicates selection, active discovery, and progress; green appears only after qualification or completion.
- Fine rules, restrained ambient shadow, and tabular numerals support scanning without decorative noise.
- Illustrative data and planned behavior are disclosed in place rather than presented as live product capability.

## Colors

The application palette is cool, quiet, and semantic; the authentication palette remains dark and atmospheric within its own routes.

### Primary

- **Control-Room Cobalt:** The authenticated application's active, selected, and in-progress signal. Use it for current pipeline movement, active navigation accents, focus support, and progress—not for qualified outcomes.

### Secondary

- **Workspace Navy:** The application shell's structural color. It owns the desktop rail, mobile masthead, and high-contrast workspace framing.
- **Authentication Signal:** The pink accent belongs only to the dark authentication world and must not become an application status color.

### Tertiary

- **Qualified Green:** Reserved for candidates or campaigns that have actually met qualification or completion criteria.
- **Retry Red:** Reserved for failed checks, retry needs, and corrective states, always paired with text or an icon.

### Neutral

- **Ice Canvas:** The authenticated workspace field behind operational content.
- **Working White:** The base for observatories, monitoring rails, campaign ledgers, and controls.
- **Evidence Ink:** The primary application text color.
- **Blue-Gray Muted:** Supporting copy, labels, future stages, and metadata.
- **Fine Rule:** Separates rows and regions without turning the dashboard into a boxed grid.

### Named Rules

**The Semantic Signal Rule.** Blue means active or progressing, green means genuinely qualified or completed, and red means failure or retry. Purple is excluded from the application status system.

**The Scoped Worlds Rule.** Dark ink, warm paper, and pink signal belong to authentication; the authenticated shell uses the daylight palette.

## Typography

**Display Font:** Manrope Variable (with Avenir Next and sans-serif fallbacks)

**Body Font:** Manrope Variable (with Avenir Next and sans-serif fallbacks)

**Character:** A single workhorse family keeps the interface direct and operational. Tight display tracking and measured weight establish hierarchy; small labels and tabular numbers keep dense pipeline data easy to compare.

### Hierarchy

- **Display** (680, fluid 31–44px, 1.05): Page-level titles only.
- **Headline** (675, fluid 21–29px): The selected campaign and other dominant operational subjects.
- **Title** (720, 16px): Monitoring sections and ledger headings.
- **Body** (400, 12–14px): Explanations, metadata, and supporting guidance.
- **Label** (700–750, 10–12px): Stages, statuses, table headings, and compact operational metadata; uppercase and tracking are reserved for structural labels.

### Named Rules

**The Numeric Scan Rule.** Counts, percentages, and campaign measures use tabular numerals so columns and changing values remain stable.

## Layout

The authenticated shell uses a persistent 264px workspace rail and a flexible main field; the rail contracts to 224px at intermediate desktop widths. Main content uses fluid horizontal padding from 24px to 56px. The primary dashboard composition is asymmetric: the selected campaign pipeline receives the broad field, while a narrower validation and evidence rail sits beside it. The campaign ledger follows below. This hierarchy must not collapse into an equal-weight metric-card grid.

At 1120px and below, the supporting rail moves beneath the campaign observatory and splits into two columns. At 780px and below, the workspace rail becomes a navy mobile masthead, the campaign pipeline becomes a vertical sequence, the monitoring rail becomes one column, and the campaign table becomes complete stacked records with every field labeled. Do not clip or horizontally abbreviate campaign records on mobile.

**The Observatory Rule.** The current campaign's movement owns the first working viewport; validation and evidence remain visibly secondary.

## Elevation & Depth

The application uses tonal layering plus restrained ambient shadow. White operational surfaces are separated from the ice canvas with a fine border and a broad, low-opacity shadow; the active navigation item and cobalt brand mark may lift more noticeably against the navy rail. Depth clarifies containment and state, never spectacle. Authentication retains its own darker atmospheric depth treatment.

### Shadow Vocabulary

- **Operational surface** (`0 18px 50px rgba(28, 55, 96, 0.065)`): Observatory, monitor rail, and campaign ledger on the daylight canvas.
- **Active navigation** (`0 9px 26px rgba(4, 18, 43, 0.24)`): Selected workspace destination against the navy rail.
- **Planned action** (`0 9px 25px rgba(24, 88, 211, 0.23)`): The disclosed, disabled Create campaign control in the current dashboard preview.

**The Quiet Depth Rule.** Resting operational surfaces read through tone and rules first; shadow supports the hierarchy but never replaces it.

## Shapes

Application controls use gently curved 11–13px corners, while major operational surfaces use a 16px radius. Compact statuses and progress tracks are true pills. Circular markers are reserved for pipeline steps, live indicators, and member avatars. One-pixel blue-gray borders organize the daylight workspace; authentication keeps its established 11–14px control language.

**The Pill Restraint Rule.** Use full pills only for compact status, badge, and progress information—not for ordinary containers or primary layout.

## Components

### Buttons

- **Shape:** Compact controls use a 12px radius and a 43px minimum height.
- **Planned action:** Cobalt with white text, a restrained blue shadow, icon-plus-label composition, and an explicit “Next” badge.
- **Focus:** Available interactive controls receive a visible 3px focus outline. Reduced-motion preference removes navigation transitions.
- **Planned / Disabled:** Keep planned actions visibly disabled, retain explicit “planned” or “next” language, and do not style them as available behavior.

### Chips

- **Style:** Status chips pair a soft semantic tint with its darker text color and use a full pill shape.
- **State:** Active and scoring states stay in the blue/navy family; only completed or qualified records use green. Failure and retry use red with explicit text or icon support.

### Cards / Containers

- **Corner Style:** Major operational surfaces use 16px corners and clip their internal sections cleanly.
- **Background:** Working white over the ice canvas.
- **Shadow Strategy:** Use the operational surface shadow with a fine structural border.
- **Internal Padding:** Major section headers and bodies use roughly 23–28px on desktop and 20px on mobile.

### Navigation

- The desktop workspace rail is deep navy with muted light labels, 46px rows, and 12px corners. The active destination becomes a white inset surface with navy text and `aria-current="page"`.
- On mobile, navigation moves into a compact navy masthead and disclosure menu; it does not become a second content card.

### Campaign Pipeline

- The pipeline is the dashboard's signature component: five stages arranged horizontally on desktop and vertically on mobile.
- Completed processing steps use cobalt, the current step uses a cobalt outlined marker with `aria-current="step"`, and future steps remain muted but readable.
- Progress and evidence measures use native `progress` semantics. Visual tracks are blue; green is not used for mere progress.

### Campaign Ledger

- Desktop uses a compact table with structural labels, tabular values, and subtle row hover.
- Mobile replaces the table layout with complete stacked campaign records. Every value keeps its visible field label and no column is dropped.

## Do's and Don'ts

### Do:

- **Do** make campaign movement the dominant object and keep validation or evidence health in a supporting rail.
- **Do** label illustrative campaign data clearly and disclose planned controls in the interface.
- **Do** preserve public-evidence language and use direct terms such as “candidate,” “qualified lead,” “signal,” and “evidence.”
- **Do** use semantic markup for current navigation, current stages, tables, and progress values.
- **Do** preserve the vertical mobile pipeline and complete stacked campaign records.

### Don't:

- **Don't** build a generic dashboard from equal-weight metric cards.
- **Don't** use green for discovery, selection, or partial progress.
- **Don't** introduce purple into application status or progress states.
- **Don't** carry authentication's pink signal or near-black canvas into the authenticated workspace.
- **Don't** make planned creation, search, archive, or campaign-detail behavior appear available before it is implemented.
