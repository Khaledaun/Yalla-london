/**
 * Team & Expertise Service
 *
 * High-level business logic for team and skill management.
 */

import {
  findTeamMembers,
  findTeamMemberBySlug,
  findTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  findFeaturedTeamMembers,
  findSkills,
  findSkillBySlug,
  findSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
  findSkillsByCategory,
  assignExpertise,
  updateExpertise,
  removeExpertise,
  setPrimarySkills,
  assignContentCredit,
  findContentCredits,
  removeContentCredit,
} from './queries';

import type {
  TeamMemberWithExpertise,
  TeamMemberFull,
  SkillWithCount,
  TeamMemberFilters,
  SkillFilters,
  CreateTeamMemberInput,
  UpdateTeamMemberInput,
  CreateSkillInput,
  UpdateSkillInput,
  AssignExpertiseInput,
  AssignCreditInput,
  TeamMemberPublicProfile,
  SkillCategory,
  Proficiency,
} from './types';

// ============================================================================
// TEAM MEMBER SERVICE
// ============================================================================

export class TeamService {
  /**
   * Get paginated list of team members
   */
  static async listMembers(
    filters: TeamMemberFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ members: TeamMemberWithExpertise[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const { members, total } = await findTeamMembers(filters, { take: limit, skip });

    return {
      members,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a team member by slug for public display
   */
  static async getMemberBySlug(slug: string): Promise<TeamMemberFull | null> {
    return findTeamMemberBySlug(slug);
  }

  /**
   * Get a team member by ID for admin
   */
  static async getMemberById(id: string): Promise<TeamMemberFull | null> {
    return findTeamMemberById(id);
  }

  /**
   * Create a new team member
   */
  static async createMember(data: CreateTeamMemberInput): Promise<TeamMemberWithExpertise> {
    // Generate slug if not provided
    if (!data.slug) {
      data.slug = this.generateSlug(data.name_en);
    }

    return createTeamMember(data);
  }

  /**
   * Update a team member
   */
  static async updateMember(
    id: string,
    data: UpdateTeamMemberInput
  ): Promise<TeamMemberWithExpertise> {
    return updateTeamMember(id, data);
  }

  /**
   * Delete a team member
   */
  static async deleteMember(id: string): Promise<void> {
    return deleteTeamMember(id);
  }

  /**
   * Get featured team members for public pages
   */
  static async getFeaturedMembers(
    siteId?: string | null,
    limit: number = 6
  ): Promise<TeamMemberWithExpertise[]> {
    return findFeaturedTeamMembers(siteId, limit);
  }

  /**
   * Transform a team member to public profile format
   */
  static toPublicProfile(
    member: TeamMemberFull,
    locale: 'en' | 'ar' = 'en'
  ): TeamMemberPublicProfile {
    const isArabic = locale === 'ar';

    // Group skills by category
    const skillsByCategory = member.expertise.reduce((acc, exp) => {
      const category = exp.skill.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        name: isArabic && exp.skill.name_ar ? exp.skill.name_ar : exp.skill.name_en,
        icon: exp.skill.icon,
        color: exp.skill.color,
        proficiency: exp.proficiency,
        years_experience: exp.years_experience,
      });
      return acc;
    }, {} as Record<SkillCategory, any[]>);

    // Get primary skills
    const primarySkills = member.expertise
      .filter(exp => exp.is_primary)
      .map(exp => ({
        name: isArabic && exp.skill.name_ar ? exp.skill.name_ar : exp.skill.name_en,
        icon: exp.skill.icon,
        color: exp.skill.color,
        proficiency: exp.proficiency,
      }));

    return {
      id: member.id,
      slug: member.slug,
      name: isArabic && member.name_ar ? member.name_ar : member.name_en,
      title: isArabic && member.title_ar ? member.title_ar : member.title_en,
      bio: isArabic && member.bio_ar ? member.bio_ar : member.bio_en,
      avatar_url: member.avatar_url,
      cover_image_url: member.cover_image_url,
      linkedin_url: member.linkedin_url,
      twitter_url: member.twitter_url,
      instagram_url: member.instagram_url,
      website_url: member.website_url,
      is_featured: member.is_featured,
      primarySkills,
      allSkills: Object.entries(skillsByCategory).map(([category, skills]) => ({
        category: category as SkillCategory,
        skills,
      })),
    };
  }

  /**
   * Generate a URL-safe slug from a name
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

// ============================================================================
// SKILL SERVICE
// ============================================================================

export class SkillService {
  /**
   * Get all skills with optional filters
   */
  static async listSkills(
    filters: SkillFilters = {},
    page: number = 1,
    limit: number = 100
  ) {
    const skip = (page - 1) * limit;
    return findSkills(filters, { take: limit, skip });
  }

  /**
   * Get a skill by slug
   */
  static async getSkillBySlug(slug: string): Promise<SkillWithCount | null> {
    return findSkillBySlug(slug);
  }

  /**
   * Get a skill by ID
   */
  static async getSkillById(id: string): Promise<SkillWithCount | null> {
    return findSkillById(id);
  }

  /**
   * Create a new skill
   */
  static async createSkill(data: CreateSkillInput): Promise<SkillWithCount> {
    return createSkill(data);
  }

  /**
   * Update a skill
   */
  static async updateSkill(id: string, data: UpdateSkillInput): Promise<SkillWithCount> {
    return updateSkill(id, data);
  }

  /**
   * Delete a skill (will fail if assigned to team members)
   */
  static async deleteSkill(id: string): Promise<void> {
    return deleteSkill(id);
  }

  /**
   * Get skills grouped by category
   */
  static async getSkillsByCategory(): Promise<Record<SkillCategory, SkillWithCount[]>> {
    const { skills } = await findSkills({ is_active: true });

    return skills.reduce((acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    }, {} as Record<SkillCategory, SkillWithCount[]>);
  }

  /**
   * Get category display info
   */
  static getCategoryInfo(category: SkillCategory): { label_en: string; label_ar: string; icon: string; color: string } {
    const categories: Record<SkillCategory, { label_en: string; label_ar: string; icon: string; color: string }> = {
      ENGINEERING: { label_en: 'Engineering', label_ar: 'الهندسة', icon: 'code', color: '#3B82F6' },
      AI_ML: { label_en: 'AI & Machine Learning', label_ar: 'الذكاء الاصطناعي', icon: 'brain', color: '#8B5CF6' },
      DESIGN: { label_en: 'Design', label_ar: 'التصميم', icon: 'palette', color: '#EC4899' },
      DATA: { label_en: 'Data', label_ar: 'البيانات', icon: 'database', color: '#10B981' },
      CONTENT: { label_en: 'Content', label_ar: 'المحتوى', icon: 'file-text', color: '#F59E0B' },
      MARKETING: { label_en: 'Marketing', label_ar: 'التسويق', icon: 'trending-up', color: '#EF4444' },
      PSYCHOLOGY: { label_en: 'Psychology', label_ar: 'علم النفس', icon: 'sparkles', color: '#6366F1' },
      BUSINESS: { label_en: 'Business', label_ar: 'الأعمال', icon: 'briefcase', color: '#64748B' },
      TRAVEL: { label_en: 'Travel', label_ar: 'السفر', icon: 'plane', color: '#06B6D4' },
    };

    return categories[category];
  }
}

// ============================================================================
// EXPERTISE SERVICE
// ============================================================================

export class ExpertiseService {
  /**
   * Assign a skill to a team member
   */
  static async assignSkill(data: AssignExpertiseInput): Promise<TeamMemberWithExpertise> {
    return assignExpertise(data);
  }

