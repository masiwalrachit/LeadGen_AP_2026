# LeadGen: Normalization (UNF → 1NF → 2NF → 3NF → BCNF)

Team T0147 · AP project: **LeadGen** · Author: Akshay

This document normalizes the data LeadGen needs for its agreed MVP flow (README.md): an agency
**workspace** creates a **campaign** for one **service playbook**, the system discovers **candidate**
businesses, records **signals** backed by **evidence**, scores them on five **score dimensions**, and
publishes qualified **leads** that users review. The schema is not implemented in the app yet; this is
the design that `dbms/03_schema.sql` will follow.

> All sample rows below are **illustrative** (fictional businesses on `.example` domains), as
> PRODUCT.md requires. Sample weights and scores are placeholders: the real weights are a product
> decision owned by Rachit and are stored as versioned data, not hard-coded.

---

## 1. Starting point: the unnormalized "lead sheet" (UNF)

Before any design, the most natural way to store LeadGen's output is how an agency keeps leads in a
spreadsheet: **one row per lead**, with everything about it packed into that row.

### UNF relation

```text
LEAD_SHEET (
  workspace_name, workspace_website,
  { member_email, member_name, member_role },                       -- repeating group
  { service_code, service_name },                                   -- services the agency offers
  client_name, client_website,
  campaign_name, playbook_code, playbook_name, target_industry, target_location,
  min_evidence_strength, business_size, campaign_status,
  created_by_email, created_by_name,
  business_name, website_url, business_industry, address_line, city, region, country_code,
  { source_type, source_record_id },                                -- where the business was found
  { contact_type, contact_value, contact_source_url },              -- public contact paths
  { signal_code, signal_description, confidence,                    -- signals ...
      { evidence_url, source_type, observed_at, title, excerpt } }, -- ... each with its own evidence (nested)
  { model_name, intent_label, llm_summary },                        -- LLM assessments
  scoring_version, qualification_threshold,
  { dimension_code, dimension_name, weight, dimension_score, explanation },  -- 5 score dimensions
  final_score, reason_summary, qualification_status,
  review_status, reviewed_by_email, reviewed_at,
  { action, action_by_email, action_at, note }                      -- review history
)
```

`{ ... }` marks a **repeating group**: a cell that holds a list instead of one value.

### Sample (illustrative) UNF rows

| workspace_name | services offered | campaign | business | contacts | signals (with evidence) | score dimensions | final_score | review_status |
|---|---|---|---|---|---|---|---|---|
| PixelCraft Studio | REDESIGN, ECOMMERCE, MAINTENANCE | "Pune cafés – redesign" (REDESIGN) | Green Leaf Café · greenleafcafe.example | email: hello@greenleafcafe.example; phone: +91 98xxxxxx01; form: /contact | SLOW_MOBILE 0.92 [pagespeed: mobile score 31, 2026-11-10]; NO_HTTPS 0.99 [http check, 2026-11-10] | FIT 85 ×0.25; NEED 90 ×0.30; TIMING 40 ×0.15; REACH 80 ×0.15; EVIDENCE 75 ×0.15 | 77.5 | saved |
| PixelCraft Studio | REDESIGN, ECOMMERCE, MAINTENANCE | "Pune cafés – redesign" (REDESIGN) | Brew & Bean · brewbean.example | email: info@brewbean.example | OUTDATED_DESIGN 0.71 [homepage, 2026-11-11]; RECENT_OPENING 0.80 [news page, 2026-10-28] | FIT 90 ×0.25; NEED 70 ×0.30; TIMING 85 ×0.15; REACH 55 ×0.15; EVIDENCE 60 ×0.15 | 73.5 | new |

### Problems with UNF

| Anomaly | Example in LeadGen |
|---|---|
| **Not atomic** | "contacts" holds three contact paths in one cell; "signals" holds a list that itself holds a list of evidence. SQL cannot index, filter or join on part of a cell ("all leads with SLOW_MOBILE", "sort by NEED score"). |
| **Update anomaly** | The agency renames itself → every lead row must change. A playbook is renamed → every row of every campaign changes. |
| **Insertion anomaly** | A workspace member, a new client, or a new campaign in `draft` cannot be stored until at least one lead exists. A discovered **candidate** that has not qualified yet has no natural place at all. |
| **Deletion anomaly** | Rejecting and deleting the last lead of a campaign deletes the campaign definition. Deleting one lead also deletes the evidence about that business, even though another campaign might use the same evidence. |
| **Redundancy** | The same business found by two campaigns is stored twice with its address and contacts, and the copies can drift apart, which breaks deduplication (README step 3). |

