import { youtubeEmbedUrl } from "@/lib/video";

/** A YouTube player at card width, 16:9, with the normal YouTube controls (mirrored in the mobile app). */
export function YouTubeEmbed({ id, start = 0, title, className = "" }: { id: string; start?: number; title: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-line bg-black ${className}`}>
      <iframe
        src={youtubeEmbedUrl(id, start)}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-video w-full"
      />
    </div>
  );
}
