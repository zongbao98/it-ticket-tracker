import Link from "next/link";
import { connection } from "next/server";
import { listQueue } from "@/lib/db";
import { SLA_STYLE, formatLeft, slaState } from "@/lib/sla";

export default async function QueuePage() {
  await connection();
  const now = new Date();
  const tickets = listQueue();

  return (
    <>
      {/* Keeps the countdowns current without client-side code. */}
      <meta httpEquiv="refresh" content="60" />
      <h1 className="mb-4 text-xl font-semibold">Support queue</h1>
      {tickets.length === 0 ? (
        <p className="text-zinc-500">No open tickets.</p>
      ) : (
        <table className="w-full border-collapse overflow-hidden rounded border bg-white text-sm">
          <thead className="bg-zinc-100 text-left">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Priority</th>
              <th className="p-2">Category</th>
              <th className="p-2">Description</th>
              <th className="p-2">Status</th>
              <th className="p-2">SLA</th>
              <th className="p-2">Time remaining</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const { state, msLeft } = slaState(t, now);
              const s = SLA_STYLE[state];
              return (
                <tr key={t.id} className={`border-t ${s.row}`}>
                  <td className="p-2">
                    <Link href={`/tickets/${t.id}`} className="text-blue-700 hover:underline">#{t.id}</Link>
                  </td>
                  <td className="p-2 font-medium">{t.priority}</td>
                  <td className="p-2">{t.category}</td>
                  <td className="max-w-xs truncate p-2" title={t.description}>{t.description}</td>
                  <td className="p-2">{t.status}</td>
                  <td className="p-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${s.badge}`}>{s.label}</span>
                  </td>
                  <td className="whitespace-nowrap p-2">
                    {formatLeft(msLeft)}
                    {t.resolved_at && <span className="text-zinc-500"> (clock stopped)</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
