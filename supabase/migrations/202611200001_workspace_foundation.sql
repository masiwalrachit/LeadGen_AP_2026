begin;
create extension if not exists pgcrypto;
create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, email text not null, full_name text not null, created_at timestamptz not null default now());
create table if not exists public.workspaces (id uuid primary key default gen_random_uuid(), name text not null check (length(btrim(name)) between 2 and 120), website_url text, default_location text not null check (length(btrim(default_location)) between 2 and 150), services text[] not null check (cardinality(services) > 0), created_by uuid not null references auth.users(id), created_at timestamptz not null default now());
create table if not exists public.workspace_members (workspace_id uuid not null references public.workspaces(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, role text not null check (role in ('owner', 'member')), joined_at timestamptz not null default now(), primary key (workspace_id, user_id));
create table if not exists public.workspace_join_codes (workspace_id uuid primary key references public.workspaces(id) on delete cascade, code text not null unique, created_at timestamptz not null default now());
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_join_codes enable row level security;
drop policy if exists "profiles_read_self" on public.profiles;
drop policy if exists "workspace_members_read_self" on public.workspace_members;
drop policy if exists "members_read_workspaces" on public.workspaces;
drop policy if exists "owners_read_join_codes" on public.workspace_join_codes;
create policy "profiles_read_self" on public.profiles for select to authenticated using (id = auth.uid());
create policy "workspace_members_read_self" on public.workspace_members for select to authenticated using (user_id = auth.uid());
create policy "members_read_workspaces" on public.workspaces for select to authenticated using (exists (select 1 from public.workspace_members m where m.workspace_id = id and m.user_id = auth.uid()));
create policy "owners_read_join_codes" on public.workspace_join_codes for select to authenticated using (exists (select 1 from public.workspace_members m where m.workspace_id = workspace_id and m.user_id = auth.uid() and m.role = 'owner'));

create or replace function public.create_workspace(workspace_name text, workspace_website text, workspace_location text, workspace_services text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); new_workspace public.workspaces; join_code text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if length(btrim(workspace_name)) < 2 or length(btrim(workspace_location)) < 2 or cardinality(workspace_services) = 0 then raise exception 'Workspace name, location, and at least one service are required'; end if;
  insert into public.profiles (id, email, full_name) values (current_user_id, coalesce(auth.jwt() ->> 'email', ''), coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email', 'LeadGen user')) on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;
  insert into public.workspaces (name, website_url, default_location, services, created_by) values (btrim(workspace_name), nullif(btrim(workspace_website), ''), btrim(workspace_location), workspace_services, current_user_id) returning * into new_workspace;
  insert into public.workspace_members values (new_workspace.id, current_user_id, 'owner', now());
  join_code := 'LG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.workspace_join_codes values (new_workspace.id, join_code, now());
  return jsonb_build_object('workspaceId', new_workspace.id, 'workspaceName', new_workspace.name, 'joinCode', join_code);
end; $$;

create or replace function public.join_workspace(workspace_code text) returns jsonb language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); target_workspace public.workspaces;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select w.* into target_workspace from public.workspaces w join public.workspace_join_codes c on c.workspace_id = w.id where c.code = upper(btrim(workspace_code));
  if target_workspace.id is null then raise exception 'Join code not found'; end if;
  insert into public.profiles (id, email, full_name) values (current_user_id, coalesce(auth.jwt() ->> 'email', ''), coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email', 'LeadGen user')) on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;
  insert into public.workspace_members values (target_workspace.id, current_user_id, 'member', now()) on conflict do nothing;
  return jsonb_build_object('workspaceId', target_workspace.id, 'workspaceName', target_workspace.name);
end; $$;
revoke all on function public.create_workspace(text,text,text,text[]) from public;
revoke all on function public.join_workspace(text) from public;
grant execute on function public.create_workspace(text,text,text,text[]) to authenticated;
grant execute on function public.join_workspace(text) to authenticated;
commit;
