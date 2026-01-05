/**
 * Team & Expertise Database Queries
 *
 * All queries are site-scoped where applicable.
 */

import { prisma } from '@/lib/db';
import { Prisma, SkillCategory, Proficiency } from '@prisma/client';
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
  UpdateExpertiseInput,
  AssignCreditInput,
} from './types';

// ============================================================================
// TEAM MEMBER QUERIES
// ============================================================================

/**
 * List team members with optional filters
 */
export async function findTeamMembers(
  filters: TeamMemberFilters = {},
  options: {
    orderBy?: Prisma.TeamMemberOrderByWithRelationInput;
    take?: number;
    skip?: number;
    includeExpertise?: boolean;
  } = {}
): Promise<{ members: TeamMemberWithExpertise[]; total: number }> {
  const where: Prisma.TeamMemberWhereInput = {
    ...(filters.site_id !== undefined && { site_id: filters.site_id }),
    ...(filters.is_active !== undefined && { is_active: filters.is_active }),
    ...(filters.is_featured !== undefined && { is_featured: filters.is_featured }),
    ...(filters.skill_category && {
      expertise: {
        some: {
          skill: { category: filters.skill_category },
        },
      },
    }),
    ...(filters.skill_id && {
      expertise: {
        some: { skill_id: filters.skill_id },
      },
    }),
  };

  const [members, total] = await Promise.all([
    prisma.teamMember.findMany({
      where,
      include: {
        expertise: {
          include: { skill: true },
          orderBy: [
            { is_primary: 'desc' },
            { display_order: 'asc' },
          ],
        },
      },
      orderBy: options.orderBy || [
        { is_featured: 'desc' },
        { display_order: 'asc' },
        { name_en: 'asc' },
      ],
      take: options.take,
      skip: options.skip,
    }),
    prisma.teamMember.count({ where }),
  ]);

  return { members, total };
}

/**
 * Get a single team member by slug with full details
 */
export async function findTeamMemberBySlug(
  slug: string
): Promise<TeamMemberFull | null> {
  return prisma.teamMember.findUnique({
    where: { slug },
    include: {
      expertise: {
        include: { skill: true },
        orderBy: [
          { is_primary: 'desc' },
          { display_order: 'asc' },
        ],
      },
      content_credits: {
        orderBy: { created_at: 'desc' },
        take: 20,
      },
    },
  });
}

/**
 * Get a single team member by ID
 */
export async function findTeamMemberById(
  id: string
): Promise<TeamMemberFull | null> {
  return prisma.teamMember.findUnique({
    where: { id },
    include: {
      expertise: {
        include: { skill: true },
        orderBy: [
          { is_primary: 'desc' },
          { display_order: 'asc' },
        ],
      },
      content_credits: {
        orderBy: { created_at: 'desc' },
        take: 20,
      },
    },
  });
}

/**
 * Create a new team member
 */
export async function createTeamMember(
  data: CreateTeamMemberInput
): Promise<TeamMemberWithExpertise> {
  return prisma.teamMember.create({
    data: {
      ...data,
      site_id: data.site_id || null,
      user_id: data.user_id || null,
    },
    include: {
      expertise: {
        include: { skill: true },
      },
    },
  });
}

/**
 * Update a team member
 */
export async function updateTeamMember(
  id: string,
  data: UpdateTeamMemberInput
): Promise<TeamMemberWithExpertise> {
  return prisma.teamMember.update({
    where: { id },
    data,
    include: {
      expertise: {
        include: { skill: true },
      },
    },
  });
}

/**
 * Delete a team member
 */
export async function deleteTeamMember(id: string): Promise<void> {
  await prisma.teamMember.delete({ where: { id } });
}

/**
 * Get featured team members for homepage/about page
 */
export async function findFeaturedTeamMembers(
  siteId?: string | null,
  limit: number = 6
): Promise<TeamMemberWithExpertise[]> {
  return prisma.teamMember.findMany({
    where: {
      is_active: true,
      is_featured: true,
      ...(siteId !== undefined && { OR: [{ site_id: siteId }, { site_id: null }] }),
    },
    include: {
      expertise: {
        where: { is_primary: true },
        include: { skill: true },
        orderBy: { display_order: 'asc' },
        take: 5,
      },
    },
    orderBy: [
      { display_order: 'asc' },
      { name_en: 'asc' },
    ],
    take: limit,
  });
}

// ============================================================================
// SKILL QUERIES
// ============================================================================

/**
 * List all skills with optional filters
 */
