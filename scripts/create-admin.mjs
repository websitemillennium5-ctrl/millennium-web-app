// Creates the first admin login (after that, admins add staff from /admin/staff).
// Usage: node --env-file=.env.local scripts/create-admin.mjs you@example.com "Full Name" [password]
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [email, fullName = "Admin", password = randomBytes(9).toString("base64url")] = process.argv.slice(2);
if (!email) {
  console.error('Usage: node --env-file=.env.local scripts/create-admin.mjs you@example.com "Full Name" [password]');
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
  app_metadata: { role: "admin" },
});
if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}

// app_metadata isn't visible to the signup trigger yet, so set the role on the profile directly
const { data: profile } = await supabase.from("profiles").update({ role: "admin" }).eq("id", data.user.id).select("role").single();
if (profile?.role !== "admin") {
  console.error("User created but no admin profile found — did you run supabase/migrations/0001_portals.sql?");
  process.exit(1);
}
console.log(`Admin created.\n  Email:    ${email}\n  Password: ${password}\n  Sign in:  /admin/login`);
