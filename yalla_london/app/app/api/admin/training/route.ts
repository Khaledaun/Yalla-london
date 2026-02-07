export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";

interface TrainingModule {
  module_id: string;
  title: string;
  description: string;
  category:
    | "onboarding"
    | "content_management"
    | "seo_tools"
    | "automation"
    | "analytics"
    | "troubleshooting";
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_duration: number; // minutes
  steps: TrainingStep[];
  prerequisites: string[];
  completion_criteria: CompletionCriteria;
}

interface TrainingStep {
  step_id: string;
  title: string;
  content: string;
  type: "text" | "video" | "interactive" | "quiz" | "hands_on";
  tooltip_targets?: string[]; // CSS selectors for UI elements
  interactive_elements?: InteractiveElement[];
}

interface InteractiveElement {
  element_selector: string;
  highlight_type: "outline" | "background" | "pulse";
  tooltip_content: string;
  action_required?: "click" | "hover" | "input";
}

interface CompletionCriteria {
  required_steps: string[];
  quiz_passing_score?: number;
  hands_on_tasks?: string[];
}

interface Tooltip {
  tooltip_id: string;
  target_element: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right" | "auto";
  trigger: "hover" | "click" | "focus" | "auto";
  category: string;
  priority: "low" | "medium" | "high";
  show_conditions: {
    user_role?: string[];
    feature_flags?: string[];
    first_time_only?: boolean;
  };
}

let trainingModules: Map<string, TrainingModule> = new Map();
let tooltips: Map<string, Tooltip> = new Map();

// Pre-configured training modules
const DEFAULT_TRAINING_MODULES: TrainingModule[] = [
  {
    module_id: "onboarding_basics",
    title: "Admin Dashboard Basics",
    description:
      "Introduction to the Yalla London admin dashboard and core navigation",
    category: "onboarding",
    difficulty: "beginner",
    estimated_duration: 15,
    prerequisites: [],
    steps: [
      {
        step_id: "welcome",
        title: "Welcome to Yalla London Admin",
        content:
          "Welcome to the Yalla London content management platform. This guide will help you understand the main features and navigation.",
        type: "text",
      },
      {
        step_id: "navigation_tour",
        title: "Dashboard Navigation",
        content:
          "Let's explore the main navigation areas of the admin dashboard.",
        type: "interactive",
        tooltip_targets: [".admin-nav", ".admin-sidebar", ".admin-header"],
        interactive_elements: [
          {
            element_selector: ".admin-nav",
            highlight_type: "outline",
            tooltip_content:
              "Main navigation menu - access all admin features here",
            action_required: "hover",
          },
          {
            element_selector: ".admin-sidebar",
            highlight_type: "background",
            tooltip_content:
              "Sidebar contains quick actions and status information",
            action_required: "click",
          },
        ],
      },
      {
        step_id: "knowledge_check",
        title: "Navigation Knowledge Check",
        content:
          "Quick quiz to test your understanding of dashboard navigation.",
        type: "quiz",
      },
    ],
    completion_criteria: {
      required_steps: ["welcome", "navigation_tour", "knowledge_check"],
      quiz_passing_score: 80,
    },
  },
  {
    module_id: "content_pipeline",
    title: "Automated Content Pipeline",
    description:
      "Learn how to use the automated content generation and management pipeline",
    category: "content_management",
    difficulty: "intermediate",
    estimated_duration: 30,
    prerequisites: ["onboarding_basics"],
    steps: [
      {
        step_id: "pipeline_overview",
        title: "Content Pipeline Overview",
        content:
          "The automated content pipeline helps you generate, review, and publish content efficiently.",
        type: "text",
      },
      {
        step_id: "topic_generation",
        title: "Topic Generation",
        content: "Learn how to generate content topics using AI assistance.",
        type: "hands_on",
        tooltip_targets: [".topic-generator", ".ai-suggestions"],
        interactive_elements: [
          {
            element_selector: ".topic-generator",
            highlight_type: "pulse",
            tooltip_content:
              "Click here to start generating new content topics",
            action_required: "click",
          },
        ],
      },
      {
        step_id: "content_review",
        title: "Content Review Process",
        content: "Understand the human review and approval workflow.",
        type: "interactive",
        tooltip_targets: [".review-queue", ".approval-buttons"],
      },
      {
        step_id: "seo_optimization",
        title: "SEO Audit & Optimization",
        content: "Learn how to use the AI SEO audit tool to optimize content.",
        type: "hands_on",
        tooltip_targets: [".seo-audit-btn", ".seo-score"],
      },
    ],
    completion_criteria: {
      required_steps: [
        "pipeline_overview",
        "topic_generation",
        "content_review",
        "seo_optimization",
      ],
      hands_on_tasks: ["generate_topic", "run_seo_audit"],
    },
  },
  {
    module_id: "analytics_integration",
    title: "Analytics & Performance Monitoring",
    description: "Configure and use GA4 and Google Search Console integrations",
    category: "analytics",
    difficulty: "intermediate",
    estimated_duration: 25,
    prerequisites: ["onboarding_basics"],
    steps: [
      {
        step_id: "analytics_overview",
        title: "Analytics Integration Overview",
        content:
          "Learn about GA4 and Google Search Console integration features.",
        type: "text",
      },
      {
        step_id: "ga4_setup",
        title: "GA4 Configuration",
        content:
          "Configure Google Analytics 4 integration for content tracking.",
        type: "hands_on",
        tooltip_targets: [".ga4-config", ".analytics-settings"],
      },
      {
        step_id: "search_console",
        title: "Search Console Integration",
        content: "Set up Google Search Console for SEO performance tracking.",
        type: "hands_on",
        tooltip_targets: [".gsc-config", ".seo-metrics"],
      },
    ],
    completion_criteria: {
      required_steps: ["analytics_overview", "ga4_setup", "search_console"],
      hands_on_tasks: ["configure_ga4", "setup_search_console"],
    },
  },
];

