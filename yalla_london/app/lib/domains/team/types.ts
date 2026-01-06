/**
 * Team & Expertise System Types
 */

// Import enums as values (not type-only) so they can be re-exported
import { SkillCategory, Proficiency, CreditRole } from '@prisma/client';
import type {
  TeamMember,
  Skill,
  TeamMemberExpertise,
  ContentCredit,
} from '@prisma/client';

// Re-export enums for convenience
export { SkillCategory, Proficiency, CreditRole };
export type { ContentCredit };

// ============================================================================
// Team Member Types
// ============================================================================

export interface TeamMemberWithExpertise extends TeamMember {
  expertise: (TeamMemberExpertise & {
    skill: Skill;
  })[];
}

export interface TeamMemberWithCredits extends TeamMember {
  content_credits: ContentCredit[];
}

export interface TeamMemberFull extends TeamMember {
  expertise: (TeamMemberExpertise & {
    skill: Skill;
  })[];
  content_credits: ContentCredit[];
}

export interface CreateTeamMemberInput {
  site_id?: string | null;
  user_id?: string | null;
  name_en: string;
  name_ar?: string | null;
  slug: string;
  title_en: string;
  title_ar?: string | null;
  bio_en: string;
  bio_ar?: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  email_public?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  website_url?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  display_order?: number;
}

export interface UpdateTeamMemberInput extends Partial<CreateTeamMemberInput> {}

// ============================================================================
// Skill Types
// ============================================================================

export interface SkillWithCount extends Skill {
  _count: {
    expertise: number;
  };
}

export interface CreateSkillInput {
  slug: string;
  name_en: string;
  name_ar?: string | null;
  category: SkillCategory;
  description_en?: string | null;
  description_ar?: string | null;
  icon?: string | null;
  color?: string | null;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateSkillInput extends Partial<CreateSkillInput> {}

// ============================================================================
// Expertise Types
// ============================================================================

export interface AssignExpertiseInput {
  team_member_id: string;
  skill_id: string;
  proficiency?: Proficiency;
  years_experience?: number | null;
  description_en?: string | null;
  description_ar?: string | null;
  is_primary?: boolean;
  display_order?: number;
}

export interface UpdateExpertiseInput extends Partial<Omit<AssignExpertiseInput, 'team_member_id' | 'skill_id'>> {}

// ============================================================================
// Content Credit Types
// ============================================================================

export interface AssignCreditInput {
  team_member_id: string;
  content_type: 'blog_post' | 'resort' | 'comparison' | 'guide' | 'product';
  content_id: string;
  role?: CreditRole;
  contribution?: string | null;
}

// ============================================================================
// Filter & Query Types
// ============================================================================

export interface TeamMemberFilters {
  site_id?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  skill_category?: SkillCategory;
  skill_id?: string;
}

export interface SkillFilters {
  category?: SkillCategory;
  is_active?: boolean;
  search?: string;
}

export interface TeamMemberListResult {
  members: TeamMemberWithExpertise[];
  total: number;
}

export interface SkillListResult {
  skills: SkillWithCount[];
  total: number;
  byCategory: Record<SkillCategory, number>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface TeamMemberPublicProfile {
  id: string;
  slug: string;
  name: string;  // Localized based on request
  title: string;
  bio: string;
  avatar_url: string | null;
  cover_image_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  is_featured: boolean;
  primarySkills: {
    name: string;
    icon: string | null;
    color: string | null;
    proficiency: Proficiency;
  }[];
  allSkills: {
    category: SkillCategory;
    skills: {
      name: string;
      icon: string | null;
      color: string | null;
      proficiency: Proficiency;
      years_experience: number | null;
    }[];
  }[];
}
