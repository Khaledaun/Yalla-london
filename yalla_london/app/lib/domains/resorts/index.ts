/**
 * Resorts Domain Module
 *
 * Maldives resort management for Arabaldives.
 */

// Types
export * from './types';

// Service functions
export {
  // Queries
  listResorts,
  getResortBySlug,
  getResortById,
  getFeaturedResorts,
  getRelatedResorts,
  getStaleResorts,
  // Mutations
  createResort,
  updateResort,
  deleteResort,
  verifyResort,
  // Scoring
  calculateOverallScore,
  updateResortScore,
  // Transformations
  toPublicView,
  toCardView,
  // Bulk operations
  bulkImportResorts,
} from './service';
