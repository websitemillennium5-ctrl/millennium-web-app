import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/portal/login";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Student login", robots: { index: false } };

export default async function StudentLogin({ searchParams }: PageProps<"/student/login">) {
  const profile = await getProfile();
  if (profile?.role === "student") redirect("/student");
  const { next, error } = await searchParams;
  return <LoginForm portal="student" next={typeof next === "string" ? next : undefined} error={typeof error === "string" ? error : undefined} />;
}
