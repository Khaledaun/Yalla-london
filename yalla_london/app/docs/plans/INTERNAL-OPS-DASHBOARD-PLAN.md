# Internal Operations Dashboard — Execution Plan

**Date:** March 29, 2026
**Branch:** `claude/internal-ops-dashboard-EmCWZ`
**Status:** In Progress

## Overview

Complete restructuring of the admin dashboard from 7 navigation sections (~21 visible pages) to 15 top-level areas exposing all 121+ existing admin pages plus new pages for gaps.

## 15 Top-Level Areas

| # | Section | Key Pages | Status |
|---|---------|-----------|--------|
| 1 | Executive Overview | KPIs, health, alerts, revenue | Existing (cockpit) — enhance |
| 2 | Sites & Brands | Per-site control, brand kit, new site wizard | Existing — consolidate |
| 3 | Analytics & Attribution | GA4, GSC, affiliate attribution, funnel | Partial — wire GA4 |
| 4 | Leads & CRM | Pipeline, conversations, retention | Existing (agent CRM) — surface |
| 5 | Commerce & Bookings | Affiliate HQ, Stripe, charter inquiries | Existing — consolidate |
| 6 | Content & SEO | Pipeline, articles, topics, SEO audit, indexing | Existing — already rich |
| 7 | Social Media Bridge | Social calendar, hub, auto-post status | Existing pages — new nav section |
| 8 | Asset & Media Library | Media, Canva videos, Unsplash, uploads | Existing — consolidate |
| 9 | Docs & Knowledge | Legal pages, site research, audit log | Partial — new hub page |
| 10 | Design System Center | Brand kit, design studio, templates, tokens | Existing — new Canva-inspired hub |
| 11 | GitHub & DevOps | Dev tasks, deployment, PR activity | Partial — new page |
| 12 | Monitoring & Observability | Health, cycle-health, system diagnostics | Existing — consolidate |
| 13 | Cron & Scheduler | Departures, cron logs, feature flags | Existing — consolidate |
| 14 | Testing, QA & Logs | Smoke tests, audit export, JSON viewer, action logs | New hub page |
| 15 | Command Center | AI config, env vars, operations, emergency | Existing — consolidate |

## 4 Special Additions

1. **Design System Center** — Canva-inspired with brand preview, token explorer, component gallery
2. **Kaspo/Messaging** — placeholder integration surface (WhatsApp already built, Kaspo discovery)
3. **Social Media Bridge** — first-class section surfacing social-hub + social-calendar
4. **Testing/QA/Logs** — JSON pretty-print, raw toggle, copy button, severity badges, log viewer

## Feature Classification Labels

Every feature gets one of:
- `wired` — Existing and fully functional
- `partial` — Backend exists, UI incomplete
- `ui-only` — UI exists, no backend
- `planned` — Neither exists, placeholder
- `hidden` — Exists but not in navigation

## Safety Requirements

- Environment label (production/staging/dev) on every page
- Confirm dialogs on destructive actions
- Stale data indicators (>5min since last fetch)
- Disabled states for unconfigured features
- Secret redaction in JSON views

## Implementation Phases

1. Navigation restructure (mophy-admin-layout.tsx)
2. New hub pages for each of the 15 sections
3. Special additions (Design Center, Kaspo, Social Bridge, QA/Logs)
4. Safety hardening and feature classification badges
5. CLAUDE.md update + build verification + push
