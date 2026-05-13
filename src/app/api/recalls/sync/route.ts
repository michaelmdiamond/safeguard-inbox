import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { matchItemAgainstRecalls, getSeverity } from "@/lib/matching";
import { sendRecallAlertEmail } from "@/lib/notifications";
import type { ActiveRecall, InventoryItem } from "@/types/database";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface CPSCRecall {
  RecallID: string;
  RecallNumber: string;
  RecallDate: string;
  Description: string;
  Title: string;
  URL: string;
  Products: Array<{ Name: string; Model: string }>;
}

/**
 * Fetch recalls from CPSC API.
 * Goes back to 2015 to cover products still in homes (especially
 * baby gear and furniture that gets handed down or bought secondhand).
 * Docs: https://www.cpsc.gov/Recalls/CPSC-Recalls-Application-Program-Interface
 */
async function fetchCPSCRecalls(): Promise<NormalizedRecall[]> {
  try {
    const response = await fetch(
      "https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=2015-01-01",
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) return [];
    const data: CPSCRecall[] = await response.json();

    return data.map((recall) => {
      // Collect model numbers and product names for matching.
      // Many CPSC products have no Model — the product Name is the
      // only searchable identifier (e.g. "Graco 4Ever DLX Car Seat").
      const models = (recall.Products ?? []).map((p) => p.Model).filter(Boolean);
      const names = (recall.Products ?? []).map((p) => p.Name).filter(Boolean);
      const affected = [...new Set([...models, ...names])];

      return {
        agency_source: "CPSC",
        agency_id: recall.RecallNumber || `CPSC-${recall.RecallID}`,
        title: recall.Title || recall.Description?.slice(0, 200) || "Unknown",
        description: recall.Description || "",
        affected_models: affected,
        recall_date: recall.RecallDate || new Date().toISOString().split("T")[0],
        remedy_url: recall.URL || "",
      };
    });
  } catch (error) {
    console.error("CPSC fetch error:", error);
    return [];
  }
}

interface FDAEnforcementRecord {
  recall_number: string;
  product_description: string;
  reason_for_recall: string;
  code_info: string;
  recall_initiation_date: string;
}

/**
 * Normalize an openFDA enforcement record into our standard shape.
 */
function normalizeFDARecord(
  recall: FDAEnforcementRecord,
  counter: { n: number }
): NormalizedRecall {
  return {
    agency_source: "FDA",
    agency_id: recall.recall_number || `FDA-${Date.now()}-${counter.n++}`,
    title: recall.product_description?.slice(0, 200) || "Unknown",
    description: recall.reason_for_recall || "",
    affected_models: recall.code_info
      ? recall.code_info
          .split(/[,;]/)
          .map((s: string) => s.trim())
          .filter(Boolean)
          .slice(0, 10)
      : [],
    recall_date: recall.recall_initiation_date
      ? `${recall.recall_initiation_date.slice(0, 4)}-${recall.recall_initiation_date.slice(4, 6)}-${recall.recall_initiation_date.slice(6, 8)}`
      : new Date().toISOString().split("T")[0],
    remedy_url: "",
  };
}

/**
 * Fetch a single openFDA enforcement endpoint.
 * Returns up to 1000 most recent records.
 */
async function fetchFDAEndpoint(url: string): Promise<FDAEnforcementRecord[]> {
  try {
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.results || []) as FDAEnforcementRecord[];
  } catch (error) {
    console.error(`FDA fetch error for ${url}:`, error);
    return [];
  }
}

/**
 * Fetch recalls from all three FDA enforcement endpoints:
 * - Food (baby formula, snacks, beverages)
 * - Drug (children's medication, OTC drugs)
 * - Device (baby monitors, breast pumps, medical devices)
 * Docs: https://open.fda.gov/apis/
 */
