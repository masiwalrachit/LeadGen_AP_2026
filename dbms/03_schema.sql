-- LeadGen normalized application schema
-- Team T0147 · PostgreSQL 15+ / Supabase PostgreSQL
-- Source: dbms/01_normalization.md (final 22-relation design).
-- Run: psql -d <database> -v ON_ERROR_STOP=1 -f dbms/03_schema.sql
-- Only PK/FK/UNIQUE/CHECK constraints are created here; performance indexes
-- belong to the optimization checkpoint.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS leadgen;

-- 1. Supabase Auth profile; credentials remain in Auth.
CREATE TABLE leadgen.users (
    user_id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_users_email_not_blank CHECK (BTRIM(email) <> ''),
    CONSTRAINT chk_users_email_shape CHECK (email LIKE '_%@_%._%'),
    CONSTRAINT chk_users_name_not_blank CHECK (BTRIM(full_name) <> '')
);

-- 2. Agency account and tenant-isolation boundary.
CREATE TABLE leadgen.workspaces (
    workspace_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    website_url TEXT,
    default_location VARCHAR(150) NOT NULL,
    created_by UUID NOT NULL
        REFERENCES leadgen.users (user_id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_workspaces_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT chk_workspaces_location_not_blank
        CHECK (BTRIM(default_location) <> ''),
    CONSTRAINT chk_workspaces_website_not_blank
        CHECK (website_url IS NULL OR BTRIM(website_url) <> '')
);

-- 3. One membership per user per workspace.
CREATE TABLE leadgen.workspace_members (
    workspace_id UUID NOT NULL
        REFERENCES leadgen.workspaces (workspace_id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES leadgen.users (user_id) ON DELETE RESTRICT,
    role VARCHAR(20) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id),
    CONSTRAINT chk_workspace_members_role_not_blank CHECK (BTRIM(role) <> '')
);

-- 4. Supported service definitions.
CREATE TABLE leadgen.service_playbooks (
    playbook_id SMALLINT PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    CONSTRAINT chk_service_playbooks_id CHECK (playbook_id > 0),
    CONSTRAINT chk_service_playbooks_code_not_blank CHECK (BTRIM(code) <> ''),
    CONSTRAINT chk_service_playbooks_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT chk_service_playbooks_description_not_blank
        CHECK (BTRIM(description) <> '')
);

-- 5. Services offered by each workspace.
CREATE TABLE leadgen.workspace_services (
    workspace_id UUID NOT NULL
        REFERENCES leadgen.workspaces (workspace_id) ON DELETE CASCADE,
    playbook_id SMALLINT NOT NULL
        REFERENCES leadgen.service_playbooks (playbook_id) ON DELETE RESTRICT,
    PRIMARY KEY (workspace_id, playbook_id)
);

-- 6. Optional customers for whom campaigns run.
CREATE TABLE leadgen.clients (
    client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL
        REFERENCES leadgen.workspaces (workspace_id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    website_url TEXT,
    CONSTRAINT uq_clients_workspace_name UNIQUE (workspace_id, name),
    CONSTRAINT uq_clients_id_workspace UNIQUE (client_id, workspace_id),
    CONSTRAINT chk_clients_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT chk_clients_website_not_blank
        CHECK (website_url IS NULL OR BTRIM(website_url) <> '')
);

-- 7. One targeting hypothesis. The composite client FK preserves workspace
-- isolation while client_id remains optional (normalization section 7.2).
CREATE TABLE leadgen.campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL
        REFERENCES leadgen.workspaces (workspace_id) ON DELETE CASCADE,
    client_id UUID,
    playbook_id SMALLINT NOT NULL
        REFERENCES leadgen.service_playbooks (playbook_id) ON DELETE RESTRICT,
    name VARCHAR(140) NOT NULL,
    target_industry VARCHAR(100) NOT NULL,
    target_location VARCHAR(150) NOT NULL,
    min_evidence_strength NUMERIC(5,2),
    business_size VARCHAR(40),
    status VARCHAR(15) NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_campaigns_client_workspace
        FOREIGN KEY (client_id, workspace_id)
        REFERENCES leadgen.clients (client_id, workspace_id) ON DELETE RESTRICT,
    CONSTRAINT fk_campaigns_creator_membership
        FOREIGN KEY (workspace_id, created_by)
        REFERENCES leadgen.workspace_members (workspace_id, user_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_campaigns_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT chk_campaigns_industry_not_blank CHECK (BTRIM(target_industry) <> ''),
    CONSTRAINT chk_campaigns_location_not_blank CHECK (BTRIM(target_location) <> ''),
    CONSTRAINT chk_campaigns_evidence_strength CHECK (
        min_evidence_strength IS NULL OR min_evidence_strength BETWEEN 0 AND 100
    ),
    CONSTRAINT chk_campaigns_business_size_not_blank
        CHECK (business_size IS NULL OR BTRIM(business_size) <> ''),
    CONSTRAINT chk_campaigns_status CHECK (status IN (
        'draft', 'queued', 'discovering', 'validating', 'scoring',
        'completed', 'failed', 'cancelled'
    ))
);

-- 8. Normalized business identity, shared and deduplicated across campaigns.
CREATE TABLE leadgen.businesses (
    business_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    website_url TEXT,
    normalized_domain VARCHAR(253) UNIQUE,
    industry VARCHAR(100),
    address_line TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    country_code CHAR(2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_businesses_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT chk_businesses_website_not_blank
        CHECK (website_url IS NULL OR BTRIM(website_url) <> ''),
    CONSTRAINT chk_businesses_domain_not_blank
        CHECK (normalized_domain IS NULL OR BTRIM(normalized_domain) <> ''),
    CONSTRAINT chk_businesses_country_code CHECK (country_code ~ '^[A-Z]{2}$')
);

-- 9. Stable external identifiers make discovery retries idempotent.
CREATE TABLE leadgen.business_source_records (
    source_type VARCHAR(30) NOT NULL,
    source_record_id VARCHAR(200) NOT NULL,
    business_id UUID NOT NULL
        REFERENCES leadgen.businesses (business_id) ON DELETE CASCADE,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (source_type, source_record_id),
    CONSTRAINT chk_business_sources_type_not_blank CHECK (BTRIM(source_type) <> ''),
    CONSTRAINT chk_business_sources_record_not_blank
        CHECK (BTRIM(source_record_id) <> '')
);

-- 10. A business considered by one campaign; not yet necessarily a lead.
CREATE TABLE leadgen.candidates (
    candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL
        REFERENCES leadgen.campaigns (campaign_id) ON DELETE CASCADE,
    business_id UUID NOT NULL
        REFERENCES leadgen.businesses (business_id) ON DELETE RESTRICT,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    qualification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    CONSTRAINT uq_candidates_campaign_business UNIQUE (campaign_id, business_id),
    CONSTRAINT chk_candidates_qualification_status CHECK (
        qualification_status IN ('pending', 'qualified', 'unqualified', 'discarded')
    )
);

-- 11. Original source-backed observations retained for traceability.
CREATE TABLE leadgen.evidence (
    evidence_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id UUID NOT NULL
        REFERENCES leadgen.businesses (business_id) ON DELETE RESTRICT,
    source_type VARCHAR(30) NOT NULL,
    source_url TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    title VARCHAR(200),
    excerpt TEXT,
    extracted_value JSONB,
    CONSTRAINT uq_evidence_business_url_time
        UNIQUE (business_id, source_url, observed_at),
    CONSTRAINT uq_evidence_id_business UNIQUE (evidence_id, business_id),
    CONSTRAINT chk_evidence_source_type_not_blank CHECK (BTRIM(source_type) <> ''),
    CONSTRAINT chk_evidence_source_url_not_blank CHECK (BTRIM(source_url) <> ''),
    CONSTRAINT chk_evidence_title_not_blank
        CHECK (title IS NULL OR BTRIM(title) <> '')
);

-- 12. Public contact paths backed by evidence for the same business.
CREATE TABLE leadgen.business_contacts (
    contact_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id UUID NOT NULL
        REFERENCES leadgen.businesses (business_id) ON DELETE CASCADE,
    contact_type VARCHAR(20) NOT NULL,
    contact_value TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    evidence_id BIGINT NOT NULL,
    CONSTRAINT uq_business_contacts_value
        UNIQUE (business_id, contact_type, contact_value),
    CONSTRAINT fk_business_contacts_evidence
        FOREIGN KEY (evidence_id, business_id)
        REFERENCES leadgen.evidence (evidence_id, business_id) ON DELETE RESTRICT,
    CONSTRAINT chk_business_contacts_type_not_blank CHECK (BTRIM(contact_type) <> ''),
    CONSTRAINT chk_business_contacts_value_not_blank CHECK (BTRIM(contact_value) <> '')
);

-- 13. Stable signal definitions.
CREATE TABLE leadgen.signal_types (
    signal_code VARCHAR(40) PRIMARY KEY,
    description TEXT NOT NULL,
    CONSTRAINT chk_signal_types_code_not_blank CHECK (BTRIM(signal_code) <> ''),
    CONSTRAINT chk_signal_types_description_not_blank CHECK (BTRIM(description) <> '')
);

-- 14. Machine-observed facts for a candidate.
CREATE TABLE leadgen.candidate_signals (
    candidate_id UUID NOT NULL
        REFERENCES leadgen.candidates (candidate_id) ON DELETE CASCADE,
    signal_code VARCHAR(40) NOT NULL
        REFERENCES leadgen.signal_types (signal_code) ON DELETE RESTRICT,
    confidence NUMERIC(5,4) NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (candidate_id, signal_code),
    CONSTRAINT chk_candidate_signals_confidence CHECK (confidence BETWEEN 0 AND 1)
);

-- 15. Evidence supporting each candidate signal.
CREATE TABLE leadgen.signal_evidence (
    candidate_id UUID NOT NULL,
    signal_code VARCHAR(40) NOT NULL,
    evidence_id BIGINT NOT NULL
        REFERENCES leadgen.evidence (evidence_id) ON DELETE RESTRICT,
    PRIMARY KEY (candidate_id, signal_code, evidence_id),
    CONSTRAINT fk_signal_evidence_signal
        FOREIGN KEY (candidate_id, signal_code)
        REFERENCES leadgen.candidate_signals (candidate_id, signal_code)
        ON DELETE CASCADE
);

-- 16. LLM interpretation; application code still owns the final score.
CREATE TABLE leadgen.llm_assessments (
    assessment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    candidate_id UUID NOT NULL
        REFERENCES leadgen.candidates (candidate_id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    schema_version VARCHAR(30) NOT NULL,
    intent_label VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_llm_assessments_candidate_time UNIQUE (candidate_id, assessed_at),
    CONSTRAINT chk_llm_model_not_blank CHECK (BTRIM(model_name) <> ''),
    CONSTRAINT chk_llm_schema_not_blank CHECK (BTRIM(schema_version) <> ''),
    CONSTRAINT chk_llm_label_not_blank CHECK (BTRIM(intent_label) <> ''),
    CONSTRAINT chk_llm_summary_not_blank CHECK (BTRIM(summary) <> '')
);

-- 17. Explainable scoring dimensions.
CREATE TABLE leadgen.score_dimensions (
    dimension_code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    CONSTRAINT chk_score_dimensions_code_not_blank CHECK (BTRIM(dimension_code) <> ''),
    CONSTRAINT chk_score_dimensions_name_not_blank CHECK (BTRIM(name) <> ''),
    CONSTRAINT chk_score_dimensions_description_not_blank CHECK (BTRIM(description) <> '')
);

-- 18. Immutable, versioned playbook scoring models.
CREATE TABLE leadgen.scoring_models (
    scoring_model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id SMALLINT NOT NULL
        REFERENCES leadgen.service_playbooks (playbook_id) ON DELETE RESTRICT,
    version INTEGER NOT NULL,
    qualification_threshold NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_scoring_models_playbook_version UNIQUE (playbook_id, version),
    CONSTRAINT chk_scoring_models_version CHECK (version >= 1),
    CONSTRAINT chk_scoring_models_threshold
        CHECK (qualification_threshold BETWEEN 0 AND 100)
);

-- 19. Versioned dimension weights. Application logic validates sum(weight)=1.
CREATE TABLE leadgen.scoring_model_weights (
    scoring_model_id UUID NOT NULL
        REFERENCES leadgen.scoring_models (scoring_model_id) ON DELETE CASCADE,
    dimension_code VARCHAR(20) NOT NULL
        REFERENCES leadgen.score_dimensions (dimension_code) ON DELETE RESTRICT,
    weight NUMERIC(5,4) NOT NULL,
    PRIMARY KEY (scoring_model_id, dimension_code),
    CONSTRAINT chk_scoring_model_weights_value CHECK (weight BETWEEN 0 AND 1)
);

-- 20. Qualified candidate and cached current inbox state.
CREATE TABLE leadgen.leads (
    candidate_id UUID PRIMARY KEY
        REFERENCES leadgen.candidates (candidate_id) ON DELETE CASCADE,
    scoring_model_id UUID NOT NULL
        REFERENCES leadgen.scoring_models (scoring_model_id) ON DELETE RESTRICT,
    final_score NUMERIC(5,2) NOT NULL,
    reason_summary TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    review_status VARCHAR(12) NOT NULL DEFAULT 'new',
    reviewed_by UUID REFERENCES leadgen.users (user_id) ON DELETE RESTRICT,
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT chk_leads_final_score CHECK (final_score BETWEEN 0 AND 100),
    CONSTRAINT chk_leads_reason_not_blank CHECK (BTRIM(reason_summary) <> ''),
    CONSTRAINT chk_leads_review_status
        CHECK (review_status IN ('new', 'saved', 'contacted', 'rejected')),
    CONSTRAINT chk_leads_review_pair
        CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL)),
    CONSTRAINT chk_leads_review_state CHECK (
        (review_status = 'new' AND reviewed_at IS NULL)
        OR (review_status <> 'new' AND reviewed_at IS NOT NULL)
    ),
    CONSTRAINT chk_leads_review_after_publish
        CHECK (reviewed_at IS NULL OR reviewed_at >= published_at)
);

-- 21. Per-dimension score and explanation shown to users.
CREATE TABLE leadgen.lead_score_components (
    candidate_id UUID NOT NULL
        REFERENCES leadgen.leads (candidate_id) ON DELETE CASCADE,
    dimension_code VARCHAR(20) NOT NULL
        REFERENCES leadgen.score_dimensions (dimension_code) ON DELETE RESTRICT,
    dimension_score NUMERIC(5,2) NOT NULL,
    explanation TEXT NOT NULL,
    PRIMARY KEY (candidate_id, dimension_code),
    CONSTRAINT chk_lead_components_score CHECK (dimension_score BETWEEN 0 AND 100),
    CONSTRAINT chk_lead_components_explanation_not_blank
        CHECK (BTRIM(explanation) <> '')
);

-- 22. Append-only human review history. Application logic enforces
-- new → saved → contacted and new → rejected.
CREATE TABLE leadgen.lead_review_events (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    candidate_id UUID NOT NULL
        REFERENCES leadgen.leads (candidate_id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES leadgen.users (user_id) ON DELETE RESTRICT,
    action VARCHAR(12) NOT NULL,
    note TEXT,
    acted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_lead_review_events_action
        CHECK (action IN ('saved', 'contacted', 'rejected')),
    CONSTRAINT chk_lead_review_events_note_not_blank
        CHECK (note IS NULL OR BTRIM(note) <> '')
);

-- Deny-by-default through Supabase. auth.uid()-based policies belong in the
-- application migration; PostgreSQL owners/service-role jobs can still operate.
ALTER TABLE leadgen.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.service_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.workspace_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.business_source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.business_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.signal_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.candidate_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.signal_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.llm_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.score_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.scoring_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.scoring_model_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.lead_score_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadgen.lead_review_events ENABLE ROW LEVEL SECURITY;

COMMIT;
