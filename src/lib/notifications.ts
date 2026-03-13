import { supabase } from "./supabase";
import type { NotificationType } from "./database.types";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    metadata: params.metadata ?? {},
  });
  if (error) console.error("[notifications] insert error:", error.message);

  // Email placeholder — wire up when email service is configured
  sendEmailNotification(params);
}

/**
 * Placeholder for email notifications.
 * Wire up Resend, SendGrid, or Supabase Edge Functions here.
 *
 * Example with Resend:
 * ```
 * await resend.emails.send({
 *   from: 'DEXO <noreply@dexo.info>',
 *   to: userEmail,
 *   subject: params.title,
 *   html: `<p>${params.message}</p>`,
 * });
 * ```
 */
function sendEmailNotification(_params: CreateNotificationParams) {
  console.log("[notifications] Email placeholder — would send:", _params.title);
}
