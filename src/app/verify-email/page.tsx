export const dynamic = "force-dynamic";

import Link from "next/link";
import { Shield, Mail, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>
            We&apos;ve sent a confirmation link to your email address. Click the
            link to verify your account and get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">What happens next?</p>
                <ul className="mt-2 space-y-1">
                  <li>1. Open the email from SafeGuard Inbox</li>
                  <li>2. Click the confirmation link</li>
                  <li>3. You&apos;ll be redirected to your dashboard</li>
                </ul>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Didn&apos;t receive an email? Check your spam folder or{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              try again
            </Link>
            .
          </p>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
