import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailEmail } from "@/lib/gmail";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${appUrl()}/onboarding?error=gmail_denied`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl()}/login`);
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl()}/onboarding?error=token_exchange`);
  }

  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    // Happens when user already granted access — revoke and retry
    return NextResponse.redirect(
      `${appUrl()}/api/auth/gmail`
    );
  }

  const gmailEmail = await getGmailEmail(tokens.access_token);

  const { error: upsertError } = await supabase
    .from("gmail_connections")
    .upsert(
      {
        user_id: user.id,
        gmail_email: gmailEmail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(
          Date.now() + tokens.expires_in * 1000
        ).toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    console.error("Failed to save Gmail connection:", upsertError);
    return NextResponse.redirect(`${appUrl()}/onboarding?error=save_failed`);
  }

  return NextResponse.redirect(`${appUrl()}/onboarding?connected=1`);
}
