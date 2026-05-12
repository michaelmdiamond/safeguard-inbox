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
import { Inbox, Copy, Check } from "lucide-react";

interface AliasCardProps {
  alias: string;
  domain: string;
}

export function AliasCard({ alias, domain }: AliasCardProps) {
  const [copied, setCopied] = useState(false);
  const fullAlias = `${alias}@${domain}`;

  function handleCopy() {
    navigator.clipboard.writeText(fullAlias);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          Your SafeGuard Email Alias
        </CardTitle>
        <CardDescription>
          Forward purchase receipts to this address to automatically track your
          products.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-lg border border-primary/20 bg-white px-4 py-3 font-mono text-sm sm:text-base">
            {fullAlias}
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
  );
}
