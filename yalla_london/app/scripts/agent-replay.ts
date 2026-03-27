#!/usr/bin/env npx tsx
/**
 * Agent Replay — Test Harness
 *
 * Replays synthetic WhatsApp/social/email interactions through the full
 * CEO Agent stack without needing live channel connections.
 *
 * Usage:
 *   npx tsx scripts/agent-replay.ts [fixture-file]
 *   npx tsx scripts/agent-replay.ts --inline '{"channel":"whatsapp","content":"Hello"}'
 *
 * Fixture format (JSON):
 * {
 *   "name": "Greeting flow",
 *   "siteId": "yalla-london",
 *   "events": [
 *     {
 *       "channel": "whatsapp",
 *       "direction": "inbound",
 *       "content": "Hi, I want to book a yacht",
 *       "senderName": "Test User",
 *       "senderPhone": "+971501234567",
 *       "expectedTools": ["crm_lookup", "crm_create_lead"],
 *       "expectedResponseContains": ["yacht", "charter"]
 *     }
 *   ]
 * }
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReplayEvent {
  channel: "whatsapp" | "email" | "web" | "internal";
  direction?: "inbound" | "outbound";
  content: string;
  senderName?: string;
  senderPhone?: string;
  senderEmail?: string;
  metadata?: Record<string, unknown>;
  expectedTools?: string[];
  expectedResponseContains?: string[];
}

interface Fixture {
  name: string;
  siteId?: string;
  events: ReplayEvent[];
}

interface ReplayResult {
  eventIndex: number;
  content: string;
  response: string;
  toolsUsed: string[];
  confidence: number;
  passed: boolean;
  assertions: { check: string; passed: boolean; detail: string }[];
  durationMs: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// CEO Brain loader (dynamic import to avoid compile-time dependency issues)
// ---------------------------------------------------------------------------

async function loadCEOBrain() {
  try {
    const mod = await import("../lib/agents/ceo-brain");
    return mod.processCEOEvent;
  } catch (err) {
    console.error(
      "\x1b[31m[agent-replay] Failed to import CEO Brain.\x1b[0m",
    );
    console.error(
      "  Make sure you're running from the app directory and dependencies are installed.",
    );
    console.error(`  Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
    return undefined as never;
  }
}

// ---------------------------------------------------------------------------
// Build CEOEvent from replay event
// ---------------------------------------------------------------------------

function buildCEOEvent(re: ReplayEvent, siteId: string) {
  return {
    id: `replay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    channel: re.channel,
    direction: re.direction || "inbound",
    content: re.content,
    senderName: re.senderName || "Replay User",
    senderPhone: re.senderPhone || "+000000000000",
    senderEmail: re.senderEmail,
    externalId: re.senderPhone || re.senderEmail || "replay-user",
    contentType: "text" as const,
    siteId,
    timestamp: new Date().toISOString(),
    metadata: {
      ...re.metadata,
      isReplay: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

function checkAssertions(
  re: ReplayEvent,
  result: { response: string; toolsUsed: string[] },
): { check: string; passed: boolean; detail: string }[] {
  const assertions: { check: string; passed: boolean; detail: string }[] = [];

  // Check expected tools
  if (re.expectedTools) {
    for (const tool of re.expectedTools) {
      const found = result.toolsUsed.includes(tool);
      assertions.push({
        check: `tool:${tool}`,
        passed: found,
        detail: found
          ? `Tool "${tool}" was used`
          : `Tool "${tool}" was NOT used. Used: [${result.toolsUsed.join(", ")}]`,
      });
    }
  }

  // Check expected response content
  if (re.expectedResponseContains) {
    for (const phrase of re.expectedResponseContains) {
      const found = result.response
        .toLowerCase()
        .includes(phrase.toLowerCase());
      assertions.push({
        check: `response:${phrase}`,
        passed: found,
        detail: found
          ? `Response contains "${phrase}"`
          : `Response does NOT contain "${phrase}"`,
      });
    }
  }

  return assertions;
}

// ---------------------------------------------------------------------------
// Main replay loop
// ---------------------------------------------------------------------------

async function replay(fixture: Fixture): Promise<ReplayResult[]> {
  const processCEOEvent = await loadCEOBrain();
  const siteId = fixture.siteId || "yalla-london";
  const results: ReplayResult[] = [];

  console.log(`\n\x1b[1m=== Replaying: ${fixture.name} ===\x1b[0m`);
  console.log(`  Site: ${siteId}`);
  console.log(`  Events: ${fixture.events.length}\n`);

  for (let i = 0; i < fixture.events.length; i++) {
    const re = fixture.events[i];
    const start = Date.now();

    console.log(
      `\x1b[36m[${i + 1}/${fixture.events.length}]\x1b[0m ${re.channel} ${re.direction || "inbound"}: "${re.content.slice(0, 80)}${re.content.length > 80 ? "..." : ""}"`,
    );

    try {
      const event = buildCEOEvent(re, siteId);
      const actionResult = await processCEOEvent(event);
      const durationMs = Date.now() - start;

      const response = actionResult.responseText || "";
      const toolsUsed = actionResult.toolsUsed || [];
      const confidence = actionResult.confidence || 0;

      const assertions = checkAssertions(re, { response, toolsUsed });
      const allPassed = assertions.every((a) => a.passed);

      results.push({
        eventIndex: i,
        content: re.content,
        response,
        toolsUsed,
        confidence,
        passed: assertions.length === 0 || allPassed,
        assertions,
        durationMs,
      });

      // Print result
      const icon = allPassed ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
      console.log(
        `  ${icon} Response (${durationMs}ms, confidence: ${confidence}): "${response.slice(0, 100)}${response.length > 100 ? "..." : ""}"`,
      );
      if (toolsUsed.length > 0) {
        console.log(`    Tools: [${toolsUsed.join(", ")}]`);
      }
      for (const a of assertions) {
        const aIcon = a.passed ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
        console.log(`    ${aIcon} ${a.detail}`);
      }
    } catch (err) {
      const durationMs = Date.now() - start;
      results.push({
        eventIndex: i,
        content: re.content,
        response: "",
        toolsUsed: [],
        confidence: 0,
        passed: false,
        assertions: [],
        durationMs,
        error: err instanceof Error ? err.message : String(err),
      });
      console.log(
        `  \x1b[31m✗ ERROR (${durationMs}ms): ${err instanceof Error ? err.message : err}\x1b[0m`,
      );
    }

    console.log("");
  }

  return results;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function printSummary(results: ReplayResult[]) {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalAssertions = results.reduce(
    (acc, r) => acc + r.assertions.length,
    0,
  );
  const passedAssertions = results.reduce(
    (acc, r) => acc + r.assertions.filter((a) => a.passed).length,
    0,
  );
  const avgDuration = Math.round(
    results.reduce((acc, r) => acc + r.durationMs, 0) / results.length,
  );

  console.log("=".repeat(60));
  console.log(
    `  Events: ${passed} passed / ${failed} failed / ${results.length} total`,
  );
  console.log(
    `  Assertions: ${passedAssertions}/${totalAssertions} passed`,
  );
  console.log(`  Avg duration: ${avgDuration}ms`);
  console.log("=".repeat(60));

  if (failed > 0) {
    console.log("\nFailed events:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  [${r.eventIndex}] "${r.content.slice(0, 60)}"`);
      if (r.error) console.log(`    Error: ${r.error}`);
      for (const a of r.assertions.filter((a) => !a.passed)) {
        console.log(`    ✗ ${a.detail}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  let fixture: Fixture;

  if (args.includes("--inline")) {
    const idx = args.indexOf("--inline");
    const json = args[idx + 1];
    if (!json) {
      console.error("Usage: --inline '{\"channel\":\"whatsapp\",\"content\":\"Hello\"}'");
      process.exit(1);
    }
    const event = JSON.parse(json) as ReplayEvent;
    fixture = { name: "Inline replay", events: [event] };
  } else if (args.length > 0) {
    const fixturePath = path.resolve(args[0]);
    if (!fs.existsSync(fixturePath)) {
      console.error(`Fixture file not found: ${fixturePath}`);
      process.exit(1);
    }
    fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as Fixture;
  } else {
    // Default demo fixture
    fixture = {
      name: "Demo — greeting + yacht inquiry",
      siteId: "yalla-london",
      events: [
        {
          channel: "whatsapp",
          content: "Hello, I am interested in luxury travel in London",
          senderName: "Test User",
          senderPhone: "+971501234567",
          expectedTools: ["crm_lookup"],
        },
        {
          channel: "whatsapp",
          content: "Can you recommend the best halal restaurants in Mayfair?",
          senderName: "Test User",
          senderPhone: "+971501234567",
          expectedTools: ["search_knowledge"],
          expectedResponseContains: ["restaurant"],
        },
        {
          channel: "email",
          content: "I would like to book a yacht charter for 8 guests in August",
          senderEmail: "test@example.com",
          senderName: "Ahmed K",
          expectedTools: ["crm_lookup", "crm_create_opportunity"],
          expectedResponseContains: ["yacht", "charter"],
        },
      ],
    };
    console.log("No fixture file provided — running default demo fixture.");
    console.log("Usage: npx tsx scripts/agent-replay.ts [fixture.json]");
    console.log(
      '        npx tsx scripts/agent-replay.ts --inline \'{"channel":"whatsapp","content":"Hello"}\'',
    );
  }

  const results = await replay(fixture);
  printSummary(results);

  const failures = results.filter((r) => !r.passed);
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
