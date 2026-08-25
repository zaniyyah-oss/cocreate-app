REVOKE ALL ON FUNCTION public.enforce_facilitator_group_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_topic_from_entries() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_topic_created_by() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_facilitator_group_preview(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_facilitator_level(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_facilitator_group_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_facilitator_group_owner(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_facilitator_group_participant(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_facilitator_group_by_code(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_facilitator_group_preview(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_facilitator_level(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_facilitator_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_facilitator_group_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_facilitator_group_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_facilitator_group_by_code(text) TO authenticated;
GRANT ALL ON FUNCTION public.enforce_facilitator_group_limit() TO service_role;
GRANT ALL ON FUNCTION public.remove_topic_from_entries() TO service_role;
GRANT ALL ON FUNCTION public.set_topic_created_by() TO service_role;