  /**
   * Update expertise details
   */
  static async updateExpertise(
    teamMemberId: string,
    skillId: string,
    data: Partial<AssignExpertiseInput>
  ): Promise<void> {
    return updateExpertise(teamMemberId, skillId, data);
  }

  /**
   * Remove a skill from a team member
   */
  static async removeSkill(teamMemberId: string, skillId: string): Promise<void> {
    return removeExpertise(teamMemberId, skillId);
  }

  /**
   * Set primary skills for a team member (max 5)
   */
  static async setPrimarySkills(teamMemberId: string, skillIds: string[]): Promise<void> {
    return setPrimarySkills(teamMemberId, skillIds);
  }

  /**
   * Bulk assign skills to a team member
   */
  static async bulkAssignSkills(
    teamMemberId: string,
    skills: { skillId: string; proficiency?: Proficiency; isPrimary?: boolean }[]
  ): Promise<TeamMemberWithExpertise> {
    let result: TeamMemberWithExpertise | null = null;

    for (const skill of skills) {
      result = await assignExpertise({
        team_member_id: teamMemberId,
        skill_id: skill.skillId,
        proficiency: skill.proficiency || 'EXPERT',
        is_primary: skill.isPrimary || false,
      });
    }

    return result!;
  }
}

// ============================================================================
// CONTENT CREDIT SERVICE
// ============================================================================

export class ContentCreditService {
  /**
   * Credit a team member for content
   */
  static async addCredit(data: AssignCreditInput): Promise<void> {
    return assignContentCredit(data);
  }

  /**
   * Get credits for a piece of content
   */
  static async getCredits(contentType: string, contentId: string) {
    return findContentCredits(contentType, contentId);
  }

  /**
   * Remove a content credit
   */
  static async removeCredit(
    teamMemberId: string,
    contentType: string,
    contentId: string
  ): Promise<void> {
    return removeContentCredit(teamMemberId, contentType, contentId);
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

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
};
