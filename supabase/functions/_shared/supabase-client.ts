import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

// Server-side client with service role key (bypasses RLS)
export function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key);
}

// Client-side client (respects RLS)
export function getAnonClient(authHeader?: string) {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_ANON_KEY')!;
  const client = createClient(url, key, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
  return client;
}

// Extract user from request
export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const client = getAnonClient(authHeader);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return user;
}
