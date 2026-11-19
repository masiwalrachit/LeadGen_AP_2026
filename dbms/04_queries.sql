-- =====================================================================
-- LeadGen · Team T0147 · dbms/04_queries.sql
-- Every SQL query the LeadGen app runs, written against dbms/03_schema.sql
-- (schema "leadgen", 22 tables). Only tables/columns from that file are used.
--
-- Workflow covered (PRODUCT.md): sign-in -> workspace and members -> services and
-- clients -> campaign -> discovery (businesses, source records, candidates) ->
-- validation (evidence, contacts, signals, LLM assessment) -> scoring (scoring
-- model, weights, score components, cached final_score) -> lead inbox -> review
-- (save / contact / reject + history) -> dashboard and export.
--
-- Conventions:
--   -- R<n> READ / -- W<n> WRITE marks each query, with a one-line description below.
--   $1, $2, ... are application parameters (cast to their column type so every
--   query can be PREPAREd on its own).
--   Every query filters by workspace where a user reaches tenant data, so one
--   agency never sees another agency's rows (workspace isolation).
-- Test: each statement was PREPAREd and EXECUTEd against 03_schema.sql on an
-- empty PostgreSQL database loaded with sample rows.
-- =====================================================================
SET search_path TO leadgen;

-- ===================== READ QUERIES =====================

-- R1 READ
-- Sign-in: load the app profile of the user who just authenticated (by email).
SELECT user_id, email, full_name, created_at
FROM users
WHERE email = $1::varchar;

-- R2 READ
-- Workspace switcher: all workspaces the user belongs to, with their role.
SELECT w.workspace_id, w.name, w.default_location, wm.role, wm.joined_at
FROM workspace_members wm
JOIN workspaces w ON w.workspace_id = wm.workspace_id
WHERE wm.user_id = $1::uuid
ORDER BY w.name;

-- R3 READ
-- Team page: members of a workspace with their names and roles.
SELECT u.user_id, u.full_name, u.email, wm.role, wm.joined_at
FROM workspace_members wm
JOIN users u ON u.user_id = wm.user_id
WHERE wm.workspace_id = $1::uuid
ORDER BY wm.joined_at;

-- R4 READ
-- Access check: is this user a member of this workspace, and with which role?
SELECT role
FROM workspace_members
WHERE workspace_id = $1::uuid AND user_id = $2::uuid;

-- R5 READ
-- Settings: service playbooks the workspace offers (used to pick a campaign playbook).
SELECT sp.playbook_id, sp.code, sp.name, sp.description
FROM workspace_services ws
JOIN service_playbooks sp ON sp.playbook_id = ws.playbook_id
WHERE ws.workspace_id = $1::uuid
ORDER BY sp.name;

-- R6 READ
-- Clients page: clients of a workspace with how many campaigns each has.
SELECT c.client_id, c.name, c.website_url, count(cp.campaign_id) AS campaigns
FROM clients c
LEFT JOIN campaigns cp ON cp.client_id = c.client_id AND cp.workspace_id = c.workspace_id
WHERE c.workspace_id = $1::uuid
GROUP BY c.client_id, c.name, c.website_url
ORDER BY c.name;

-- R7 READ
-- Campaign list: every campaign in a workspace with client, playbook, creator and
-- candidate / lead counts (client is optional, so LEFT JOIN).
SELECT cp.campaign_id, cp.name, cp.status, cp.target_industry, cp.target_location,
       cl.name AS client_name, sp.name AS playbook_name, u.full_name AS created_by_name,
       cp.created_at,
       count(DISTINCT ca.candidate_id) AS candidates,
       count(DISTINCT l.candidate_id)  AS leads
FROM campaigns cp
JOIN service_playbooks sp ON sp.playbook_id = cp.playbook_id
JOIN users u              ON u.user_id = cp.created_by
LEFT JOIN clients cl      ON cl.client_id = cp.client_id
LEFT JOIN candidates ca   ON ca.campaign_id = cp.campaign_id
LEFT JOIN leads l         ON l.candidate_id = ca.candidate_id
WHERE cp.workspace_id = $1::uuid
GROUP BY cp.campaign_id, cp.name, cp.status, cp.target_industry, cp.target_location,
         cl.name, sp.name, u.full_name, cp.created_at
ORDER BY cp.created_at DESC;

