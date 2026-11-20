begin;

create or replace function public.is_workspace_member(target_workspace uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid()) $$;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null, service text not null, target_industry text not null, target_location text not null,
  status text not null check (status in ('validating','scoring','completed','failed')),
  created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id) on delete cascade,
  import_row_id text not null, business_name text not null, industry text not null, location text not null,
  website_url text, source_url text not null, observed_at timestamptz not null,
  qualification_status text not null check (qualification_status in ('pending','qualified','unqualified')),
  unique (campaign_id, import_row_id)
);
create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null references public.candidates(id) on delete cascade,
  evidence_key text not null, source_type text not null, source_url text not null, observed_at timestamptz not null,
  validator text not null, signal_code text not null, observation text not null, extracted_value jsonb,
  unique (candidate_id, evidence_key)
);
create table if not exists public.llm_assessments (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  model_name text not null, intent_label text not null, recommended_service text not null,
  need_strength numeric(5,2) not null, enough_information boolean not null, summary text not null,
  supporting_evidence_keys text[] not null, assessed_at timestamptz not null default now()
);
create table if not exists public.leads (
  candidate_id uuid primary key references public.candidates(id) on delete cascade,
  final_score numeric(5,2) not null, reason_summary text not null,
  review_status text not null default 'new' check (review_status in ('new','saved','contacted','rejected')),
  published_at timestamptz not null default now(), reviewed_at timestamptz
);
create table if not exists public.lead_score_components (
  candidate_id uuid not null references public.leads(candidate_id) on delete cascade,
  dimension_code text not null, dimension_score numeric(5,2) not null, explanation text not null,
  primary key (candidate_id, dimension_code)
);

alter table public.campaigns enable row level security;
alter table public.candidates enable row level security;
alter table public.evidence enable row level security;
alter table public.llm_assessments enable row level security;
alter table public.leads enable row level security;
alter table public.lead_score_components enable row level security;

drop policy if exists "members_manage_campaigns" on public.campaigns;
create policy "members_manage_campaigns" on public.campaigns for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
drop policy if exists "members_manage_candidates" on public.candidates;
create policy "members_manage_candidates" on public.candidates for all to authenticated using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_workspace_member(c.workspace_id))) with check (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_workspace_member(c.workspace_id)));
drop policy if exists "members_manage_evidence" on public.evidence;
create policy "members_manage_evidence" on public.evidence for all to authenticated using (exists (select 1 from public.candidates x join public.campaigns c on c.id = x.campaign_id where x.id = candidate_id and public.is_workspace_member(c.workspace_id))) with check (exists (select 1 from public.candidates x join public.campaigns c on c.id = x.campaign_id where x.id = candidate_id and public.is_workspace_member(c.workspace_id)));
drop policy if exists "members_manage_assessments" on public.llm_assessments;
create policy "members_manage_assessments" on public.llm_assessments for all to authenticated using (exists (select 1 from public.candidates x join public.campaigns c on c.id = x.campaign_id where x.id = candidate_id and public.is_workspace_member(c.workspace_id))) with check (exists (select 1 from public.candidates x join public.campaigns c on c.id = x.campaign_id where x.id = candidate_id and public.is_workspace_member(c.workspace_id)));
drop policy if exists "members_manage_leads" on public.leads;
create policy "members_manage_leads" on public.leads for all to authenticated using (exists (select 1 from public.candidates x join public.campaigns c on c.id = x.campaign_id where x.id = candidate_id and public.is_workspace_member(c.workspace_id))) with check (exists (select 1 from public.candidates x join public.campaigns c on c.id = x.campaign_id where x.id = candidate_id and public.is_workspace_member(c.workspace_id)));
drop policy if exists "members_manage_score_components" on public.lead_score_components;
create policy "members_manage_score_components" on public.lead_score_components for all to authenticated using (exists (select 1 from public.candidates x join public.campaigns c on c.id = x.campaign_id where x.id = candidate_id and public.is_workspace_member(c.workspace_id))) with check (exists (select 1 from public.candidates x join public.campaigns c on c.id = x.campaign_id where x.id = candidate_id and public.is_workspace_member(c.workspace_id)));

notify pgrst, 'reload schema';
commit;
