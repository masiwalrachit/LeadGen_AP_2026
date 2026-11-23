-- =====================================================================
-- LeadGen · Team T0147 · dbms/seed_test_data.sql
-- Synthetic TEST data for timing dbms/04_queries.sql (CP4). Not real businesses.
-- Run on an empty database, after the schema:
--   createdb leadgen_dbms
--   psql -d leadgen_dbms -v ON_ERROR_STOP=1 -f dbms/03_schema.sql
--   psql -d leadgen_dbms -v ON_ERROR_STOP=1 -f dbms/seed_test_data.sql
--
-- Sizes (chosen so plans are realistic, not toy-sized):
--   users 40 · workspaces 8 · members 47 · playbooks 3 · clients 40 · campaigns 80
--   businesses 20,000 · source records 20,000 · candidates 30,000 · evidence 60,000
--   contacts 20,000 · signal types 6 · candidate signals 45,000 · signal evidence 45,000
--   LLM assessments ~12,500 · score dimensions 5 · scoring models 6 · leads 10,000
--   score components 50,000 · review events ~3,300
-- Every row obeys every constraint in 03_schema.sql (the file fails otherwise).
-- setseed() fixes random() values; ids are random UUIDs, so a few counts that depend on
-- the id (LLM assessments) can differ by a handful of rows between loads.
-- =====================================================================
SET search_path TO leadgen;
SELECT setseed(0.42);

