// Sets the Supabase Auth settings the portals rely on, through the Management API (no Supabase CLI here):
// the site URL, the redirect allow-list for "Continue with Google" (web callback + the student app's scheme), and
// — when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are given — the Google provider itself.
// The Google OAuth client is a "Web application" client in Google Cloud Console whose authorised redirect URI is
// https://<project-ref>.supabase.co/auth/v1/callback. Needs a personal access token from
// https://supabase.com/dashboard/account/tokens; the project ref is read from NEXT_PUBLIC_SUPABASE_URL.
//
//   SUPABASE_ACCESS_TOKEN=sbp_… node --env-file=.env.local scripts/configure-auth.mjs --show
//   SUPABASE_ACCESS_TOKEN=sbp_… GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=… node --env-file=.env.local scripts/configure-auth.mjs
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
const show = process.argv.includes("--show");
if (!token || !ref) {
  console.error("Usage: SUPABASE_ACCESS_TOKEN=sbp_… [GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=…] node --env-file=.env.local scripts/configure-auth.mjs [--show]");
  process.exit(1);
}

const SITE_URL = "https://www.millenniumairhostess.com";
const REDIRECTS = [
  `${SITE_URL}/auth/callback`, // student login on the website
  "https://millenniumairhostess.com/auth/callback",
  "http://localhost:3000/auth/callback", // next dev
  "millenniumstudent://auth/callback", // the student app (app.json "scheme")
];

const KEYS = ["site_url", "uri_allow_list", "external_google_enabled", "external_google_client_id", "external_google_secret"];
const endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };

async function current() {
  const res = await fetch(endpoint, { headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  return Object.fromEntries(KEYS.map((k) => [k, k === "external_google_secret" ? (body[k] ? "<set>" : "") : body[k]]));
}

if (show) {
  console.log(await current());
  process.exit(0);
}

const patch = { site_url: SITE_URL, uri_allow_list: REDIRECTS.join(",") };
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  Object.assign(patch, { external_google_enabled: true, external_google_client_id: GOOGLE_CLIENT_ID, external_google_secret: GOOGLE_CLIENT_SECRET });
} else {
  console.log("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not given: leaving the Google provider as it is");
}

const res = await fetch(endpoint, { method: "PATCH", headers, body: JSON.stringify(patch) });
if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
console.log("updated:", await current());
