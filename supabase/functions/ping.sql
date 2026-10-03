-- Function to keep the Supabase database alive and prevent pausing due to inactivity
-- Endpoint to call via GET: /rest/v1/rpc/ping
create or replace function public.ping()
returns json
language sql
stable
security definer
as $$
  select json_build_object(
    'status', 'alive',
    'timestamp', now()
  );
$$;

-- Allow anonymous and authenticated access to invoke this function
grant execute on function public.ping() to anon, authenticated;
