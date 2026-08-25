-- Trigger-only functions: no direct execution by app roles
REVOKE ALL ON FUNCTION public.enforce_facilitator_group_limit() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_topic_from_entries() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_topic_created_by() FROM anon, authenticated;

-- Helper functions: signed-in users only
REVOKE ALL ON FUNCTION public.get_facilitator_group_preview(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_facilitator_level(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.is_facilitator_group_member(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_facilitator_group_owner(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_facilitator_group_participant(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.join_facilitator_group_by_code(text) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_facilitator_group_preview(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_facilitator_level(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_facilitator_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_facilitator_group_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_facilitator_group_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_facilitator_group_by_code(text) TO authenticated;