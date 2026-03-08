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

    // Upsert in batches of 500 to stay within request size limits
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
      fda_food: "https://api.fda.gov/food/enforcement.json",
      fda_drug: "https://api.fda.gov/drug/enforcement.json",
      fda_device: "https://api.fda.gov/device/enforcement.json",
      nhtsa: "https://api.nhtsa.gov/recalls/recallsByVehicle",
    },
  });
}