async function fetchFDARecalls(): Promise<NormalizedRecall[]> {
  const [food, drug, device] = await Promise.all([
    fetchFDAEndpoint(
      "https://api.fda.gov/food/enforcement.json?limit=1000&sort=recall_initiation_date:desc"
    ),
    fetchFDAEndpoint(
      "https://api.fda.gov/drug/enforcement.json?limit=1000&sort=recall_initiation_date:desc"
    ),
    fetchFDAEndpoint(
      "https://api.fda.gov/device/enforcement.json?limit=1000&sort=recall_initiation_date:desc"
    ),
  ]);

  const counter = { n: 0 };
  return [...food, ...drug, ...device].map((r) =>
    normalizeFDARecord(r, counter)
  );
}

/**
 * Popular family vehicles to query for NHTSA recalls.
 * NHTSA's bulk "recallsByYear" endpoint is no longer publicly accessible,
 * so we query by specific make/model/year using their recallsByVehicle API.
 * CPSC already covers child equipment (car seats, strollers, etc.).
 */
const NHTSA_FAMILY_VEHICLES: Array<{ make: string; model: string }> = [
  { make: "toyota", model: "rav4" },
  { make: "toyota", model: "camry" },
  { make: "toyota", model: "highlander" },
  { make: "honda", model: "cr-v" },
  { make: "honda", model: "civic" },
  { make: "honda", model: "pilot" },
  { make: "ford", model: "explorer" },
  { make: "ford", model: "escape" },
  { make: "chevrolet", model: "equinox" },
  { make: "chevrolet", model: "traverse" },
  { make: "hyundai", model: "tucson" },
  { make: "hyundai", model: "santa fe" },
  { make: "kia", model: "sportage" },
  { make: "kia", model: "telluride" },
  { make: "subaru", model: "outback" },
];

interface NHTSARecallResult {
  NHTSACampaignNumber: string;
  Summary: string;
  Consequence: string;
  ModelYear: string;
  Make: string;
  Model: string;
  ReportReceivedDate: string; // DD/MM/YYYY
}

type NormalizedRecall = {
  agency_source: string;
  agency_id: string;
  title: string;
  description: string;
  affected_models: string[];
  recall_date: string;
  remedy_url: string;
};

/**
 * Fetch recalls from NHTSA API.
 * Docs: https://www.nhtsa.gov/nhtsa-datasets-and-apis
 *
 * Queries recallsByVehicle for a curated set of popular family vehicles
 * across recent model years. Deduplicates by campaign number.
 */
async function fetchNHTSARecalls(): Promise<NormalizedRecall[]> {
  try {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];

    // Build all make/model/year combinations
    const queries = NHTSA_FAMILY_VEHICLES.flatMap((vehicle) =>
      years.map((year) => ({ ...vehicle, year }))
    );

    // Fetch in batches of 10 to avoid hammering the API
    const batchSize = 10;
    const allResults: NHTSARecallResult[] = [];

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const responses = await Promise.all(
        batch.map(async ({ make, model, year }) => {
          try {
            const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;
            const res = await fetch(url, { next: { revalidate: 86400 } });
            if (!res.ok) return [];
            const data = await res.json();
            return (data.results || []) as NHTSARecallResult[];
          } catch {
            return [];
          }
        })
      );
      allResults.push(...responses.flat());
    }

    // Deduplicate by campaign number
    const seen = new Set<string>();
    const unique: NHTSARecallResult[] = [];
    for (const r of allResults) {
      if (r.NHTSACampaignNumber && !seen.has(r.NHTSACampaignNumber)) {
        seen.add(r.NHTSACampaignNumber);
        unique.push(r);
      }
    }

    return unique.map((recall) => {
      // ReportReceivedDate is DD/MM/YYYY — convert to YYYY-MM-DD
      let recallDate = new Date().toISOString().split("T")[0];
      if (recall.ReportReceivedDate) {
        const [day, month, year] = recall.ReportReceivedDate.split("/");
        if (day && month && year) {
          recallDate = `${year}-${month}-${day}`;
        }
      }

      return {
        agency_source: "NHTSA",
        agency_id: recall.NHTSACampaignNumber,
        title: recall.Summary?.slice(0, 200) || "Unknown",
        description: `${recall.Summary || ""} ${recall.Consequence || ""}`.trim(),
        affected_models: [
          `${recall.ModelYear || ""} ${recall.Make || ""} ${recall.Model || ""}`.trim(),
        ].filter((m) => m.length > 0),
        recall_date: recallDate,
        remedy_url: "",
      };
    });
  } catch (error) {
    console.error("NHTSA fetch error:", error);
    return [];
  }
}

