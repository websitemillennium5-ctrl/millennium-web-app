import { Pin, PinOff, Trash2 } from "lucide-react";
import { createAnnouncement, deleteAnnouncement, toggleAnnouncementPin } from "@/app/admin/actions";
import { requireStaff } from "@/lib/auth";
import { getAnnouncements } from "@/lib/data";
import { courseTitle, formatDate } from "@/lib/format";
import { ActionForm, ConfirmButton, IconSubmit, SubmitButton } from "@/components/portal/form";
import { Badge, Card, CourseSelect, Empty, Field, Input, PageTitle, Textarea } from "@/components/portal/ui";

export default async function AdminAnnouncements() {
  await requireStaff();
  const announcements = await getAnnouncements(100);

  return (
    <>
      <PageTitle title="Announcements" text="Notices appear on students' dashboards straight away." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="New announcement" className="h-fit lg:col-span-2">
          <ActionForm action={createAnnouncement} resetOnSuccess className="space-y-4">
            <Field label="Title *">
              <Input name="title" required placeholder="Mock interview on Friday" />
            </Field>
            <Field label="Message">
              <Textarea name="body" placeholder="Details, timings, what to bring…" />
            </Field>
            <Field label="Who should see it?">
              <CourseSelect emptyLabel="All students" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" name="pinned" className="size-4 accent-brand" /> Pin to top
            </label>
            <SubmitButton>Post</SubmitButton>
          </ActionForm>
        </Card>

        <Card title="Posted" className="lg:col-span-3">
          {announcements.length === 0 ? (
            <Empty>Nothing posted yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {announcements.map((a) => (
                <li key={a.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {a.pinned && <Pin className="size-3.5 text-brand" />}
                        <h3 className="font-medium">{a.title}</h3>
                        <Badge tone={a.course_slug ? "brand" : "default"}>{a.course_slug ? courseTitle(a.course_slug) : "Everyone"}</Badge>
                      </div>
                      {a.body && <p className="mt-1 text-sm whitespace-pre-line text-muted">{a.body}</p>}
                      <p className="mt-2 text-xs text-muted">{formatDate(a.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <form action={toggleAnnouncementPin}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="pinned" value={String(a.pinned)} />
                        <IconSubmit label={a.pinned ? "Unpin" : "Pin to top"} active={a.pinned}>
                          {a.pinned ? <PinOff className="size-4" strokeWidth={1.75} /> : <Pin className="size-4" strokeWidth={1.75} />}
                        </IconSubmit>
                      </form>
                      <form action={deleteAnnouncement}>
                        <input type="hidden" name="id" value={a.id} />
                        <ConfirmButton message="Delete this announcement?" icon={<Trash2 className="size-4" strokeWidth={1.75} />}>
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
