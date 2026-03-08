"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Search,
  AlertTriangle,
  Calendar,
  ExternalLink,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConfidenceLevel } from "@/types/database";

interface LookupResult {
  recall_id: string;
  agency: string;
  agency_id: string;
  title: string;
  description: string | null;
  affected_models: string[];
  recall_date: string;
  remedy_url: string | null;
  score: number;
  confidence: ConfidenceLevel;
  match_type: string;
}

const agencyVariants: Record<string, "cpsc" | "fda" | "usda" | "nhtsa"> = {
  CPSC: "cpsc",
  FDA: "fda",
  USDA: "usda",
  NHTSA: "nhtsa",
};

const confidenceConfig: Record<
  ConfidenceLevel,
  { label: string; variant: "destructive" | "warning" | "secondary"; icon: typeof ShieldCheck }
> = {
  high: { label: "High Confidence", variant: "destructive", icon: ShieldAlert },
  medium: { label: "Medium Confidence", variant: "warning", icon: ShieldQuestion },
  low: { label: "Low Confidence", variant: "secondary", icon: ShieldQuestion },
};

export default function LookupPage() {
  const [query, setQuery] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [results, setResults] = useState<LookupResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim() && !modelNumber.trim()) return;

      setLoading(true);
      setError(null);
      setSearched(true);

      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (modelNumber.trim()) params.set("model", modelNumber.trim());

        const res = await fetch(`/api/lookup?${params.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Search failed");
        }

        const data = await res.json();
        setResults(data.results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [query, modelNumber]
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">SafeGuard Inbox</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Product Recall Lookup
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Check if a product has been recalled. Search by brand, product name,
            or model number — no account required.
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="query">Product Name or Brand</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="query"
                    placeholder='e.g. "Fisher-Price Rock n Play" or "Similac formula"'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">
                  Model Number{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="model"
                  placeholder='e.g. "FHW27" or "803.092.37"'
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={loading || (!query.trim() && !modelNumber.trim())}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search Recalls
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="mb-6 border-destructive/50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {searched && results !== null && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {results.length === 0
                ? "No matching recalls found."
                : `Found ${results.length} potential recall${results.length !== 1 ? "s" : ""} matching your product.`}
            </p>

            {results.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShieldCheck className="h-12 w-12 text-success mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No recalls found</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    We didn&apos;t find any matching recalls in our database. This doesn&apos;t
                    guarantee your product is safe — sign up to get ongoing monitoring.
                  </p>
                  <Link
                    href="/signup"
                    className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Sign Up for Monitoring
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <>
                {results.map((result) => {
                  const conf = confidenceConfig[result.confidence];
                  const ConfIcon = conf.icon;
                  return (
                    <Card key={result.recall_id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={agencyVariants[result.agency]}>
                                {result.agency}
                              </Badge>
                              <Badge variant={conf.variant} className="gap-1">
                                <ConfIcon className="h-3 w-3" />
                                {conf.label} — {Math.round(result.score * 100)}%
                              </Badge>
                            </div>
                            <CardTitle className="text-base">
                              {result.title}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {result.description && (
                          <CardDescription className="text-sm">
                            {result.description}
                          </CardDescription>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {result.recall_date
                              ? new Date(result.recall_date).toLocaleDateString()
                              : "Date unknown"}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {result.agency_id}
                          </span>
                        </div>

                        {result.affected_models.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              Affected Models
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {result.affected_models.map((model) => (
                                <Badge
                                  key={model}
                                  variant="outline"
                                  className="font-mono text-xs"
                                >
                                  {model}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.remedy_url && (
                          <a
                            href={result.remedy_url}
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
                  );
                })}

                {/* Upsell */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="flex flex-col items-center py-8 text-center">
                    <Shield className="h-8 w-8 text-primary mb-3" />
                    <h3 className="text-lg font-semibold">
                      Want automatic monitoring?
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground max-w-md">
                      Sign up and forward your receipts — we&apos;ll automatically
                      track all your products and alert you the moment a new recall
                      is issued.
                    </p>
                    <Link
                      href="/signup"
                      className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Create Free Account
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
