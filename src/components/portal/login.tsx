"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/portal/form";
import { Field, Input } from "@/components/portal/ui";

export function LoginForm({ portal, next }: { portal: "student" | "admin"; next?: string }) {
  const [state, action] = useActionState(signIn, undefined);
  const isStudent = portal === "student";

  return (
    <div className="portal flex min-h-screen flex-1 items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mx-auto block w-fit">
          <Image src="/images/logo.png" alt="Millennium Air Hostess Academy" width={900} height={174} priority className="h-9 w-auto" />
        </Link>
        <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-[0_20px_60px_-30px_rgba(24,24,27,0.2)] sm:p-7">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase"><span className="size-1.5 rounded-full bg-good" />{isStudent ? "Student portal" : "Staff & admin portal"}</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">
            {isStudent ? "Sign in with the details the institute gave you." : "Sign in with your staff account."}
          </p>

          <form action={action} className="mt-6 space-y-4">
            <input type="hidden" name="portal" value={portal} />
            <input type="hidden" name="next" value={next ?? ""} />
            <Field label={isStudent ? "Roll number or email" : "Email"}>
              <Input
                name="identifier"
                type={isStudent ? "text" : "email"}
                autoComplete="username"
                required
                placeholder={isStudent ? "e.g. MAA2026-014" : "you@millenniumairhostess.com"}
              />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" autoComplete="current-password" required />
            </Field>
            <FormMessage state={state} />
            <div className="pt-1 [&>button]:w-full">
              <SubmitButton>Sign in</SubmitButton>
            </div>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          {isStudent ? (
            "Forgot your password? Ask the front office to reset it."
          ) : (
            <>
              Student?{" "}
              <Link href="/student/login" className="font-medium text-ink underline-offset-2 hover:underline">
                Student portal
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
