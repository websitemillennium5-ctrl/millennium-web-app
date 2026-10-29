import { getCourse } from "@/lib/site";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (amount: number) => inr.format(amount);

// A plain date (YYYY-MM-DD) is formatted as that calendar day; a timestamp is shown on India's clock.
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dayPlain = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatDate = (value: string | null | undefined) => (value ? (dateOnly.test(value) ? dayPlain : day).format(new Date(value)) : "—");

/** Today's date in India (YYYY-MM-DD), the calendar the academy runs on; `t` shifts it (e.g. 7 days ago). */
export const istDay = (t = Date.now()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(t);

export const courseTitle = (slug: string | null | undefined) => (slug ? getCourse(slug)?.title ?? slug : "Not assigned");

/** Some listings apply by email (a pre-filled `mailto:` draft) rather than on a website. */
export const isEmailLink = (url: string) => url.startsWith("mailto:");
export const emailAddress = (url: string) => decodeURIComponent(url.slice("mailto:".length).split("?")[0]);
/** Website links open in a new tab; email links open the mail app in place (a new tab would be left blank). */
export const linkProps = (url: string) => (isEmailLink(url) ? {} : { target: "_blank", rel: "noreferrer" });
