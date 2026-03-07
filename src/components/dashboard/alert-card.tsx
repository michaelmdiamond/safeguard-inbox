import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserAlert } from "@/types/database";
import { AlertTriangle, ExternalLink, CheckCircle, XCircle } from "lucide-react";

interface AlertCardProps {
  alert: UserAlert;
  onConfirm?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function AlertCard({ alert, onConfirm, onDismiss }: AlertCardProps) {
  const isHigh = alert.severity === "high";
  const matchPercent = Math.round(alert.match_score * 100);

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        isHigh && "border-destructive/50",
        alert.severity === "medium" && "border-warning/50"
      )}
    >
      {/* Severity stripe */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1",
          isHigh ? "bg-destructive" : "bg-warning"
        )}
      />

      <CardHeader className="pb-3 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                "h-5 w-5 shrink-0",
                isHigh ? "text-destructive" : "text-warning"
              )}
            />
            <CardTitle className="text-base leading-tight">
              {alert.recall?.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={isHigh ? "destructive" : "warning"}>
              {matchPercent}% match
            </Badge>
            {alert.status === "confirmed" && (
              <Badge variant="secondary">Confirmed</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pl-5 space-y-3">
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Your Product
          </p>
          <p className="text-sm font-medium">
            {alert.inventory_item?.brand} {alert.inventory_item?.product_name}
            {alert.inventory_item?.model_number && (
              <span className="text-muted-foreground">
                {" "}
                ({alert.inventory_item.model_number})
              </span>
            )}
          </p>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {alert.recall?.description}
        </p>

        <div className="flex items-center gap-2 pt-1">
          {alert.status === "new" && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onConfirm?.(alert.id)}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Confirm Match
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDismiss?.(alert.id)}
              >
                <XCircle className="h-3.5 w-3.5" />
                Dismiss
              </Button>
            </>
          )}
          {alert.recall?.remedy_url && (
            <a
              href={alert.recall.remedy_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Recall Details
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