---

## 2. First Normal Form (1NF)

**Rule:** every attribute holds one atomic value, there are no repeating groups, and every relation
has a key.

**How:** each repeating group moves into its own relation that carries the key of the entity it
repeats under, plus its own identifier. Names are not stable or unique identifiers (two cafés can
share a name; an agency can rename itself), so identifiers are introduced here: `workspace_id`,
`campaign_id`, `business_id`, `user_id`, `evidence_id`, `scoring_model_id`.

The nested group *signals → evidence* is flattened into one row per (signal, evidence) pair.

| 1NF relation | Primary key | Came from |
|---|---|---|
| **LEAD_1NF** (campaign_id, business_id, workspace_id, workspace_name, workspace_website, client_id, client_name, client_website, campaign_name, playbook_code, playbook_name, target_industry, target_location, min_evidence_strength, business_size, campaign_status, created_by_user_id, created_by_email, created_by_name, business_name, website_url, normalized_domain, business_industry, address_line, city, region, country_code, discovered_at, qualification_status, scoring_model_id, scoring_version, qualification_threshold, final_score, reason_summary, published_at, review_status, reviewed_by_user_id, reviewed_by_email, reviewed_at) | (campaign_id, business_id) | all single-valued columns |
| **MEMBER_1NF** (workspace_id, user_id, user_email, user_name, role, joined_at) | (workspace_id, user_id) | members group |
| **OFFERED_SERVICE_1NF** (workspace_id, playbook_code, playbook_name) | (workspace_id, playbook_code) | services offered group |
| **SOURCE_RECORD_1NF** (source_type, source_record_id, business_id, first_seen_at) | (source_type, source_record_id) | source ids group |
| **CONTACT_1NF** (business_id, contact_type, contact_value, is_primary, evidence_id, evidence_url, evidence_observed_at) | (business_id, contact_type, contact_value) | contacts group |
| **SIGNAL_EVIDENCE_1NF** (campaign_id, business_id, signal_code, evidence_id, signal_description, confidence, detected_at, source_type, source_url, observed_at, title, excerpt, extracted_value) | (campaign_id, business_id, signal_code, evidence_id) | signals and nested evidence |
| **SCORE_COMPONENT_1NF** (campaign_id, business_id, dimension_code, dimension_name, weight, dimension_score, explanation) | (campaign_id, business_id, dimension_code) | score dimensions group |
| **ASSESSMENT_1NF** (campaign_id, business_id, assessed_at, model_name, schema_version, intent_label, summary) | (campaign_id, business_id, assessed_at) | LLM assessments group |
| **REVIEW_EVENT_1NF** (campaign_id, business_id, acted_at, user_id, user_email, user_name, action, note) | (campaign_id, business_id, acted_at, user_id) | review history group |

Why the repeating groups were **not** flattened into extra rows of one table: contacts, signals and
score dimensions are independent of each other. One table with a row per (contact × signal ×
dimension) would turn 3 contacts × 2 signals × 5 dimensions into 30 rows for one lead, and every
signal would be repeated once per contact (a multivalued-dependency problem that 4NF addresses).
Separate relations avoid it from the start.

**What is still wrong in 1NF:** LEAD_1NF repeats the whole campaign and workspace on every lead and the
whole business on every campaign that finds it. The anomalies of section 1 remain, because many
attributes depend on only **part** of a composite key.

---

## 3. Second Normal Form (2NF)

**Rule:** 1NF, and no non-key attribute depends on only part of a composite key (no **partial
dependency**).

### Partial dependencies found

