import type { Announcement } from "@/lib/data";

/** Public storage bucket for announcement pictures (supabase/migrations/0015_announcement_images.sql). */
export const ANNOUNCEMENT_IMAGE_BUCKET = "announcement-images";
/** Matches the bucket's file_size_limit: the size of the original the browser uploads, before compression. */
export const ANNOUNCEMENT_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
/** Matches the bucket's allowed_mime_types. HEIC isn't here: iPhones convert to JPEG when picking for the web. */
export const ANNOUNCEMENT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
/** The longest edge of the picture that's kept; anything bigger is shrunk on the server after the upload. */
export const ANNOUNCEMENT_IMAGE_MAX_EDGE = 1600;

/** Public CDN URL of a stored announcement picture. Works on the server and in the browser. */
export const announcementImageUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${ANNOUNCEMENT_IMAGE_BUCKET}/${path}`;

export const announcementImageAlt = (a: Pick<Announcement, "title">) => `Picture for “${a.title}”`;
