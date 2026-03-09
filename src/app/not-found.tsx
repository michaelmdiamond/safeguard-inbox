import Link from "next/link";
import { Shield, Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="mt-2 text-xl font-semibold text-foreground">
          Page Not Found
        </h2>
        <p className="mt-3 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            href="/lookup"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-6 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Search className="h-4 w-4" />
            Search Recalls
          </Link>
        </div>
      </div>
    </div>
  );
}
