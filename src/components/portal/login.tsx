"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { signIn, signInWithGoogle } from "@/app/actions/auth";
import { courses, site, telHref } from "@/lib/site";
import { FormMessage } from "@/components/portal/form";
import { GoogleMark } from "@/components/portal/google-mark";

/** `error` is a message carried back from the Google callback (/auth/callback) in the URL. */
export function LoginForm({ portal, next, error }: { portal: "student" | "admin"; next?: string; error?: string }) {
  const [state, action] = useActionState(signIn, undefined);
  const isStudent = portal === "student";

  return (
    <div className="portal grid min-h-screen flex-1 bg-white lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-ink lg:block">
        <Image src="/images/crew-terminal.jpg" alt="" fill priority sizes="50vw" className="object-cover object-[70%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
          <Link href="/" className="w-fit">
            <Image src="/images/logo-light.png" alt="Millennium Air Hostess Academy" width={900} height={174} className="h-9 w-auto" />
          </Link>
          <div className="max-w-md">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-white/60 uppercase">Where dreams take flight</p>
            <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
              {isStudent ? "Your journey to the skies starts here." : "Everything the academy runs, in one place."}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              {isStudent
                ? "Track your classes, fees and documents, and apply to airline openings picked for you."
                : "Manage students, enquiries, fees and airline job listings for Millennium Air Hostess Academy."}
            </p>
            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {[
                ["Students placed", "450+"],
                ["Placement help", "100%"],
                ["Programs", String(courses.length)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] tracking-wide text-white/55 uppercase">{label}</dt>
                  <dd className="mt-1 text-xl font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </aside>

      <main className="relative flex min-h-screen flex-col bg-canvas lg:bg-white">
        {/* faint dot grid, fading out toward the form */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_65%)] lg:block"
        />

        <header className="relative flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" className="lg:hidden">
            <Image src="/images/logo.png" alt="Millennium Air Hostess Academy" width={900} height={174} priority className="h-8 w-auto" />
          </Link>
          <Link href="/" className="hidden items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink lg:inline-flex">
            <ArrowLeft className="size-4" /> Back to website
          </Link>
          <a href={telHref(site.phones[0])} className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
            <Phone className="size-3.5" />
            <span className="hidden sm:inline">Need help?</span> <span className="font-medium text-ink">{site.phones[0]}</span>
          </a>
        </header>

        <div className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-[0_24px_64px_-32px_rgba(24,24,27,0.25)] sm:p-9">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#a7222d]/10 text-[#a7222d]">
              {isStudent ? <UserRound className="size-6" /> : <ShieldCheck className="size-6" />}
            </span>
            <p className="mt-6 flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">
              <span className="size-1.5 rounded-full bg-good" />
              {isStudent ? "Student portal" : "Staff & admin portal"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted">
              {isStudent ? "Sign in with the details the institute gave you." : "Sign in with your staff account to continue."}
            </p>

            <form action={action} className="mt-8 space-y-5">
              <input type="hidden" name="portal" value={portal} />
              <input type="hidden" name="next" value={next ?? ""} />
              <IconField label={isStudent ? "Roll number or email" : "Email address"} icon={isStudent ? UserRound : Mail}>
                <input
                  name="identifier"
                  type={isStudent ? "text" : "email"}
                  autoComplete="username"
                  required
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={isStudent ? "e.g. MAA2026-014" : "you@millenniumairhostess.com"}
                  className={loginInput}
                />
              </IconField>
              <PasswordField />
              <FormMessage state={state ?? (error ? { error } : undefined)} />
              <LoginButton />
            </form>

            {isStudent && (
              <>
                <p className="my-5 flex items-center gap-3 text-xs text-muted" aria-hidden>
                  <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
                </p>
                <form action={signInWithGoogle}>
                  <input type="hidden" name="next" value={next ?? ""} />
                  <GoogleButton />
                </form>
                <p className="mt-3 text-center text-xs text-muted">Works with the Gmail address on your student record.</p>
              </>
            )}

            <p className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
              {isStudent ? (
                "Forgot your password? Ask the front office to reset it."
              ) : (
                <>
                  Are you a student?{" "}
                  <Link href="/student/login" className="font-semibold text-[#a7222d] underline-offset-2 hover:underline">
                    Go to the student portal
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        <footer className="relative flex flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-muted sm:flex-row sm:px-8 lg:px-12">
          <span>© {new Date().getFullYear()} {site.name}</span>
          <span className="inline-flex items-center gap-1.5">
            <LockKeyhole className="size-3.5" /> Secure, encrypted sign-in
          </span>
        </footer>
      </main>
    </div>
  );
}

const loginInput =
  "h-12 w-full rounded-xl border border-line bg-white pr-4 pl-11 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-[#a7222d] focus:ring-4 focus:ring-[#a7222d]/10 autofill:shadow-[inset_0_0_0_1000px_white]";

function IconField({ label, icon: Icon, children, action }: { label: string; icon: typeof Mail; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-ink-soft">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted" />
        {children}
        {action}
      </span>
    </label>
  );
}

function PasswordField() {
  const [show, setShow] = useState(false);
  return (
    <IconField
      label="Password"
      icon={LockKeyhole}
      action={
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-mist hover:text-ink"
        >
          {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      }
    >
      <input name="password" type={show ? "text" : "password"} autoComplete="current-password" required className={`${loginInput} pr-12`} />
    </IconField>
  );
}

function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-white text-[15px] font-medium text-ink transition hover:border-ink/25 hover:bg-mist disabled:opacity-70"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
      {pending ? "Opening Google…" : "Continue with Google"}
    </button>
  );
}

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#a7222d] text-[15px] font-semibold text-white shadow-lg shadow-[#a7222d]/25 transition hover:bg-[#861b24] disabled:opacity-70"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? "Signing in…" : "Sign in"}
      {!pending && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
    </button>
  );
}
