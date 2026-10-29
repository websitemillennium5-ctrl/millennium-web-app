/**
 * YouTube links on announcements and study material (mirrored in the mobile app's src/lib/video.ts).
 * Staff paste any YouTube URL; we keep the URL and derive the video id when rendering the player.
 */

const ID = /^[\w-]{11}$/;

/** The 11-character video id from any YouTube URL (watch, youtu.be, shorts, live, embed), or null. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = url.trim();
  if (ID.test(s)) return s;
  let u: URL;
  try {
    u = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else id = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1] ?? null;
  }
  return id && ID.test(id) ? id : null;
}

/** The `t=` / `start=` offset of a YouTube URL in seconds ("90", "1m30s"), or 0. */
export function youtubeStart(url: string | null | undefined): number {
  if (!url) return 0;
  const m = url.match(/[?&#](?:t|start)=([^&#]+)/);
  if (!m) return 0;
  const v = m[1];
  if (/^\d+s?$/.test(v)) return parseInt(v, 10);
  const parts = v.match(/(\d+)h|(\d+)m|(\d+)s/g) ?? [];
  return parts.reduce((sum, p) => sum + parseInt(p, 10) * (p.endsWith("h") ? 3600 : p.endsWith("m") ? 60 : 1), 0);
}

/** Privacy-enhanced embed URL with the player controls on. */
export const youtubeEmbedUrl = (id: string, start = 0) =>
  `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&controls=1${start > 0 ? `&start=${start}` : ""}`;

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** The video on an item: its own video link first, else a YouTube link pasted in the generic link field. */
export function videoOf(item: { video_url?: string | null; link_url?: string | null }) {
  const url = youtubeId(item.video_url) ? item.video_url : youtubeId(item.link_url) ? item.link_url : null;
  const id = youtubeId(url);
  return id ? { id, start: youtubeStart(url), url: url! } : null;
}
