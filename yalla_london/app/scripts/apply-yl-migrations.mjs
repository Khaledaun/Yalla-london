#!/usr/bin/env node
/**
 * YL custom migration runner ("Option B-light")
 * ------------------------------------------------
 * Auto-applies raw SQL migrations under prisma/migrations/<dir>/migration.sql on every
 * Vercel deploy, WITHOUT using Prisma's native migration system.
 *
 * Background: YL's migrations are hand-authored raw SQL with no migration_lock.toml, and
 * historically were applied out-of-band (Supabase MCP / SQL editor). `prisma migrate deploy`
 * was never able to run them. This runner gives us a simple, low-risk, idempotent mechanism:
 *
 *   - A bookkeeping table `public._yl_migrations_applied` tracks which migration dirs ran.
 *   - On the VERY FIRST run (table just created, zero rows) it GRANDFATHERS every existing
 *     migration dir as already-applied, so we never re-run SQL that was applied by hand.
 *   - Thereafter, any migration dir not yet recorded is executed inside a single transaction
 *     and recorded. A SQL error rolls back and fails the build (exit 1).
 *
 * Going forward: drop a new prisma/migrations/<YYYYMMDD>_<slug>/migration.sql and it auto-applies
 * on the next deploy. No more out-of-band application.
 *
 * Runs via package.json "build" before `next build`. Uses `pg` (already a runtime dep).
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const TAG = '[yl-migrations]';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'prisma', 'migrations');

function log(msg) {
  console.log(`${TAG} ${msg}`);
}

function fail(msg) {
  console.error(`${TAG} ERROR: ${msg}`);
}

/** Migration directory names (sorted) that actually contain a migration.sql. */
function listMigrationDirs() {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => {
      const full = join(MIGRATIONS_DIR, name);
      // Only directories (skips stray files like add-seo-tables.sql).
      if (!statSync(full).isDirectory()) return false;
      return existsSync(join(full, 'migration.sql'));
    })
    .sort(); // YYYYMMDD prefix gives natural chronological order.
}

function buildSslConfig(connectionString) {
  const lower = connectionString.toLowerCase();
  const isLocal = lower.includes('localhost') || lower.includes('127.0.0.1');
  if (isLocal || lower.includes('sslmode=disable')) return false;
  // Supabase / hosted Postgres require SSL; don't reject self-signed chain in the pooler.
  return { rejectUnauthorized: false };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // No DB available at build time (e.g. an env without DATABASE_URL). Skip without
    // breaking the build — mirrors the legacy deploy-migrations.sh graceful-skip behavior.
    log('DATABASE_URL not set, skipping migration runner');
    return;
  }

  const dirs = listMigrationDirs();

  const client = new Client({
    connectionString,
    ssl: buildSslConfig(connectionString),
    connectionTimeoutMillis: 15000,
    statement_timeout: 120000,
  });

  // Connection/environment failures (DB unreachable at build time) must NOT break the
  // build — this project's Vercel build cannot always reach the database (the legacy
  // deploy-migrations.sh is wrapped in `|| echo` for exactly this reason). We skip loudly
  // and the migration will auto-apply on the next deploy where the DB is reachable.
  // A genuine migration SQL failure (below) is different and DOES fail the build (exit 1).
  try {
    await client.connect();
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    log(`Could not connect to DATABASE_URL (${msg}) — skipping migration runner; will apply on a deploy with DB access`);
    await client.end().catch(() => {});
    return;
  }

  try {
    // 1. Ensure bookkeeping table exists. Detect whether WE just created it.
    const existed = await client.query(
      `SELECT to_regclass('public._yl_migrations_applied') IS NOT NULL AS present`
    );
    const tablePreexisted = existed.rows[0].present === true;

    await client.query(`
      CREATE TABLE IF NOT EXISTS public._yl_migrations_applied (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    let appliedRows = await client.query(
      `SELECT name FROM public._yl_migrations_applied`
    );

    // 2. First-run bootstrap: table is brand-new AND empty -> grandfather everything.
    const isFirstRun = !tablePreexisted && appliedRows.rowCount === 0;
    if (isFirstRun) {
      log('Created bookkeeping table');
      if (dirs.length > 0) {
        // Insert all existing migration dir names as already-applied in one statement.
        const values = dirs.map((_, i) => `($${i + 1})`).join(', ');
        await client.query(
          `INSERT INTO public._yl_migrations_applied (name) VALUES ${values}
           ON CONFLICT (name) DO NOTHING`,
          dirs
        );
      }
      log(`Grandfathered ${dirs.length} existing migrations`);
      appliedRows = await client.query(
        `SELECT name FROM public._yl_migrations_applied`
      );
    }

    const applied = new Set(appliedRows.rows.map((r) => r.name));

    // 3. Apply any migration dir not yet recorded.
    const pending = dirs.filter((name) => !applied.has(name));
    if (pending.length === 0) {
      log('Nothing to apply');
      return;
    }

    for (const name of pending) {
      const sqlPath = join(MIGRATIONS_DIR, name, 'migration.sql');
      const sql = readFileSync(sqlPath, 'utf8');
      log(`Applying ${name}`);
      try {
        await client.query('BEGIN');
        await client.query(sql); // simple protocol -> multi-statement file runs as one batch
        await client.query(
          `INSERT INTO public._yl_migrations_applied (name) VALUES ($1)`,
          [name]
        );
        await client.query('COMMIT');
        log(`OK ${name}`);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        fail(`Failed applying ${name}: ${err && err.message ? err.message : err}`);
        throw err;
      }
    }
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  fail(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
