import postgres from "postgres";
import type { Priority, Status } from "./sla.ts";

export type Ticket = {
  id: number;
  category: string;
  description: string;
  priority: Priority;
  status: Status;
  raised_by: string;
  created_at: Date;
  due_at: Date;
  resolved_at: Date | null;
};

export type TicketEvent = {
  id: number;
  ticket_id: number;
  from_status: Status | null;
  to_status: Status;
  agent: string;
  at: Date;
};

const url = process.env.DATABASE_URL;

// One client per server instance; reused across dev hot reloads so connections don't pile up.
// It connects lazily, so the build works without DATABASE_URL; ensureSchema() checks it.
const g = globalThis as unknown as { sql?: postgres.Sql };
// prepare: false is required by Supabase's transaction pooler (port 6543).
export const sql = (g.sql ??= postgres(url ?? "", { prepare: false, max: 5 }));

// Every query path calls this first. Runs the DDL once per server instance. RLS on with no policies
// blocks Supabase's public REST API from these tables; the app connects as the owner, which RLS doesn't restrict.
let ready: Promise<unknown> | undefined;
export function ensureSchema() {
  if (!url) return Promise.reject(new Error("DATABASE_URL is not set (see README: Supabase setup)"));
  return (ready ??= sql.unsafe(`
    CREATE TABLE IF NOT EXISTS tickets (
      id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      category    text NOT NULL,
      description text NOT NULL,
      priority    text NOT NULL CHECK (priority IN ('P1','P2','P3','P4')),
      status      text NOT NULL CHECK (status IN ('Open','In Progress','Resolved','Closed')),
      raised_by   text NOT NULL,
      created_at  timestamptz NOT NULL,
      due_at      timestamptz NOT NULL,
      resolved_at timestamptz
    );
    CREATE TABLE IF NOT EXISTS ticket_events (
      id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ticket_id   integer NOT NULL REFERENCES tickets(id),
      from_status text,
      to_status   text NOT NULL,
      agent       text NOT NULL,
      at          timestamptz NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_queue ON tickets(status, due_at);
    CREATE INDEX IF NOT EXISTS idx_events_ticket ON ticket_events(ticket_id);
    ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;
  `).catch((e) => {
    ready = undefined; // retry on the next request instead of caching the failure
    throw e;
  }));
}

export async function insertTicket(t: Omit<Ticket, "id" | "status" | "resolved_at">): Promise<number> {
  await ensureSchema();
  return sql.begin(async (tx) => {
    const [{ id }] = await tx<{ id: number }[]>`
      INSERT INTO tickets (category, description, priority, status, raised_by, created_at, due_at)
      VALUES (${t.category}, ${t.description}, ${t.priority}, 'Open', ${t.raised_by}, ${t.created_at}, ${t.due_at})
      RETURNING id`;
    await tx`
      INSERT INTO ticket_events (ticket_id, from_status, to_status, agent, at)
      VALUES (${id}, NULL, 'Open', ${t.raised_by}, ${t.created_at})`;
    return id;
  });
}

/** Everything not Closed; active work first by deadline, then Resolved awaiting close. */
export async function listQueue(): Promise<Ticket[]> {
  await ensureSchema();
  return sql<Ticket[]>`SELECT * FROM tickets WHERE status <> 'Closed' ORDER BY status = 'Resolved', due_at`;
}

export async function getTicket(id: number): Promise<Ticket | undefined> {
  await ensureSchema();
  const [t] = await sql<Ticket[]>`SELECT * FROM tickets WHERE id = ${id}`;
  return t;
}

export async function getEvents(ticketId: number): Promise<TicketEvent[]> {
  await ensureSchema();
  return sql<TicketEvent[]>`SELECT * FROM ticket_events WHERE ticket_id = ${ticketId} ORDER BY at, id`;
}
