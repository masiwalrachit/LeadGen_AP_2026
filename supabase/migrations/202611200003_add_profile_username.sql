begin;

alter table public.profiles
  add column if not exists username text;

update public.profiles
set username = lower(
  regexp_replace(
    regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9_-]+', '_', 'g'),
    '(^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$)',
    '',
    'g'
  )
)
where username is null;

update public.profiles
set username = 'user_' || substr(replace(id::text, '-', ''), 1, 8)
where username is null or length(username) < 3;

alter table public.profiles
  alter column username set not null;

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$');

drop function if exists public.create_workspace(text, text, text, text[]);
drop function if exists public.join_workspace(text);

create or replace function public.create_workspace(profile_username text, workspace_name text, workspace_website text, workspace_location text, workspace_services text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); new_workspace public.workspaces; join_code text; normalized_username text := lower(btrim(profile_username));
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if normalized_username !~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$' then raise exception 'Username format is invalid'; end if;
  if length(btrim(workspace_name)) < 2 or length(btrim(workspace_location)) < 2 or cardinality(workspace_services) = 0 then raise exception 'Workspace name, location, and at least one service are required'; end if;
  insert into public.profiles (id, email, full_name, username) values (current_user_id, coalesce(auth.jwt() ->> 'email', ''), coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email', 'LeadGen user'), normalized_username) on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, username = excluded.username;
  insert into public.workspaces (name, website_url, default_location, services, created_by) values (btrim(workspace_name), nullif(btrim(workspace_website), ''), btrim(workspace_location), workspace_services, current_user_id) returning * into new_workspace;
  insert into public.workspace_members values (new_workspace.id, current_user_id, 'owner', now());
  join_code := 'LG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.workspace_join_codes values (new_workspace.id, join_code, now());
  return jsonb_build_object('workspaceId', new_workspace.id, 'workspaceName', new_workspace.name, 'joinCode', join_code);
end; $$;

create or replace function public.join_workspace(profile_username text, workspace_code text) returns jsonb language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); target_workspace public.workspaces; normalized_username text := lower(btrim(profile_username));
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if normalized_username !~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$' then raise exception 'Username format is invalid'; end if;
  select w.* into target_workspace from public.workspaces w join public.workspace_join_codes c on c.workspace_id = w.id where c.code = upper(btrim(workspace_code));
  if target_workspace.id is null then raise exception 'Join code not found'; end if;
  insert into public.profiles (id, email, full_name, username) values (current_user_id, coalesce(auth.jwt() ->> 'email', ''), coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email', 'LeadGen user'), normalized_username) on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, username = excluded.username;
  insert into public.workspace_members values (target_workspace.id, current_user_id, 'member', now()) on conflict do nothing;
  return jsonb_build_object('workspaceId', target_workspace.id, 'workspaceName', target_workspace.name);
end; $$;

revoke all on function public.create_workspace(text, text, text, text, text[]) from public;
revoke all on function public.join_workspace(text, text) from public;
grant execute on function public.create_workspace(text, text, text, text, text[]) to authenticated;
grant execute on function public.join_workspace(text, text) to authenticated;
notify pgrst, 'reload schema';

commit;