| Relation | Partial dependency | Fix |
|---|---|---|
| LEAD_1NF | campaign_id → workspace_id, client_id, campaign_name, playbook_code, target_industry, target_location, min_evidence_strength, business_size, campaign_status, created_by_user_id, ... | move to **CAMPAIGN_2NF** |
| LEAD_1NF | business_id → business_name, website_url, normalized_domain, business_industry, address_line, city, region, country_code | move to **BUSINESS_2NF** |
| LEAD_1NF | the remaining attributes depend on the full key (campaign_id, business_id) | they describe the business *inside one campaign*: the **candidate** |
| MEMBER_1NF | user_id → user_email, user_name | move to **USER** |
| OFFERED_SERVICE_1NF | playbook_code → playbook_name | move to **SERVICE_PLAYBOOK** |
| SIGNAL_EVIDENCE_1NF | signal_code → signal_description | move to **SIGNAL_TYPE** |
| SIGNAL_EVIDENCE_1NF | (campaign_id, business_id, signal_code) → confidence, detected_at (does not depend on evidence_id) | move to **CANDIDATE_SIGNAL** |
| SIGNAL_EVIDENCE_1NF | evidence_id → business_id, source_type, source_url, observed_at, title, excerpt, extracted_value | move to **EVIDENCE** |
| SCORE_COMPONENT_1NF | dimension_code → dimension_name | move to **SCORE_DIMENSION** |
| REVIEW_EVENT_1NF | user_id → user_email, user_name | use **USER** |

SOURCE_RECORD_1NF, CONTACT_1NF and ASSESSMENT_1NF have no partial dependency: every non-key attribute
needs the whole key.

### Surrogate key for candidates

The pair (campaign_id, business_id) identifies a candidate and stays as a **candidate key** (UNIQUE).
A single-column `candidate_id` is added as the primary key, because signals, scores, assessments and
reviews all reference the candidate, and a one-column foreign key keeps those child tables smaller
and simpler. The rows that hung off (campaign_id, business_id) now hang off candidate_id.

### 2NF relations

```text
USER              (user_id, user_email, user_name)
MEMBER_2NF        (workspace_id, user_id, role, joined_at)
SERVICE_PLAYBOOK  (playbook_code, playbook_name)
OFFERED_SERVICE   (workspace_id, playbook_code)
CAMPAIGN_2NF      (campaign_id, workspace_id, workspace_name, workspace_website,
                   client_id, client_name, client_website, campaign_name, playbook_code,
                   target_industry, target_location, min_evidence_strength, business_size,
                   campaign_status, created_by_user_id)
BUSINESS_2NF      (business_id, business_name, website_url, normalized_domain, business_industry,
                   address_line, city, region, country_code)
SOURCE_RECORD     (source_type, source_record_id, business_id, first_seen_at)
CANDIDATE_2NF     (candidate_id, campaign_id, business_id, discovered_at, qualification_status,
                   scoring_model_id, scoring_version, qualification_threshold, final_score,
                   reason_summary, published_at, review_status, reviewed_by_user_id, reviewed_at)
EVIDENCE          (evidence_id, business_id, source_type, source_url, observed_at, title, excerpt,
                   extracted_value)
CONTACT_2NF       (business_id, contact_type, contact_value, is_primary, evidence_id,
                   evidence_url, evidence_observed_at)
SIGNAL_TYPE       (signal_code, signal_description)
CANDIDATE_SIGNAL  (candidate_id, signal_code, confidence, detected_at)
SIGNAL_EVIDENCE   (candidate_id, signal_code, evidence_id)
SCORE_DIMENSION   (dimension_code, dimension_name)
SCORE_COMP_2NF    (candidate_id, dimension_code, weight, dimension_score, explanation)
ASSESSMENT        (candidate_id, assessed_at, model_name, schema_version, intent_label, summary)
REVIEW_EVENT      (candidate_id, acted_at, user_id, action, note)
```

**Solved by 2NF:** a business is stored once no matter how many campaigns find it (dedup works); a
campaign exists before it has candidates; evidence about a business survives when a lead is deleted
and can be reused by another campaign.

**Still wrong:** some non-key attributes depend on *another non-key attribute* (transitive
dependencies), e.g. `campaign_id → workspace_id → workspace_name`.

---

## 4. Third Normal Form (3NF)

**Rule:** 2NF, and for every dependency X → A, either X is a superkey or A is part of a candidate key.
In practice: no non-key attribute depends on another non-key attribute (no **transitive
dependency**).

### Transitive dependencies found

