import { describe, it, expect } from "vitest";
import {
  matchItemAgainstRecalls,
  getSeverity,
  getConfidence,
  lookupProduct,
  AUTO_ALERT_THRESHOLD,
  REVIEW_THRESHOLD,
  LOOKUP_THRESHOLD,
} from "../matching";
import { mockInventory, mockRecalls } from "../mock-data";
import type { ActiveRecall, InventoryItem } from "@/types/database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecall(overrides: Partial<ActiveRecall> = {}): ActiveRecall {
  return {
    id: "test-recall",
    agency_source: "CPSC",
    agency_id: "TEST-001",
    title: "Test Recall",
    description: "A test recall description",
    affected_models: [],
    recall_date: "2026-01-01",
    remedy_url: null,
    embedding: null,
    ...overrides,
  };
}

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: "test-item",
    user_id: "user-1",
    brand: "TestBrand",
    product_name: "Test Product",
    model_number: null,
    category: "Other",
    purchase_date: null,
    source_email_id: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getSeverity
// ---------------------------------------------------------------------------

describe("getSeverity", () => {
  it("returns high for scores >= AUTO_ALERT_THRESHOLD", () => {
    expect(getSeverity(AUTO_ALERT_THRESHOLD)).toBe("high");
    expect(getSeverity(0.95)).toBe("high");
    expect(getSeverity(1.0)).toBe("high");
  });

  it("returns medium for scores >= REVIEW_THRESHOLD but < AUTO_ALERT", () => {
    expect(getSeverity(REVIEW_THRESHOLD)).toBe("medium");
    expect(getSeverity(0.75)).toBe("medium");
  });

  it("returns low for scores below REVIEW_THRESHOLD", () => {
    expect(getSeverity(0.5)).toBe("low");
    expect(getSeverity(0.0)).toBe("low");
  });
});

// ---------------------------------------------------------------------------
// getConfidence
// ---------------------------------------------------------------------------

describe("getConfidence", () => {
  it("returns high for scores >= 0.8", () => {
    expect(getConfidence(0.8)).toBe("high");
    expect(getConfidence(1.0)).toBe("high");
  });

  it("returns medium for scores >= 0.55 but < 0.8", () => {
    expect(getConfidence(0.55)).toBe("medium");
    expect(getConfidence(0.7)).toBe("medium");
  });

  it("returns low for scores < 0.55", () => {
    expect(getConfidence(0.4)).toBe("low");
    expect(getConfidence(0.0)).toBe("low");
  });
});

// ---------------------------------------------------------------------------
// matchItemAgainstRecalls
// ---------------------------------------------------------------------------

