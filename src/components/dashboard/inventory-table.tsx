import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryItem } from "@/types/database";
import { Package, ShoppingBag } from "lucide-react";

interface InventoryTableProps {
  items: InventoryItem[];
}

const categoryColors: Record<string, string> = {
  Baby: "bg-pink-100 text-pink-800",
  Food: "bg-green-100 text-green-800",
  Electronics: "bg-blue-100 text-blue-800",
  Toys: "bg-purple-100 text-purple-800",
  Home: "bg-amber-100 text-amber-800",
  Auto: "bg-slate-100 text-slate-800",
  Other: "bg-gray-100 text-gray-800",
};

export function InventoryTable({ items }: InventoryTableProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No products yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Forward your purchase receipts to your SafeGuard email alias to
            automatically track your products.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Your Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium hidden sm:table-cell">Model #</th>
                <th className="pb-3 font-medium hidden md:table-cell">Category</th>
                <th className="pb-3 font-medium hidden lg:table-cell">Purchased</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-3">
                    <div>
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">{item.brand}</p>
                    </div>
                  </td>
                  <td className="py-3 hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground font-mono">
                      {item.model_number || "—"}
                    </span>
                  </td>
                  <td className="py-3 hidden md:table-cell">
                    <Badge
                      className={categoryColors[item.category] || categoryColors.Other}
                      variant="secondary"
                    >
                      {item.category}
                    </Badge>
                  </td>
                  <td className="py-3 hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {item.purchase_date
                        ? new Date(item.purchase_date).toLocaleDateString()
                        : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
