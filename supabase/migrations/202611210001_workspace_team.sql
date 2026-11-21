begin;

create or replace function public.get_workspace_team(target_workspace uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  membership_role text;
  invite_code text;
  team_members jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select role
  into membership_role
  from public.workspace_members
  where workspace_id = target_workspace
    and user_id = current_user_id;

  if membership_role is null then
    raise exception 'Workspace access denied';
  end if;

  if membership_role = 'owner' then
    select code
    into invite_code
    from public.workspace_join_codes
    where workspace_id = target_workspace;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'userId', member.user_id,
        'username', profile.username,
        'fullName', profile.full_name,
        'role', member.role,
        'joinedAt', member.joined_at
      )
      order by
        case when member.role = 'owner' then 0 else 1 end,
        member.joined_at asc
    ),
    '[]'::jsonb
  )
  into team_members
  from public.workspace_members member
  join public.profiles profile on profile.id = member.user_id
  where member.workspace_id = target_workspace;

  return jsonb_build_object(
    'currentRole', membership_role,
    'joinCode', invite_code,
    'members', team_members
  );
end;
$$;

revoke all on function public.get_workspace_team(uuid) from public;
grant execute on function public.get_workspace_team(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
