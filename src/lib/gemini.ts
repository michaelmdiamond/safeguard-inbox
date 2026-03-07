import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ParsedProduct } from "@/types/database";

const RECEIPT_PARSING_PROMPT = `Act as a specialized retail data extractor. Analyze the following HTML email receipt. Extract a JSON array of physical products purchased.

Requirements:
1. Ignore digital services, shipping, and taxes.
2. For each item, identify: brand, product_name, model_number (if visible), and category.
3. Categories must be one of: "Baby", "Food", "Electronics", "Toys", "Home", "Auto", "Other".
4. Scrub all PII (names, addresses, prices).
5. If model_number is not visible, set it to null.
6. Return ONLY valid JSON — no markdown, no explanation.

Example output format:
[
  {
    "brand": "Fisher-Price",
    "product_name": "Rock 'n Play Sleeper",
    "model_number": "FHW27",
    "category": "Baby"
  }
]

Email receipt content:
`;

export async function parseReceipt(
  emailContent: string
): Promise<ParsedProduct[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent(
    RECEIPT_PARSING_PROMPT + emailContent
  );
  const response = result.response;
  const text = response.text();

  // Extract JSON from the response (handle potential markdown code blocks)
  let jsonString = text.trim();
  if (jsonString.startsWith("```")) {
    jsonString = jsonString.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed: ParsedProduct[] = JSON.parse(jsonString);

  // Validate each product has required fields
  return parsed.filter(
    (p) =>
      typeof p.brand === "string" &&
      typeof p.product_name === "string" &&
      p.brand.length > 0 &&
      p.product_name.length > 0
  );
}
