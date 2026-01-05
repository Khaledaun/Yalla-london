/**
 * Comparisons Domain Module
 *
 * Resort comparison engine for Arabaldives.
 */

// Types
export * from './types';

// Service functions
export {
  // Queries
  listComparisons,
  getPublishedComparisons,
  getComparisonBySlug,
  getComparisonById,
  getFeaturedComparisons,
  // Mutations
  createComparison,
  updateComparison,
  deleteComparison,
  publishComparison,
  // Resort management
  addResortToComparison,
  updateComparisonResort,
  removeResortFromComparison,
  reorderComparisonResorts,
  // Table builder
  buildComparisonTable,
  // Verdicts
  calculateVerdicts,
  applyVerdicts,
} from './service';