| Relation | Transitive dependency | Fix |
|---|---|---|
| CAMPAIGN_2NF | campaign_id → workspace_id → workspace_name, workspace_website | new **WORKSPACE** |
| CAMPAIGN_2NF | campaign_id → client_id → client_name, client_website | new **CLIENT** (client_id → workspace_id also moves there) |
| CAMPAIGN_2NF | campaign_id → created_by_user_id → user_email, user_name | already in **USER**; keep only the FK |
| CANDIDATE_2NF | candidate_id → scoring_model_id → scoring_version, qualification_threshold, playbook_code | new **SCORING_MODEL** |
| CANDIDATE_2NF | lead-only attributes (final_score, reason_summary, published_at, review_status, reviewed_by_user_id, reviewed_at, scoring_model_id) exist only when qualification_status = 'qualified' | split into **LEAD** (1 : 0..1 with candidate) so unqualified candidates carry no empty lead columns |
| CONTACT_2NF | (business_id, contact_type, contact_value) → evidence_id → evidence_url, evidence_observed_at | already in **EVIDENCE**; keep only evidence_id |
| SCORE_COMP_2NF | weight depends on (scoring_model_id, dimension_code), and scoring_model_id comes from the lead, not from the component | new **SCORING_MODEL_WEIGHT**; component keeps only its own score |
| (lead row in UNF) | "recommended service" = campaign_id → playbook_code | not stored on the lead at all; read through the campaign |

The LEAD split is also why "candidate" and "lead" stay separate, as README's terminology demands:
*"a record is a candidate until it passes qualification."*

### Final relations (3NF, and BCNF except where section 7 says otherwise)

Notation: **PK** primary key · **CK** other candidate key (UNIQUE) · **FK** foreign key.

| # | Relation | Attributes | Keys |
|---|---|---|---|
| 1 | `users` | user_id, email, full_name, created_at | PK user_id · CK email |
| 2 | `workspaces` | workspace_id, name, website_url, default_location, created_by, created_at | PK workspace_id · FK created_by → users |
| 3 | `workspace_members` | workspace_id, user_id, role, joined_at | PK (workspace_id, user_id) · FKs → workspaces, users |
| 4 | `service_playbooks` | playbook_id, code, name, description | PK playbook_id · CK code · CK name |
| 5 | `workspace_services` | workspace_id, playbook_id | PK (workspace_id, playbook_id) · FKs → workspaces, service_playbooks |
| 6 | `clients` | client_id, workspace_id, name, website_url | PK client_id · CK (workspace_id, name) · FK → workspaces |
| 7 | `campaigns` | campaign_id, workspace_id, client_id (nullable), playbook_id, name, target_industry, target_location, min_evidence_strength, business_size, status, created_by, created_at | PK campaign_id · FKs → workspaces, service_playbooks, users · **FK (client_id, workspace_id) → clients (client_id, workspace_id)** |
| 8 | `businesses` | business_id, name, website_url, normalized_domain (nullable), industry, address_line, city, region, country_code, created_at | PK business_id · CK normalized_domain (when present) |
| 9 | `business_source_records` | source_type, source_record_id, business_id, first_seen_at | PK (source_type, source_record_id) · FK → businesses |
| 10 | `candidates` | candidate_id, campaign_id, business_id, discovered_at, qualification_status | PK candidate_id · CK (campaign_id, business_id) · FKs → campaigns, businesses |
| 11 | `evidence` | evidence_id, business_id, source_type, source_url, observed_at, title, excerpt, extracted_value | PK evidence_id · CK (business_id, source_url, observed_at) · FK → businesses |
| 12 | `business_contacts` | contact_id, business_id, contact_type, contact_value, is_primary, evidence_id | PK contact_id · CK (business_id, contact_type, contact_value) · **FK (evidence_id, business_id) → evidence** |
| 13 | `signal_types` | signal_code, description | PK signal_code |
| 14 | `candidate_signals` | candidate_id, signal_code, confidence, detected_at | PK (candidate_id, signal_code) · FKs → candidates, signal_types |
| 15 | `signal_evidence` | candidate_id, signal_code, evidence_id | PK (candidate_id, signal_code, evidence_id) · FKs → candidate_signals, evidence |
| 16 | `llm_assessments` | assessment_id, candidate_id, model_name, schema_version, intent_label, summary, assessed_at | PK assessment_id · CK (candidate_id, assessed_at) · FK → candidates |
| 17 | `score_dimensions` | dimension_code, name, description | PK dimension_code · CK name |
| 18 | `scoring_models` | scoring_model_id, playbook_id, version, qualification_threshold, created_at | PK scoring_model_id · CK (playbook_id, version) · FK → service_playbooks |
| 19 | `scoring_model_weights` | scoring_model_id, dimension_code, weight | PK (scoring_model_id, dimension_code) · FKs → scoring_models, score_dimensions |
| 20 | `leads` | candidate_id, scoring_model_id, final_score, reason_summary, published_at, review_status, reviewed_by, reviewed_at | PK candidate_id (also FK → candidates) · FKs → scoring_models, users |
| 21 | `lead_score_components` | candidate_id, dimension_code, dimension_score, explanation | PK (candidate_id, dimension_code) · FKs → leads, score_dimensions |
| 22 | `lead_review_events` | event_id, candidate_id, user_id, action, note, acted_at | PK event_id · FKs → leads, users |

