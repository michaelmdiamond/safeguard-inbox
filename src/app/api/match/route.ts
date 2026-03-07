import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { matchItemAgainstRecalls, getSeverity } from "@/lib/matching";
import type { InventoryItem, ActiveRecall } from "@/types/database";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/match
 *
 * Runs fuzzy matching between an inventory item and all active recalls.
 * Used to trigger matching for a specific item or re-check after new recalls.
 *
 * Body: { inventory_item_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventory_item_id } = body;

    if (!inventory_item_id) {
      return NextResponse.json(
        { error: "Missing inventory_item_id" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Fetch the inventory item
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

    // Fetch all active recalls
    const { data: recalls, error: recallsError } = await supabase
      .from("active_recalls")
      .select("*");

    if (recallsError || !recalls) {
      return NextResponse.json(
        { error: "Failed to fetch recalls" },
        { status: 500 }
      );
    }

    // Run matching
    const matches = matchItemAgainstRecalls(
      item as InventoryItem,
      recalls as ActiveRecall[]
    );

    // Save alerts for matches
    if (matches.length > 0) {
      const alerts = matches.map((match) => ({
        user_id: item.user_id,
        inventory_item_id: item.id,
        recall_id: match.recall.id,
        match_score: match.score,
        severity: getSeverity(match.score),
        status: "new",
      }));

      const { error: alertError } = await supabase
        .from("user_alerts")
        .upsert(alerts, {
          onConflict: "inventory_item_id,recall_id",
        });

      if (alertError) {
        console.error("Failed to save alerts:", alertError);
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
