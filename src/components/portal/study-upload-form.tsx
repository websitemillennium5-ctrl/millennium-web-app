"use client";

import { useActionState, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Link2, Loader2, Paperclip, Upload, Video, X } from "lucide-react";
import { createStudyMaterial, prepareStudyUpload } from "@/app/admin/actions";
import type { FormState } from "@/app/actions/auth";
import { FormMessage } from "@/components/portal/form";
import { Field, Input, Textarea } from "@/components/portal/ui";
import { formatBytes, STUDY_BUCKET, STUDY_MAX_BYTES } from "@/lib/study";

/**
 * Staff form for sharing study material. A picked file goes straight from the browser to the private
 * storage bucket through a one-time signed URL, then the row is saved with its path.
 */
export function StudyUploadForm({ batches }: { batches: string[] }) {
  const form = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [state, save, saving] = useActionState(async (prev: FormState, fd: FormData): Promise<FormState> => {
    setUploadError(null);
    if (file) {
      if (file.size > STUDY_MAX_BYTES) return { error: "That file is over 50 MB. Upload a smaller copy, or share it as a link instead." };
      setUploading(true);
      try {
        const ticket = await prepareStudyUpload(file.name, file.size);
        if ("error" in ticket) return { error: ticket.error };
        const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
        const { error } = await supabase.storage.from(STUDY_BUCKET).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type || undefined });
        if (error) return { error: `Upload failed: ${error.message}` };
        fd.set("file_path", ticket.path);
        fd.set("file_name", file.name);
        fd.set("file_size", String(file.size));
        fd.set("mime_type", file.type);
      } finally {
        setUploading(false);
      }
    }
    const result = await createStudyMaterial(prev, fd);
    if (result?.ok) {
      form.current?.reset();
      setFile(null);
    }
    return result;
  }, undefined);

  const busy = uploading || saving;

  return (
    <form ref={form} action={save} className="space-y-3.5">
      <Field label="Title *">
        <Input name="title" required maxLength={140} placeholder="Safety & emergency procedures — notes" />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={3} placeholder="What it covers, which class it's for…" />
      </Field>
      <Field label="Who should see it?" hint="Leave empty for all students, or type a batch exactly as it appears on student profiles.">
        <Input name="batch" list="study-batches" placeholder="All students" autoComplete="off" />
        <datalist id="study-batches">
          {batches.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </Field>

      {/* File picker: a dashed drop zone, or the chosen file with a remove button */}
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-mist/50 px-3 py-2.5">
          <Paperclip className="size-4 shrink-0 text-muted" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{file.name}</span>
            <span className="block text-xs text-muted">{formatBytes(file.size)}</span>
          </span>
          <button type="button" onClick={() => setFile(null)} disabled={busy} aria-label="Remove file" className="rounded-full p-1 text-muted hover:bg-white hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-line bg-mist/30 px-4 py-5 text-center transition hover:border-ink/25 hover:bg-mist/60">
          <Upload className="size-5 text-muted" />
          <span className="text-sm font-medium text-ink">Choose a file</span>
          <span className="text-xs text-muted">PDF, Word, slides, images or video · up to 50 MB</span>
          <input
            type="file"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setUploadError(f && f.size > STUDY_MAX_BYTES ? "That file is over 50 MB." : null);
              setFile(f && f.size <= STUDY_MAX_BYTES ? f : null);
            }}
          />
        </label>
      )}

      <Field label="YouTube video" hint="Optional · plays inside the student portal and the app">
        <div className="relative">
          <Video className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input name="video_url" type="url" inputMode="url" placeholder="https://youtu.be/…" className="pl-9" />
        </div>
      </Field>

      <Field label="Or a link" hint="Google Drive, a website… (optional if you attach a file or a video)">
        <div className="relative">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input name="link_url" type="url" placeholder="https://" className="pl-9" />
        </div>
      </Field>

      {uploadError && <FormMessage state={{ error: uploadError }} />}
      <FormMessage state={state} />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-soft disabled:opacity-60"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {uploading ? "Uploading…" : saving ? "Saving…" : "Share material"}
      </button>
    </form>
  );
}
