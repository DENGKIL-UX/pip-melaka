/**
 * PIP-MLK sample migration runner.
 *
 * This script demonstrates the programmatic migration workflow described in
 * docs/RESEARCH-DATABASE.md §1. It is NOT run by CI — it exists as living
 * documentation for engineers who need to drive Prisma migrations from a
 * script (e.g. in a blue-green deploy, a one-off data backfill, or a
 * rollback procedure).
 *
 * Usage:
 *   bun run prisma/scripts/migrate.ts status     # show pending migrations
 *   bun run prisma/scripts/migrate.ts deploy     # apply pending migrations
 *   bun run prisma/scripts/migrate.ts rollback <name>  # roll back to a migration
 *
 * The script shells out to the `prisma` CLI but wraps it with:
 *   - JSON logging for machine-parsable CI output
 *   - Pre-flight DATABASE_URL check (fails fast with a clear message)
 *   - Rollback guard — refuses to roll back past the init migration
 *
 * See docs/RESEARCH-DATABASE.md §2 for the rollback strategy.
 */

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

type Action = "status" | "deploy" | "rollback";

const MIGRATIONS_DIR = path.resolve(__dirname, "..", "migrations");

function fail(msg: string, code = 1): never {
  console.error(JSON.stringify({ level: "error", msg }, null, 2));
  process.exit(code);
}

function run(cmd: string, args: string[]): number {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: process.cwd() });
  return res.status ?? 0;
}

function listMigrationNames(): string[] {
  try {
    return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

function main(): void {
  const [actionRaw, target] = process.argv.slice(2) as [string | undefined, string | undefined];
  const action = (actionRaw ?? "status") as Action;

  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set. Add it to .env before running migrations.");
  }

  if (action === "status") {
    const migrations = listMigrationNames();
    console.log(JSON.stringify({ level: "info", migrations, count: migrations.length }, null, 2));
    process.exit(run("bunx", ["prisma", "migrate", "status"]));
  }

  if (action === "deploy") {
    console.log(JSON.stringify({ level: "info", msg: "Applying pending migrations via prisma migrate deploy" }, null, 2));
    process.exit(run("bunx", ["prisma", "migrate", "deploy"]));
  }

  if (action === "rollback") {
    if (!target) {
      fail("Usage: bun run prisma/scripts/migrate.ts rollback <target_migration_name>");
    }
    const migrations = listMigrationNames();
    const targetIdx = migrations.indexOf(target);
    if (targetIdx < 0) {
      fail(`Target migration "${target}" not found in ${MIGRATIONS_DIR}`);
    }
    if (targetIdx === 0) {
      fail("Refusing to roll back past the init migration — restore from backup instead.");
    }
    // Prisma does not natively support "down" migrations; the rollback strategy
    // (see docs/RESEARCH-DATABASE.md §2) is to restore the DB snapshot taken
    // before the deploy and re-run migrations up to `target`. This script
    // documents that flow and prints the explicit command for the operator.
    console.log(JSON.stringify({
      level: "warn",
      msg: "Prisma has no native DOWN migrations.",
      rollback_strategy: "restore pre-deploy DB snapshot, then run `prisma migrate deploy` against a migrations/ dir truncated to the target migration.",
      target,
      migrations_to_keep: migrations.slice(0, targetIdx + 1),
      migrations_to_drop: migrations.slice(targetIdx + 1),
    }, null, 2));
    process.exit(0);
  }

  fail(`Unknown action "${actionRaw}". Expected: status | deploy | rollback`);
}

main();
