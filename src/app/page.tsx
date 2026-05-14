export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  Shield,
  Mail,
  Cpu,
  Bell,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Search,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";

interface RecentRecall {
  id: string;
  agency_source: string;
  title: string;
  recall_date: string;
  remedy_url: string | null;
}

async function getRecentRecalls(): Promise<RecentRecall[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return [];

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("active_recalls")
      .select("id, agency_source, title, recall_date, remedy_url")
      .order("recall_date", { ascending: false })
      .limit(6);

    if (error || !data) return [];
    return data as RecentRecall[];
  } catch {
    return [];
  }
}

async function getRecallCount(): Promise<number> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return 0;

    const supabase = createClient(url, key);
    const { count, error } = await supabase
      .from("active_recalls")
      .select("*", { count: "exact", head: true });

    if (error || count === null) return 0;
    return count;
  } catch {
    return 0;
  }
}

const agencyColors: Record<string, string> = {
  CPSC: "bg-blue-100 text-blue-800",
  FDA: "bg-green-100 text-green-800",
  USDA: "bg-amber-100 text-amber-800",
  NHTSA: "bg-purple-100 text-purple-800",
};

export default async function LandingPage() {
  const [recentRecalls, recallCount] = await Promise.all([
    getRecentRecalls(),
    getRecallCount(),
  ]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">SafeGuard Inbox</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/lookup"
              className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              Product Lookup
            </Link>
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
          {/* Mobile nav */}
          <MobileNav />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-amber-50/30" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              Protecting families from recalled products
            </div>
            <h1 className="animate-fade-in-up delay-100 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your Family&apos;s{" "}
              <span className="text-primary">Safety Hub</span>
              {" "}for Product Recalls
            </h1>
            <p className="animate-fade-in-up delay-200 mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Forward your purchase receipts. Our AI automatically tracks your
              products and alerts you instantly if any are recalled by CPSC, FDA,
              USDA, or NHTSA.
            </p>
            <div className="animate-fade-in-up delay-300 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors sm:w-auto"
              >
                Start Protecting Your Family
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/lookup"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border px-8 text-base font-medium text-foreground hover:bg-accent transition-colors sm:w-auto"
              >
                <Search className="h-4 w-4" />
                Check a Product Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8 px-4 py-6 sm:gap-12">
          {recallCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">{recallCount.toLocaleString()}</span>
              <span className="text-muted-foreground">recalls tracked</span>
            </div>
          )}
          {[
            { label: "CPSC", desc: "Consumer Goods" },
            { label: "FDA", desc: "Food & Drug" },
            { label: "USDA", desc: "Agriculture" },
            { label: "NHTSA", desc: "Auto Safety" },
          ].map((agency) => (
            <div key={agency.label} className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="font-semibold">{agency.label}</span>
              <span className="text-muted-foreground hidden sm:inline">{agency.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three simple steps to automatic product safety monitoring.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: Mail,
                step: "1",
                title: "Forward Receipts",
                description:
                  "Forward your purchase confirmation emails to your unique SafeGuard address. Set up auto-forwarding for zero effort.",
              },
              {
                icon: Cpu,
                step: "2",
                title: "AI Extracts Products",
                description:
                  "Our AI (powered by Gemini 1.5 Flash) parses receipts, identifies products, and adds them to your monitored inventory.",
              },
              {
                icon: Bell,
                step: "3",
                title: "Get Instant Alerts",
                description:
                  "We continuously cross-reference your products against government recall databases. You get notified the moment a match is found.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="relative rounded-xl border border-border bg-card p-8 text-center"
                >
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Recalls — live from DB */}
      {recentRecalls.length > 0 && (
        <section className="border-t border-border bg-muted/10 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Latest Recalls
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Recently issued recalls we&apos;re actively monitoring.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentRecalls.map((recall) => (
                <div
                  key={recall.id}
                  className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        agencyColors[recall.agency_source] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {recall.agency_source}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {recall.recall_date
                        ? new Date(recall.recall_date).toLocaleDateString()
                        : "Recent"}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                    {recall.title}
                  </h3>
                  {recall.remedy_url && (
                    <a
                      href={recall.remedy_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Details
                    </a>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/lookup"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-6 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <Search className="h-4 w-4" />
                Search All Recalls
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="border-t border-border bg-muted/20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built for Parents Who Care
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Every feature designed with family safety in mind.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Shield,
                title: "Multi-Agency Coverage",
                description:
                  "We monitor CPSC, FDA, USDA, and NHTSA — covering everything from baby gear to food to car seats.",
              },
              {
                icon: Cpu,
                title: "AI-Powered Parsing",
                description:
                  "Gemini 1.5 Flash extracts product details from any receipt format. No manual data entry needed.",
              },
              {
                icon: AlertTriangle,
                title: "Smart Matching",
                description:
                  "Fuzzy matching via Levenshtein distance and semantic similarity catches recalls even with imprecise data.",
              },
              {
                icon: Bell,
                title: "Instant Notifications",
                description:
                  "Get email alerts and dashboard warnings the moment a match is detected. High-severity matches auto-alert.",
              },
              {
                icon: ShieldCheck,
                title: "Privacy First",
                description:
                  "All PII is scrubbed during processing. We never store your name, address, or payment information.",
              },
              {
                icon: CheckCircle,
                title: "Confirm or Dismiss",
                description:
                  "Review potential matches and confirm or dismiss them. You're always in control of your alerts.",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-blue-700 px-8 py-16 text-center text-white sm:px-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Start Protecting Your Family Today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
              Sign up in 30 seconds. Forward your first receipt. Let SafeGuard
              handle the rest.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-8 text-base font-semibold text-primary hover:bg-blue-50 transition-colors"
            >
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">SafeGuard Inbox</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Keeping families safe, one receipt at a time.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <Link href="/lookup" className="text-muted-foreground hover:text-foreground transition-colors">
                Product Lookup
              </Link>
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="text-muted-foreground hover:text-foreground transition-colors">
                Get Started
              </Link>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} SafeGuard Inbox. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
