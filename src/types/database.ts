export type ProductCategory = "Baby" | "Food" | "Electronics" | "Toys" | "Home" | "Auto" | "Other";

export type RecallAgency = "CPSC" | "FDA" | "USDA" | "NHTSA";

export type AlertSeverity = "high" | "medium" | "low";
export type AlertStatus = "new" | "confirmed" | "dismissed";

export interface InventoryItem {
  id: string;
  user_id: string;
  brand: string;
  product_name: string;
  model_number: string | null;
  category: ProductCategory;
  purchase_date: string | null;
  source_email_id: string | null;
  created_at: string;
}

export interface ActiveRecall {
  id: string;
  agency_source: RecallAgency;
  agency_id: string;
  title: string;
  description: string | null;
  affected_models: string[];
  recall_date: string;
  remedy_url: string | null;
  embedding: number[] | null;
}

export interface UserAlert {
  id: string;
  user_id: string;
  inventory_item_id: string;
  recall_id: string;
  match_score: number;
  severity: AlertSeverity;
  status: AlertStatus;
  notified_at: string | null;
  created_at: string;
  // Joined fields
  inventory_item?: InventoryItem;
  recall?: ActiveRecall;
}

export interface ParsedProduct {
  brand: string;
  product_name: string;
  model_number: string | null;
  category: ProductCategory;
}

export interface MatchResult {
  recall: ActiveRecall;
  score: number;
  match_type: "model_number" | "semantic" | "combined";
}
