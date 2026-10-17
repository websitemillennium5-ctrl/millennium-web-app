import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "student" | "staff" | "admin";

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  email: string | null;
  phone: string | null;
  course_slug: string | null;
  batch: string | null;
  roll_no: string | null;
  student_id: string | null;
  fee_total: number;
  joined_on: string;
  created_at: string;
};

/** The signed-in user's profile, verified against Supabase Auth. Deduped per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return (profile as Profile | null) ?? null;
});

export const isStaffRole = (role: Role) => role === "staff" || role === "admin";

/** Use at the top of a student page/layout/action. */
export async function requireStudent() {
  const profile = await getProfile();
  if (!profile) redirect("/student/login");
  if (profile.role !== "student") redirect("/admin");
  return profile;
}

/** Use at the top of an admin page/layout/action. Pass "admin" for admin-only areas. */
export async function requireStaff(minRole: "staff" | "admin" = "staff") {
  const profile = await getProfile();
  if (!profile) redirect("/admin/login");
  if (!isStaffRole(profile.role)) redirect("/student");
  if (minRole === "admin" && profile.role !== "admin") redirect("/admin");
  return profile;
}