`users.user_id` is the Supabase Auth user id (`auth.users.id`); `users` holds the profile columns the
app needs, so other tables never reference Supabase's internal schema directly.

---

## 5. Functional dependencies of every final relation

"→" means *determines*. Only non-trivial dependencies are listed. Relations whose key is all their
columns (pure bridge tables) have no non-trivial FD.

| Relation | Functional dependencies | Candidate keys |
|---|---|---|
| users | user_id → email, full_name, created_at · email → user_id, full_name, created_at | {user_id}, {email} |
| workspaces | workspace_id → name, website_url, default_location, created_by, created_at | {workspace_id} |
| workspace_members | (workspace_id, user_id) → role, joined_at | {workspace_id, user_id} |
| service_playbooks | playbook_id → code, name, description · code → playbook_id, name, description · name → playbook_id, code, description | {playbook_id}, {code}, {name} |
| workspace_services | none (all-key bridge) | {workspace_id, playbook_id} |
| clients | client_id → workspace_id, name, website_url · (workspace_id, name) → client_id, website_url | {client_id}, {workspace_id, name} |
| campaigns | campaign_id → workspace_id, client_id, playbook_id, name, target_industry, target_location, min_evidence_strength, business_size, status, created_by, created_at · **client_id → workspace_id** (see 7.2) | {campaign_id} |
| businesses | business_id → name, website_url, normalized_domain, industry, address_line, city, region, country_code, created_at · normalized_domain → business_id (and all others) when not NULL · **website_url → normalized_domain** (see 6.4) | {business_id}, {normalized_domain} |
| business_source_records | (source_type, source_record_id) → business_id, first_seen_at | {source_type, source_record_id} |
| candidates | candidate_id → campaign_id, business_id, discovered_at, qualification_status · (campaign_id, business_id) → candidate_id, discovered_at, qualification_status | {candidate_id}, {campaign_id, business_id} |
| evidence | evidence_id → business_id, source_type, source_url, observed_at, title, excerpt, extracted_value · (business_id, source_url, observed_at) → evidence_id, source_type, title, excerpt, extracted_value | {evidence_id}, {business_id, source_url, observed_at} |
| business_contacts | contact_id → business_id, contact_type, contact_value, is_primary, evidence_id · (business_id, contact_type, contact_value) → contact_id, is_primary, evidence_id | {contact_id}, {business_id, contact_type, contact_value} |
| signal_types | signal_code → description | {signal_code} |
| candidate_signals | (candidate_id, signal_code) → confidence, detected_at | {candidate_id, signal_code} |
| signal_evidence | none (all-key bridge) | {candidate_id, signal_code, evidence_id} |
| llm_assessments | assessment_id → candidate_id, model_name, schema_version, intent_label, summary, assessed_at · (candidate_id, assessed_at) → assessment_id, ... | {assessment_id}, {candidate_id, assessed_at} |
| score_dimensions | dimension_code → name, description · name → dimension_code, description | {dimension_code}, {name} |
| scoring_models | scoring_model_id → playbook_id, version, qualification_threshold, created_at · (playbook_id, version) → scoring_model_id, qualification_threshold, created_at | {scoring_model_id}, {playbook_id, version} |
| scoring_model_weights | (scoring_model_id, dimension_code) → weight | {scoring_model_id, dimension_code} |
| leads | candidate_id → scoring_model_id, final_score, reason_summary, published_at, review_status, reviewed_by, reviewed_at | {candidate_id} |
| lead_score_components | (candidate_id, dimension_code) → dimension_score, explanation | {candidate_id, dimension_code} |
| lead_review_events | event_id → candidate_id, user_id, action, note, acted_at | {event_id} |

