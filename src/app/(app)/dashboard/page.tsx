"use client";

import { useState } from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { AlertCard } from "@/components/dashboard/alert-card";
import { InventoryTable } from "@/components/dashboard/inventory-table";
import { mockInventory, mockAlerts } from "@/lib/mock-data";
import {
  Package,
  AlertTriangle,
  ShieldCheck,
  Mail,
} from "lucide-react";
import type { UserAlert } from "@/types/database";

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<UserAlert[]>(mockAlerts);
  const inventory = mockInventory;

  const activeAlerts = alerts.filter((a) => a.status === "new");
  const highAlerts = alerts.filter(
    (a) => a.severity === "high" && a.status !== "dismissed"
  );

  function handleConfirm(id: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "confirmed" } : a))
    );
  }

  function handleDismiss(id: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "dismissed" } : a))
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your products and stay safe from recalls.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Tracked Products"
          value={inventory.length}
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
          value={inventory.length - activeAlerts.length}
          description="No recalls found"
          icon={ShieldCheck}
          trend="down"
        />
        <StatsCard
          title="Receipts Processed"
          value={inventory.length}
          description="Auto-parsed by AI"
          icon={Mail}
          trend="neutral"
        />
      </div>

      {/* Recall Alerts */}
      {alerts.filter((a) => a.status !== "dismissed").length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Recall Alerts
          </h2>
          <div className="space-y-3">
            {alerts
              .filter((a) => a.status !== "dismissed")
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

      {/* Inventory */}
      <InventoryTable items={inventory} />
    </div>
  );
}