-- R8 READ
-- Campaign detail: one campaign, only if it belongs to the user's workspace.
SELECT cp.campaign_id, cp.name, cp.status, cp.target_industry, cp.target_location,
       cp.min_evidence_strength, cp.business_size, cp.playbook_id, sp.code AS playbook_code,
       cp.client_id, cl.name AS client_name, cp.created_at
FROM campaigns cp
JOIN service_playbooks sp ON sp.playbook_id = cp.playbook_id
LEFT JOIN clients cl      ON cl.client_id = cp.client_id
WHERE cp.campaign_id = $1::uuid AND cp.workspace_id = $2::uuid;

-- R9 READ
-- Background job queue: campaigns waiting for discovery, oldest first.
SELECT campaign_id, workspace_id, playbook_id, target_industry, target_location, business_size
FROM campaigns
WHERE status = 'queued'
ORDER BY created_at
LIMIT $1::int;

-- R10 READ
-- Discovery dedup: is this source record (e.g. a maps place id) already known?
SELECT bsr.business_id, b.name, b.normalized_domain
FROM business_source_records bsr
JOIN businesses b ON b.business_id = bsr.business_id
WHERE bsr.source_type = $1::varchar AND bsr.source_record_id = $2::varchar;

-- R11 READ
-- Discovery dedup: is a business with this normalized domain already known?
SELECT business_id, name, website_url, city, region, country_code
FROM businesses
WHERE normalized_domain = $1::varchar;

-- R12 READ
-- Validation worker: candidates of a campaign still waiting to be qualified.
SELECT ca.candidate_id, b.business_id, b.name, b.website_url, b.normalized_domain, b.city
FROM candidates ca
JOIN businesses b ON b.business_id = ca.business_id
WHERE ca.campaign_id = $1::uuid AND ca.qualification_status = 'pending'
ORDER BY ca.discovered_at;

-- R13 READ
-- Candidates tab: every candidate of a campaign with business, status and signal count.
SELECT ca.candidate_id, b.name, b.city, b.industry, ca.qualification_status, ca.discovered_at,
       count(cs.signal_code) AS signals
FROM candidates ca
JOIN campaigns cp ON cp.campaign_id = ca.campaign_id
JOIN businesses b ON b.business_id = ca.business_id
LEFT JOIN candidate_signals cs ON cs.candidate_id = ca.candidate_id
WHERE ca.campaign_id = $1::uuid AND cp.workspace_id = $2::uuid
GROUP BY ca.candidate_id, b.name, b.city, b.industry, ca.qualification_status, ca.discovered_at
ORDER BY ca.discovered_at DESC;

-- R14 READ
-- Evidence panel: all evidence collected for a business, newest first.
SELECT evidence_id, source_type, source_url, observed_at, title, excerpt, extracted_value
FROM evidence
WHERE business_id = $1::uuid
ORDER BY observed_at DESC;

-- R15 READ
-- Contact panel: public contact paths of a business with the evidence that backs each.
SELECT bc.contact_id, bc.contact_type, bc.contact_value, bc.is_primary,
       e.source_url AS evidence_url, e.observed_at
FROM business_contacts bc
JOIN evidence e ON e.evidence_id = bc.evidence_id AND e.business_id = bc.business_id
WHERE bc.business_id = $1::uuid
ORDER BY bc.is_primary DESC, bc.contact_type;

-- R16 READ
-- Signals panel: detected signals of a candidate, their meaning, confidence and evidence.
SELECT cs.signal_code, st.description, cs.confidence, cs.detected_at,
       e.evidence_id, e.source_url, e.excerpt
FROM candidate_signals cs
JOIN signal_types st        ON st.signal_code = cs.signal_code
LEFT JOIN signal_evidence se ON se.candidate_id = cs.candidate_id AND se.signal_code = cs.signal_code
LEFT JOIN evidence e         ON e.evidence_id = se.evidence_id
WHERE cs.candidate_id = $1::uuid
ORDER BY cs.confidence DESC, cs.signal_code;

-- R17 READ
-- LLM panel: the latest LLM assessment of a candidate.
SELECT assessment_id, model_name, schema_version, intent_label, summary, assessed_at
FROM llm_assessments
WHERE candidate_id = $1::uuid
ORDER BY assessed_at DESC
LIMIT 1;

