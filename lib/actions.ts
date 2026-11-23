"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, getTicket, insertTicket, transaction } from "./db.ts";
import { CATEGORIES, NEXT_STATUS, PRIORITIES, STATUSES, dueAt, type Priority, type Status } from "./sla.ts";

// shortcut: invalid input throws and shows the error page; add useActionState for inline form errors if users hit it.
function text(form: FormData, key: string, max: number): string {
  const v = String(form.get(key) ?? "").trim();
  if (!v) throw new Error(`${key} is required`);
  if (v.length > max) throw new Error(`${key} is too long (max ${max})`);
  return v;
}

function oneOf<T extends string>(form: FormData, key: string, allowed: readonly T[]): T {
  const v = String(form.get(key) ?? "");
  if (!allowed.includes(v as T)) throw new Error(`Invalid ${key}`);
  return v as T;
}

export async function createTicket(form: FormData) {
  const priority = oneOf<Priority>(form, "priority", PRIORITIES);
  const now = new Date();
  const id = insertTicket({
    category: oneOf(form, "category", CATEGORIES),
    description: text(form, "description", 5000),
    priority,
    raised_by: text(form, "raised_by", 100),
    created_at: now.toISOString(),
    due_at: dueAt(now, priority).toISOString(),
  });
  revalidatePath("/");
  redirect(`/tickets/${id}`);
}

export async function changeStatus(form: FormData) {
  const id = Number(form.get("id"));
  const to = oneOf<Status>(form, "to", STATUSES);
  const agent = text(form, "agent", 100);
  const at = new Date().toISOString();

  transaction(() => {
    const t = getTicket(id);
    if (!t) throw new Error("Ticket not found");
    if (!NEXT_STATUS[t.status].includes(to)) throw new Error(`Cannot move ${t.status} → ${to}`);
    // Resolving stops the SLA clock; reopening restarts it.
    const resolvedAt = to === "Resolved" ? at : to === "In Progress" ? null : t.resolved_at;
    db.prepare(`UPDATE tickets SET status = ?, resolved_at = ? WHERE id = ?`).run(to, resolvedAt, id);
    db.prepare(
      `INSERT INTO ticket_events (ticket_id, from_status, to_status, agent, at) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, t.status, to, agent, at);
  });

  revalidatePath("/");
  revalidatePath(`/tickets/${id}`);
}
