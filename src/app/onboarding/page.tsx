"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Package,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Step = "connect" | "scanning" | "complete" | "error";

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingFlow />
    </Suspense>
  );
}

function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("connect");
  const [productCount, setProductCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (error) {
      const messages: Record<string, string> = {
        gmail_denied: "Google sign-in was cancelled. You can try again or use email forwarding.",
        token_exchange: "Something went wrong connecting to Gmail. Please try again.",
        save_failed: "Failed to save your Gmail connection. Please try again.",
      };
      setErrorMessage(messages[error] ?? "An unexpected error occurred.");
      setStep("error");
    } else if (connected) {
      setStep("scanning");
    }
  }, [searchParams]);

  useEffect(() => {
    if (step !== "scanning") return;

    async function runScan() {
      try {
        const res = await fetch("/api/gmail/scan", { method: "POST" });
        const data = await res.json();
        setProductCount(data.products_saved ?? 0);
        setStep("complete");
      } catch {
        setErrorMessage("The inbox scan failed. Your Gmail is connected — you can rescan from your profile.");
        setStep("error");
      }
    }

    runScan();
  }, [step]);

  return (
    <Card className="w-full max-w-md">
      {step === "connect" && <ConnectStep />}
      {step === "scanning" && <ScanningStep />}
      {step === "complete" && (
        <CompleteStep
          productCount={productCount}
          onDashboard={() => router.push("/dashboard")}
        />
      )}
      {step === "error" && (
        <ErrorStep
          message={errorMessage!}
          onRetry={() => setStep("connect")}
          onSkip={() => router.push("/dashboard")}
        />
      )}
    </Card>
  );
}

function ConnectStep() {
  return (
    <>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Protect your household</CardTitle>
        <CardDescription>
          Connect your Gmail and we'll automatically scan your purchase history
          for any recalled products — no manual forwarding needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm text-muted-foreground">
          {[
            "Scans up to 2 years of purchase history",
            "Monitors new receipts automatically going forward",
            "Read-only access — we never send or delete emails",
          ].map((point) => (
            <div key={point} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{point}</span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Link
          href="/api/auth/gmail"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          <GoogleIcon />
          Connect Gmail
        </Link>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Use email forwarding instead
        </Link>
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:underline"
        >
          Skip for now
        </Link>
      </CardFooter>
    </>
  );
}

function ScanningStep() {
  return (
    <>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>
        <CardTitle className="text-2xl">Scanning your inbox…</CardTitle>
        <CardDescription>
          We're looking through your purchase history. This takes about 30
          seconds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            "Finding purchase receipts",
            "Extracting product details",
            "Checking against recall databases",
          ].map((label, i) => (
            <div
              key={label}
              className="flex items-center gap-3 text-sm text-muted-foreground"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {label}
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}

function CompleteStep({
  productCount,
  onDashboard,
}: {
  productCount: number;
  onDashboard: () => void;
}) {
  return (
    <>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <CardTitle className="text-2xl">You're protected!</CardTitle>
        <CardDescription>
          {productCount > 0
            ? `We found ${productCount} product${productCount === 1 ? "" : "s"} in your inbox and added them to your inventory.`
            : "Your Gmail is connected. We'll monitor new receipts automatically going forward."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {productCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
            <Package className="h-5 w-5 text-primary" />
            <div className="text-sm">
              <p className="font-medium">{productCount} items in inventory</p>
              <p className="text-muted-foreground">
                We'll alert you if any are recalled
              </p>
            </div>
          </div>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Want better coverage?{" "}
          <Link
            href="/api/auth/gmail"
            className="font-medium text-primary hover:underline"
          >
            Connect your partner's Gmail
          </Link>{" "}
          to monitor your whole household.
        </p>
      </CardContent>
      <CardFooter>
        <Button className="w-full" size="lg" onClick={onDashboard}>
          Go to Dashboard
        </Button>
      </CardFooter>
    </>
  );
}

function ErrorStep({
  message,
  onRetry,
  onSkip,
}: {
  message: string;
  onRetry: () => void;
  onSkip: () => void;
}) {
  return (
    <>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <CardTitle className="text-2xl">Something went wrong</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col gap-3">
        <Button className="w-full" onClick={onRetry}>
          Try again
        </Button>
        <Button variant="outline" className="w-full" onClick={onSkip}>
          Skip for now
        </Button>
      </CardFooter>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
