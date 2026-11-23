import { createTicket } from "@/lib/actions";
import { CATEGORIES, PRIORITIES, SLA_HOURS } from "@/lib/sla";

const field = "mt-1 block w-full rounded border px-2 py-1.5";

export default function NewTicketPage() {
  return (
    <form action={createTicket} className="max-w-xl space-y-4 rounded border bg-white p-6">
      <h1 className="text-xl font-semibold">Raise a ticket</h1>
      <label className="block">
        Your name
        <input name="raised_by" required maxLength={100} className={field} />
      </label>
      <label className="block">
        Category
        <select name="category" required className={field}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className="block">
        Priority
        <select name="priority" required defaultValue="P3" className={field}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p} — fix within {SLA_HOURS[p] < 24 ? `${SLA_HOURS[p]} hours` : `${SLA_HOURS[p] / 24} day(s)`}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Description
        <textarea name="description" required maxLength={5000} rows={5} className={field} />
      </label>
      <button className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700">Submit ticket</button>
    </form>
  );
}