**Dependencies that span two relations** (not FDs inside one table, so normalization does not handle
them; they are enforced by constraints, triggers or integrity checks in `03_schema.sql`):

1. `leads.final_score` is computed from `lead_score_components` and `scoring_model_weights` (section 6.1).
2. `leads.review_status` equals the action of the latest `lead_review_events` row (section 6.2).
3. A lead's `scoring_model.playbook_id` must equal its campaign's `playbook_id`.
4. Evidence linked in `signal_evidence` must belong to the same business as the candidate.
5. A `leads` row exists exactly when `candidates.qualification_status = 'qualified'` (section 6.3).

---

## 6. Deliberate fields (controlled redundancy) and why they are kept

A fully normalized schema stores no derived value. LeadGen keeps a few on purpose, because the lead
inbox reads them constantly. Each one has a single writer and a rule that keeps it correct.

### 6.1 `leads.final_score` (cached score)

```text
final_score = Σ (dimension_score × weight) / Σ weight
              over lead_score_components ⋈ scoring_model_weights for the lead's scoring_model_id
```

- **Derivable, so redundant.** The components and weights already determine it.
- **Why keep it:** the lead inbox sorts, filters ("score ≥ 70") and paginates by score on every page
  load. Without the column, each load would join components to weights and aggregate for every lead
  of the campaign before it could even sort.
- **Why it cannot go stale:** README requires weights to be *versioned*. A `scoring_models` row and its
  weights are never edited; a weight change creates a new version. A lead's score is therefore fixed
  for its `scoring_model_id`. Rescoring writes new components, a new `scoring_model_id` and a new
  `final_score` in one transaction.
