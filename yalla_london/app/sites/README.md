# Per-Site Directories

Each subdirectory here corresponds to a branded site in `config/sites.ts`.
Changes to files inside `sites/{site-id}/` only trigger a Vercel deployment
for **that specific site's project**, not all projects.

## Structure

```
sites/
  yalla-london/         # Only triggers yalla-london Vercel project
    assets/             # Site-specific images, logos, etc.
    content/            # Site-specific content overrides
    overrides/          # Site-specific component/config overrides
  arabaldives/
    ...
  gulf-maldives/
    ...
```

## How It Works

Each Vercel project has `SITE_ID` env var and uses `scripts/should-deploy.sh`
as its Ignored Build Step. The script checks git diff:

- **Core files changed** (lib/, components/, app/, middleware.ts, etc.) → ALL sites build
- **Only `sites/yalla-london/` changed** → only yalla-london builds
- **Only docs/scripts/.claude changed** → NO sites build

## Setup per Vercel Project

1. Go to Vercel Dashboard → Project → Settings → Git
2. Set "Ignored Build Step" to: `bash scripts/should-deploy.sh`
3. Add env var: `SITE_ID` = `yalla-london` (or the site's ID)
