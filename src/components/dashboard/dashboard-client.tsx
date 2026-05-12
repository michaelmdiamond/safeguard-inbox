"use client";

import { useState } from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { AlertCard } from "@/components/dashboard/alert-card";
import { InventoryTable } from "@/components/dashboard/inventory-table";
import { AddProductDialog } from "@/components/dashboard/add-product-dialog";
import { Package, AlertTriangle, ShieldCheck, Mail } from "lucide-react";
import type { InventoryItem, UserAlert } from "@/types/database";

interface DashboardClientProps {
  initialInventory: InventoryItem[];
  initialAlerts: UserAlert[];
}

export function DashboardClient({
  initialInventory,
  initialAlerts,
}: DashboardClientProps) {
  const [alerts, setAlerts] = useState<UserAlert[]>(initialAlerts);

  const activeAlerts = alerts.filter((a) => a.status === "new");
  const highAlerts = alerts.filter(
    (a) => a.severity === "high" && a.status !== "dismissed"
  );
  const visibleAlerts = alerts.filter((a) => a.status !== "dismissed");

  async function handleConfirm(id: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "confirmed" } : a))
    );
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert on failure
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "new" } : a))
      );
    }
  }

  async function handleDismiss(id: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "dismissed" } : a))
    );
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "new" } : a))
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your products and stay safe from recalls.
          </p>
        </div>
        <AddProductDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Tracked Products"
          value={initialInventory.length}
          description="From email receipts"
          icon={Package}
          trend="neutral"
        />
        <StatsCard
          title="Active Alerts"
          value={activeAlerts.length}
          description={
            highAlerts.length > 0
              ? `${highAlerts.length} high severity`
              : "All clear"
          }
          icon={AlertTriangle}
          trend={highAlerts.length > 0 ? "up" : "neutral"}
        />
        <StatsCard
          title="Safe Products"
          value={initialInventory.length - activeAlerts.length}
          description="No recalls found"
          icon={ShieldCheck}
          trend="down"
        />
        <StatsCard
          title="Receipts Processed"
          value={initialInventory.length}
          description="Auto-parsed by AI"
          icon={Mail}
          trend="neutral"
        />
      </div>

      {visibleAlerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Recall Alerts
          </h2>
          <div className="space-y-3">
            {visibleAlerts
              .sort((a, b) => b.match_score - a.match_score)
              .map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onConfirm={handleConfirm}
                  onDismiss={handleDismiss}
                />
              ))}
          </div>
        </div>
      )}

      <InventoryTable items={initialInventory} />
    </div>
  );
}
