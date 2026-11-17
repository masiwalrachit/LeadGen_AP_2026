-- ============================================================================
-- LeadGen application database schema
-- Team T0147 · PostgreSQL 15+ / Supabase PostgreSQL
--
-- Source of truth:
--   * README.md and PRODUCT.md
--   * dbms/02_er_diagram.svg (14 application tables)
--
-- Run with:
--   psql -d <database_name> -v ON_ERROR_STOP=1 -f dbms/03_schema.sql
--
-- This CP1 schema creates only tables and integrity constraints. PostgreSQL
-- automatically creates indexes for PRIMARY KEY and UNIQUE constraints. Any
-- additional performance indexes belong in the optimization checkpoint.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS leadgen;


-- --------------------------------------------------------------------------
-- 1. users
-- Application profile for a Supabase Auth user. Passwords and OAuth secrets
-- never belong in this table.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.users (
    -- Supabase Auth supplies this UUID; the application must reuse auth.users.id.
    user_id      UUID          PRIMARY KEY,
    email        VARCHAR(254)  NOT NULL UNIQUE,
    full_name    VARCHAR(100)  NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_users_email_not_blank CHECK (BTRIM(email) <> ''),
    CONSTRAINT chk_users_email_shape CHECK (email LIKE '_%@_%._%'),
    CONSTRAINT chk_users_name_not_blank CHECK (BTRIM(full_name) <> '')
);


-- --------------------------------------------------------------------------
-- 2. workspaces
-- The agency account and tenant-isolation boundary.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.workspaces (
    workspace_id       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by         UUID          NOT NULL
                       REFERENCES leadgen.users (user_id) ON DELETE RESTRICT,
    name               VARCHAR(120)  NOT NULL,
    website_url        TEXT,
    default_location   VARCHAR(150)  NOT NULL,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_workspaces_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT chk_workspaces_location_not_blank
        CHECK (BTRIM(default_location) <> ''),
    CONSTRAINT chk_workspaces_website_not_blank
        CHECK (website_url IS NULL OR BTRIM(website_url) <> '')
);


-- --------------------------------------------------------------------------
-- 3. workspace_members
-- M:N bridge between users and workspaces. The composite primary key permits
-- one membership per user per workspace.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.workspace_members (
    workspace_id   UUID         NOT NULL
                   REFERENCES leadgen.workspaces (workspace_id) ON DELETE CASCADE,
    user_id        UUID         NOT NULL
                   REFERENCES leadgen.users (user_id) ON DELETE RESTRICT,
    role           VARCHAR(20)  NOT NULL,
    joined_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    PRIMARY KEY (workspace_id, user_id),
    CONSTRAINT chk_workspace_members_role_not_blank CHECK (BTRIM(role) <> '')
);


-- --------------------------------------------------------------------------
-- 4. clients
-- Optional customers for whom an agency workspace runs campaigns.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.clients (
    client_id      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   UUID          NOT NULL
                   REFERENCES leadgen.workspaces (workspace_id) ON DELETE CASCADE,
    name           VARCHAR(120)  NOT NULL,
    website_url    TEXT,
    industry       VARCHAR(100),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_clients_id_workspace UNIQUE (client_id, workspace_id),
    CONSTRAINT chk_clients_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT chk_clients_website_not_blank
        CHECK (website_url IS NULL OR BTRIM(website_url) <> ''),
    CONSTRAINT chk_clients_industry_not_blank
        CHECK (industry IS NULL OR BTRIM(industry) <> '')
);


-- --------------------------------------------------------------------------
-- 5. service_playbooks
-- The four agreed web-agency service playbooks. Rows are lookup data; the
-- schema does not seed them so demonstrations cannot be mistaken for app data.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.service_playbooks (
    playbook_id   SMALLINT      PRIMARY KEY,
    code          VARCHAR(40)   NOT NULL UNIQUE,
    name          VARCHAR(100)  NOT NULL,
    description   TEXT          NOT NULL,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_service_playbooks_id CHECK (playbook_id > 0),
    CONSTRAINT chk_service_playbooks_code_not_blank CHECK (BTRIM(code) <> ''),
    CONSTRAINT chk_service_playbooks_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT chk_service_playbooks_description_not_blank
        CHECK (BTRIM(description) <> '')
);


