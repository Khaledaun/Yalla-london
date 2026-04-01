/**
 * Zenitha Yachts Articles — Index file
 * Combines all 4 batches into a single export for the seed route.
 *
 * Batch 1 (1-5):   Destination guides — COMPLETE (full content)
 * Batch 2 (6-10):  Destination + charter guides — 6-8 COMPLETE, 9-10 PLACEHOLDER
 * Batch 3 (11-15): Charter knowledge guides — ALL PLACEHOLDER
 * Batch 4 (16-20): Practical charter guides — ALL PLACEHOLDER
 */

export type { ZenithaArticle } from "./zenitha-articles-batch1";

import { BATCH1_ARTICLES } from "./zenitha-articles-batch1";
import { BATCH2_ARTICLES } from "./zenitha-articles-batch2";
import { BATCH3_ARTICLES } from "./zenitha-articles-batch3";
import { BATCH4_ARTICLES } from "./zenitha-articles-batch4";

export const ALL_ZENITHA_ARTICLES = [
  ...BATCH1_ARTICLES,
  ...BATCH2_ARTICLES,
  ...BATCH3_ARTICLES,
  ...BATCH4_ARTICLES,
];

export { BATCH1_ARTICLES, BATCH2_ARTICLES, BATCH3_ARTICLES, BATCH4_ARTICLES };
