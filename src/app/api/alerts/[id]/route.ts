import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/alerts/:id
 *
 * Update the status of an alert (confirm or dismiss).
 * Requires authentication — RLS ensures users can only update their own alerts.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !["confirmed", "dismissed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'confirmed' or 'dismissed'." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("user_alerts")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update alert:", error);
      return NextResponse.json(
        { error: "Failed to update alert" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ alert: data });
  } catch (error) {
    console.error("Alert update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