-- Users: user i has a fixed UUID so tests can refer to it.
INSERT INTO users (user_id, email, full_name)
SELECT ('00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
       'user' || i || '@agency' || ((i - 1) % 8 + 1) || '.example',
       'Test User ' || i
FROM generate_series(1, 40) i;

-- 8 agencies (workspaces); creator = user 1..8
INSERT INTO workspaces (name, website_url, default_location, created_by)
SELECT 'Agency ' || i, 'https://agency' || i || '.example',
       (ARRAY['South Delhi','Gurugram','Noida','Mumbai','Pune','Bengaluru','Jaipur','Hyderabad'])[i],
       ('00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid
FROM generate_series(1, 8) i;

-- Members: creator is owner; users 9..40 spread over workspaces as members.
-- Users 33..40 additionally join workspace 1 (they never create campaigns there).
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.workspace_id, w.created_by, 'owner' FROM workspaces w;
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.workspace_id, ('00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid, 'member'
FROM generate_series(9, 40) i
JOIN workspaces w ON w.name = 'Agency ' || ((i - 9) % 8 + 1);
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.workspace_id, ('00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid, 'member'
FROM generate_series(33, 40) i JOIN workspaces w ON w.name = 'Agency 1'
ON CONFLICT DO NOTHING;

INSERT INTO service_playbooks VALUES
 (1, 'website_rebuild', 'Website rebuild',   'Rebuild outdated or broken websites'),
 (2, 'local_seo',       'Local SEO',         'Improve local search visibility'),
 (3, 'online_booking',  'Online booking',    'Add online booking and payments');

-- Every workspace offers playbooks 1 and 2; even-numbered ones also offer 3.
INSERT INTO workspace_services (workspace_id, playbook_id)
SELECT w.workspace_id, p FROM workspaces w CROSS JOIN generate_series(1, 3) p
WHERE p < 3 OR substring(w.name from '\d+')::int % 2 = 0;

-- 5 clients per workspace
INSERT INTO clients (workspace_id, name, website_url)
SELECT w.workspace_id, 'Client ' || c || ' of ' || w.name, 'https://client' || c || '.' || lower(replace(w.name, ' ', '')) || '.example'
FROM workspaces w CROSS JOIN generate_series(1, 5) c;

-- 10 campaigns per workspace: every 3rd has no client (client is optional),
-- creator is the workspace owner or a member (membership FK), mixed statuses.
INSERT INTO campaigns (workspace_id, client_id, playbook_id, name, target_industry,
                       target_location, min_evidence_strength, business_size, status,
                       created_by, created_at)
SELECT w.workspace_id,
       CASE WHEN k % 3 = 0 THEN NULL ELSE
            (SELECT c.client_id FROM clients c WHERE c.workspace_id = w.workspace_id
             ORDER BY c.name OFFSET (k % 5) LIMIT 1) END,
       1 + (k % 2),
       'Campaign ' || k || ' - ' || w.name,
       (ARRAY['Cafe','Gym','Dental clinic','Salon','Bakery','Boutique','Restaurant','Tutor'])[1 + k % 8],
       w.default_location,
       CASE WHEN k % 2 = 0 THEN 40 + k END,
       CASE WHEN k % 4 = 0 THEN 'small' END,
       (ARRAY['completed','completed','completed','scoring','validating','discovering','queued','draft','failed','completed'])[k],
       (SELECT m.user_id FROM workspace_members m WHERE m.workspace_id = w.workspace_id
          AND m.user_id::text < '00000000-0000-0000-0000-000000000033'
        ORDER BY m.user_id OFFSET (k % 2) LIMIT 1),
       now() - (k || ' days')::interval
FROM workspaces w CROSS JOIN generate_series(1, 10) k;

-- 20,000 businesses (95% have a website and a unique normalized domain)
INSERT INTO businesses (name, website_url, normalized_domain, industry, address_line,
                        city, region, country_code, created_at)
SELECT 'Business ' || i,
       CASE WHEN i % 20 <> 0 THEN 'http://biz' || i || '.example' END,
       CASE WHEN i % 20 <> 0 THEN 'biz' || i || '.example' END,
       (ARRAY['Cafe','Gym','Dental clinic','Salon','Bakery','Boutique','Restaurant','Tutor'])[1 + i % 8],
       i || ' Market Road',
       (ARRAY['South Delhi','Gurugram','Noida','Mumbai','Pune','Bengaluru','Jaipur','Hyderabad'])[1 + i % 8],
       (ARRAY['DL','HR','UP','MH','MH','KA','RJ','TG'])[1 + i % 8],
       'IN',
       now() - ((i % 300) || ' days')::interval
FROM generate_series(1, 20000) i;

INSERT INTO business_source_records (source_type, source_record_id, business_id)
SELECT 'openstreetmap', 'osm-' || row_number() OVER (ORDER BY name), business_id
FROM businesses;

-- 30,000 candidates: 375 businesses per campaign (80 campaigns), no duplicates per campaign.
WITH b AS (SELECT business_id, row_number() OVER (ORDER BY name) - 1 AS n FROM businesses),
     c AS (SELECT campaign_id, row_number() OVER (ORDER BY created_at, name) - 1 AS n FROM campaigns)
INSERT INTO candidates (campaign_id, business_id, discovered_at, qualification_status)
SELECT c.campaign_id, b.business_id,
       now() - ((j % 60) || ' hours')::interval,
       (ARRAY['qualified','qualified','unqualified','pending','discarded','qualified'])[1 + (j % 6)]
FROM c CROSS JOIN generate_series(0, 374) j
JOIN b ON b.n = (c.n * 250 + j) % 20000;

-- 3 pieces of evidence per business (60,000)
INSERT INTO evidence (business_id, source_type, source_url, observed_at, title, excerpt, extracted_value)
SELECT b.business_id,
       (ARRAY['website','maps','directory'])[e],
       COALESCE(b.website_url, 'https://maps.example/' || b.business_id) || '/page' || e,
       now() - ((e * 7) || ' days')::interval,
       'Evidence ' || e || ' for ' || b.name,
       (ARRAY['No HTTPS on home page','Last updated 2019','No online booking'])[e],
       jsonb_build_object('https', e <> 1, 'year', 2019 + e)
FROM businesses b CROSS JOIN generate_series(1, 3) e;

-- one primary contact per business, backed by its first evidence (composite FK)
INSERT INTO business_contacts (business_id, contact_type, contact_value, is_primary, evidence_id)
SELECT DISTINCT ON (e.business_id) e.business_id, 'email',
       'hello@' || COALESCE(b.normalized_domain, b.business_id::text || '.example'),
       TRUE, e.evidence_id
FROM evidence e JOIN businesses b ON b.business_id = e.business_id
ORDER BY e.business_id, e.evidence_id;

INSERT INTO signal_types VALUES
 ('no_https',        'Website does not use HTTPS'),
 ('outdated_design', 'Website design or copyright year is old'),
 ('no_booking',      'No way to book or order online'),
 ('slow_site',       'Website loads slowly on mobile'),
 ('no_website',      'Business has no website'),
 ('few_reviews',     'Few public reviews on maps');

-- 1-2 signals per candidate (~45,000)
INSERT INTO candidate_signals (candidate_id, signal_code, confidence, detected_at)
SELECT ca.candidate_id, s.code, round((0.5 + random() * 0.5)::numeric, 4), ca.discovered_at
FROM (SELECT candidate_id, discovered_at, row_number() OVER (ORDER BY candidate_id) AS n FROM candidates) ca
CROSS JOIN LATERAL (
  SELECT (ARRAY['no_https','outdated_design','no_booking','slow_site','no_website','few_reviews'])[1 + ca.n % 6] AS code
  UNION ALL
  SELECT (ARRAY['no_https','outdated_design','no_booking','slow_site','no_website','few_reviews'])[1 + (ca.n + 2) % 6]
  WHERE ca.n % 2 = 0) s;

-- each signal linked to one evidence row of the same business
INSERT INTO signal_evidence (candidate_id, signal_code, evidence_id)
SELECT cs.candidate_id, cs.signal_code,
       (SELECT e.evidence_id FROM evidence e WHERE e.business_id = ca.business_id
        ORDER BY e.evidence_id LIMIT 1)
FROM candidate_signals cs JOIN candidates ca ON ca.candidate_id = cs.candidate_id;

-- LLM assessment for about half of the candidates that are not pending
INSERT INTO llm_assessments (candidate_id, model_name, schema_version, intent_label, summary, assessed_at)
SELECT candidate_id, 'test-llm', 'v1',
       CASE qualification_status WHEN 'qualified' THEN 'needs_service' ELSE 'not_a_fit' END,
       'Synthetic assessment for testing', discovered_at + interval '10 minutes'
FROM candidates
WHERE qualification_status <> 'pending' AND candidate_id::text < '8';

INSERT INTO score_dimensions VALUES
 ('fit',        'Fit',            'Matches the agency service and target'),
 ('need',       'Need',           'Observable need for the service'),
 ('timing',     'Timing',         'Recent evidence makes outreach timely'),
 ('reach',      'Reachability',   'Public contact path exists'),
 ('evidence',   'Evidence quality','Strength and freshness of evidence');

-- 2 versions per playbook
INSERT INTO scoring_models (playbook_id, version, qualification_threshold)
SELECT p, v, 55 + v * 5 FROM generate_series(1, 3) p CROSS JOIN generate_series(1, 2) v;

-- weights; playbook 3 version 2 deliberately has no 'evidence' weight yet
INSERT INTO scoring_model_weights (scoring_model_id, dimension_code, weight)
SELECT sm.scoring_model_id, d.code, d.w
FROM scoring_models sm
CROSS JOIN (VALUES ('fit', 0.25), ('need', 0.30), ('timing', 0.15), ('reach', 0.15), ('evidence', 0.15)) d(code, w)
WHERE NOT (sm.playbook_id = 3 AND sm.version = 2 AND d.code = 'evidence');

-- 10,000 leads from qualified candidates, scored with the newest model of the
-- campaign's playbook. Review status: ~2/3 new, the rest saved/contacted/rejected.
INSERT INTO leads (candidate_id, scoring_model_id, final_score, reason_summary, published_at,
                   review_status, reviewed_by, reviewed_at)
SELECT q.candidate_id, sm.scoring_model_id, 0, 'Synthetic reason: ' || q.n, q.discovered_at + interval '1 hour',
       (ARRAY['new','new','new','new','saved','contacted','rejected','new','new'])[1 + q.n % 9],
       CASE WHEN (ARRAY['new','new','new','new','saved','contacted','rejected','new','new'])[1 + q.n % 9] <> 'new'
            THEN cp.created_by END,
       CASE WHEN (ARRAY['new','new','new','new','saved','contacted','rejected','new','new'])[1 + q.n % 9] <> 'new'
            THEN q.discovered_at + interval '2 hours' END
FROM (SELECT ca.*, row_number() OVER (ORDER BY ca.candidate_id) AS n
      FROM candidates ca WHERE qualification_status = 'qualified') q
JOIN campaigns cp ON cp.campaign_id = q.campaign_id
JOIN scoring_models sm ON sm.playbook_id = cp.playbook_id AND sm.version = 2
WHERE q.n <= 10000;

-- 5 score components per lead, then cache final_score = sum(score*weight)/sum(weight)
INSERT INTO lead_score_components (candidate_id, dimension_code, dimension_score, explanation)
SELECT l.candidate_id, d.dimension_code, round((40 + random() * 60)::numeric, 2),
       'Synthetic explanation for ' || d.name
FROM leads l CROSS JOIN score_dimensions d;

UPDATE leads l SET final_score = s.score
FROM (SELECT lsc.candidate_id,
             round(sum(lsc.dimension_score * smw.weight) / sum(smw.weight), 2) AS score
      FROM lead_score_components lsc
      JOIN leads l2 ON l2.candidate_id = lsc.candidate_id
      JOIN scoring_model_weights smw ON smw.scoring_model_id = l2.scoring_model_id
                                    AND smw.dimension_code = lsc.dimension_code
      GROUP BY lsc.candidate_id) s
WHERE l.candidate_id = s.candidate_id;

-- one history event for every reviewed lead
INSERT INTO lead_review_events (candidate_id, user_id, action, note, acted_at)
SELECT candidate_id, reviewed_by, review_status, 'Synthetic review', reviewed_at
FROM leads WHERE review_status <> 'new';

ANALYZE;

SELECT 'users' AS t, count(*) FROM users UNION ALL
SELECT 'workspaces', count(*) FROM workspaces UNION ALL
SELECT 'workspace_members', count(*) FROM workspace_members UNION ALL
SELECT 'clients', count(*) FROM clients UNION ALL
SELECT 'campaigns', count(*) FROM campaigns UNION ALL
SELECT 'businesses', count(*) FROM businesses UNION ALL
SELECT 'candidates', count(*) FROM candidates UNION ALL
SELECT 'evidence', count(*) FROM evidence UNION ALL
SELECT 'business_contacts', count(*) FROM business_contacts UNION ALL
SELECT 'candidate_signals', count(*) FROM candidate_signals UNION ALL
SELECT 'signal_evidence', count(*) FROM signal_evidence UNION ALL
SELECT 'llm_assessments', count(*) FROM llm_assessments UNION ALL
SELECT 'leads', count(*) FROM leads UNION ALL
SELECT 'lead_score_components', count(*) FROM lead_score_components UNION ALL
SELECT 'lead_review_events', count(*) FROM lead_review_events;
