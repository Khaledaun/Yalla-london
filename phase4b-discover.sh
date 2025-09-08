#!/usr/bin/env bash
# Phase 4B – Discovery (resilient; always finishes with a report)
set +e
set +u
set +H

STAMP="$(date +%F_%H%M%S)"
OUTDIR="$PWD/.phase4b-discovery"   # absolute path so it always exists
mkdir -p "$OUTDIR"
REPORT="$OUTDIR/discovery-$STAMP.md"

log() { printf '%s\n' "$*" >&2; }
add() { printf '%s\n' "$*" >> "$REPORT"; }
hr()  { printf '\n---\n\n' >> "$REPORT"; }

# ---------- App dir autodetect ----------
APP_DIR=""
if   [ -f "yalla_london/app/package.json" ]; then APP_DIR="yalla_london/app"
elif [ -f "package.json" ] && [ -d "prisma" ]; then APP_DIR="."
elif [ -d "yalla_london/app" ]; then APP_DIR="yalla_london/app"
fi
[ -n "$APP_DIR" ] || APP_DIR="yalla_london/app"

cd "$APP_DIR" 2>/dev/null || log "WARN: cannot cd into $APP_DIR (continuing anyway)"

# ---------- Repo / tools ----------
REPO_TOP="$(git rev-parse --show-toplevel 2>/dev/null)"
BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null)"
LAST_COMMIT="$(git log -1 --pretty=format:'%h %ad %s (%an)' --date=iso 2>/dev/null)"
REMOTE_URL="$(git config --get remote.origin.url 2>/dev/null)"
NODE_V="$(node -v 2>/dev/null)"
YARN_V="$(yarn -v 2>/dev/null)"
NPM_V="$(npm -v 2>/dev/null)"

# ---------- package.json / Next ----------
NEXT_VER="$(node - <<'NODE' 2>/dev/null || true
const fs=require('fs');
try{const j=JSON.parse(fs.readFileSync('package.json','utf8'));
const v=(j.dependencies&&j.dependencies.next)||(j.devDependencies&&j.devDependencies.next)||'';
process.stdout.write(String(v||''));}catch{process.stdout.write('');}
NODE
)"
PKG_SCRIPTS="$(node - <<'NODE' 2>/dev/null || true
const fs=require('fs');try{const j=JSON.parse(fs.readFileSync('package.json','utf8'));
console.log(JSON.stringify(j.scripts||{},null,2));}catch{console.log("{}");}
NODE
)"
NEXT_CFG=""
for f in next.config.{js,mjs,ts,cjs}; do [ -f "$f" ] && NEXT_CFG="$f" && break; done

# ---------- ENV (masked) ----------
ENV_MASKED=""
if [ -f ".env" ]; then
  ENV_MASKED="$(awk -F= '
    /^DIRECT_URL=|^DATABASE_URL=|^NEXT_PUBLIC_/ {
      gsub(/:\/\/[^:]+:[^@]+@/,"://USER:******@",$2);
      print $1"="$2
    }' .env 2>/dev/null)"
fi
DIRECT_URL="$(sed -n 's/^DIRECT_URL=//p' .env | tail -n1)"

# ---------- Prisma / migrations ----------
PRISMA_V="$(npx --yes prisma -v 2>/dev/null)"
SCHEMA_BLOCK="$(awk '/^datasource[[:space:]]+db[[:space:]]*{/,/}/ {print}' prisma/schema.prisma 2>/dev/null)"
SCHEMA_PROVIDER="$(printf '%s\n' "$SCHEMA_BLOCK" | awk -F= '/provider/{gsub(/[ "]/,"",$2);print $2}')"
HAS_DIRECTURL="no"; printf '%s' "$SCHEMA_BLOCK" | grep -q 'directUrl' && HAS_DIRECTURL="yes"
MODEL_COUNT="$(grep -Ec '^[[:space:]]*model[[:space:]]+[A-Za-z0-9_]+' prisma/schema.prisma 2>/dev/null)"
ENUM_COUNT="$(grep -Ec  '^[[:space:]]*enum[[:space:]]+[A-Za-z0-9_]+'  prisma/schema.prisma 2>/dev/null)"
MIG_DIRS="$(ls -1 prisma/migrations 2>/dev/null | wc -l | tr -d ' ')"

# psql client
if ! command -v psql >/dev/null 2>&1; then
  log "INFO: installing psql client"
  sudo apt-get update -y >/dev/null 2>&1
  sudo apt-get install -y postgresql-client >/dev/null 2>&1
fi

MIG_SNAPSHOT=""
if [ -n "$DIRECT_URL" ]; then
  MIG_SNAPSHOT="$(psql "$DIRECT_URL" -c '\x' \
    -c 'select id,migration_name,started_at,finished_at,rolled_back_at from "_prisma_migrations" order by started_at desc limit 10;' 2>&1)"
