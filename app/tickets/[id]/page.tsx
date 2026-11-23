import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { changeStatus } from "@/lib/actions";
import { getEvents, getTicket } from "@/lib/db";
import { NEXT_STATUS, SLA_STYLE, formatLeft, formatTime, slaState } from "@/lib/sla";

// The Suspense boundary must live in the page: a layout boundary doesn't cover client navigations.
export default function TicketPage({ params }: PageProps<"/tickets/[id]">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
      <TicketDetail params={params} />
    </Suspense>
  );
}

async function TicketDetail({ params }: { params: PageProps<"/tickets/[id]">["params"] }) {
  await connection();
  const id = Number((await params).id);
  const ticket = Number.isInteger(id) ? await getTicket(id) : undefined;
  if (!ticket) notFound();

  const events = await getEvents(id);
  const { state, msLeft } = slaState(ticket);
  const s = SLA_STYLE[state];
  const next = NEXT_STATUS[ticket.status];

  return (
    <div className="space-y-6">
      <section className="rounded border bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">Ticket #{ticket.id}</h1>
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-sm">{ticket.priority}</span>
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-sm">{ticket.category}</span>
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-sm">{ticket.status}</span>
          <span className={`rounded px-2 py-0.5 text-sm font-medium ${s.badge}`}>
            {s.label} · {formatLeft(msLeft)}
          </span>
        </div>
        <p className="mt-4 whitespace-pre-wrap">{ticket.description}</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-zinc-600">
          <dt>Raised by</dt><dd>{ticket.raised_by}</dd>
          <dt>Raised at</dt><dd>{formatTime(ticket.created_at)}</dd>
          <dt>SLA due</dt><dd>{formatTime(ticket.due_at)}</dd>
          {ticket.resolved_at && (<><dt>Resolved at</dt><dd>{formatTime(ticket.resolved_at)}</dd></>)}
        </dl>
      </section>

      {next.length > 0 && (
        <form action={changeStatus} className="flex flex-wrap items-end gap-3 rounded border bg-white p-4">
          <input type="hidden" name="id" value={ticket.id} />
          <label className="text-sm">
            Move to
            <select name="to" className="mt-1 block rounded border px-2 py-1.5">
              {next.map((st) => <option key={st}>{st}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Agent name
            <input name="agent" required maxLength={100} className="mt-1 block rounded border px-2 py-1.5" />
          </label>
          <button className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700">Update status</button>
        </form>
      )}

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Audit trail</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-zinc-500">
            <tr><th className="py-1">When</th><th>Change</th><th>By</th></tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="py-1">{formatTime(e.at)}</td>
                <td>{e.from_status ? `${e.from_status} → ${e.to_status}` : `Created (${e.to_status})`}</td>
                <td>{e.agent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
