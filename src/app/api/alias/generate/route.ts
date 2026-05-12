import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Generate a short random alias slug (e.g. "inbox.a7k3mx"). */
function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 8; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return `inbox.${slug}`;
}

/**
 * POST /api/alias/generate
 *
 * Called after signup to create the user's unique email alias.
 * Requires an authenticated session.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = getServiceClient();

    // Check if alias already exists
    const { data: existing } = await service
      .from("user_aliases")
      .select("alias")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ alias: existing.alias });
    }

    // Generate a unique alias (retry on collision)
    let alias = generateSlug();
    let attempts = 0;
    while (attempts < 5) {
      const { error } = await service.from("user_aliases").insert({
        user_id: user.id,
        alias,
      });

      if (!error) break;

      // Unique constraint violation — try another slug
      if (error.code === "23505") {
        alias = generateSlug();
        attempts++;
        continue;
      }

      // Other error
      console.error("Failed to create alias:", error);
      return NextResponse.json(
        { error: "Failed to create alias" },
        { status: 500 }
      );
    }

    if (attempts >= 5) {
      return NextResponse.json(
        { error: "Failed to generate unique alias" },
        { status: 500 }
      );
    }

    return NextResponse.json({ alias });
  } catch (error) {
    console.error("Alias generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
