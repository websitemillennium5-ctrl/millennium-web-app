"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import { FormMessage, SubmitButton } from "@/components/portal/form";
import type { FormState } from "@/app/actions/auth";

type Result = (FormState & { password?: string }) | undefined;
type Student = { full_name: string; email: string | null; phone: string | null; roll_no: string | null };

/** Login message for the student: who, where to log in, the credentials and the steps. */
function loginMessage(student: Student, password: string, loginUrl: string) {
  const loginId = student.roll_no ?? student.email ?? "";
  return [
    `Hi ${student.full_name}, here are your Millennium student portal login details.`,
    "",
    `Login page: ${loginUrl}`,
    `Login ID: ${loginId}`,
    ...(student.email && student.email !== loginId ? [`Email: ${student.email}`] : []),
    `Password: ${password}`,
    "",
    "How to log in:",
    "1. Open the login page above.",
    `2. Enter your ${student.roll_no ? "roll number (or email)" : "email"} and the password.`,
    "3. After logging in, go to Profile → Change password and set your own password.",
  ].join("\n");
}

/** Staff "Reset password": generates a new password, then shows a ready-to-send login message to copy or WhatsApp. */
export function ResetPassword({
  action,
  student,
}: {
  action: () => Promise<Result>;
  student: Student;
}) {
  const [state, formAction] = useActionState<Result>(action, undefined);
  const [copied, setCopied] = useState(false);

  // only built after a reset, which happens in the browser, so window is always available here
  const message = state?.password ? loginMessage(student, state.password, `${window.location.origin}/student/login`) : "";
  const phone = student.phone?.replace(/\D/g, "") ?? "";
  // Indian 10-digit numbers need the country code for wa.me
  const waPhone = phone.length === 10 ? `91${phone}` : phone;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const el = Object.assign(document.createElement("textarea"), { value: message });
      el.style.cssText = "position:fixed;opacity:0";
      document.body.append(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <form action={formAction} className="space-y-3">
      <SubmitButton variant="ghost">Reset password</SubmitButton>
      {message ? (
        <div className="space-y-3 rounded-xl border border-good/20 bg-good/5 p-3">
          <p className="text-sm text-good">
            New password: <span className="font-mono font-semibold">{state?.password}</span>
          </p>
          <pre className="rounded-lg border border-line bg-white p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap text-ink-soft">
            {message}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                copied ? "bg-good text-white" : "bg-ink text-white hover:bg-ink-soft"
              }`}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy login details"}
            </button>
            <a
              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition hover:brightness-95"
            >
              <WhatsAppIcon className="size-4" /> {waPhone ? "Send on WhatsApp" : "Share on WhatsApp"}
            </a>
          </div>
        </div>
      ) : (
        <FormMessage state={state} />
      )}
    </form>
  );
}
