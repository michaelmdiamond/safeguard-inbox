import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseReceipt } from "@/lib/gemini";
import { matchItemAgainstRecalls, getSeverity } from "@/lib/matching";
import type { ActiveRecall } from "@/types/database";

// Use service role key for webhook processing (no user session)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/ingest
 *
 * SendGrid Inbound Parse webhook handler.
 * Receives forwarded emails, parses receipts with Gemini,
 * saves products to user_inventory, and triggers matching.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // SendGrid sends the email data as form fields
    const to = formData.get("to") as string;
    const html = formData.get("html") as string;
    const text = formData.get("text") as string;

    if (!to) {
      return NextResponse.json(
        { error: "Missing 'to' field" },
        { status: 400 }
      );
    }

    // Extract user identifier from email alias (e.g., user.abc123@safeguard.io)
    const emailDomain = process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "safeguard.io";
    const aliasMatch = to.match(new RegExp(`([^<\\s]+)@${emailDomain.replace(".", "\\.")}`));
    if (!aliasMatch) {
      return NextResponse.json(
        { error: "Invalid recipient address" },
        { status: 400 }
      );
    }

    const userAlias = aliasMatch[1];
    // In production, look up user_id from the alias
    // For now, extract UUID-like pattern from the alias
    const supabase = getServiceClient();

    // Look up user by alias pattern (the alias contains the user id slug)
    // In production: SELECT user_id FROM user_aliases WHERE alias = $1
    // For demo, we'll use the alias as a lookup key

    const emailContent = html || text;
    if (!emailContent) {
      return NextResponse.json(
        { error: "No email content found" },
        { status: 400 }
      );
    }

    // Parse the receipt with Gemini
    const products = await parseReceipt(emailContent);

    if (products.length === 0) {
      return NextResponse.json({
        message: "No physical products found in receipt",
        products_found: 0,
      });
    }

    // Generate a source reference (PII-scrubbed)
    const sourceEmailId = `sg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Save products to inventory
    // Note: In production, user_id would be resolved from the alias
    const inventoryItems = products.map((product) => ({
      user_id: userAlias, // In production: resolved UUID
      brand: product.brand,
      product_name: product.product_name,
      model_number: product.model_number,
      category: product.category,
      source_email_id: sourceEmailId,
    }));

    const { data: savedItems, error: insertError } = await supabase
      .from("user_inventory")
      .insert(inventoryItems)
      .select();

    if (insertError) {
      console.error("Failed to save inventory:", insertError);
      return NextResponse.json(
        { error: "Failed to save products" },
        { status: 500 }
      );
    }

    // Trigger matching against active recalls
    const { data: recalls } = await supabase
      .from("active_recalls")
      .select("*");

    if (recalls && savedItems) {
      for (const item of savedItems) {
        const matches = matchItemAgainstRecalls(
          item,
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

          await supabase.from("user_alerts").upsert(alerts, {
            onConflict: "inventory_item_id,recall_id",
          });
        }
      }
    }

    return NextResponse.json({
      message: "Receipt processed successfully",
      products_found: products.length,
      products_saved: savedItems?.length || 0,
    });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
