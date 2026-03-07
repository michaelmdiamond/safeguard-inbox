import { distance } from "fastest-levenshtein";
import type { InventoryItem, ActiveRecall, MatchResult } from "@/types/database";

const AUTO_ALERT_THRESHOLD = 0.85;
const REVIEW_THRESHOLD = 0.65;

/**
 * Calculate normalized Levenshtein similarity between two strings.
 * Returns a score between 0 and 1, where 1 is an exact match.
 */
function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - distance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

/**
 * Check if a product's model number matches any of the recall's affected models.
 * Uses Levenshtein distance for fuzzy matching.
 */
function matchModelNumber(
  modelNumber: string | null,
  affectedModels: string[]
): number {
  if (!modelNumber || affectedModels.length === 0) return 0;

  let bestScore = 0;
  for (const affected of affectedModels) {
    const score = levenshteinSimilarity(modelNumber, affected);
    if (score > bestScore) {
      bestScore = score;
    }
  }
  return bestScore;
}

/**
 * Calculate a simple text similarity score between product info and recall info.
 * This is used when vector similarity (pgvector) is not available.
 */
function textSimilarity(
  item: InventoryItem,
  recall: ActiveRecall
): number {
  const itemText = `${item.brand} ${item.product_name}`.toLowerCase();
  const recallText = `${recall.title} ${recall.description || ""}`.toLowerCase();

  // Check for brand name presence
  const brandInRecall = recallText.includes(item.brand.toLowerCase()) ? 0.3 : 0;

  // Check for product name word overlap
  const itemWords = itemText.split(/\s+/).filter((w) => w.length > 2);
  const recallWords = new Set(recallText.split(/\s+/));
  const matchingWords = itemWords.filter((w) => recallWords.has(w));
  const wordOverlap =
    itemWords.length > 0 ? (matchingWords.length / itemWords.length) * 0.4 : 0;

  // Check affected models text matching
  const modelTextScore = recall.affected_models.some((m) =>
    itemText.includes(m.toLowerCase())
  )
    ? 0.3
    : 0;

  return Math.min(brandInRecall + wordOverlap + modelTextScore, 1);
}

/**
 * Match an inventory item against all active recalls.
 * Returns matches above the review threshold, sorted by score.
 */
export function matchItemAgainstRecalls(
  item: InventoryItem,
  recalls: ActiveRecall[]
): MatchResult[] {
  const matches: MatchResult[] = [];

  for (const recall of recalls) {
    const modelScore = matchModelNumber(item.model_number, recall.affected_models);
    const semanticScore = textSimilarity(item, recall);

    // Combined score: weight model number match higher when available
    let finalScore: number;
    let matchType: MatchResult["match_type"];

    if (modelScore > 0.8) {
      // Strong model number match — this is highly reliable
      finalScore = modelScore * 0.7 + semanticScore * 0.3;
      matchType = "model_number";
    } else if (modelScore > 0) {
      // Partial model match + semantic
      finalScore = modelScore * 0.5 + semanticScore * 0.5;
      matchType = "combined";
    } else {
      // Semantic only
      finalScore = semanticScore;
      matchType = "semantic";
    }

    if (finalScore >= REVIEW_THRESHOLD) {
      matches.push({
        recall,
        score: finalScore,
        match_type: matchType,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Determine alert severity based on match score.
 */
export function getSeverity(score: number): "high" | "medium" | "low" {
  if (score >= AUTO_ALERT_THRESHOLD) return "high";
  if (score >= REVIEW_THRESHOLD) return "medium";
  return "low";
}

export { AUTO_ALERT_THRESHOLD, REVIEW_THRESHOLD };
