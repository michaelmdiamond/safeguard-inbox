import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type { InventoryItem, UserAlert } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: inventory }, { data: alerts }] = await Promise.all([
    supabase
      .from("user_inventory")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_alerts")
      .select("*, inventory_item:user_inventory(*), recall:active_recalls(*)")
      .eq("user_id", user!.id)
      .neq("status", "dismissed")
      .order("match_score", { ascending: false }),
  ]);

  return (
    <DashboardClient
      initialInventory={(inventory ?? []) as InventoryItem[]}
      initialAlerts={(alerts ?? []) as UserAlert[]}
    />
  );
}
