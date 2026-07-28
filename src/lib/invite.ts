import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Durable invite links for first-time portal access.
 *
 * Replaces raw Supabase magic links, which failed three ways in the
 * WhatsApp workflow: the implicit-flow hash tokens never reached the
 * server callback, link previews consumed the one-time token before the
 * student tapped it, and the 1-hour expiry died in transit.
 *
 * An invite link points to /bienvenida?t=<token>. Opening the page costs
 * nothing; the session is only created when the student presses the
 * button (POST /api/auth/redeem-invite). Valid for 7 days, reusable
 * within that window, revoked by generating a new one.
 */
export const INVITE_VALIDITY_DAYS = 7;

export async function createInviteLink(
  serviceClient: SupabaseClient,
  studentId: string,
): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(
    Date.now() + INVITE_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await serviceClient
    .from("tu_students")
    .update({ invite_token: token, invite_expires_at: expiresAt })
    .eq("id", studentId);

  if (error) {
    throw new Error(`No se pudo guardar el enlace de invitacion: ${error.message}`);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tataumana.com";
  return `${baseUrl}/bienvenida?t=${token}`;
}
