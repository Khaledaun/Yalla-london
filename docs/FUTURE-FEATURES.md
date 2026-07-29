# Future Features

Features that are waiting on external dependencies before activation. No code changes until conditions are met.

---

## Remotion on Vercel Sandbox
- Status: WAITING — feature is experimental as of March 2026
- Decision: Do NOT activate until Vercel Sandbox is marked stable by Remotion team
- Check URL: https://www.remotion.dev/docs/vercel
- What to look for: removal of the "experimental" warning banner on that page
- When ready: update render-engine.ts to use @remotion/vercel instead of AWS Lambda
- Existing files already built (do not modify):
  - lib/video/render-engine.ts
  - lib/video/prompt-to-video.ts
  - components/video-studio/video-player.tsx
  - app/api/admin/video-studio/route.ts
  - app/admin/video-studio/page.tsx
- Required env vars when activating (add to Vercel, not now):
  - REMOTION_VERCEL_SANDBOX=true
  - VERCEL_BLOB_READ_WRITE_TOKEN (likely already exists)
- Weekly check owner: Khaled — visit the URL above every Monday, check for stable status
