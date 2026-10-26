// Notification emails for website form submissions, sent to the academy inbox via Resend.
// Email clients ignore <style> and modern CSS, so the layout is nested tables with inline styles.

const SITE_URL = "https://millenniumairhostess.com";

const colors = {
  brand: "#a7222d",
  brandSoft: "#f5e4e1",
  ink: "#17283e",
  inkSoft: "#263a55",
  muted: "#5f6a78",
  line: "#e2d8c5",
  mist: "#f7f4ec",
  canvas: "#f2eee4",
  whatsapp: "#1f9d55",
};
const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const kinds = {
  enquiry: { label: "New enquiry", color: colors.brand, bg: colors.brandSoft },
  applicant: { label: "Job applicant", color: "#8a5a00", bg: "#fdf1d8" },
  student: { label: "Student applying", color: "#1d6b33", bg: "#e3f2e6" },
};

export type FormEmail = {
  kind: keyof typeof kinds;
  subject: string;
  /** Big headline, usually the person's name. */
  title: string;
  /** One line under the name, e.g. "Interested in Cabin Crew" or "Applying for Cabin Crew · IndiGo". */
  subtitle?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Label → value rows; empty values are left out. A value can carry a link. */
  fields: Record<string, string | { text: string; href: string } | null | undefined>;
  /** Free text the visitor wrote, shown in its own quoted block. */
  message?: string | null;
  /** Extra action button, e.g. the job they're applying for. */
  link?: { label: string; href: string } | null;
};

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** wa.me wants digits with the country code; Indian 10-digit numbers get 91 added. */
const whatsappNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length === 10 ? `91${digits}` : digits;
};

const button = (href: string, label: string, bg: string, color = "#ffffff", border = bg) =>
  `<td style="padding:0 8px 8px 0"><a href="${escape(href)}" style="display:inline-block;padding:10px 18px;border-radius:999px;border:1px solid ${border};background:${bg};color:${color};font:600 14px/1 ${font};text-decoration:none;white-space:nowrap">${label}</a></td>`;

