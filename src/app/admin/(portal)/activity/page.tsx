import { requirePage } from "@/lib/auth";
import { getStudentChanges } from "@/lib/data";
import { ChangeLog } from "@/components/portal/change-log";
import { Card, Empty, PageTitle } from "@/components/portal/ui";

/** Every change staff have made to students, newest first. */
export default async function AdminActivity() {
  await requirePage("activity");
  const entries = await getStudentChanges(undefined, 200);

  return (
    <>
      <PageTitle title="Activity" text="Who changed what on which student, and when. Details edits show each field before and after." />
      {entries.length === 0 ? (
        <Empty>Nothing recorded yet. Student edits, payments, password resets and new accounts will appear here.</Empty>
      ) : (
        <Card>
          <ChangeLog entries={entries} showStudent />
        </Card>
      )}
    </>
  );
}
