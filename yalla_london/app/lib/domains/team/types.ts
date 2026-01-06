/**
 * Team & Expertise System Types
 */

// Local enum definitions matching Prisma schema
export enum SkillCategory {
  ENGINEERING = 'ENGINEERING',
  AI_ML = 'AI_ML',
  DESIGN = 'DESIGN',
  DATA = 'DATA',
  CONTENT = 'CONTENT',
  MARKETING = 'MARKETING',
  PSYCHOLOGY = 'PSYCHOLOGY',
  BUSINESS = 'BUSINESS',
  TRAVEL = 'TRAVEL',
}

export enum Proficiency {
  LEARNING = 'LEARNING',
  PROFICIENT = 'PROFICIENT',
  EXPERT = 'EXPERT',
  THOUGHT_LEADER = 'THOUGHT_LEADER',
}

export enum CreditRole {
  AUTHOR = 'AUTHOR',
  CONTRIBUTOR = 'CONTRIBUTOR',
  EDITOR = 'EDITOR',
  RESEARCHER = 'RESEARCHER',
  PHOTOGRAPHER = 'PHOTOGRAPHER',
}

// Local type definitions
interface TeamMember {
  id: string;
  site_id: string | null;
  user_id: string | null;
  name_en: string;
  name_ar: string | null;
  slug: string;
  title_en: string;
  title_ar: string | null;
  bio_en: string;
  bio_ar: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  email_public: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

interface Skill {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  category: SkillCategory;
  description_en: string | null;
  description_ar: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

interface TeamMemberExpertise {
  id: string;
  team_member_id: string;
  skill_id: string;
  proficiency: Proficiency;
  years_experience: number | null;
  description_en: string | null;
  description_ar: string | null;
  is_primary: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface ContentCredit {
  id: string;
  team_member_id: string;
  content_type: string;
  content_id: string;
  role: CreditRole;
  contribution: string | null;
  created_at: Date;
}

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
