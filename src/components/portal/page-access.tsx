"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { setStaffPages } from "@/app/admin/actions";
import { pageKeys, portalPages, type PortalPage } from "@/lib/portal-pages";
import { Field, Select } from "@/components/portal/ui";

const chipOn = "border-ink bg-ink text-white";
const chipOff = "border-line bg-white text-muted hover:border-ink/30 hover:text-ink";
const chip = "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition select-none";

/** "Add staff member" form: the role select plus a tick per page for staff accounts. Uncontrolled so the form can reset itself. */
export function StaffAccessFields() {
  const [role, setRole] = useState("staff");
  const box = useRef<HTMLDivElement>(null);
  const setAll = (checked: boolean) => box.current?.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((input) => (input.checked = checked));

  return (
    <>
      <Field label="Access">
        <Select name="role" defaultValue="staff" onChange={(e) => setRole(e.target.value)}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      {/* kept in the DOM while hidden so a switch back to Staff keeps the ticks; the server ignores it for admins */}
      <div ref={box} className={role === "admin" ? "hidden" : ""}>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-ink-soft">Pages</span>
          <span className="flex gap-3 text-xs text-muted">
            <button type="button" onClick={() => setAll(true)} className="hover:text-ink">
              All
            </button>
            <button type="button" onClick={() => setAll(false)} className="hover:text-ink">
              None
            </button>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {portalPages.map(({ key, label, icon: Icon }) => (
            <label key={key} className="group">
              <input type="checkbox" name="pages" value={key} defaultChecked className="peer sr-only" />
              <span className={`${chip} ${chipOff} peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-ink/10`}>
                <Icon className="size-3" strokeWidth={2} />
                {label}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">Untick the pages this member should not see. Admins always see every page.</p>
      </div>
    </>
  );
}

/** Team list: one chip per page for a staff member, saved the moment it is clicked. */
export function StaffPageAccess({ id, pages }: { id: string; pages: string[] | null }) {
  const [chosen, setChosen] = useState<PortalPage[]>(() => (pages === null ? pageKeys : pageKeys.filter((k) => pages.includes(k))));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const all = chosen.length === pageKeys.length;

  const save = (next: PortalPage[]) => {
    setChosen(next);
    start(async () => {
      const res = await setStaffPages(id, next).catch(() => ({ error: "Could not save. Try again." }));
      setError(res?.error ?? null);
    });
  };
  const toggle = (key: PortalPage) => save(chosen.includes(key) ? chosen.filter((k) => k !== key) : pageKeys.filter((k) => k === key || chosen.includes(k)));

  return (
    <div className="basis-full pl-11">
      <div className="flex flex-wrap items-center gap-1.5">
        {portalPages.map(({ key, label, icon: Icon }) => {
          const on = chosen.includes(key);
          return (
            <button key={key} type="button" aria-pressed={on} onClick={() => toggle(key)} className={`${chip} ${on ? chipOn : chipOff}`}>
              <Icon className="size-3" strokeWidth={2} />
              {label}
            </button>
          );
        })}
        <span className="ml-auto flex items-center gap-2 text-[11px] text-muted">
          {pending ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving
            </>
          ) : all ? (
            "Every page"
          ) : chosen.length === 0 ? (
            "No pages"
          ) : (
            `${chosen.length} of ${pageKeys.length} pages`
          )}
          <button type="button" onClick={() => save(all ? [] : pageKeys)} className="font-medium hover:text-ink">
            {all ? "Clear" : "Select all"}
          </button>
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
