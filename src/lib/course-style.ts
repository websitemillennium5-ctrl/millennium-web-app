/** Colour per course for avatars, chips and tabs in the staff portal. Keys match `courses[].slug` in site.ts. */
export const courseStyles: Record<string, { color: string; chip: string; iconClass: string }> = {
  "cabin-crew": { color: "#e11d48", chip: "border-rose-200 bg-rose-50 text-rose-700", iconClass: "text-rose-500" },
  "ground-operations": { color: "#0284c7", chip: "border-sky-200 bg-sky-50 text-sky-700", iconClass: "text-sky-500" },
  hospitality: { color: "#d97706", chip: "border-amber-200 bg-amber-50 text-amber-800", iconClass: "text-amber-500" },
  "retail-operations": { color: "#7c3aed", chip: "border-violet-200 bg-violet-50 text-violet-700", iconClass: "text-violet-500" },
};

const fallback = { color: "#52525b", chip: "border-line bg-mist text-ink-soft", iconClass: "text-muted" };

export const courseStyle = (slug: string | null | undefined) => (slug && courseStyles[slug]) || fallback;
