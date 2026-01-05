/**
 * Team & Expertise System
 *
 * Exports all team-related functionality.
 *
 * Usage:
 *   import { TeamService, SkillService } from '@/lib/domains/team';
 *   import type { TeamMemberWithExpertise, SkillCategory } from '@/lib/domains/team';
 */

// Services
export {
  TeamService,
  SkillService,
  ExpertiseService,
  ContentCreditService,
} from './service';

// Query functions (for direct use when needed)
export {
  findTeamMembers,
  findTeamMemberBySlug,
  findTeamMemberById,
  findFeaturedTeamMembers,
  findSkills,
  findSkillBySlug,
  findSkillById,
  findSkillsByCategory,
  findContentCredits,
} from './service';

// Types
export type {
  TeamMemberWithExpertise,
  TeamMemberWithCredits,
  TeamMemberFull,
  SkillWithCount,
  TeamMemberFilters,
  SkillFilters,
  TeamMemberListResult,
  SkillListResult,
  CreateTeamMemberInput,
  UpdateTeamMemberInput,
  CreateSkillInput,
  UpdateSkillInput,
  AssignExpertiseInput,
  UpdateExpertiseInput,
  AssignCreditInput,
  TeamMemberPublicProfile,
} from './types';

// Enums
export {
  SkillCategory,
  Proficiency,
  CreditRole,
} from './types';
