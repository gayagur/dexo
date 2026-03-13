/**
 * Admin configuration.
 * To grant admin access, add the user's email here AND set is_admin = true
 * in the profiles table via Supabase dashboard.
 * This client-side list is a UI guard only — real security is enforced by RLS.
 */
export const ADMIN_EMAILS: string[] = [
  // Add admin emails here, e.g.:
  // "admin@dexo.info",
];

/** Check if an email is in the admin allowlist (UI-only guard) */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
