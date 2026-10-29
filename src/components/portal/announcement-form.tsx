"use client";

import { useActionState, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ImagePlus, Loader2, Video, X } from "lucide-react";
import { createAnnouncement, prepareAnnouncementImage } from "@/app/admin/actions";
import type { FormState } from "@/app/actions/auth";
import { ANNOUNCEMENT_IMAGE_BUCKET, ANNOUNCEMENT_IMAGE_MAX_BYTES, ANNOUNCEMENT_IMAGE_TYPES } from "@/lib/announcements";
import { formatBytes } from "@/lib/study";
import { FormMessage } from "@/components/portal/form";
import { CourseSelect, Field, Input, Textarea } from "@/components/portal/ui";

type Picked = { file: File; url: string };

/**
 * Staff form for posting an announcement, with an optional picture. The picture goes straight from the browser
 * to storage through a one-time signed URL (Vercel caps request bodies at 4.5 MB, phone photos are bigger);
 * the server then shrinks it to web size before saving the post, so staff never have to resize anything.
 */
export function AnnouncementForm() {
  const form = useRef<HTMLFormElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pick = (file: File | null) => {
    if (picked) URL.revokeObjectURL(picked.url);
    setPicked(null);
    setPickError(null);
    if (!file) return;
    if (!ANNOUNCEMENT_IMAGE_TYPES.includes(file.type)) return setPickError("Use a JPG, PNG, WebP or GIF picture.");
    if (file.size > ANNOUNCEMENT_IMAGE_MAX_BYTES) return setPickError("That picture is over 15 MB. Pick a smaller one.");
    setPicked({ file, url: URL.createObjectURL(file) });
  };

  const [state, post, posting] = useActionState(async (prev: FormState, fd: FormData): Promise<FormState> => {
    if (picked) {
      setUploading(true);
      try {
        const { file } = picked;
        const ticket = await prepareAnnouncementImage(file.name, file.size, file.type);
        if ("error" in ticket) return { error: ticket.error };
        const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
        const { error } = await supabase.storage.from(ANNOUNCEMENT_IMAGE_BUCKET).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
        if (error) return { error: `Upload failed: ${error.message}` };
        fd.set("image_path", ticket.path);
      } finally {
        setUploading(false);
      }
    }
    const result = await createAnnouncement(prev, fd);
    if (result?.ok) {
      form.current?.reset();
      pick(null);
    }
    return result;
  }, undefined);

  const busy = uploading || posting;

  return (
    <form ref={form} action={post} className="space-y-3.5">
      <Field label="Title *">
        <Input name="title" required maxLength={120} placeholder="Mock interview on Friday" />
      </Field>
      <Field label="Message">
        <Textarea name="body" rows={4} placeholder="Details, timings, what to bring…" />
      </Field>

      {/* Picture: a preview of the chosen file with a remove button, or a dashed picker */}
      {picked ? (
        <div className="overflow-hidden rounded-xl border border-line bg-mist/50">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, nothing for next/image to optimise */}
          <img src={picked.url} alt="" className="max-h-56 w-full bg-mist object-contain" />
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-ink">{picked.file.name}</span>
              <span className="block text-[11px] text-muted">{formatBytes(picked.file.size)} · shrunk for the web after upload</span>
            </span>
            <button type="button" onClick={() => pick(null)} disabled={busy} aria-label="Remove picture" className="rounded-full p-1 text-muted hover:bg-white hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-mist/30 px-3 py-2.5 transition hover:border-ink/25 hover:bg-mist/60">
          <ImagePlus className="size-5 shrink-0 text-muted" strokeWidth={1.75} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink">Add a picture</span>
            <span className="block text-xs text-muted">Optional · JPG, PNG, WebP or GIF up to 15 MB</span>
          </span>
          <input type="file" accept={ANNOUNCEMENT_IMAGE_TYPES.join(",")} className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </label>
      )}

      <Field label="YouTube video" hint="Optional · paste a YouTube link and it plays inside the announcement">
        <div className="relative">
          <Video className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input name="video_url" type="url" inputMode="url" placeholder="https://youtu.be/…" className="pl-9" />
        </div>
      </Field>

      <Field label="Who should see it?">
        <CourseSelect emptyLabel="All students" />
      </Field>
      <label className="flex items-center gap-2 rounded-xl border border-line bg-mist/50 px-3 py-2 text-sm text-ink-soft">
        <input type="checkbox" name="pinned" className="size-4 accent-brand" />
        <span>
          Pin to top <span className="text-xs text-muted">— stays above newer notices</span>
        </span>
      </label>

      {pickError && <FormMessage state={{ error: pickError }} />}
      <FormMessage state={state} />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-soft disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {uploading ? "Uploading picture…" : posting ? "Posting…" : "Post announcement"}
      </button>
    </form>
  );
}