// Pre-configured tooltips
const DEFAULT_TOOLTIPS: Tooltip[] = [
  {
    tooltip_id: "feature_flags_help",
    target_element: ".feature-flags-panel",
    title: "Feature Flags",
    content:
      "Control which features are enabled or disabled. Use for phased rollouts and A/B testing.",
    position: "right",
    trigger: "hover",
    category: "feature_management",
    priority: "high",
    show_conditions: {
      user_role: ["admin", "editor"],
      first_time_only: true,
    },
  },
  {
    tooltip_id: "content_pipeline_help",
    target_element: ".content-pipeline-status",
    title: "Content Pipeline",
    content:
      "Monitor the automated content generation workflow. Green indicates all steps are operational.",
    position: "bottom",
    trigger: "hover",
    category: "content_management",
    priority: "medium",
    show_conditions: {
      feature_flags: ["FEATURE_CONTENT_PIPELINE"],
    },
  },
  {
    tooltip_id: "seo_audit_help",
    target_element: ".seo-audit-button",
    title: "AI SEO Audit",
    content:
      "Run comprehensive SEO analysis on your content. Provides actionable recommendations for optimization.",
    position: "top",
    trigger: "hover",
    category: "seo_tools",
    priority: "high",
    show_conditions: {
      feature_flags: ["FEATURE_AI_SEO_AUDIT"],
    },
  },
  {
    tooltip_id: "monitoring_alerts_help",
    target_element: ".monitoring-alerts",
    title: "Performance Monitoring",
    content:
      "Real-time system health monitoring. Click to view detailed alerts and metrics.",
    position: "left",
    trigger: "hover",
    category: "monitoring",
    priority: "medium",
    show_conditions: {
      user_role: ["admin"],
    },
  },
  {
    tooltip_id: "backup_test_help",
    target_element: ".backup-test-button",
    title: "Database Backup Testing",
    content:
      "Test backup integrity and restore procedures. Run regularly to ensure data safety.",
    position: "top",
    trigger: "hover",
    category: "data_management",
    priority: "high",
    show_conditions: {
      user_role: ["admin"],
    },
  },
];

// Initialize default modules and tooltips
DEFAULT_TRAINING_MODULES.forEach((module) => {
  trainingModules.set(module.module_id, module);
});

DEFAULT_TOOLTIPS.forEach((tooltip) => {
  tooltips.set(tooltip.tooltip_id, tooltip);
});

/**
 * GET /api/admin/training
 * Get training modules and progress
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const moduleId = url.searchParams.get("module_id");
    const category = url.searchParams.get("category");
    const userRole = url.searchParams.get("user_role") || "admin";

    if (moduleId) {
      // Get specific training module
      const trainingModule = trainingModules.get(moduleId);
      if (trainingModule) {
        return NextResponse.json({
          status: "success",
          training_module: trainingModule,
        });
      } else {
        return NextResponse.json(
          { status: "error", message: "Training module not found" },
          { status: 404 },
        );
      }
    }

    // Filter modules by category if specified
    let allModules = Array.from(trainingModules.values());
    if (category) {
      allModules = allModules.filter((module) => module.category === category);
    }

    // Return module list with default progress (no tracking data available yet)
    const moduleProgress = allModules.map((module) => ({
      module_id: module.module_id,
      title: module.title,
      category: module.category,
      difficulty: module.difficulty,
      estimated_duration: module.estimated_duration,
      completion_percentage: 0,
      is_completed: false,
      last_accessed: null,
    }));

    return NextResponse.json({
      status: "success",
      training_modules: moduleProgress,
      categories: [
        "onboarding",
        "content_management",
        "seo_tools",
        "automation",
        "analytics",
        "troubleshooting",
      ],
      user_role: userRole,
      total_modules: allModules.length,
      recommended_modules: allModules
        .filter(
          (m) => m.difficulty === "beginner" || m.category === "onboarding",
        )
        .map((m) => m.module_id)
        .slice(0, 3),
    });
  } catch (error) {
    console.error("Training modules retrieval error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to retrieve training modules",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});

/**
 * POST /api/admin/training
 * Update training progress
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { module_id, step_id, action, user_id = "admin" } = body;

    if (!trainingModules.has(module_id)) {
      return NextResponse.json(
        { status: "error", message: "Training module not found" },
        { status: 404 },
      );
    }

    // Log training progress
    try {
      await prisma.auditLog.create({
        data: {
          action: "TRAINING_PROGRESS",
          entity_type: "TRAINING_MODULE",
          entity_id: module_id,
          details: {
            step_id,
            action, // 'started', 'completed', 'skipped'
            timestamp: new Date().toISOString(),
          },
          user_id,
          ip_address: request.ip || "unknown",
          user_agent: request.headers.get("user-agent") || "unknown",
        },
      });
    } catch (dbError) {
      console.warn("Failed to log training progress:", dbError);
    }

    return NextResponse.json({
      status: "success",
      message: "Training progress updated",
      module_id,
      step_id,
      action,
      next_steps:
        action === "completed"
          ? "Proceed to next step or module"
          : "Continue with current training module",
    });
  } catch (error) {
    console.error("Training progress update error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to update training progress",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
