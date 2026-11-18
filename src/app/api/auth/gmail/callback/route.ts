import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getGmailEmail } from "@/lib/gmail";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL!;

function redirect(path: string) {
  const response = NextResponse.redirect(`${appUrl()}${path}`);
  response.cookies.set("gmail_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/gmail",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return redirect("/onboarding?error=gmail_denied");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const state = searchParams.get("state");
  const expectedState = request.cookies.get("gmail_oauth_state")?.value;
  if (!state || !expectedState || state !== expectedState ||
      !state.startsWith(`${user.id}:`)) {
    return redirect("/onboarding?error=invalid_oauth_state");
  }

  // Exchange authorization code only after verifying the initiating browser/session.
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
    return redirect("/onboarding?error=token_exchange");
  }

  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    // Happens when user already granted access — revoke and retry
    return redirect("/api/auth/gmail");
  }

  const gmailEmail = await getGmailEmail(tokens.access_token);

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: upsertError } = await service
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
    return redirect("/onboarding?error=save_failed");
  }

  return redirect("/onboarding?connected=1");
}