describe("matchItemAgainstRecalls", () => {
  it("finds exact model number match (Fisher-Price FHW27)", () => {
    const item = mockInventory[1]; // Fisher-Price Rock 'n Play, model FHW27
    const matches = matchItemAgainstRecalls(item, mockRecalls);

    expect(matches.length).toBeGreaterThan(0);

    const topMatch = matches[0];
    expect(topMatch.recall.id).toBe("rec-1"); // Fisher-Price recall
    expect(topMatch.match_type).toBe("model_number");
    expect(topMatch.score).toBeGreaterThanOrEqual(AUTO_ALERT_THRESHOLD);
  });

  it("finds exact model number match (IKEA 803.092.37)", () => {
    const item = mockInventory[3]; // IKEA KULLEN, model 803.092.37
    const matches = matchItemAgainstRecalls(item, mockRecalls);

    expect(matches.length).toBeGreaterThan(0);

    const topMatch = matches[0];
    expect(topMatch.recall.id).toBe("rec-3"); // IKEA KULLEN recall
    expect(topMatch.match_type).toBe("model_number");
    expect(topMatch.score).toBeGreaterThanOrEqual(AUTO_ALERT_THRESHOLD);
  });

  it("matches brand + product name semantically (Similac formula)", () => {
    const item = mockInventory[2]; // Similac Pro-Advance, no model number
    const matches = matchItemAgainstRecalls(item, mockRecalls);

    expect(matches.length).toBeGreaterThan(0);
    // Should find the Similac/Abbott formula recall
    const formulaMatch = matches.find((m) => m.recall.id === "rec-2");
    expect(formulaMatch).toBeDefined();
  });

  it("returns empty array when no recalls match", () => {
    const item = makeItem({
      brand: "NoMatchBrand",
      product_name: "Totally Unrelated Widget",
      model_number: "ZZZZZ",
    });
    const matches = matchItemAgainstRecalls(item, mockRecalls);
    expect(matches).toEqual([]);
  });

  it("returns results sorted by score descending", () => {
    const item = mockInventory[1]; // Fisher-Price
    const matches = matchItemAgainstRecalls(item, mockRecalls);

    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
    }
  });

  it("does not return matches below REVIEW_THRESHOLD", () => {
    const item = mockInventory[1];
    const matches = matchItemAgainstRecalls(item, mockRecalls);

    for (const match of matches) {
      expect(match.score).toBeGreaterThanOrEqual(REVIEW_THRESHOLD);
    }
  });

  it("handles item with null model number gracefully", () => {
    const item = makeItem({ model_number: null, brand: "Unknown", product_name: "Something" });
    const matches = matchItemAgainstRecalls(item, mockRecalls);
    // Should not throw; may or may not find matches
    expect(Array.isArray(matches)).toBe(true);
  });

  it("handles empty recalls list", () => {
    const item = mockInventory[0];
    const matches = matchItemAgainstRecalls(item, []);
    expect(matches).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// lookupProduct
// ---------------------------------------------------------------------------

describe("lookupProduct", () => {
  it("finds recalls by brand name", () => {
    const results = lookupProduct({ query: "Fisher-Price sleeper" }, mockRecalls);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].recall.id).toBe("rec-1");
    expect(results[0].confidence).toBeDefined();
  });

  it("finds recalls by model number", () => {
    const results = lookupProduct(
      { query: "baby sleeper", model_number: "FHW27" },
      mockRecalls
    );

    expect(results.length).toBeGreaterThan(0);
    const fpMatch = results.find((r) => r.recall.id === "rec-1");
    expect(fpMatch).toBeDefined();
    expect(fpMatch!.match_type).toBe("model_number");
  });

  it("finds IKEA recall by product name", () => {
    const results = lookupProduct({ query: "IKEA KULLEN dresser" }, mockRecalls);

    expect(results.length).toBeGreaterThan(0);
    const ikeaMatch = results.find((r) => r.recall.id === "rec-3");
    expect(ikeaMatch).toBeDefined();
  });

  it("finds recall by model number alone", () => {
    const results = lookupProduct(
      { query: "", model_number: "803.092.37" },
      mockRecalls
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].recall.id).toBe("rec-3");
  });

  it("returns empty for blank query and no model", () => {
    const results = lookupProduct({ query: "" }, mockRecalls);
    expect(results).toEqual([]);
  });

  it("returns empty for whitespace-only query", () => {
    const results = lookupProduct({ query: "   " }, mockRecalls);
    expect(results).toEqual([]);
  });

  it("returns results sorted by score descending", () => {
    const results = lookupProduct({ query: "recalled product" }, mockRecalls);

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("annotates each result with a valid confidence level", () => {
    const results = lookupProduct({ query: "Fisher-Price" }, mockRecalls);

    for (const r of results) {
      expect(["high", "medium", "low"]).toContain(r.confidence);
    }
  });

  it("does not return results below LOOKUP_THRESHOLD", () => {
    const results = lookupProduct({ query: "Fisher-Price" }, mockRecalls);

    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(LOOKUP_THRESHOLD);
    }
  });

  it("handles empty recalls list", () => {
    const results = lookupProduct({ query: "anything" }, []);
    expect(results).toEqual([]);
  });

  it("does not match completely unrelated queries", () => {
    const results = lookupProduct(
      { query: "quantum blockchain synergy" },
      mockRecalls
    );
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Threshold sanity checks
// ---------------------------------------------------------------------------

describe("thresholds", () => {
  it("LOOKUP_THRESHOLD < REVIEW_THRESHOLD < AUTO_ALERT_THRESHOLD", () => {
    expect(LOOKUP_THRESHOLD).toBeLessThan(REVIEW_THRESHOLD);
    expect(REVIEW_THRESHOLD).toBeLessThan(AUTO_ALERT_THRESHOLD);
  });

  it("all thresholds are between 0 and 1", () => {
    for (const t of [LOOKUP_THRESHOLD, REVIEW_THRESHOLD, AUTO_ALERT_THRESHOLD]) {
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThan(1);
    }
  });
});
