begin;

-- The original policy compared `m.workspace_id = workspace_id`. Inside the subquery the
-- unqualified `workspace_id` resolved to `m.workspace_id`, so the condition was always true
-- and any workspace owner could read every workspace's join code. Qualify both sides.
drop policy if exists "owners_read_join_codes" on public.workspace_join_codes;
create policy "owners_read_join_codes" on public.workspace_join_codes
  for select to authenticated
  using (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = workspace_join_codes.workspace_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

-- Same ambiguity risk on the workspaces policy; qualify it so it cannot regress silently.
drop policy if exists "members_read_workspaces" on public.workspaces;
create policy "members_read_workspaces" on public.workspaces
  for select to authenticated
  using (
    exists (
      select 1
      from public.workspace_members m
      where m.workspace_id = workspaces.id
        and m.user_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
commit;
