import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface AuthResult {
  userId: string;
  supabase: ReturnType<typeof createClient>;
}

/**
 * Verify JWT from Authorization header and return authenticated Supabase client.
 * Throws an Error with a message if auth fails.
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.replace("Bearer ", "");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify the JWT by explicitly passing it to getUser()
  const verifyClient = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await verifyClient.auth.getUser(token);

  if (error || !user) {
    console.error("Auth verification failed:", error?.message);
    throw new Error("Invalid or expired token");
  }

  // Return an authenticated client the caller can use for DB/storage ops
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  return { userId: user.id, supabase };
}
