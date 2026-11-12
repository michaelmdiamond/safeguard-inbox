import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  refreshGmailToken,
  searchGmailThreadIds,
  getGmailThreadContent,
} from "@/lib/gmail";
import { parseReceipt } from "@/lib/gemini";
import { matchItemAgainstRecalls, getSeverity } from "@/lib/matching";
import type { ActiveRecall, InventoryItem } from "@/types/database";

const SCAN_QUERY = "category:purchases newer_than:2y";
const MAX_THREADS = 30;
const BATCH_SIZE = 5;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch Gmail connection
  const { data: connection, error: connError } = await supabase
    .from("gmail_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json(
      { error: "No Gmail connection found" },
      { status: 404 }
    );
  }

  // Refresh token if expired
  let accessToken = connection.access_token;
  if (new Date(connection.token_expiry) <= new Date()) {
    const refreshed = await refreshGmailToken(connection.refresh_token);
    accessToken = refreshed.accessToken;
    await supabase
      .from("gmail_connections")
      .update({
        access_token: refreshed.accessToken,
        token_expiry: refreshed.expiry.toISOString(),
      })
      .eq("user_id", user.id);
  }

  // Search Gmail for purchase threads
  const threadIds = await searchGmailThreadIds(
    accessToken,
    SCAN_QUERY,
    MAX_THREADS
  );

  // Filter out threads already in inventory
  const sourceIds = threadIds.map((id) => `gmail_${id}`);
  const { data: existing } = await supabase
    .from("user_inventory")
    .select("source_email_id")
    .eq("user_id", user.id)
    .in("source_email_id", sourceIds);

  const alreadyScanned = new Set(
    (existing ?? []).map((r) => r.source_email_id)
  );
  const newThreadIds = threadIds.filter(
    (id) => !alreadyScanned.has(`gmail_${id}`)
  );

  // Load active recalls once for matching
  const { data: recalls } = await supabase.from("active_recalls").select("*");
  const activeRecalls = (recalls ?? []) as ActiveRecall[];

  let productsSaved = 0;

  // Process in batches to avoid rate limits
  for (let i = 0; i < newThreadIds.length; i += BATCH_SIZE) {
    const batch = newThreadIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((threadId) =>
        processThread(
          supabase,
          user.id,
          accessToken,
          threadId,
          activeRecalls
        ).then((count) => {
          productsSaved += count;
        })
      )
    );
  }

  // Mark as scanned
  await supabase
    .from("gmail_connections")
    .update({ scanned_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return NextResponse.json({
    threads_scanned: newThreadIds.length,
    products_saved: productsSaved,
  });
}

async function processThread(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  accessToken: string,
  threadId: string,
  activeRecalls: ActiveRecall[]
): Promise<number> {
  try {
    const content = await getGmailThreadContent(accessToken, threadId);
    if (!content) return 0;

    const products = await parseReceipt(content);
    if (products.length === 0) return 0;

    const sourceEmailId = `gmail_${threadId}`;
    const inventoryItems = products.map((p) => ({
      user_id: userId,
      brand: p.brand,
      product_name: p.product_name,
      model_number: p.model_number ?? null,
      category: p.category,
      source_email_id: sourceEmailId,
    }));

    const { data: savedItems, error: insertError } = await supabase
      .from("user_inventory")
      .insert(inventoryItems)
      .select();

    if (insertError || !savedItems) return 0;

    // Match against recalls
    if (activeRecalls.length > 0) {
      for (const item of savedItems) {
        const matches = matchItemAgainstRecalls(
          item as InventoryItem,
          activeRecalls
        );
        if (matches.length > 0) {
          await supabase.from("user_alerts").upsert(
            matches.map((m) => ({
              user_id: userId,
              inventory_item_id: item.id,
              recall_id: m.recall.id,
              match_score: m.score,
              severity: getSeverity(m.score),
              status: "new",
            })),
            { onConflict: "inventory_item_id,recall_id" }
          );
        }
      }
    }

    return savedItems.length;
  } catch {
    return 0;
  }
}
