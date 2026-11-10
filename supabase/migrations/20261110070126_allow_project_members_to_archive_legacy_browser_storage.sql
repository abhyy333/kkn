-- Let authenticated project members observe only the global legacy migration marker.
-- Keep all actual legacy browser data readable only by Super Admin.
drop policy if exists kkn_workspace_records_member_read on public.kkn_workspace_records;
create policy kkn_workspace_records_member_read
on public.kkn_workspace_records
for select
to authenticated
using (
  case
    when module_key = 'admin_logs'::text then
      (select private.is_super_admin())
    when module_key = 'legacy_storage'::text then
      (
        (select private.is_super_admin())
        or (
          record_key = 'migration_complete_v1'
          and (select private.is_project_member(project_id))
        )
      )
    when module_key = 'transactions'::text then
      (
        (select private.is_super_admin())
        or (select private.has_project_role(project_id, array['chair'::project_role, 'treasurer'::project_role]))
      )
    else
      (select private.is_project_member(project_id))
  end
);

-- Members (including DPL) may archive only their own old browser cache under
-- client:<their-auth-uid>:<local-storage-key>. The archive remains unreadable to them.
drop policy if exists kkn_workspace_records_member_insert on public.kkn_workspace_records;
create policy kkn_workspace_records_member_insert
on public.kkn_workspace_records
for insert
to authenticated
with check (
  (select private.is_super_admin())
  or case
    when module_key = 'legacy_storage'::text then
      (
        record_key like ('client:' || (select auth.uid())::text || ':%')
        and (select private.is_project_member(project_id))
      )
    when module_key = 'transactions'::text then
      (select private.has_project_role(project_id, array['chair'::project_role, 'treasurer'::project_role]))
    when module_key = any (array['meetings'::text, 'decisions'::text]) then
      (select private.has_project_role(project_id, array['chair'::project_role, 'secretary'::project_role]))
    when module_key = any (array['village_research'::text, 'unit_config'::text]) then
      (select private.has_project_role(project_id, array['chair'::project_role, 'secretary'::project_role, 'division_lead'::project_role]))
    when module_key = any (array['public_articles'::text, 'announcements'::text, 'archive'::text]) then
      (select private.has_project_role(project_id, array['chair'::project_role, 'secretary'::project_role, 'division_lead'::project_role]))
    else
      (
        (select private.is_project_member(project_id))
        and not (select private.is_project_dpl(project_id))
      )
  end
);

drop policy if exists kkn_workspace_records_member_update on public.kkn_workspace_records;
create policy kkn_workspace_records_member_update
on public.kkn_workspace_records
for update
to authenticated
using (
  (select private.is_super_admin())
  or case
    when module_key = 'legacy_storage'::text then
      (
        record_key like ('client:' || (select auth.uid())::text || ':%')
        and (select private.is_project_member(project_id))
      )
    when module_key = 'transactions'::text then
      (select private.has_project_role(project_id, array['chair'::project_role, 'treasurer'::project_role]))
    when module_key = any (array['meetings'::text, 'decisions'::text]) then
      (select private.has_project_role(project_id, array['chair'::project_role, 'secretary'::project_role]))
    when module_key = any (array['village_research'::text, 'unit_config'::text]) then
      (select private.has_project_role(project_id, array['chair'::project_role, 'secretary'::project_role, 'division_lead'::project_role]))
    when module_key = any (array['public_articles'::text, 'announcements'::text, 'archive'::text]) then
      (select private.has_project_role(project_id, array['chair'::project_role, 'secretary'::project_role, 'division_lead'::project_role]))
    when module_key = 'reports'::text then
      (select private.has_project_role(project_id, array['chair'::project_role, 'secretary'::project_role]))
    else
      (
        (select private.is_project_member(project_id))
        and not (select private.is_project_dpl(project_id))
      )
  end
)
with check (
  (select private.is_super_admin())
  or case
    when module_key = 'legacy_storage'::text then
      (
        record_key like ('client:' || (select auth.uid())::text || ':%')
        and (select private.is_project_member(project_id))
      )
    when module_key = 'transactions'::text then
      (select private.has_project_role(project_id, array['chair'::project_role, 'treasurer'::project_role]))
    when module_key = any (array['meetings'::text, 'decisions'::text]) then
      (select private.has_project_role(project_id, array['chair'::project_role, 'secretary'::project_role]))
    when module_key = any (array['village_research'::text, 'unit_config'::text]) then
      (select private.has_project_role(project_id, array['chair'::project_role, 'secretary'::project_role, 'division_lead'::project_role]))
    when module_key = any (array['public_articles'::text, 'announcements'::text, 'archive'::text]) then
      (select private.has_project_role(project_id, array['chair'::project_role, 'secretary'::project_role, 'division_lead'::project_role]))
    when module_key = 'reports'::text then
      (select private.has_project_role(project_id, array['chair'::project_role, 'secretary'::project_role]))
    else
      (
        (select private.is_project_member(project_id))
        and not (select private.is_project_dpl(project_id))
      )
  end
);