/**
 * Fetch recalls from the USDA FSIS API.
 * Covers meat, poultry, and processed egg products.
 * Docs: https://www.fsis.usda.gov/science-data/data-sets-visualizations
 */
async function fetchUSDARecalls(): Promise<NormalizedRecall[]> {
  try {
    const response = await fetch(
      "https://api.fsis.usda.gov/fsis-open-data/recalls",
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) return [];
    const data = await response.json();
    const records = Array.isArray(data) ? data : data.results || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return records.slice(0, 1000).map((r: any) => {
      const recallDate = r.recall_date || r.Date || new Date().toISOString().split("T")[0];
      const products = r.products || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const affected = products.map((p: any) => p.product_name || p.name).filter(Boolean);

      return {
        agency_source: "USDA",
        agency_id: r.recall_number || r.Recall_Number || `USDA-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: (r.title || r.reason_for_recall || r.Description || "USDA Recall").slice(0, 200),
        description: r.reason_for_recall || r.Description || "",
        affected_models: affected.slice(0, 10),
        recall_date: typeof recallDate === "string" ? recallDate.slice(0, 10) : new Date().toISOString().split("T")[0],
        remedy_url: r.url || "",
      };
    });
  } catch (error) {
    console.error("USDA fetch error:", error);
    return [];
  }
}

/** Decode common XML/HTML entities. */
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

/** Extract the text content of an XML element, handling CDATA sections. */
function extractXmlField(item: string, tag: string): string {
  const cdataMatch = item.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`)
  );
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = item.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
  );
  return plainMatch ? decodeEntities(plainMatch[1].trim()) : "";
}

/**
 * Fetch food safety alerts from the CDC RSS feed.
 * Covers Salmonella, Listeria, allergen alerts, and adulterated food products.
 * Aggregates data from FDA, USDA, and CDC's own outbreak investigations.
 * Feed: https://tools.cdc.gov/api/v2/resources/media/316422.rss
 */
async function fetchCDCAlerts(): Promise<NormalizedRecall[]> {
  try {
    const response = await fetch(
      "https://tools.cdc.gov/api/v2/resources/media/316422.rss",
      { next: { revalidate: 86400 } }
    );
    if (!response.ok) return [];

    const xml = await response.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

    return items.slice(0, 500).map((item) => {
      const title = extractXmlField(item, "title");
      const description = extractXmlField(item, "description");
      const link = extractXmlField(item, "link");
      const guid = extractXmlField(item, "guid");
      const pubDate = extractXmlField(item, "pubDate");

      // Use the `c=` query param from the guid URL as the stable ID
      const cdcId =
        guid.match(/[?&]c=(\d+)/)?.[1] ?? guid.slice(-12).replace(/\W/g, "");
      const agencyId = `CDC-${cdcId}`;

      // Parse RFC 2822 date → YYYY-MM-DD
      let recallDate = new Date().toISOString().split("T")[0];
      if (pubDate) {
        const parsed = new Date(pubDate);
        if (!isNaN(parsed.getTime())) {
          recallDate = parsed.toISOString().split("T")[0];
        }
      }

      return {
        agency_source: "CDC",
        agency_id: agencyId,
        title: title.slice(0, 200) || "CDC Food Safety Alert",
        description,
        affected_models: [],
        recall_date: recallDate,
        remedy_url: link,
      };
    });
  } catch (error) {
    console.error("CDC fetch error:", error);
    return [];
  }
}

/**
 * After syncing new recalls, re-match all user inventory items against them.
 * Creates alerts and sends notifications for high-severity matches.
 */
async function reMatchInventory(
  supabase: ReturnType<typeof getServiceClient>,
  newRecalls: ActiveRecall[]
): Promise<number> {
  if (newRecalls.length === 0) return 0;

  const { data: allItems } = await supabase
    .from("user_inventory")
    .select("*");

  if (!allItems || allItems.length === 0) return 0;

  let alertsCreated = 0;

  // Group items by user for efficient notification
  const userItems = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const existing = userItems.get(item.user_id) || [];
    existing.push(item);
    userItems.set(item.user_id, existing);
  }

  for (const [userId, items] of userItems) {
    const newAlerts: Array<{
      user_id: string;
      inventory_item_id: string;
      recall_id: string;
      match_score: number;
      severity: string;
      status: string;
    }> = [];

    for (const item of items) {
      const matches = matchItemAgainstRecalls(
        item as InventoryItem,
        newRecalls
      );

      for (const match of matches) {
        newAlerts.push({
          user_id: userId,
          inventory_item_id: item.id,
          recall_id: match.recall.id,
          match_score: match.score,
          severity: getSeverity(match.score),
          status: "new",
        });
      }
    }

    if (newAlerts.length === 0) continue;

    const { data: savedAlerts } = await supabase
      .from("user_alerts")
      .upsert(newAlerts, { onConflict: "inventory_item_id,recall_id" })
      .select("*, inventory_item:user_inventory(*), recall:active_recalls(*)");

    alertsCreated += newAlerts.length;

    // Send notifications for high-severity alerts
    const highAlerts = (savedAlerts || []).filter(
      (a) => a.severity === "high" && !a.notified_at
    );

    if (highAlerts.length > 0) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const userEmail = userData?.user?.email;

      if (userEmail) {
        for (const alert of highAlerts) {
          await sendRecallAlertEmail(userEmail, alert);
          await supabase
            .from("user_alerts")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", alert.id);
        }
      }
    }
  }

  return alertsCreated;
}

