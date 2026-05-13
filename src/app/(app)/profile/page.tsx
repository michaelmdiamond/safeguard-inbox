import { createClient } from "@/lib/supabase/server";
import { AliasCard } from "@/components/dashboard/alias-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Cpu, Shield, Bell, Mail } from "lucide-react";

const steps = [
  {
    icon: Mail,
    title: "Forward Your Receipts",
    description:
      "Set up auto-forwarding from your email, or manually forward purchase receipts to your unique SafeGuard alias.",
  },
  {
    icon: Cpu,
    title: "AI Extracts Products",
    description:
      "Our AI (Gemini 1.5 Flash) automatically parses the receipt, extracts product details, and adds them to your inventory.",
  },
  {
    icon: Shield,
    title: "Continuous Monitoring",
    description:
      "We check your products against real-time recall data from CPSC, FDA, USDA, and NHTSA every day.",
  },
  {
    icon: Bell,
    title: "Instant Alerts",
    description:
      "If a match is found, you'll get an immediate alert on your dashboard and an email notification.",
  },
];

const agencies = [
  {
    name: "CPSC",
    full: "Consumer Product Safety Commission",
    desc: "Consumer goods, furniture, toys",
    variant: "cpsc" as const,
  },
  {
    name: "FDA",
    full: "Food & Drug Administration",
    desc: "Food, formula, medications",
    variant: "fda" as const,
  },
  {
    name: "USDA",
    full: "U.S. Dept. of Agriculture",
    desc: "Meat, poultry, food products",
    variant: "usda" as const,
  },
  {
    name: "NHTSA",
    full: "National Highway Traffic Safety",
    desc: "Car seats, vehicles, auto parts",
    variant: "nhtsa" as const,
  },
  {
    name: "CDC",
    full: "Centers for Disease Control",
    desc: "Food outbreaks, Salmonella, allergens",
    variant: "secondary" as const,
  },
  {
    name: "HC",
    full: "Health Canada",
    desc: "Canadian recalls, cross-border products",
    variant: "secondary" as const,
  },
];

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: aliasRow } = await supabase
    .from("user_aliases")
    .select("alias")
    .eq("user_id", user!.id)
    .single();

  const domain =
    process.env.NEXT_PUBLIC_EMAIL_DOMAIN || "safeguard.io";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account and email forwarding settings.
        </p>
      </div>

      {aliasRow ? (
        <AliasCard alias={aliasRow.alias} domain={domain} />
      ) : (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Your email alias is being set up. Refresh the page in a moment.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            SafeGuard Inbox monitors your purchases automatically in 4 simple
            steps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        Step {i + 1}
                      </Badge>
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Set Up Auto-Forwarding</CardTitle>
          <CardDescription>
            Configure your email provider to automatically forward receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              provider: "Gmail",
              instructions:
                "Settings → Forwarding and POP/IMAP → Add a forwarding address → Create a filter for receipts.",
            },
            {
              provider: "Outlook",
              instructions:
                "Settings → Mail → Forwarding → Enable forwarding → Enter your SafeGuard alias.",
            },
            {
              provider: "Apple Mail",
              instructions:
                "Settings → Accounts → Forwarding → Add your SafeGuard alias as a forwarding destination.",
            },
          ].map((item) => (
            <div
              key={item.provider}
              className="flex items-start gap-3 rounded-lg border p-4"
            >
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">{item.provider}</p>
                <p className="text-sm text-muted-foreground">
                  {item.instructions}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recall Data Sources</CardTitle>
          <CardDescription>
            We monitor these government agencies for recall notices daily.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {agencies.map((agency) => (
              <div
                key={agency.name}
                className="flex items-center gap-3 rounded-lg border p-4"
              >
                <Badge variant={agency.variant}>{agency.name}</Badge>
                <div>
                  <p className="text-sm font-medium">{agency.full}</p>
                  <p className="text-xs text-muted-foreground">{agency.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
