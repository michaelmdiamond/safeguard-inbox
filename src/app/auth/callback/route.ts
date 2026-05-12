import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Generate alias for new users (if they don't have one yet)
      if (type === "signup" || type === "magiclink") {
        try {
          const aliasUrl = new URL("/api/alias/generate", origin);
          await fetch(aliasUrl.toString(), {
            method: "POST",
            headers: { cookie: request.headers.get("cookie") || "" },
          });
        } catch {
          // Non-fatal
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Handle token_hash (e.g. recovery links)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "recovery" | "signup" | "email",
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
