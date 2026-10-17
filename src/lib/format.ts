import { getCourse } from "@/lib/site";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (amount: number) => inr.format(amount);

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const formatDate = (value: string | null | undefined) => (value ? day.format(new Date(value)) : "—");

export const courseTitle = (slug: string | null | undefined) => (slug ? getCourse(slug)?.title ?? slug : "Not assigned");

/** Some listings apply by email (a pre-filled `mailto:` draft) rather than on a website. */
export const isEmailLink = (url: string) => url.startsWith("mailto:");
export const emailAddress = (url: string) => decodeURIComponent(url.slice("mailto:".length).split("?")[0]);
/** Website links open in a new tab; email links open the mail app in place (a new tab would be left blank). */
export const linkProps = (url: string) => (isEmailLink(url) ? {} : { target: "_blank", rel: "noreferrer" });
