/**
 * Lightweight Supabase query timing instrumentation.
 * Wraps any async call and logs duration to the console.
 *
 * Usage:
 *   const { data } = await timed("useProjects.fetch", () =>
 *     supabase.from("projects").select("*").eq("customer_id", uid)
 *   );
 *
 * Enable/disable via localStorage:
 *   localStorage.setItem("dexo_timing", "1")   // enable
 *   localStorage.removeItem("dexo_timing")      // disable
 */

const SLOW_THRESHOLD_MS = 500;

function isEnabled(): boolean {
  try {
    return localStorage.getItem("dexo_timing") === "1";
  } catch {
    return false;
  }
}

export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isEnabled()) return fn();

  const start = performance.now();
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - start);
    const tag = ms > SLOW_THRESHOLD_MS ? "🐌 SLOW" : "✓";
    console.log(`[timing] ${tag} ${label}: ${ms}ms`);
    return result;
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    console.error(`[timing] ✗ ${label}: ${ms}ms (error)`);
    throw err;
  }
}
