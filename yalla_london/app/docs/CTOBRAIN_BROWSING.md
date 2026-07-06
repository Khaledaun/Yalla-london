# CTO Agent — Browsing Policy & Allow-List

## Overview

The CTO Agent has limited browsing capability for researching best practices, checking documentation, and verifying the live site. All browsing is **read-only** and restricted to a strict domain allow-list.

## Allow-List

| Domain | Purpose | Path Restriction |
|--------|---------|-----------------|
| `nextjs.org` | Next.js framework documentation | `/docs/*` |
| `www.prisma.io` | Prisma ORM documentation | `/docs/*` |
| `vercel.com` | Vercel deployment documentation | `/docs/*` |
| `developers.google.com` | GA4, GSC, Search Central docs | Any path |
| `developer.mozilla.org` | Web standards (MDN) | Any path |
| `www.yalla-london.com` | Own site — live testing | Any path |
| `github.com` | Own repositories only | `/khaledaun/*` only |

## Rules

1. **Strict allow-list enforcement** — Any URL not matching the allow-list is rejected immediately. No exceptions.
2. **Read-only** — Only `GET` and `HEAD` methods are permitted. No `POST`, `PUT`, `DELETE`, or `PATCH`.
3. **No redirect following to disallowed domains** — If a page redirects to a domain not on the allow-list, the redirect is not followed.
4. **Response size cap** — Response bodies are truncated to 500 KB by default. This prevents memory issues from large pages.
5. **Timeout** — All fetches have a 10-second timeout via `AbortController`.
6. **HTML stripping** — Script and style blocks are removed, then remaining HTML tags are stripped to extract clean text content.
7. **User-Agent** — All requests identify as `YallaLondon-CTO-Agent/1.0`.
8. **GitHub restriction** — `github.com` is further restricted to paths starting with `/khaledaun/` to prevent browsing arbitrary repositories.

## When Browsing Is Used

The CTO Agent browses documentation during its maintenance loop:

- **Phase 2 (BROWSE)** — After scanning the codebase for issues, the CTO may research fixes by checking relevant documentation
- **On-demand tasks** — When triggered manually via the admin API, browsing may be used to research specific topics

## Adding New Domains

To add a new domain to the allow-list:

1. Edit `lib/agents/tools/browsing.ts`
2. Add the domain to the `ALLOWED_DOMAINS` array
3. Update this document
4. Document the rationale (why this domain is needed)

New domains should only be added for:
- Official documentation of technologies used in this project
- Trusted industry sources for SEO/web standards
- Own properties (sites, repositories)

Never add:
- General search engines
- Social media platforms
- Arbitrary third-party sites
- User-submitted URLs

## Security Considerations

- The allow-list prevents SSRF (Server-Side Request Forgery) attacks
- No internal/private IPs are reachable (domains resolve to public IPs only)
- Credentials are never sent in browsing requests
- Response content is treated as untrusted — never executed or eval'd