function render(mail: FormEmail) {
  const kind = kinds[mail.kind];
  const received = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date());
  const rows = Object.entries(mail.fields).filter(([, v]) => (typeof v === "string" ? v.trim() : v)) as [string, string | { text: string; href: string }][];

  const actions = [
    mail.phone && button(`tel:${mail.phone.replace(/[^\d+]/g, "")}`, "Call", colors.ink),
    mail.phone && button(`https://wa.me/${whatsappNumber(mail.phone)}`, "WhatsApp", colors.whatsapp),
    mail.email && button(`mailto:${mail.email}`, "Email", "#ffffff", colors.ink, colors.line),
    mail.link && button(mail.link.href, `${escape(mail.link.label)} &#8599;`, "#ffffff", colors.ink, colors.line),
    button(`${SITE_URL}/admin/leads`, "View in admin", colors.brand),
  ].filter(Boolean);

  const details = rows
    .map(([label, value], i) => {
      const content =
        typeof value === "string"
          ? escape(value)
          : `<a href="${escape(value.href)}" style="color:${colors.brand};text-decoration:none;font-weight:600">${escape(value.text)} &rarr;</a>`;
      return `<tr>
        <td style="padding:11px 0;${i ? `border-top:1px solid ${colors.line};` : ""}width:38%;vertical-align:top;font:600 11px/1.5 ${font};letter-spacing:.08em;text-transform:uppercase;color:${colors.muted}">${escape(label)}</td>
        <td style="padding:11px 0;${i ? `border-top:1px solid ${colors.line};` : ""}vertical-align:top;font:15px/1.5 ${font};color:${colors.ink}">${content}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(mail.subject)}</title></head>
<body style="margin:0;padding:0;background:${colors.canvas}">
<div style="display:none;max-height:0;overflow:hidden">${escape([mail.title, mail.subtitle].filter(Boolean).join(" · "))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.canvas}">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${colors.line};border-radius:18px;overflow:hidden">

    <tr><td style="background:${colors.brand};padding:16px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font:700 13px/1.2 ${font};letter-spacing:.14em;text-transform:uppercase;color:#ffffff">Millennium<span style="font-weight:400;opacity:.8"> Air Hostess Academy</span></td>
        <td align="right" style="font:12px/1.2 ${font};color:#ffffff;opacity:.8">Website lead</td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:28px 28px 8px">
      <span style="display:inline-block;padding:5px 11px;border-radius:999px;background:${kind.bg};color:${kind.color};font:700 11px/1 ${font};letter-spacing:.08em;text-transform:uppercase">${kind.label}</span>
      <h1 style="margin:14px 0 0;font:700 26px/1.25 ${font};color:${colors.ink}">${escape(mail.title)}</h1>
      ${mail.subtitle ? `<p style="margin:6px 0 0;font:16px/1.5 ${font};color:${colors.inkSoft}">${escape(mail.subtitle)}</p>` : ""}
    </td></tr>

    ${actions.length ? `<tr><td style="padding:16px 28px 8px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${actions.join("")}</tr></table></td></tr>` : ""}

    ${
      mail.message
        ? `<tr><td style="padding:12px 28px 4px">
      <div style="background:${colors.mist};border-left:3px solid ${colors.brand};border-radius:10px;padding:14px 16px">
        <p style="margin:0 0 6px;font:600 11px/1.5 ${font};letter-spacing:.08em;text-transform:uppercase;color:${colors.muted}">Message</p>
        <p style="margin:0;font:15px/1.6 ${font};color:${colors.ink};white-space:pre-wrap">${escape(mail.message)}</p>
      </div>
    </td></tr>`
        : ""
    }

    <tr><td style="padding:16px 28px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${details}</table>
    </td></tr>

    <tr><td style="padding:16px 28px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${colors.line}"><tr>
        <td style="padding-top:16px;font:13px/1.5 ${font};color:${colors.muted}">Received ${received} IST</td>
        <td align="right" style="padding-top:16px"><a href="${SITE_URL}/admin/leads" style="font:600 13px/1.5 ${font};color:${colors.brand};text-decoration:none">Open all leads &rarr;</a></td>
      </tr></table>
    </td></tr>

  </table>
  <p style="margin:16px 0 0;font:12px/1.5 ${font};color:${colors.muted}">Sent automatically from the form on ${SITE_URL.replace("https://", "")}. Reply to answer them directly.</p>
</td></tr>
</table>
</body></html>`;
}

function renderText(mail: FormEmail) {
  const lines = Object.entries(mail.fields)
    .filter(([, v]) => (typeof v === "string" ? v.trim() : v))
    .map(([label, v]) => `${label}: ${typeof v === "string" ? v : `${v!.text} (${v!.href})`}`);
  return [
    `${kinds[mail.kind].label}: ${mail.title}`,
    mail.subtitle,
    "",
    mail.phone && `Phone: ${mail.phone}`,
    mail.email && `Email: ${mail.email}`,
    ...lines,
    mail.message && `\nMessage:\n${mail.message}`,
    `\nAll leads: ${SITE_URL}/admin/leads`,
  ]
    .filter((l) => typeof l === "string")
    .join("\n");
}

/** Emails a form submission to the academy inbox. Never throws: a failed email is logged so it can't break the form. */
export async function sendFormEmail(mail: FormEmail & { replyTo?: string | null }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return console.warn("RESEND_API_KEY is not set; skipping form email:", mail.subject);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Millennium Website <onboarding@resend.dev>",
        to: (process.env.FORM_EMAIL_TO || "websitemillennium5@gmail.com").split(",").map((s) => s.trim()),
        subject: mail.subject,
        html: render(mail),
        text: renderText(mail),
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
    });
    if (!res.ok) console.error("Resend rejected form email:", res.status, await res.text());
  } catch (err) {
    console.error("Form email failed:", err);
  }
}

export { render as renderFormEmail };
