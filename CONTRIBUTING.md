# Contributing to LeadGen

LeadGen is maintained by Rachit, Vedant, and Akshay. Keep changes small, reviewable, and tied to one product outcome.

## Ownership

- **Rachit:** product logic, qualification rules, architecture, authentication, and integrations
- **Vedant:** frontend screens, components, responsive behavior, and accessibility
- **Akshay:** discovery connectors, background jobs, data normalization, and tests

Ownership describes the first reviewer, not a boundary. Every pull request should be understandable by all three contributors.

## Workflow

1. Pull the latest `main`.
2. Create a focused branch such as `feat/signup`, `feat/reddit-connector`, or `fix/lead-score`.
3. Make one coherent change and add or update tests.
4. Run all quality checks locally.
5. Open a pull request using the repository template.
6. Merge only after one teammate reviews it and CI passes.

Do not push feature work directly to `main`.

## Local checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Commit style

Use short, outcome-focused messages:

```text
feat: add Google workspace signup
fix: reject unsafe OAuth redirects
test: cover lead qualification thresholds
docs: explain local Supabase setup
```

Never commit `.env.local`, API keys, OAuth secrets, generated build output, or customer data.
