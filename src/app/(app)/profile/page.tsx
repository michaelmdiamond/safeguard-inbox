"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Copy,
  Check,
  Shield,
  ArrowRight,
  Inbox,
  Cpu,
  Bell,
} from "lucide-react";

export default function ProfilePage() {
  const [copied, setCopied] = useState(false);

  // In production this would come from the authenticated user's UUID
  const userAlias = "user.abc123@safeguard.io";

  function handleCopy() {
    navigator.clipboard.writeText(userAlias);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account and email forwarding settings.
        </p>
      </div>

      {/* Email Alias Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            Your SafeGuard Email Alias
          </CardTitle>
          <CardDescription>
            Forward purchase receipts to this address to automatically track your products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-lg border border-primary/20 bg-white px-4 py-3 font-mono text-sm sm:text-base">
              {userAlias}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            This address is unique to your account. Only receipts sent here will
            be processed.
          </p>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            SafeGuard Inbox monitors your purchases automatically in 4 simple steps.
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

      {/* Email Forwarding Setup */}
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

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Recall Data Sources</CardTitle>
          <CardDescription>
            We monitor these government agencies for recall notices daily.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
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
            ].map((agency) => (
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
