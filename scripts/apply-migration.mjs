// Applies one SQL file from supabase/migrations to the project's database through the Supabase Management API
// (there's no Supabase CLI or direct Postgres access on this machine). Needs a personal access token from
// https://supabase.com/dashboard/account/tokens; the project ref is read from NEXT_PUBLIC_SUPABASE_URL.
//
//   SUPABASE_ACCESS_TOKEN=sbp_… node --env-file=.env.local scripts/apply-migration.mjs 0014
//   SUPABASE_ACCESS_TOKEN=sbp_… node --env-file=.env.local scripts/apply-migration.mjs 0014 --check   → only list the jobs_* tables
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
const [prefix, flag] = process.argv.slice(2);
if (!token || !ref || !prefix) {
  console.error("Usage: SUPABASE_ACCESS_TOKEN=sbp_… node --env-file=.env.local scripts/apply-migration.mjs <number> [--check]");
  process.exit(1);
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  return body;
}

const dir = "supabase/migrations";
const file = readdirSync(dir).find((f) => f.startsWith(prefix));
if (!file) throw new Error(`no migration starting with ${prefix} in ${dir}`);

if (flag !== "--check") {
  console.log(`applying ${file} to ${ref}…`);
  await query(readFileSync(join(dir, file), "utf8"));
  console.log("done");
}
const tables = await query("select tablename from pg_tables where schemaname = 'public' and tablename like 'jobs%' order by 1");
console.log(`jobs tables (${tables.length}): ${tables.map((t) => t.tablename).join(", ")}`);
