export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getAllSkills,
  getSkillsByCategory,
  findMatchingSkills,
  getSkillCategories,
  getSkillById,
  type SkillCategory,
  type SkillEvent,
} from "@/lib/skills/skill-registry";

/**
 * GET /api/admin/skill-engine
 *
 * Automation skill engine — returns registered skills, their triggers,
 * and auto-activation matches.
 *
 * Query params:
 *  - category: filter by category
 *  - event: find skills for a specific event
 *  - file: find skills matching a file path
 *  - keyword: find skills matching keywords (comma-separated)
 *  - id: get a specific skill by ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category") as SkillCategory | null;
    const event = searchParams.get("event") as SkillEvent | null;
    const file = searchParams.get("file");
    const keyword = searchParams.get("keyword");
    const id = searchParams.get("id");

    // Single skill lookup
    if (id) {
      const skill = getSkillById(id);
      if (!skill)
        return NextResponse.json(
          { error: "Skill not found" },
          { status: 404 },
        );
      return NextResponse.json({ skill });
    }

    // Context-based matching
    if (file || keyword || event) {
      const matched = findMatchingSkills({
        filePath: file || undefined,
        keywords: keyword ? keyword.split(",") : undefined,
        event: event || undefined,
      });
      return NextResponse.json({
        skills: matched,
        count: matched.length,
        context: { file, keyword, event },
      });
    }

    // Category filter
    if (category) {
      const filtered = getSkillsByCategory(category);
      return NextResponse.json({ skills: filtered, count: filtered.length });
    }

    // Return all skills with categories
    const allSkills = getAllSkills();
    const categories = getSkillCategories();

    return NextResponse.json({
      skills: allSkills,
      categories,
      total: allSkills.length,
      enabled: allSkills.filter((s) => s.enabled).length,
      summary: {
        totalActions: allSkills.reduce(
          (sum, s) => sum + s.actions.length,
          0,
        ),
        criticalSkills: allSkills.filter((s) => s.priority === "critical")
          .length,
        autoTriggered: allSkills.filter(
          (s) =>
            s.triggers.events &&
            s.triggers.events.some((e) => e !== "manual"),
        ).length,
      },
    });
  } catch (error) {
    console.error("[Skill Engine API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch skills" },
      { status: 500 },
    );
  }
}
