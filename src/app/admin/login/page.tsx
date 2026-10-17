import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/portal/login";
import { getProfile, isStaffRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Staff login", robots: { index: false } };

export default async function AdminLogin({ searchParams }: PageProps<"/admin/login">) {
  const profile = await getProfile();
  if (profile && isStaffRole(profile.role)) redirect("/admin");
  const { next } = await searchParams;
  return <LoginForm portal="admin" next={typeof next === "string" ? next : undefined} />;
}
