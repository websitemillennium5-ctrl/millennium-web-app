import Image from "next/image";
import { announcementImageAlt, announcementImageUrl } from "@/lib/announcements";
import type { Announcement } from "@/lib/data";

/**
 * The picture attached to an announcement, at card width. Tall pictures (posters, long screenshots) are
 * letterboxed to a sane height rather than cropped, since the words on them are the point; a click opens
 * the full-size picture in a new tab.
 */
export function AnnouncementImage({ a, className = "" }: { a: Announcement; className?: string }) {
  if (!a.image_path) return null;
  const url = announcementImageUrl(a.image_path);
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Open the picture" className={`block overflow-hidden rounded-xl border border-line bg-mist ${className}`}>
      <Image
        src={url}
        alt={announcementImageAlt(a)}
        // the stored size keeps the space reserved while loading; rows without one fall back to 4:3 until the picture arrives
        width={a.image_width ?? 1200}
        height={a.image_height ?? 900}
        sizes="(min-width: 1024px) 36rem, 100vw"
        className="h-auto max-h-[30rem] w-full object-contain"
      />
    </a>
  );
}

/** Small square thumbnail of the picture, for compact rows such as the dashboard's "today's announcement" card. */
export function AnnouncementThumb({ a, className = "" }: { a: Announcement; className?: string }) {
  if (!a.image_path) return null;
  return (
    <Image
      src={announcementImageUrl(a.image_path)}
      alt=""
      width={96}
      height={96}
      sizes="3rem"
      className={`size-12 shrink-0 rounded-xl border border-line object-cover ${className}`}
    />
  );
}
