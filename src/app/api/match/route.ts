import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { matchItemAgainstRecalls, getSeverity } from "@/lib/matching";
import { sendRecallAlertEmail } from "@/lib/notifications";
import type { InventoryItem, ActiveRecall } from "@/types/database";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Verify the caller is authorized. Accepts either:
 * - A valid CRON_SECRET in the Authorization header (internal/server calls)
 * - A valid Supabase user session cookie (authenticated user triggering re-match)
 */
async function verifyAuth(request: NextRequest): Promise<boolean> {
  // Check shared secret first (server-to-server)
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  // Fall back to Supabase session check
  const { createClient: createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

/**
 * POST /api/match
 *
 * Runs fuzzy matching between an inventory item and all active recalls.
 * Requires authentication (CRON_SECRET or user session).
 *
 * Body: { inventory_item_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { inventory_item_id } = body;

    if (!inventory_item_id) {
      return NextResponse.json(
        { error: "Missing inventory_item_id" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { data: item, error: itemError } = await supabase
      .from("user_inventory")
      .select("*")
      .eq("id", inventory_item_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const { data: recalls, error: recallsError } = await supabase
      .from("active_recalls")
      .select("*");

    if (recallsError || !recalls) {
      return NextResponse.json(
        { error: "Failed to fetch recalls" },
        { status: 500 }
      );
    }

    const matches = matchItemAgainstRecalls(
      item as InventoryItem,
      recalls as ActiveRecall[]
    );

    if (matches.length > 0) {
      const alerts = matches.map((match) => ({
        user_id: item.user_id,
        inventory_item_id: item.id,
        recall_id: match.recall.id,
        match_score: match.score,
        severity: getSeverity(match.score),
        status: "new",
      }));

      const { data: savedAlerts, error: alertError } = await supabase
        .from("user_alerts")
        .upsert(alerts, { onConflict: "inventory_item_id,recall_id" })
        .select("*, inventory_item:user_inventory(*), recall:active_recalls(*)");

      if (alertError) {
        console.error("Failed to save alerts:", alertError);
      }

      // Send email for high-severity alerts
      if (savedAlerts) {
        const { data: userData } = await supabase.auth.admin.getUserById(
          item.user_id
        );
        const userEmail = userData?.user?.email;

        if (userEmail) {
          for (const alert of savedAlerts) {
            if (alert.severity === "high" && !alert.notified_at) {
              await sendRecallAlertEmail(userEmail, alert);
              await supabase
                .from("user_alerts")
                .update({ notified_at: new Date().toISOString() })
                .eq("id", alert.id);
            }
          }
        }
      }
    }

    return NextResponse.json({
      inventory_item_id,
      matches_found: matches.length,
      matches: matches.map((m) => ({
        recall_id: m.recall.id,
        recall_title: m.recall.title,
        score: m.score,
        match_type: m.match_type,
        severity: getSeverity(m.score),
      })),
    });
  } catch (error) {
    console.error("Match error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