/**
 * Shared sync logic used by both GET (Vercel cron) and POST handlers.
 */
async function runSync(request: NextRequest) {
  // --- Mandatory auth check ---
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Fetch from all agencies in parallel
  const [cpscRecalls, fdaRecalls, nhtsaRecalls, usdaRecalls, cdcAlerts] =
    await Promise.all([
      fetchCPSCRecalls(),
      fetchFDARecalls(),
      fetchNHTSARecalls(),
      fetchUSDARecalls(),
      fetchCDCAlerts(),
    ]);

  const allRecalls = [
    ...cpscRecalls,
    ...fdaRecalls,
    ...nhtsaRecalls,
    ...usdaRecalls,
    ...cdcAlerts,
  ];

  if (allRecalls.length === 0) {
    return NextResponse.json({
      message: "No new recalls fetched",
      counts: { cpsc: 0, fda: 0, nhtsa: 0, usda: 0, cdc: 0 },
    });
  }

  // Upsert in batches of 500
  const batchSize = 500;
  let upsertErrors = 0;
  for (let i = 0; i < allRecalls.length; i += batchSize) {
    const batch = allRecalls.slice(i, i + batchSize);
    const { error } = await supabase.from("active_recalls").upsert(batch, {
      onConflict: "agency_id",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`Failed to upsert batch ${i / batchSize + 1}:`, error);
      upsertErrors++;
    }
  }

  if (upsertErrors > 0) {
    return NextResponse.json(
      { error: `${upsertErrors} batch(es) failed during upsert` },
      { status: 500 }
    );
  }

  // Re-match all inventory against newly synced recalls
  const { data: freshRecalls } = await supabase
    .from("active_recalls")
    .select("*");

  const alertsCreated = await reMatchInventory(
    supabase,
    (freshRecalls || []) as ActiveRecall[]
  );

  return NextResponse.json({
    message: "Recall sync completed",
    counts: {
      cpsc: cpscRecalls.length,
      fda: fdaRecalls.length,
      nhtsa: nhtsaRecalls.length,
      usda: usdaRecalls.length,
      cdc: cdcAlerts.length,
      total: allRecalls.length,
    },
    alerts_created: alertsCreated,
  });
}

/**
 * GET /api/recalls/sync
 *
 * Vercel cron handler — runs the sync on schedule.
 * Set CRON_SECRET to secure this endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    return await runSync(request);
  } catch (error) {
    console.error("Recall sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recalls/sync
 *
 * Manual trigger for recall sync.
 */
export async function POST(request: NextRequest) {
  try {
    return await runSync(request);
  } catch (error) {
    console.error("Recall sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