export async function findSkills(
  filters: SkillFilters = {},
  options: {
    orderBy?: Prisma.SkillOrderByWithRelationInput;
    take?: number;
    skip?: number;
  } = {}
): Promise<{ skills: SkillWithCount[]; total: number; byCategory: Record<SkillCategory, number> }> {
  const where: Prisma.SkillWhereInput = {
    ...(filters.category && { category: filters.category }),
    ...(filters.is_active !== undefined && { is_active: filters.is_active }),
    ...(filters.search && {
      OR: [
        { name_en: { contains: filters.search, mode: 'insensitive' } },
        { name_ar: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [skills, total, categoryCounts] = await Promise.all([
    prisma.skill.findMany({
      where,
      include: {
        _count: { select: { expertise: true } },
      },
      orderBy: options.orderBy || [
        { category: 'asc' },
        { display_order: 'asc' },
        { name_en: 'asc' },
      ],
      take: options.take,
      skip: options.skip,
    }),
    prisma.skill.count({ where }),
    prisma.skill.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { is_active: true },
    }),
  ]);

  const byCategory = Object.fromEntries(
    Object.values(SkillCategory).map(cat => [
      cat,
      categoryCounts.find(c => c.category === cat)?._count.id || 0,
    ])
  ) as Record<SkillCategory, number>;

  return { skills, total, byCategory };
}

/**
 * Get a skill by slug
 */
export async function findSkillBySlug(slug: string): Promise<SkillWithCount | null> {
  return prisma.skill.findUnique({
    where: { slug },
    include: {
      _count: { select: { expertise: true } },
    },
  });
}

/**
 * Get a skill by ID
 */
export async function findSkillById(id: string): Promise<SkillWithCount | null> {
  return prisma.skill.findUnique({
    where: { id },
    include: {
      _count: { select: { expertise: true } },
    },
  });
}

/**
 * Create a new skill
 */
export async function createSkill(data: CreateSkillInput): Promise<SkillWithCount> {
  return prisma.skill.create({
    data,
    include: {
      _count: { select: { expertise: true } },
    },
  });
}

/**
 * Update a skill
 */
export async function updateSkill(
  id: string,
  data: UpdateSkillInput
): Promise<SkillWithCount> {
  return prisma.skill.update({
    where: { id },
    data,
    include: {
      _count: { select: { expertise: true } },
    },
  });
}

/**
 * Delete a skill
 */
export async function deleteSkill(id: string): Promise<void> {
  await prisma.skill.delete({ where: { id } });
}

/**
 * Get skills by category
 */
export async function findSkillsByCategory(
  category: SkillCategory
): Promise<SkillWithCount[]> {
  return prisma.skill.findMany({
    where: { category, is_active: true },
    include: {
      _count: { select: { expertise: true } },
    },
    orderBy: [
      { display_order: 'asc' },
      { name_en: 'asc' },
    ],
  });
}

// ============================================================================
// EXPERTISE QUERIES
// ============================================================================

/**
 * Assign a skill to a team member
 */
export async function assignExpertise(
  data: AssignExpertiseInput
): Promise<TeamMemberWithExpertise> {
  await prisma.teamMemberExpertise.upsert({
    where: {
      team_member_id_skill_id: {
        team_member_id: data.team_member_id,
        skill_id: data.skill_id,
      },
    },
    update: {
      proficiency: data.proficiency || 'EXPERT',
      years_experience: data.years_experience,
      description_en: data.description_en,
      description_ar: data.description_ar,
      is_primary: data.is_primary || false,
      display_order: data.display_order || 0,
    },
    create: {
      team_member_id: data.team_member_id,
      skill_id: data.skill_id,
      proficiency: data.proficiency || 'EXPERT',
      years_experience: data.years_experience,
      description_en: data.description_en,
      description_ar: data.description_ar,
      is_primary: data.is_primary || false,
      display_order: data.display_order || 0,
    },
  });

  return findTeamMemberById(data.team_member_id) as Promise<TeamMemberWithExpertise>;
}

/**
 * Update expertise assignment
 */
export async function updateExpertise(
  teamMemberId: string,
  skillId: string,
  data: UpdateExpertiseInput
): Promise<void> {
  await prisma.teamMemberExpertise.update({
    where: {
      team_member_id_skill_id: {
        team_member_id: teamMemberId,
        skill_id: skillId,
      },
    },
    data,
  });
}

/**
 * Remove expertise from a team member
 */
export async function removeExpertise(
  teamMemberId: string,
  skillId: string
): Promise<void> {
  await prisma.teamMemberExpertise.delete({
    where: {
      team_member_id_skill_id: {
        team_member_id: teamMemberId,
        skill_id: skillId,
      },
    },
  });
}

/**
 * Set primary skills for a team member (max 5)
 */
export async function setPrimarySkills(
  teamMemberId: string,
  skillIds: string[]
): Promise<void> {
  const limitedSkillIds = skillIds.slice(0, 5);

  await prisma.$transaction([
    // Reset all to non-primary
    prisma.teamMemberExpertise.updateMany({
      where: { team_member_id: teamMemberId },
      data: { is_primary: false },
    }),
    // Set selected as primary
    prisma.teamMemberExpertise.updateMany({
      where: {
        team_member_id: teamMemberId,
        skill_id: { in: limitedSkillIds },
      },
      data: { is_primary: true },
    }),
  ]);
}

// ============================================================================
// CONTENT CREDIT QUERIES
// ============================================================================

/**
 * Assign content credit to a team member
 */
export async function assignContentCredit(data: AssignCreditInput): Promise<void> {
  await prisma.contentCredit.upsert({
    where: {
      team_member_id_content_type_content_id: {
        team_member_id: data.team_member_id,
        content_type: data.content_type,
        content_id: data.content_id,
      },
    },
    update: {
      role: data.role || 'AUTHOR',
      contribution: data.contribution,
    },
    create: {
      team_member_id: data.team_member_id,
      content_type: data.content_type,
      content_id: data.content_id,
      role: data.role || 'AUTHOR',
      contribution: data.contribution,
    },
  });
}

/**
 * Get credits for a piece of content
 */
export async function findContentCredits(
  contentType: string,
  contentId: string
): Promise<(ContentCredit & { team_member: TeamMemberWithExpertise })[]> {
  return prisma.contentCredit.findMany({
    where: {
      content_type: contentType,
      content_id: contentId,
    },
    include: {
      team_member: {
        include: {
          expertise: {
            where: { is_primary: true },
            include: { skill: true },
            take: 3,
          },
        },
      },
    },
    orderBy: { created_at: 'asc' },
  });
}

/**
 * Remove content credit
 */
export async function removeContentCredit(
  teamMemberId: string,
  contentType: string,
  contentId: string
): Promise<void> {
  await prisma.contentCredit.delete({
    where: {
      team_member_id_content_type_content_id: {
        team_member_id: teamMemberId,
        content_type: contentType,
        content_id: contentId,
      },
    },
  });
}

// Need to import ContentCredit type
import type { ContentCredit } from '@prisma/client';
