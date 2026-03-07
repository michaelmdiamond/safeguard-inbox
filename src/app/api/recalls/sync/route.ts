import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
 * Docs: https://www.cpsc.gov/Recalls/CPSC-Recalls-Application-Program-Interface
 */
async function fetchCPSCRecalls(): Promise<
  Array<{
    agency_source: string;
    agency_id: string;
    title: string;
    description: string;
    affected_models: string[];
    recall_date: string;
    remedy_url: string;
  }>
> {
  try {
    const response = await fetch(
      "https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=2024-01-01",
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) return [];
    const data: CPSCRecall[] = await response.json();

    return data.slice(0, 100).map((recall) => ({
      agency_source: "CPSC",
      agency_id: recall.RecallNumber || `CPSC-${recall.RecallID}`,
      title: recall.Title || recall.Description?.slice(0, 200) || "Unknown",
      description: recall.Description || "",
      affected_models: recall.Products?.map((p) => p.Model).filter(Boolean) || [],
      recall_date: recall.RecallDate || new Date().toISOString().split("T")[0],
      remedy_url: recall.URL || "",
    }));
  } catch (error) {
    console.error("CPSC fetch error:", error);
    return [];
  }
}

/**
 * Fetch recalls from FDA openFDA API.
 * Docs: https://open.fda.gov/apis/food/enforcement/
 */
async function fetchFDARecalls(): Promise<
  Array<{
    agency_source: string;
    agency_id: string;
    title: string;
    description: string;
    affected_models: string[];
    recall_date: string;
    remedy_url: string;
  }>
> {
  try {
    const response = await fetch(
      "https://api.fda.gov/food/enforcement.json?limit=50&sort=recall_initiation_date:desc",
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) return [];
    const data = await response.json();

    return (data.results || []).map(
      (recall: {
        recall_number: string;
        product_description: string;
        reason_for_recall: string;
        code_info: string;
        recall_initiation_date: string;
      }) => ({
        agency_source: "FDA",
        agency_id: recall.recall_number || `FDA-${Date.now()}`,
        title: recall.product_description?.slice(0, 200) || "Unknown",
        description: recall.reason_for_recall || "",
        affected_models: recall.code_info
          ? recall.code_info.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean).slice(0, 10)
          : [],
        recall_date: recall.recall_initiation_date
          ? `${recall.recall_initiation_date.slice(0, 4)}-${recall.recall_initiation_date.slice(4, 6)}-${recall.recall_initiation_date.slice(6, 8)}`
          : new Date().toISOString().split("T")[0],
        remedy_url: "",
      })
    );
  } catch (error) {
    console.error("FDA fetch error:", error);
    return [];
  }
}

/**
 * Fetch recalls from NHTSA API.
 * Docs: https://www.nhtsa.gov/nhtsa-api
 */
async function fetchNHTSARecalls(): Promise<
  Array<{
    agency_source: string;
    agency_id: string;
    title: string;
    description: string;
    affected_models: string[];
    recall_date: string;
    remedy_url: string;
  }>
> {
  try {
    const currentYear = new Date().getFullYear();
    const response = await fetch(
      `https://api.nhtsa.gov/recalls/recallsByYear?year=${currentYear}&type=equipment`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) return [];
    const data = await response.json();

    return (data.results || []).slice(0, 50).map(
      (recall: {
        NHTSACampaignNumber: string;
        Subject: string;
        Summary: string;
        ModelYear: string;
        Make: string;
        Model: string;
        ReportReceivedDate: string;
      }) => ({
        agency_source: "NHTSA",
        agency_id: recall.NHTSACampaignNumber || `NHTSA-${Date.now()}`,
        title: recall.Subject || "Unknown",
        description: recall.Summary || "",
        affected_models: [
          `${recall.ModelYear || ""} ${recall.Make || ""} ${recall.Model || ""}`.trim(),
        ].filter((m) => m.length > 0),
        recall_date:
          recall.ReportReceivedDate?.split("T")[0] ||
          new Date().toISOString().split("T")[0],
        remedy_url: "",
      })
    );
  } catch (error) {
    console.error("NHTSA fetch error:", error);
    return [];
  }
}

/**
 * POST /api/recalls/sync
 *
 * Cron-triggered endpoint that fetches latest recalls from
 * CPSC, FDA, and NHTSA APIs and upserts them into the database.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (optional security measure)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceClient();

    // Fetch from all agencies in parallel
    const [cpscRecalls, fdaRecalls, nhtsaRecalls] = await Promise.all([
      fetchCPSCRecalls(),
      fetchFDARecalls(),
      fetchNHTSARecalls(),
    ]);

    const allRecalls = [...cpscRecalls, ...fdaRecalls, ...nhtsaRecalls];

    if (allRecalls.length === 0) {
      return NextResponse.json({
        message: "No new recalls fetched",
        counts: { cpsc: 0, fda: 0, nhtsa: 0 },
      });
    }

    // Upsert recalls into the database
    const { error } = await supabase.from("active_recalls").upsert(allRecalls, {
      onConflict: "agency_id",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error("Failed to upsert recalls:", error);
      return NextResponse.json(
        { error: "Failed to save recalls" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Recall sync completed",
      counts: {
        cpsc: cpscRecalls.length,
        fda: fdaRecalls.length,
        nhtsa: nhtsaRecalls.length,
        total: allRecalls.length,
      },
    });
  } catch (error) {
    console.error("Recall sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing
export async function GET() {
  return NextResponse.json({
    message: "Use POST to trigger recall sync",
    endpoints: {
      cpsc: "https://www.saferproducts.gov/RestWebServices/Recall",
      fda: "https://api.fda.gov/food/enforcement.json",
      nhtsa: "https://api.nhtsa.gov/recalls/recallsByYear",
    },
  });
}