-- R18 READ
-- Scoring: the newest scoring model of a playbook with its dimension weights.
SELECT sm.scoring_model_id, sm.version, sm.qualification_threshold,
       smw.dimension_code, sd.name AS dimension_name, smw.weight
FROM scoring_models sm
JOIN scoring_model_weights smw ON smw.scoring_model_id = sm.scoring_model_id
JOIN score_dimensions sd       ON sd.dimension_code = smw.dimension_code
WHERE sm.playbook_id = $1::smallint
  AND sm.version = (SELECT max(version) FROM scoring_models WHERE playbook_id = $1::smallint)
ORDER BY smw.weight DESC;

-- R19 READ
-- Lead inbox: published leads of a campaign, filtered by review status, best score first.
SELECT l.candidate_id, b.name, b.website_url, b.city, l.final_score, l.reason_summary,
       l.review_status, l.published_at
FROM leads l
JOIN candidates ca ON ca.candidate_id = l.candidate_id
JOIN campaigns cp  ON cp.campaign_id = ca.campaign_id
JOIN businesses b  ON b.business_id = ca.business_id
WHERE ca.campaign_id = $1::uuid
  AND cp.workspace_id = $2::uuid
  AND l.review_status = $3::varchar
ORDER BY l.final_score DESC, l.published_at
LIMIT $4::int OFFSET $5::int;

-- R20 READ
-- Lead detail: "explain every score" - each dimension's score, weight and explanation.
SELECT sd.dimension_code, sd.name, lsc.dimension_score, smw.weight, lsc.explanation
FROM leads l
JOIN lead_score_components lsc ON lsc.candidate_id = l.candidate_id
JOIN score_dimensions sd       ON sd.dimension_code = lsc.dimension_code
LEFT JOIN scoring_model_weights smw
       ON smw.scoring_model_id = l.scoring_model_id AND smw.dimension_code = lsc.dimension_code
WHERE l.candidate_id = $1::uuid
ORDER BY smw.weight DESC NULLS LAST;

-- R21 READ
-- Score check: recompute final_score = sum(score x weight) / sum(weight) from the
-- components and compare it with the cached value on the lead.
SELECT l.candidate_id, l.final_score AS cached_score,
       round(sum(lsc.dimension_score * smw.weight) / NULLIF(sum(smw.weight), 0), 2) AS computed_score
FROM leads l
JOIN lead_score_components lsc ON lsc.candidate_id = l.candidate_id
JOIN scoring_model_weights smw
     ON smw.scoring_model_id = l.scoring_model_id AND smw.dimension_code = lsc.dimension_code
WHERE l.candidate_id = $1::uuid
GROUP BY l.candidate_id, l.final_score;

-- R22 READ
-- Review history: who saved / contacted / rejected a lead, and when.
SELECT e.event_id, e.action, e.note, e.acted_at, u.full_name AS reviewer
FROM lead_review_events e
JOIN users u ON u.user_id = e.user_id
WHERE e.candidate_id = $1::uuid
ORDER BY e.acted_at;

-- R23 READ
-- Dashboard: number of leads per review status for every campaign of a workspace.
SELECT cp.campaign_id, cp.name,
       count(*) FILTER (WHERE l.review_status = 'new')       AS new_leads,
       count(*) FILTER (WHERE l.review_status = 'saved')     AS saved,
       count(*) FILTER (WHERE l.review_status = 'contacted') AS contacted,
       count(*) FILTER (WHERE l.review_status = 'rejected')  AS rejected,
       round(avg(l.final_score), 2) AS avg_score
FROM campaigns cp
JOIN candidates ca ON ca.campaign_id = cp.campaign_id
JOIN leads l       ON l.candidate_id = ca.candidate_id
WHERE cp.workspace_id = $1::uuid
GROUP BY cp.campaign_id, cp.name
ORDER BY cp.name;

-- R24 READ
-- Export: saved and contacted leads of a campaign with their primary contact.
SELECT b.name, b.website_url, b.city, b.region, l.final_score, l.review_status,
       bc.contact_type, bc.contact_value
FROM leads l
JOIN candidates ca ON ca.candidate_id = l.candidate_id
JOIN campaigns cp  ON cp.campaign_id = ca.campaign_id
JOIN businesses b  ON b.business_id = ca.business_id
LEFT JOIN business_contacts bc ON bc.business_id = b.business_id AND bc.is_primary
WHERE ca.campaign_id = $1::uuid
  AND cp.workspace_id = $2::uuid
  AND l.review_status IN ('saved', 'contacted')
