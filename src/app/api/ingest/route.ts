import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseReceipt } from "@/lib/gemini";
import { matchItemAgainstRecalls, getSeverity } from "@/lib/matching";
import { sendRecallAlertEmail } from "@/lib/notifications";
import type { ActiveRecall, InventoryItem } from "@/types/database";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Verify the SendGrid webhook shared secret.
 * Rejects requests that don't include a valid Authorization header.
 */
function verifyWebhookAuth(request: NextRequest): boolean {
  const secret = process.env.SENDGRID_WEBHOOK_SECRET;
  if (!secret) return false; // Deny if secret is not configured
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * POST /api/ingest
 *
 * SendGrid Inbound Parse webhook handler.
 * Receives forwarded emails, parses receipts with Gemini,
 * saves products to user_inventory, and triggers matching + notifications.
 */
export async function POST(request: NextRequest) {
  try {
    // --- Webhook authentication ---
    if (!verifyWebhookAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const to = formData.get("to") as string;
    const html = formData.get("html") as string;
    const text = formData.get("text") as string;

    if (!to) {
      return NextResponse.json(
        { error: "Missing 'to' field" },
        { status: 400 }
      );
    }

    // Extract alias from email address (e.g., "inbox.a1b2c3@safeguard.io")
    const emailDomain = process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "safeguard.io";
    const aliasMatch = to.match(
      new RegExp(`([^<\\s]+)@${emailDomain.replace(/\./g, "\\.")}`)
    );
    if (!aliasMatch) {
      return NextResponse.json(
        { error: "Invalid recipient address" },
        { status: 400 }
      );
    }

    const alias = aliasMatch[1];
    const supabase = getServiceClient();

    // --- Resolve user_id from alias ---
    const { data: aliasRow, error: aliasError } = await supabase
      .from("user_aliases")
      .select("user_id")
      .eq("alias", alias)
      .single();

    if (aliasError || !aliasRow) {
      return NextResponse.json(
        { error: "Unknown recipient alias" },
        { status: 404 }
      );
    }

    const userId: string = aliasRow.user_id;

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

    const sourceEmailId = `sg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const inventoryItems = products.map((product) => ({
      user_id: userId,
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

    let alertsCreated = 0;

    if (recalls && savedItems) {
      // Fetch user email for notifications
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const userEmail = userData?.user?.email;

      for (const item of savedItems) {
        const matches = matchItemAgainstRecalls(
          item as InventoryItem,
          recalls as ActiveRecall[]
        );

        if (matches.length > 0) {
          const alerts = matches.map((match) => ({
            user_id: userId,
            inventory_item_id: item.id,
            recall_id: match.recall.id,
            match_score: match.score,
            severity: getSeverity(match.score),
            status: "new",
          }));

          const { data: savedAlerts } = await supabase
            .from("user_alerts")
            .upsert(alerts, { onConflict: "inventory_item_id,recall_id" })
            .select("*, inventory_item:user_inventory(*), recall:active_recalls(*)");

          alertsCreated += alerts.length;

          // Send email for high-severity alerts
          if (userEmail && savedAlerts) {
            for (const alert of savedAlerts) {
              if (alert.severity === "high") {
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
    }

    return NextResponse.json({
      message: "Receipt processed successfully",
      products_found: products.length,
      products_saved: savedItems?.length || 0,
      alerts_created: alertsCreated,
    });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
