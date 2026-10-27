import { File, FileSpreadsheet, FileText, Image as ImageIcon, Link2, Presentation, Video, type LucideIcon } from "lucide-react";
import type { StudyMaterial } from "@/lib/data";

export const STUDY_BUCKET = "study-materials";
/** Matches the bucket's file_size_limit (supabase/migrations/0012_study_materials.sql) */
export const STUDY_MAX_BYTES = 50 * 1024 * 1024;

export type StudyKind = { label: string; icon: LucideIcon; color: string };

const kinds = {
  pdf: { label: "PDF", icon: FileText, color: "#dc2626" },
  doc: { label: "Document", icon: FileText, color: "#2563eb" },
  sheet: { label: "Spreadsheet", icon: FileSpreadsheet, color: "#16a34a" },
  slides: { label: "Slides", icon: Presentation, color: "#ea580c" },
  image: { label: "Image", icon: ImageIcon, color: "#0d9488" },
  video: { label: "Video", icon: Video, color: "#7c3aed" },
  link: { label: "Link", icon: Link2, color: "#0284c7" },
  file: { label: "File", icon: File, color: "#52525b" },
} satisfies Record<string, StudyKind>;

/** What a piece of study material is, from its file type or link, for its icon and label. */
export function studyKind(m: Pick<StudyMaterial, "mime_type" | "file_name" | "link_url" | "file_path">): StudyKind {
  if (!m.file_path) return /youtube\.com|youtu\.be|vimeo\.com/i.test(m.link_url ?? "") ? kinds.video : kinds.link;
  const mime = m.mime_type ?? "";
  const ext = (m.file_name ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (mime === "application/pdf" || ext === "pdf") return kinds.pdf;
  if (mime.startsWith("image/")) return kinds.image;
  if (mime.startsWith("video/")) return kinds.video;
  if (/presentation|powerpoint/.test(mime) || ["ppt", "pptx", "key", "odp"].includes(ext)) return kinds.slides;
  if (/spreadsheet|excel|csv/.test(mime) || ["xls", "xlsx", "csv", "ods"].includes(ext)) return kinds.sheet;
  if (/word|document|text/.test(mime) || ["doc", "docx", "txt", "rtf", "odt"].includes(ext)) return kinds.doc;
  return kinds.file;
}

export function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
