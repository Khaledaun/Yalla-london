# CC Workflow Studio — Visual AI Workflow Editor

## Overview

[CC Workflow Studio](https://github.com/breaking-brake/cc-wf-studio) is a VS Code extension that provides a visual canvas for designing and viewing AI agent orchestration workflows. It uses React Flow to render interactive node-based diagrams directly inside VS Code.

This project uses CC Workflow Studio to visualize all 7 AI agent pipelines that power the Zenitha Content Network.

## Setup

### Install the Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "CC Workflow Studio" by breaking-brake
4. Click Install

### Open a Workflow

1. Open any `.json` file in `.vscode/workflows/` or `docs/workflows/`
2. Click the "Open in Workflow Studio" button in the editor toolbar (top-right)
3. The visual canvas opens with draggable, interactive nodes

## Workflow Files

All workflow files live in two locations:
- `.vscode/workflows/` — Primary location (VS Code extension auto-discovers these)
- `docs/workflows/` — Git-tracked backup copy

### Available Workflows

| # | File | Pipeline | Schedule | Nodes |
|---|------|----------|----------|-------|
| 1 | `yalla-content-to-revenue-pipeline.json` | **Content-to-Revenue** (HIGHEST PRIORITY) | Daily 5am UTC | 16 nodes, 20 connections |
| 2 | `yalla-seo-audit-fix-pipeline.json` | **SEO Audit & Fix** | Weekly Sun 5am UTC | 11 nodes, 14 connections |
| 3 | `yalla-analytics-intelligence-pipeline.json` | **Analytics Intelligence** | Daily 3am UTC | 9 nodes, 10 connections |
| 4 | `yalla-frontend-excellence-pipeline.json` | **Frontend Excellence** | On-demand | 10 nodes, 11 connections |
| 5 | `yalla-growth-social-pipeline.json` | **Growth & Social** | Weekly Mon 10am UTC | 9 nodes, 10 connections |
| 6 | `yalla-conversion-optimization-pipeline.json` | **Conversion Optimization** | Bi-weekly 1st & 15th | 9 nodes, 9 connections |
| 7 | `yalla-competitive-research-pipeline.json` | **Competitive Research** | Monthly 1st | 10 nodes, 11 connections |
| 8 | `yalla-master-orchestration.json` | **Master Orchestration** (overview) | All schedules | 9 pipeline nodes, 20 connections |

### Pipeline Details

**Pipeline 1: Content-to-Revenue (Daily)**
The most critical pipeline. End-to-end content lifecycle:
```
Topic Research → Content Builder (8 phases) → Quality Gate (≥70) →
Content Selector → Pre-Publication Gate (13 checks) → Schema Injection →
SEO Indexing → Affiliate Injection → SEO Monitor → CTR Check → Auto-Rewrite (loop)
```

**Pipeline 2: SEO Audit & Fix (Weekly)**
```
Site Crawler → [Technical Audit | Content Audit | CWV Audit] (parallel) →
Severity Router → Auto-Fix (critical) / Log Warnings → Report → Validate
```

**Pipeline 3: Analytics Intelligence (Daily)**
```
Data Collection → [Traffic Analysis | Revenue Tracking] (parallel) →
Audience Segmentation → Action Trigger → Dispatch / Dashboard Report
```

**Pipeline 4: Frontend Excellence (On-Demand)**
```
[Performance Audit | Accessibility Audit] (parallel) → Priority Router →
CWV Fix / A11Y Fix / Optimize → Test & Validate → Deploy
```

**Pipeline 5: Growth & Social (Weekly)**
```
Strategy → [Content Repurposing | Community Building] (parallel) →
Multi-Platform Distribution → Engagement Tracking → Iterate (loop)
```

**Pipeline 6: Conversion Optimization (Bi-Weekly)**
```
Data Analysis → Hypothesis → A/B Test Design → Monitor →
Implement Winner / Learn & Iterate
```

**Pipeline 7: Competitive Research (Monthly)**
```
[Competitor Discovery | Content Gap Analysis] (parallel) → Benchmark →
Content Strategy / Technical SEO / Strategy Report
```

**Master Orchestration (Overview)**
Shows all 7 pipelines as nodes with cross-pipeline data flows:
- Content → SEO: Articles pass pre-publication gate
- SEO → Content: Low CTR triggers auto-rewrite
- Analytics → CRO: Drop-off data feeds conversion priorities
- CRO → Frontend: A/B winners trigger component updates
- Frontend → SEO: Performance feeds CWV metrics
- Competitive → Content: Content gaps feed TopicProposals
- Content → Growth: Published articles repurposed for social
- All → Dashboard: Every pipeline reports to admin

## JSON Schema Reference

### Workflow Structure

```json
{
  "id": "unique-workflow-id",
  "name": "workflow-name",
  "description": "Human-readable description",
  "version": "1.0.0",
  "schemaVersion": "1.1.0",
  "nodes": [...],
  "connections": [...],
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "metadata": {
    "tags": ["tag1", "tag2"],
    "author": "author name"
  }
}
```

### Node Types

| Type | Purpose | Key Fields |
|------|---------|------------|
| `start` | Entry point | `data.label` |
| `end` | Exit point | `data.label` |
| `subAgent` | AI agent task | `data.prompt`, `data.model`, `data.color`, `data.description` |
| `ifElse` | Binary decision | `data.evaluationTarget`, `data.branches[2]` |
| `switch` | Multi-way routing | `data.evaluationTarget`, `data.branches[2-4]` |
| `skill` | Invoke a skill | `data.skillName`, `data.prompt` |
| `mcp` | MCP server call | `data.serverName`, `data.toolName` |
| `prompt` | LLM prompt | `data.prompt`, `data.model` |
| `human` | Human-in-loop | `data.prompt`, `data.timeout` |
| `loop` | Iteration | `data.maxIterations`, `data.condition` |
| `parallel` | Concurrent | `data.branches` |
| `transform` | Data transform | `data.expression` |

### Node Structure

```json
{
  "id": "unique-node-id",
  "type": "subAgent",
  "name": "display-name",
  "position": { "x": 300, "y": 200 },
  "data": {
    "description": "Short description",
    "prompt": "Detailed instructions for the agent",
    "model": "sonnet",
    "color": "blue",
    "outputPorts": 1
  }
}
```

### Connection Structure

```json
{
  "id": "unique-connection-id",
  "from": "source-node-id",
  "to": "target-node-id",
  "fromPort": "out|output|branch-0|branch-1|branch-2",
  "toPort": "input|in",
  "label": "Optional edge label"
}
```

### Colors

Available node colors: `blue`, `green`, `red`, `yellow`, `purple`, `orange`, `cyan`, `pink`.

### Models

Available model values: `haiku` (fast/cheap), `sonnet` (balanced), `opus` (most capable).

## Creating New Workflows

1. Create a new `.json` file in `.vscode/workflows/`
2. Copy the structure from an existing workflow
3. Define your nodes with unique IDs
4. Connect nodes with connections (fromPort/toPort must match node types)
5. Open in VS Code with the extension installed
6. Drag nodes to arrange the visual layout
7. Copy the file to `docs/workflows/` for git tracking

### Conventions

- **File naming**: `yalla-{pipeline-name}-pipeline.json`
- **Node IDs**: `{type}-{descriptive-name}` (e.g., `agent-topic-research`, `switch-severity`)
- **Connection IDs**: `conn-{from}-{to}` (e.g., `conn-start-crawl`)
- **Start nodes**: Position at left (x: 50)
- **End nodes**: Position at right (furthest x)
- **Flow direction**: Left to right
- **Parallel branches**: Stack vertically at same x position