fi

# ---------- DB snapshot ----------
DB_STATS=""
if [ -n "$DIRECT_URL" ]; then
  DB_STATS="$(psql "$DIRECT_URL" -v ON_ERROR_STOP=1 \
    -c 'select to_regclass('"'"'public."BlogPost"'"'"') as "BlogPost", to_regclass('"'"'public."Category"'"'"') as "Category", to_regclass('"'"'public."Place"'"'"') as "Place", to_regclass('"'"'public."PageTypeRecipe"'"'"') as "PageTypeRecipe", to_regclass('"'"'public."RulebookVersion"'"'"') as "RulebookVersion";' \
    -c 'select count(*) as places from "Place";' \
    -c 'select type, count(*) from "PageTypeRecipe" group by 1 order by 1;' \
    -c 'select version, is_active from "RulebookVersion" order by created_at desc limit 3;' 2>&1)"
fi

# ---------- Routes ----------
API_ROUTES="$(find app -type f \( -name 'route.ts' -o -name 'route.js' \) 2>/dev/null | sed 's#^app/##' | sort)"
PAGE_ROUTES="$(find app -type f -name 'page.*' 2>/dev/null | sed 's#^app/##' | sort)"

# ---------- Tests / Vercel markers ----------
HAS_PLAYWRIGHT="no"; { [ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ]; } && HAS_PLAYWRIGHT="yes"
HAS_JEST="no";       { [ -f "jest.config.ts" ] || [ -f "jest.config.js" ]; } && HAS_JEST="yes"
VERCEL_META=""
[ -f ".vercel/project.json" ] && VERCEL_META="$(cat .vercel/project.json 2>/dev/null)"
[ -z "$VERCEL_META" ] && [ -f "../.vercel/project.json" ] && VERCEL_META="$(cat ../.vercel/project.json 2>/dev/null)"

# ---------- Write report ----------
add "# Phase-4B Discovery Report ($STAMP)"
hr
add "## Repo & Tooling"
add "- Repo root: \`${REPO_TOP:-<unknown>}\`"
add "- Branch: \`${BRANCH:-<unknown>}\`"
add "- Last commit: ${LAST_COMMIT:-<unknown>}"
add "- Remote: \`${REMOTE_URL:-<unknown>}\`"
add "- Node: \`${NODE_V:-n/a}\`, Yarn: \`${YARN_V:-n/a}\`, npm: \`${NPM_V:-n/a}\`"
hr

add "## Next.js / Build Setup"
add "- App dir: \`$(pwd)\`"
add "- Next (from package.json): \`${NEXT_VER:-n/a}\`"
add "- Next config: \`${NEXT_CFG:-<none>}\`"
add ""
add "### package.json scripts"
add '```json'
add "${PKG_SCRIPTS:-{}}"
add '```'
hr

add "## Environment (.env) — masked"
if [ -n "$ENV_MASKED" ]; then
  add '```env'
  add "$ENV_MASKED"
  add '```'
else
  add "_No .env / or matching keys not found_"
fi
hr

add "## Prisma"
add "- Prisma CLI: \`$(printf '%s' "$PRISMA_V" | tr -d '\r')\`"
add "- Datasource provider: \`${SCHEMA_PROVIDER:-n/a}\`"
add "- directUrl present: \`${HAS_DIRECTURL}\`"
add "- Models: \`${MODEL_COUNT:-0}\`, Enums: \`${ENUM_COUNT:-0}\`"
add "- Migrations count: \`${MIG_DIRS:-0}\`"
add ""
add "### _prisma_migrations snapshot (last 10)"
add '```'
add "${MIG_SNAPSHOT:-<no data>}"
add '```'
hr

add "## Database snapshot"
add '```'
add "${DB_STATS:-<skipped: DIRECT_URL missing/unreachable>}"
add '```'
hr

add "## Routes (App Router)"
add "### API routes"
if [ -n "$API_ROUTES" ]; then printf '%s\n' "$API_ROUTES" | sed 's/^/- /' >> "$REPORT"; else add "_None found_"; fi
add ""
add "### Page routes"
if [ -n "$PAGE_ROUTES" ]; then printf '%s\n' "$PAGE_ROUTES" | sed 's/^/- /' >> "$REPORT"; else add "_None found_"; fi
hr

add "## Tests / QA"
add "- Playwright config present: \`${HAS_PLAYWRIGHT}\`"
add "- Jest config present: \`${HAS_JEST}\`"
hr

add "## Vercel project markers"
if [ -n "$VERCEL_META" ]; then
  add '```json'; add "$VERCEL_META"; add '```'
else
  add "_No .vercel/project.json found locally_"
fi
hr

add "_Generated by phase4b-discover.sh_"
echo "✅ Discovery complete."
echo "Report → $REPORT"
