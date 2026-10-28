/**
 * Brand styling for job cards: logo (from public/images/partners), brand colour and IATA code for the monogram
 * fallback. Matched by scraper source key first, then by company name for hand-added jobs.
 */
import { isHotelSource } from "@/lib/job-sources";

export type AirlineBrand = { name: string; color: string; code: string; logo?: string };

const brands: (AirlineBrand & { sources?: string[]; match: RegExp })[] = [
  { name: "IndiGo", color: "#1a2b9b", code: "6E", logo: "indigo.png", sources: ["indigo_cabin_crew", "indigo_ground_staff"], match: /indigo/i },
  { name: "Air India Express", color: "#e2591f", code: "IX", logo: "air-india-express.png", match: /air india express/i },
  { name: "Air India", color: "#c8102e", code: "AI", logo: "air-india.png", sources: ["air_india"], match: /air india/i },
  { name: "Akasa Air", color: "#f26a36", code: "QP", logo: "akasa-air.png", sources: ["akasa"], match: /akasa/i },
  { name: "SpiceJet", color: "#d71920", code: "SG", logo: "spicejet.png", sources: ["spicejet"], match: /spicejet/i },
  { name: "Emirates", color: "#c8102e", code: "EK", logo: "emirates.png", sources: ["emirates"], match: /emirates/i },
  { name: "Qatar Airways", color: "#5c0632", code: "QR", logo: "qatar-airways.png", sources: ["qatar_airways"], match: /qatar/i },
  { name: "Etihad Airways", color: "#a87b1d", code: "EY", logo: "etihad.png", sources: ["etihad"], match: /etihad/i },
  { name: "British Airways", color: "#075aaa", code: "BA", logo: "british-airways.png", sources: ["british_airways"], match: /british airways/i },
  { name: "AirAsia", color: "#e1251b", code: "AK", logo: "air-asia.png", match: /air ?asia/i },
  { name: "Riyadh Air", color: "#3d1a5b", code: "RX", logo: "riyadh-air.png", match: /riyadh/i },
  { name: "Lufthansa Group", color: "#05164d", code: "LH", sources: ["lufthansa"], match: /lufthansa/i },
  { name: "flydubai", color: "#f26522", code: "FZ", sources: ["flydubai"], match: /flydubai/i },
  { name: "Air Arabia", color: "#d4002a", code: "G9", sources: ["air_arabia"], match: /air arabia/i },
  { name: "Star Air", color: "#1b3e8c", code: "S5", sources: ["star_air"], match: /star air/i },
  { name: "Fly91", color: "#0e8a5f", code: "IC", sources: ["fly91"], match: /fly ?91/i },
  // Hotel groups
  {
    name: "Marriott",
    color: "#a6192e",
    code: "MI",
    logo: "marriott.png",
    sources: ["marriott"],
    match: /marriott|courtyard|fairfield|four points|le m[eé]ridien|moxy|renaissance|sheraton|st\.? regis|ritz[- ]carlton|tribute portfolio|w hotels|westin|aloft/i,
  },
  { name: "Radisson Hotel Group", color: "#b5121b", code: "RD", logo: "radisson.png", sources: ["radisson"], match: /radisson|park inn|park plaza|country inn/i },
  { name: "Accor", color: "#1e1852", code: "AC", sources: ["accor"], match: /accor|novotel|ibis|mercure|sofitel|pullman|fairmont|raffles|m[oö]venpick|swiss[oô]tel/i },
  { name: "Hilton", color: "#104c97", code: "HI", sources: ["hilton"], match: /hilton|doubletree|hampton|conrad|waldorf/i },
  { name: "Hyatt", color: "#1e3a5f", code: "HY", sources: ["hyatt"], match: /hyatt|andaz|alila/i },
  { name: "IHCL (Taj)", color: "#8a1c2b", code: "TJ", logo: "taj.png", sources: ["ihcl"], match: /\bihcl\b|\btaj\b|vivanta|ginger|seleqtions/i },
  { name: "Lemon Tree Hotels", color: "#6aa84f", code: "LT", sources: ["lemon_tree"], match: /lemon tree|keys hotels|red fox/i },
  { name: "ITC Limited", color: "#1b5e3b", code: "ITC", sources: ["itc"], match: /\bitc\b/i },
  { name: "Fortune Hotels", color: "#7b1b2b", code: "FH", sources: ["fortune"], match: /fortune (?:hotels|park|select|resort)/i },
  { name: "Wyndham", color: "#0e3b5c", code: "WY", sources: ["wyndham"], match: /wyndham|ramada|days inn|howard johnson/i },
  { name: "NILE Hospitality", color: "#0b2545", code: "NL", sources: ["nile"], match: /\bnile\b/i },
];

export function airlineBrand(source: string, company: string): AirlineBrand {
  const brand = brands.find((b) => b.sources?.includes(source)) ?? brands.find((b) => b.match.test(company));
  if (brand) return { ...brand, logo: brand.logo && `/images/partners/${brand.logo}` };

  const code = company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return { name: company, color: "#3f3f46", code: code || "?" };
}

/**
 * Role families for the coloured category chip and the role filter. `terms` drive both: the chip matches them
 * against the title in JS, the filter turns them into `title ILIKE` clauses. First match wins for the chip.
 */
export const roles = {
  cabin: {
    label: "Cabin crew",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    iconClass: "text-rose-500",
    terms: ["cabin crew", "flight attendant", "cabin attendant", "air hostess", "steward"],
  },
  ground: {
    label: "Ground staff",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    iconClass: "text-sky-500",
    terms: ["ground", "airport", "customer service", "check-in", "check in", "ramp", "passenger", "security", "lounge", "guest service"],
  },
  hospitality: {
    label: "Hospitality",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    iconClass: "text-amber-500",
    terms: ["hospitality", "hotel", "f&b", "food", "chef", "housekeeping"],
  },
} as const;

export type RoleKey = keyof typeof roles;

export function roleCategory(title: string, source: string) {
  const text = `${title} ${source.replace(/_/g, " ")}`.toLowerCase();
  // Every hotel-group job is a hospitality role, even when its title sounds like airport work ("Security Officer").
  const key = isHotelSource(source) ? "hospitality" : (Object.keys(roles) as RoleKey[]).find((k) => roles[k].terms.some((t) => text.includes(t)));
  return key ? { key, ...roles[key] } : null;
}

/**
 * Whether a hiring event belongs to the role filter (none = all roles). Same any-term match as the jobs filter,
 * but also over the event's role and source (e.g. indigo_ground_staff), since event titles are often generic.
 */
export function eventMatchesRole(event: { title: string; role: string | null; source: string }, role: RoleKey | "") {
  if (!role) return true;
  const text = `${event.title} ${event.role ?? ""} ${event.source.replace(/_/g, " ")}`.toLowerCase();
  return roles[role].terms.some((t) => text.includes(t));
}
