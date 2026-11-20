begin;
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
revoke all on function public.create_workspace(text,text,text,text[]) from public;
grant execute on function public.create_workspace(text,text,text,text[]) to authenticated;
notify pgrst, 'reload schema';
commit;
