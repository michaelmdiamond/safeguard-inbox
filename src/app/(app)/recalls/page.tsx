"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockRecalls } from "@/lib/mock-data";
import type { RecallAgency } from "@/types/database";
import {
  Search,
  ExternalLink,
  AlertTriangle,
  Calendar,
  Filter,
} from "lucide-react";

const agencyVariants: Record<string, "cpsc" | "fda" | "usda" | "nhtsa"> = {
  CPSC: "cpsc",
  FDA: "fda",
  USDA: "usda",
  NHTSA: "nhtsa",
};

const agencies: RecallAgency[] = ["CPSC", "FDA", "USDA", "NHTSA"];

export default function RecallsPage() {
  const [search, setSearch] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<RecallAgency | "all">("all");

  const filteredRecalls = useMemo(() => {
    return mockRecalls.filter((recall) => {
      const matchesSearch =
        search === "" ||
        recall.title.toLowerCase().includes(search.toLowerCase()) ||
        recall.description?.toLowerCase().includes(search.toLowerCase()) ||
        recall.affected_models.some((m) =>
          m.toLowerCase().includes(search.toLowerCase())
        );

      const matchesAgency =
        selectedAgency === "all" || recall.agency_source === selectedAgency;

      return matchesSearch && matchesAgency;
    });
  }, [search, selectedAgency]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Active Recalls</h1>
        <p className="text-muted-foreground">
          Browse the latest product recalls from government agencies.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search recalls by product, brand, or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={selectedAgency === "all" ? "default" : "outline"}
              onClick={() => setSelectedAgency("all")}
            >
              All
            </Button>
            {agencies.map((agency) => (
              <Button
                key={agency}
                size="sm"
                variant={selectedAgency === agency ? "default" : "outline"}
                onClick={() => setSelectedAgency(agency)}
              >
                {agency}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredRecalls.length} recall{filteredRecalls.length !== 1 ? "s" : ""}
      </p>

      {/* Recall Cards */}
      <div className="space-y-4">
        {filteredRecalls.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No recalls found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRecalls.map((recall) => (
            <Card key={recall.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={agencyVariants[recall.agency_source]}>
                        {recall.agency_source}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {recall.agency_id}
                      </span>
                    </div>
                    <CardTitle className="text-base">{recall.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="text-sm">
                  {recall.description}
                </CardDescription>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {recall.recall_date
                      ? new Date(recall.recall_date).toLocaleDateString()
                      : "Date unknown"}
                  </div>
                </div>

                {recall.affected_models.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      Affected Models
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {recall.affected_models.map((model) => (
                        <Badge key={model} variant="outline" className="font-mono text-xs">
                          {model}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {recall.remedy_url && (
                  <a
                    href={recall.remedy_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Full Recall Notice
                  </a>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
