import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";

// Lightweight endpoint: returns boolean presence for a curated set of env vars.
// Never returns actual values — only whether they are set.
const CHECKED_KEYS = [
  // WhatsApp
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  // Email (Resend)
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "EMAIL_FROM",
  // Kaspo (planned)
  "KASPO_API_KEY",
  "KASPO_WORKSPACE_ID",
  // Twilio (planned)
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
];

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const vars: Record<string, boolean> = {};
  for (const key of CHECKED_KEYS) {
    vars[key] = !!process.env[key];
  }
  return NextResponse.json({ vars });
}
