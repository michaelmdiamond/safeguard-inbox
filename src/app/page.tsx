import Link from "next/link";
import {
  Shield,
  Mail,
  Cpu,
  Bell,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">SafeGuard Inbox</span>
          </div>
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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-amber-50/30" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              Protecting families from recalled products
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your Family&apos;s{" "}
              <span className="text-primary">Safety Hub</span>
              {" "}for Product Recalls
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Forward your purchase receipts. Our AI automatically tracks your
              products and alerts you instantly if any are recalled by CPSC, FDA,
              USDA, or NHTSA.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors sm:w-auto"
              >
                Start Protecting Your Family
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-border px-8 text-base font-medium text-foreground hover:bg-accent transition-colors sm:w-auto"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8 px-4 py-6 sm:gap-12">
          {[
            { label: "CPSC", desc: "Consumer Goods" },
            { label: "FDA", desc: "Food & Drug" },
            { label: "USDA", desc: "Agriculture" },
            { label: "NHTSA", desc: "Auto Safety" },
          ].map((agency) => (
            <div key={agency.label} className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="font-semibold">{agency.label}</span>
              <span className="text-muted-foreground">{agency.desc}</span>
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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">SafeGuard Inbox</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Keeping families safe, one receipt at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
