REVOKE EXECUTE ON FUNCTION public.owns_plan(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_plan_assignment(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_plan(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owns_plan_assignment(uuid, uuid) TO authenticated, service_role;
