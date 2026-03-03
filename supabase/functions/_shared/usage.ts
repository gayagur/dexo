import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

interface LogUsageParams {
  userId: string;
  functionName: string;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Log an AI API call to ai_usage_log (fire-and-forget).
 * Uses service role key so RLS doesn't block inserts.
 */
export async function logUsage(params: LogUsageParams): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  await adminClient.from("ai_usage_log").insert({
    user_id: params.userId,
    function_name: params.functionName,
    model: params.model,
    tokens_in: params.tokensIn ?? 0,
    tokens_out: params.tokensOut ?? 0,
    cost_usd: params.costUsd ?? 0,
    metadata: params.metadata ?? {},
  });
}

/**
 * Get today's usage count for a user + function combo.
 */
export async function getDailyUsageCount(
  userId: string,
  functionName: string
): Promise<number> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await adminClient
    .from("ai_usage_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("function_name", functionName)
    .gte("created_at", today.toISOString());

  return count ?? 0;
}