- **Who writes it:** only the deterministic scoring code in application logic (README: "Calculate the
  final score in application logic"), never the LLM and never a user.
- **Check:** an integrity query recomputes the formula and lists any lead whose stored value differs.
- The **explanation** stays normalized: the per-dimension scores and weights remain stored, so the UI
  can always show the breakdown that README's "Explain every score" principle requires.

### 6.2 `leads.review_status` (current state of the review history)

- `lead_review_events` is the append-only history (who saved, rejected or contacted the lead, and
  when). The current status is derivable as the action of the latest event.
- **Kept** because the inbox filters by status on every load (`new`, `saved`, `contacted`,
  `rejected`).
- **Rule:** the event insert and the status update happen in the same transaction; the state machine
  `new → saved → contacted`, `new → rejected` (README) is checked before writing. `reviewed_by` and
  `reviewed_at` are cached from the same event.

### 6.3 `candidates.qualification_status`

- Values: `pending`, `qualified`, `unqualified`, `discarded`. For `qualified`, the existence of a
  `leads` row says the same thing.
- **Kept** because the other three states have no lead row, and progress views ("40 found, 12
  qualified so far") count by status without probing `leads`.
- **Rule:** a `leads` row is inserted in the same transaction that sets the status to `qualified`.

### 6.4 `businesses.normalized_domain` next to `website_url`

- `website_url → normalized_domain` (lower-cased host, `www.` and trailing paths removed), so it is
  derivable: a transitive dependency.
- **Kept** because it is the deduplication key (README: "Normalize names, domains ... Deduplicate
  before expensive work"). Storing it lets a UNIQUE index stop the same business being inserted twice
  when jobs retry, which README requires to be idempotent.
- **Rule:** computed only by the normalization step of the discovery job, never typed by a user.

### 6.5 `evidence.extracted_value` (JSONB)

- Holds the raw structured value a source returned (for example the PageSpeed metrics object).
  Strictly, a JSON document is not atomic.
- **Kept** because README requires the original extraction for traceability and revalidation. The
  database never filters or joins on the inside of this value: every fact that queries need is lifted
  into atomic columns (`candidate_signals.confidence`, `lead_score_components.dimension_score`).
  For the schema's purposes it is one opaque value, so the 1NF intent holds.

### 6.6 `campaigns.workspace_id` next to `client_id`: see 7.2

---

## 7. BCNF discussion

**BCNF rule:** for every non-trivial dependency X → A in a relation, X is a superkey.

### 7.1 Relations that are in BCNF

Check the FD table in section 5: in every relation except `campaigns` and `businesses`, each
determinant on the left side (`user_id`, `email`, `code`, `name`, `(workspace_id, name)`,
`(campaign_id, business_id)`, `(playbook_id, version)`, ...) is a candidate key. Relations with more
than one candidate key (`users`, `service_playbooks`, `clients`, `candidates`, `evidence`,
`business_contacts`, `scoring_models`, `score_dimensions`) are still in BCNF, because each of their
keys determines the whole row. So **20 of the 22 relations are in BCNF**.

### 7.2 `campaigns`: client_id → workspace_id

A client belongs to one workspace, so inside `campaigns` the dependency `client_id → workspace_id`
holds, and `client_id` is not a key of `campaigns` (many campaigns can share a client). Strictly,
this breaks 3NF and BCNF.

Why the column cannot simply be dropped: README says the client is **optional**; an agency can run a
campaign for itself. For those campaigns `client_id` is NULL, and `workspace_id` is the only link to
the owning agency.

| Option | Normal form | Cost |
|---|---|---|
| **A (chosen).** Keep `workspace_id` and `client_id`, add a composite FK `(client_id, workspace_id) → clients (client_id, workspace_id)` | 3NF/BCNF violated by one column | The database itself guarantees the two can never disagree, so the redundancy cannot cause an anomaly. One extra UNIQUE (client_id, workspace_id) on `clients`. |
| B. Move the optional link to its own table `campaign_clients (campaign_id PK, client_id)` | BCNF | The rule "the client's workspace = the campaign's workspace" now spans tables and needs a trigger: BCNF here **loses dependency preservation**. |
| C. Make every campaign have a client by adding one "self" client per workspace, then drop `campaigns.workspace_id` | BCNF | Changes the product meaning of "optional client"; needs Rachit's approval. |

We choose A: a dependency the database enforces is better than a cleaner form that relies on a
trigger. If the product later decides every campaign has a client, option C becomes the clean
choice.

### 7.3 `businesses`: website_url → normalized_domain

This is the deliberate field from 6.4. `website_url` is not a key (`http://` and `https://` versions
of the same site normalize to one domain), so the FD breaks BCNF on purpose: the derived column exists
to carry the UNIQUE dedup constraint. If PostgreSQL could compute the normalization reliably, a
generated column or an expression index on `website_url` would remove the redundancy, so it is listed
as a later improvement.

### 7.4 Dependencies deliberately *not* modelled

- **Postal code → city / region.** If a postal code were stored, it would determine city and region
  in most places, giving another transitive dependency. Postal codes can span several towns and come
  from sources in different formats, so this is not a reliable FD. LeadGen stores the address as the
  source reported it and does not treat postal code as a determinant.
- **Signal → playbook.** Which signals matter for which playbook (SLOW_MOBILE for MAINTENANCE,
  NO_ONLINE_STORE for ECOMMERCE) is a rule of the playbook. When those rules move from code to data,
  they become a separate bridge relation `playbook_signal_types (playbook_id, signal_code)`, so the
  final set stays in BCNF.

---

## 8. Summary

| Stage | What changed | Repeating group or dependency removed |
|---|---|---|
| UNF → 1NF | One wide lead row split into 9 relations; identifiers introduced | services offered, members, source records, **contacts**, **signals + evidence**, LLM assessments, **score dimensions**, review history |
| 1NF → 2NF | Campaign, business, user, playbook, signal type, score dimension and evidence data separated; `candidate_id` introduced | partial dependencies on part of (campaign_id, business_id) and other composite keys |
| 2NF → 3NF | workspace, client, scoring model, scoring weights and lead separated | transitive dependencies through workspace_id, client_id, scoring_model_id, created_by, evidence_id |
| 3NF → BCNF | 20 of 22 relations already in BCNF | `campaigns` (client_id → workspace_id) and `businesses` (website_url → normalized_domain) kept on purpose, with constraints that stop the redundancy from causing anomalies |

The result: a business is stored once and deduplicated by domain; every signal keeps its source
evidence (*"Evidence before volume"*); every score keeps its dimension breakdown and its versioned
weights (*"Explain every score"*); and the only redundant values are the ones the inbox reads on every
page load, each with one writer and a checkable rule.
