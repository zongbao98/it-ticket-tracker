import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import type { Priority, Status } from "./sla.ts";

export type Ticket = {
  id: number;
  category: string;
  description: string;
  priority: Priority;
  status: Status;
  raised_by: string;
  created_at: string;
  due_at: string;
  resolved_at: string | null;
};

export type TicketEvent = {
  id: number;
  ticket_id: number;
  from_status: Status | null;
  to_status: Status;
  agent: string;
  at: string;
};

mkdirSync("data", { recursive: true });
export const db = new DatabaseSync("data/tickets.db");

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS tickets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category    TEXT NOT NULL,
    description TEXT NOT NULL,
    priority    TEXT NOT NULL CHECK (priority IN ('P1','P2','P3','P4')),
    status      TEXT NOT NULL CHECK (status IN ('Open','In Progress','Resolved','Closed')),
    raised_by   TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    due_at      TEXT NOT NULL,
    resolved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS ticket_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id   INTEGER NOT NULL REFERENCES tickets(id),
    from_status TEXT,
    to_status   TEXT NOT NULL,
    agent       TEXT NOT NULL,
    at          TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tickets_queue ON tickets(status, due_at);
  CREATE INDEX IF NOT EXISTS idx_events_ticket ON ticket_events(ticket_id);
`);

export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function insertTicket(t: Omit<Ticket, "id" | "status" | "resolved_at">): number {
  return transaction(() => {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO tickets (category, description, priority, status, raised_by, created_at, due_at)
         VALUES (?, ?, ?, 'Open', ?, ?, ?)`,
      )
      .run(t.category, t.description, t.priority, t.raised_by, t.created_at, t.due_at);
    const id = Number(lastInsertRowid);
    db.prepare(
      `INSERT INTO ticket_events (ticket_id, from_status, to_status, agent, at) VALUES (?, NULL, 'Open', ?, ?)`,
    ).run(id, t.raised_by, t.created_at);
    return id;
  });
}

/** Everything not Closed; active work first by deadline, then Resolved awaiting close. */
export function listQueue(): Ticket[] {
  return db
    .prepare(`SELECT * FROM tickets WHERE status != 'Closed' ORDER BY status = 'Resolved', due_at`)
    .all() as unknown as Ticket[];
}

export function getTicket(id: number): Ticket | undefined {
  return db.prepare(`SELECT * FROM tickets WHERE id = ?`).get(id) as unknown as Ticket | undefined;
}

export function getEvents(ticketId: number): TicketEvent[] {
  return db
    .prepare(`SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY at, id`)
    .all(ticketId) as unknown as TicketEvent[];
}