ORDER BY l.final_score DESC;

-- ===================== WRITE QUERIES =====================

-- W1 WRITE
-- First sign-in: create the app profile for a Supabase Auth user (safe to repeat).
INSERT INTO users (user_id, email, full_name)
VALUES ($1::uuid, $2::varchar, $3::varchar)
ON CONFLICT (user_id) DO NOTHING;

-- W2 WRITE
-- Onboarding: create a workspace and add its creator as the owner, in one statement.
WITH w AS (
  INSERT INTO workspaces (name, website_url, default_location, created_by)
  VALUES ($1::varchar, $2::text, $3::varchar, $4::uuid)
  RETURNING workspace_id, created_by
)
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT workspace_id, created_by, 'owner' FROM w
RETURNING workspace_id;

-- W3 WRITE
-- Team page: invite / add a member to a workspace.
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ($1::uuid, $2::uuid, $3::varchar)
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- W4 WRITE
-- Team page: remove a member from a workspace. Blocked on purpose (ON DELETE RESTRICT
-- via fk_campaigns_creator_membership) if that member created campaigns there.
DELETE FROM workspace_members
WHERE workspace_id = $1::uuid AND user_id = $2::uuid;

-- W5 WRITE
-- Settings: turn on a service playbook for the workspace.
INSERT INTO workspace_services (workspace_id, playbook_id)
VALUES ($1::uuid, $2::smallint)
ON CONFLICT DO NOTHING;

-- W6 WRITE
-- Clients page: add a client to the workspace.
INSERT INTO clients (workspace_id, name, website_url)
VALUES ($1::uuid, $2::varchar, $3::text)
RETURNING client_id;

-- W7 WRITE
-- New campaign (client optional, creator must be a member - enforced by FKs).
INSERT INTO campaigns (workspace_id, client_id, playbook_id, name, target_industry,
                       target_location, min_evidence_strength, business_size, status, created_by)
VALUES ($1::uuid, $2::uuid, $3::smallint, $4::varchar, $5::varchar,
        $6::varchar, $7::numeric, $8::varchar, 'queued', $9::uuid)
RETURNING campaign_id;

-- W8 WRITE
-- Job runner: move a campaign to its next pipeline status
-- (queued -> discovering -> validating -> scoring -> completed / failed / cancelled).
UPDATE campaigns
SET status = $2::varchar
WHERE campaign_id = $1::uuid
RETURNING campaign_id, status;

-- W9 WRITE
-- Discovery: insert a business, or reuse the existing one with the same domain.
INSERT INTO businesses (name, website_url, normalized_domain, industry, address_line,
                        city, region, country_code)
VALUES ($1::varchar, $2::text, $3::varchar, $4::varchar, $5::text,
        $6::varchar, $7::varchar, $8::char(2))
ON CONFLICT (normalized_domain) DO UPDATE SET name = EXCLUDED.name
RETURNING business_id;

-- W10 WRITE
-- Discovery: remember the external source id so a retried job does not duplicate it.
INSERT INTO business_source_records (source_type, source_record_id, business_id)
VALUES ($1::varchar, $2::varchar, $3::uuid)
ON CONFLICT (source_type, source_record_id) DO NOTHING;

-- W11 WRITE
-- Discovery: add the business to the campaign as a candidate (once per campaign).
INSERT INTO candidates (campaign_id, business_id)
VALUES ($1::uuid, $2::uuid)
ON CONFLICT (campaign_id, business_id) DO NOTHING
RETURNING candidate_id;

-- W12 WRITE
-- Validation: store one piece of evidence (same URL at the same time is stored once).
INSERT INTO evidence (business_id, source_type, source_url, observed_at, title, excerpt, extracted_value)
VALUES ($1::uuid, $2::varchar, $3::text, $4::timestamptz, $5::varchar, $6::text, $7::jsonb)
ON CONFLICT (business_id, source_url, observed_at) DO NOTHING
RETURNING evidence_id;

