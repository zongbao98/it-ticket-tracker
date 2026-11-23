export const CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"] as const;
export const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export const STATUSES = ["Open", "In Progress", "Resolved", "Closed"] as const;

export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];

// shortcut: calendar hours, 24/7 — switch to business-hours maths if the SLA policy needs it.
export const SLA_HOURS: Record<Priority, number> = { P1: 4, P2: 8, P3: 24, P4: 72 };

/** Allowed status moves. Resolved -> In Progress is a reopen. */
export const NEXT_STATUS: Record<Status, Status[]> = {
  Open: ["In Progress"],
  "In Progress": ["Resolved"],
  Resolved: ["Closed", "In Progress"],
  Closed: [],
};

const HOUR = 3_600_000;
const AT_RISK_FRACTION = 0.25;

export type SlaState = "ok" | "at-risk" | "breached";

export function dueAt(createdAt: Date, priority: Priority): Date {
  return new Date(createdAt.getTime() + SLA_HOURS[priority] * HOUR);
}

/** The SLA clock stops at resolved_at; otherwise it runs until now. */
export function slaState(
  t: { priority: Priority; due_at: string; resolved_at: string | null },
  now: Date = new Date(),
): { state: SlaState; msLeft: number } {
  const end = t.resolved_at ? new Date(t.resolved_at) : now;
  const msLeft = new Date(t.due_at).getTime() - end.getTime();
  const state: SlaState =
    msLeft < 0 ? "breached" : msLeft < SLA_HOURS[t.priority] * HOUR * AT_RISK_FRACTION ? "at-risk" : "ok";
  return { state, msLeft };
}

// shortcut: formats in the server's time zone; render on the client if agents work across time zones.
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export const SLA_STYLE: Record<SlaState, { label: string; row: string; badge: string }> = {
  ok: { label: "On track", row: "", badge: "bg-green-100 text-green-800" },
  "at-risk": { label: "At risk", row: "bg-amber-50", badge: "bg-amber-200 text-amber-900" },
  breached: { label: "Breached", row: "bg-red-50", badge: "bg-red-200 text-red-900" },
};

export function formatLeft(msLeft: number): string {
  const mins = Math.floor(Math.abs(msLeft) / 60_000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const text = d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
  return msLeft < 0 ? `${text} overdue` : `${text} left`;
}