-- --------------------------------------------------------------------------
-- 6. campaigns
-- A single targeting hypothesis: one playbook, industry and location.
-- The composite client FK prevents linking a campaign to another workspace's
-- client. The creator must be a member of the same workspace.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.campaigns (
    campaign_id       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id      UUID          NOT NULL
                      REFERENCES leadgen.workspaces (workspace_id) ON DELETE CASCADE,
    client_id         UUID,
    playbook_id       SMALLINT      NOT NULL
                      REFERENCES leadgen.service_playbooks (playbook_id)
                      ON DELETE RESTRICT,
    created_by        UUID          NOT NULL,
    name              VARCHAR(140)  NOT NULL,
    target_industry   VARCHAR(100)  NOT NULL,
    target_location   VARCHAR(150)  NOT NULL,
    constraints       JSONB         NOT NULL DEFAULT '{}'::JSONB,
    status            VARCHAR(15)   NOT NULL DEFAULT 'draft',
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,

    CONSTRAINT fk_campaigns_client_workspace
        FOREIGN KEY (client_id, workspace_id)
        REFERENCES leadgen.clients (client_id, workspace_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_campaigns_creator_membership
        FOREIGN KEY (workspace_id, created_by)
        REFERENCES leadgen.workspace_members (workspace_id, user_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_campaigns_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT chk_campaigns_industry_not_blank
        CHECK (BTRIM(target_industry) <> ''),
    CONSTRAINT chk_campaigns_location_not_blank
        CHECK (BTRIM(target_location) <> ''),
    CONSTRAINT chk_campaigns_constraints_object
        CHECK (JSONB_TYPEOF(constraints) = 'object'),
    CONSTRAINT chk_campaigns_status
        CHECK (status IN (
            'draft', 'queued', 'discovering', 'validating', 'scoring',
            'completed', 'failed', 'cancelled'
        )),
    CONSTRAINT chk_campaigns_started_after_created
        CHECK (started_at IS NULL OR started_at >= created_at),
    CONSTRAINT chk_campaigns_completed_after_started
        CHECK (
            completed_at IS NULL
            OR (started_at IS NOT NULL AND completed_at >= started_at)
        ),
    CONSTRAINT chk_campaigns_terminal_time
        CHECK (
            (status = 'completed' AND completed_at IS NOT NULL)
            OR (status <> 'completed' AND completed_at IS NULL)
        )
);


-- --------------------------------------------------------------------------
-- 7. candidates
-- A normalized, deduplicated business identity. A candidate is not a lead.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.candidates (
    candidate_id     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_name  VARCHAR(200)  NOT NULL,
    domain           VARCHAR(253)  UNIQUE,
    industry         VARCHAR(100),
    city             VARCHAR(100),
    region           VARCHAR(100),
    country_code     CHAR(2)       NOT NULL,
    first_seen_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_candidates_name_not_blank
        CHECK (BTRIM(normalized_name) <> ''),
    CONSTRAINT chk_candidates_domain_not_blank
        CHECK (domain IS NULL OR BTRIM(domain) <> ''),
    CONSTRAINT chk_candidates_country_code
        CHECK (country_code ~ '^[A-Z]{2}$')
);


-- --------------------------------------------------------------------------
-- 8. campaign_candidates
-- M:N bridge recording how a candidate entered a campaign and its current
-- qualification state. Expensive enrichment follows deterministic filtering.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.campaign_candidates (
    campaign_id          UUID          NOT NULL
                         REFERENCES leadgen.campaigns (campaign_id) ON DELETE CASCADE,
    candidate_id         UUID          NOT NULL
                         REFERENCES leadgen.candidates (candidate_id) ON DELETE RESTRICT,
    discovery_source     VARCHAR(30)   NOT NULL,
    source_record_id     VARCHAR(200),
    qualification_status VARCHAR(20)   NOT NULL DEFAULT 'discovered',
    discovered_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    PRIMARY KEY (campaign_id, candidate_id),
    CONSTRAINT chk_campaign_candidates_source_not_blank
        CHECK (BTRIM(discovery_source) <> ''),
    CONSTRAINT chk_campaign_candidates_record_not_blank
        CHECK (source_record_id IS NULL OR BTRIM(source_record_id) <> ''),
    CONSTRAINT chk_campaign_candidates_status
        CHECK (qualification_status IN (
            'discovered', 'validating', 'unqualified', 'qualified',
            'discarded', 'failed'
        ))
);


-- --------------------------------------------------------------------------
-- 9. contact_paths
-- Public business contact routes only. The source URL is always retained.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.contact_paths (
    contact_id      BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    candidate_id   UUID         NOT NULL
                   REFERENCES leadgen.candidates (candidate_id) ON DELETE CASCADE,
    contact_type    VARCHAR(20)  NOT NULL,
    contact_value   TEXT         NOT NULL,
    source_url      TEXT         NOT NULL,
    verified_at     TIMESTAMPTZ,
    is_primary      BOOLEAN      NOT NULL DEFAULT FALSE,

    CONSTRAINT uq_contact_paths_candidate_type_value
        UNIQUE (candidate_id, contact_type, contact_value),
    CONSTRAINT chk_contact_paths_type_not_blank
        CHECK (BTRIM(contact_type) <> ''),
    CONSTRAINT chk_contact_paths_value_not_blank
        CHECK (BTRIM(contact_value) <> ''),
    CONSTRAINT chk_contact_paths_source_not_blank
        CHECK (BTRIM(source_url) <> '')
);


-- --------------------------------------------------------------------------
-- 10. evidence
-- Source-backed observations for one campaign/candidate pair. The composite
-- FK guarantees evidence cannot be attached outside that pair.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.evidence (
    evidence_id       BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    campaign_id       UUID          NOT NULL,
    candidate_id      UUID          NOT NULL,
    source_type       VARCHAR(30)   NOT NULL,
    source_url        TEXT          NOT NULL,
    observed_at       TIMESTAMPTZ   NOT NULL,
    title             VARCHAR(200),
    excerpt           TEXT,
    extracted_value   JSONB,
    source_record_id  VARCHAR(200),
    collected_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_evidence_campaign_candidate
        FOREIGN KEY (campaign_id, candidate_id)
        REFERENCES leadgen.campaign_candidates (campaign_id, candidate_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_evidence_source_type_not_blank
        CHECK (BTRIM(source_type) <> ''),
    CONSTRAINT chk_evidence_source_url_not_blank
        CHECK (BTRIM(source_url) <> ''),
    CONSTRAINT chk_evidence_title_not_blank
        CHECK (title IS NULL OR BTRIM(title) <> ''),
    CONSTRAINT chk_evidence_record_not_blank
        CHECK (source_record_id IS NULL OR BTRIM(source_record_id) <> ''),
    CONSTRAINT chk_evidence_collection_order
        CHECK (collected_at >= observed_at)
);


-- --------------------------------------------------------------------------
-- 11. signals
-- Machine-observed facts. Every signal must point to preserved evidence.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.signals (
    signal_id       BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    evidence_id     BIGINT        NOT NULL
                    REFERENCES leadgen.evidence (evidence_id) ON DELETE CASCADE,
    signal_type     VARCHAR(40)   NOT NULL,
    strength        NUMERIC(5,2)  NOT NULL,
    observed_value  JSONB         NOT NULL,
    detected_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_signals_type_not_blank CHECK (BTRIM(signal_type) <> ''),
    CONSTRAINT chk_signals_strength CHECK (strength BETWEEN 0 AND 100)
);


-- --------------------------------------------------------------------------
-- 12. leads
-- A campaign candidate becomes a lead only after evidence-backed qualification.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.leads (
    lead_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id    UUID         NOT NULL,
    candidate_id   UUID         NOT NULL,
    status         VARCHAR(12)  NOT NULL DEFAULT 'new',
    reason         TEXT         NOT NULL,
    qualified_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    reviewed_by    UUID
                   REFERENCES leadgen.users (user_id) ON DELETE RESTRICT,
    reviewed_at    TIMESTAMPTZ,

    CONSTRAINT uq_leads_campaign_candidate UNIQUE (campaign_id, candidate_id),
    CONSTRAINT fk_leads_campaign_candidate
        FOREIGN KEY (campaign_id, candidate_id)
        REFERENCES leadgen.campaign_candidates (campaign_id, candidate_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_leads_status
        CHECK (status IN ('new', 'saved', 'contacted', 'rejected')),
    CONSTRAINT chk_leads_reason_not_blank CHECK (BTRIM(reason) <> ''),
    CONSTRAINT chk_leads_review_pair
        CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL)),
    CONSTRAINT chk_leads_review_after_qualification
        CHECK (reviewed_at IS NULL OR reviewed_at >= qualified_at),
    CONSTRAINT chk_leads_reviewed_status
        CHECK (
            (status = 'new' AND reviewed_at IS NULL)
            OR (status <> 'new' AND reviewed_at IS NOT NULL)
        )
);


-- --------------------------------------------------------------------------
-- 13. lead_score_factors
-- Explainable components of the application-calculated lead score. The LLM
-- may interpret evidence but never owns these final scores or weights.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.lead_score_factors (
    lead_id       UUID          NOT NULL
                  REFERENCES leadgen.leads (lead_id) ON DELETE CASCADE,
    factor_type   VARCHAR(20)   NOT NULL,
    score         NUMERIC(5,2)  NOT NULL,
    weight        NUMERIC(5,2)  NOT NULL,
    explanation   TEXT          NOT NULL,

    PRIMARY KEY (lead_id, factor_type),
    CONSTRAINT chk_lead_score_factors_type
        CHECK (factor_type IN (
            'fit', 'need', 'timing', 'reachability', 'evidence_quality'
        )),
    CONSTRAINT chk_lead_score_factors_score CHECK (score BETWEEN 0 AND 100),
    CONSTRAINT chk_lead_score_factors_weight CHECK (weight BETWEEN 0 AND 1),
    CONSTRAINT chk_lead_score_factors_explanation_not_blank
        CHECK (BTRIM(explanation) <> '')
);


-- --------------------------------------------------------------------------
-- 14. lead_status_history
-- Auditable human review transitions.
-- --------------------------------------------------------------------------
CREATE TABLE leadgen.lead_status_history (
    history_id    BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lead_id       UUID         NOT NULL
                  REFERENCES leadgen.leads (lead_id) ON DELETE CASCADE,
    from_status   VARCHAR(12),
    to_status     VARCHAR(12)  NOT NULL,
    changed_by    UUID         NOT NULL
                  REFERENCES leadgen.users (user_id) ON DELETE RESTRICT,
    changed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_lead_history_from_status
        CHECK (
            from_status IS NULL
            OR from_status IN ('new', 'saved', 'contacted', 'rejected')
        ),
    CONSTRAINT chk_lead_history_to_status
        CHECK (to_status IN ('new', 'saved', 'contacted', 'rejected')),
    CONSTRAINT chk_lead_history_actual_change
        CHECK (from_status IS NULL OR from_status <> to_status)
);


-- Tenant and user data is deny-by-default when accessed through Supabase.
-- Policies are intentionally kept in an application migration because they
-- depend on the final auth/role design. PostgreSQL owners and Supabase's
-- service role can still perform controlled background-job operations.
ALTER TABLE leadgen.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.campaign_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.contact_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.lead_score_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.lead_status_history ENABLE ROW LEVEL SECURITY;

COMMIT;