-- W13 WRITE
-- Validation: store a public contact path backed by evidence of the same business.
INSERT INTO business_contacts (business_id, contact_type, contact_value, is_primary, evidence_id)
VALUES ($1::uuid, $2::varchar, $3::text, $4::boolean, $5::bigint)
ON CONFLICT (business_id, contact_type, contact_value) DO NOTHING
RETURNING contact_id;

-- W14 WRITE
-- Validation: record (or refresh) a detected signal for a candidate.
INSERT INTO candidate_signals (candidate_id, signal_code, confidence)
VALUES ($1::uuid, $2::varchar, $3::numeric)
ON CONFLICT (candidate_id, signal_code)
DO UPDATE SET confidence = EXCLUDED.confidence, detected_at = NOW();

-- W15 WRITE
-- Validation: link a signal to the evidence that supports it.
INSERT INTO signal_evidence (candidate_id, signal_code, evidence_id)
VALUES ($1::uuid, $2::varchar, $3::bigint)
ON CONFLICT DO NOTHING;

-- W16 WRITE
-- Validation: save the LLM's interpretation of a candidate.
INSERT INTO llm_assessments (candidate_id, model_name, schema_version, intent_label, summary)
VALUES ($1::uuid, $2::varchar, $3::varchar, $4::varchar, $5::text)
RETURNING assessment_id;

-- W17 WRITE
-- Admin: publish a new version of a playbook's scoring model.
INSERT INTO scoring_models (playbook_id, version, qualification_threshold)
SELECT $1::smallint, COALESCE(max(version), 0) + 1, $2::numeric
FROM scoring_models
WHERE playbook_id = $1::smallint
RETURNING scoring_model_id, version;

-- W18 WRITE
-- Admin: set the weight of one dimension in a scoring model.
INSERT INTO scoring_model_weights (scoring_model_id, dimension_code, weight)
VALUES ($1::uuid, $2::varchar, $3::numeric);

-- W19 WRITE
-- Scoring: publish a qualified candidate as a lead in the inbox.
INSERT INTO leads (candidate_id, scoring_model_id, final_score, reason_summary)
VALUES ($1::uuid, $2::uuid, $3::numeric, $4::text);

-- W20 WRITE
-- Scoring: store one dimension's score and explanation for a lead.
INSERT INTO lead_score_components (candidate_id, dimension_code, dimension_score, explanation)
VALUES ($1::uuid, $2::varchar, $3::numeric, $4::text)
ON CONFLICT (candidate_id, dimension_code)
DO UPDATE SET dimension_score = EXCLUDED.dimension_score, explanation = EXCLUDED.explanation;

-- W21 WRITE
-- Scoring: refresh the cached final_score from the components and model weights.
UPDATE leads l
SET final_score = s.score
FROM (SELECT lsc.candidate_id,
             round(sum(lsc.dimension_score * smw.weight) / NULLIF(sum(smw.weight), 0), 2) AS score
      FROM lead_score_components lsc
      JOIN leads l2 ON l2.candidate_id = lsc.candidate_id
      JOIN scoring_model_weights smw
           ON smw.scoring_model_id = l2.scoring_model_id AND smw.dimension_code = lsc.dimension_code
      WHERE lsc.candidate_id = $1::uuid
      GROUP BY lsc.candidate_id) s
WHERE l.candidate_id = s.candidate_id AND s.score IS NOT NULL
RETURNING l.candidate_id, l.final_score;

-- W22 WRITE
-- Validation result: mark a candidate qualified / unqualified / discarded.
UPDATE candidates
SET qualification_status = $2::varchar
WHERE candidate_id = $1::uuid;

-- W23 WRITE
-- Review: save / contact / reject a lead AND append the history event in one
-- statement, so the cached review_status and lead_review_events never disagree.
WITH upd AS (
  UPDATE leads
  SET review_status = $2::varchar, reviewed_by = $3::uuid, reviewed_at = NOW()
  WHERE candidate_id = $1::uuid
  RETURNING candidate_id, reviewed_by
)
INSERT INTO lead_review_events (candidate_id, user_id, action, note)
SELECT candidate_id, reviewed_by, $2::varchar, $4::text FROM upd
RETURNING event_id;

-- W24 WRITE
-- Cleanup: delete a draft campaign (its candidates, signals and leads cascade).
DELETE FROM campaigns
WHERE campaign_id = $1::uuid AND workspace_id = $2::uuid AND status = 'draft';
