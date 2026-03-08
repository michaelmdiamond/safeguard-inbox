import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { lookupProduct } from "@/lib/matching";
import type { ActiveRecall } from "@/types/database";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/lookup?q=fisher+price+sleeper&model=FHW27
 *
 * Public product recall lookup. No authentication required.
 * Searches all active recalls for fuzzy matches against the provided query.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const model = searchParams.get("model")?.trim() ?? "";

    if (!q && !model) {
      return NextResponse.json(
        { error: "Provide at least a search query (q) or model number (model)" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { data: recalls, error } = await supabase
      .from("active_recalls")
      .select("*");

    if (error) {
      console.error("Failed to fetch recalls:", error);
      return NextResponse.json(
        { error: "Failed to search recalls" },
        { status: 500 }
      );
    }

    const results = lookupProduct(
      { query: q, model_number: model || undefined },
      (recalls ?? []) as ActiveRecall[]
    );

    return NextResponse.json({
      query: q,
      model: model || null,
      total_results: results.length,
      results: results.map((r) => ({
        recall_id: r.recall.id,
        agency: r.recall.agency_source,
        agency_id: r.recall.agency_id,
        title: r.recall.title,
        description: r.recall.description,
        affected_models: r.recall.affected_models,
        recall_date: r.recall.recall_date,
        remedy_url: r.recall.remedy_url,
        score: Math.round(r.score * 100) / 100,
        confidence: r.confidence,
        match_type: r.match_type,
      })),
    });
  } catch (error) {
    console.error("Lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
