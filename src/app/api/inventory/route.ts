import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProductCategory } from "@/types/database";

const VALID_CATEGORIES: ProductCategory[] = [
  "Baby",
  "Food",
  "Electronics",
  "Toys",
  "Home",
  "Auto",
  "Other",
];

/**
 * POST /api/inventory
 *
 * Manually add a product to the user's inventory.
 * Requires authentication.
 *
 * Body: { brand: string, product_name: string, model_number?: string, category: ProductCategory }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { brand, product_name, model_number, category } = body;

    if (!brand || typeof brand !== "string" || brand.trim().length === 0) {
      return NextResponse.json(
        { error: "Brand is required" },
        { status: 400 }
      );
    }

    if (
      !product_name ||
      typeof product_name !== "string" ||
      product_name.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("user_inventory")
      .insert({
        user_id: user.id,
        brand: brand.trim(),
        product_name: product_name.trim(),
        model_number: model_number?.trim() || null,
        category,
        source_email_id: null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add inventory item:", error);
      return NextResponse.json(
        { error: "Failed to add product" },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    console.error("Inventory add error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
