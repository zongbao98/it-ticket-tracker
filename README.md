# IT Ticket Tracker

Raise IT tickets with a category, description and priority (P1–P4). Each ticket gets an SLA deadline automatically. Support staff work from a queue sorted by time left before breach, and every status change is logged with a timestamp and the agent's name.

| Priority | SLA |
|---|---|
| P1 | 4 hours |
| P2 | 8 hours |
| P3 | 1 day |
| P4 | 3 days |

- **At risk** (amber): less than 25% of the SLA window left.
- **Breached** (red): past the deadline.
- Status flow: `Open → In Progress → Resolved → Closed`, plus `Resolved → In Progress` to reopen. Resolving stops the SLA clock.

To change the SLA targets, edit `SLA_HOURS` in `lib/sla.ts`.

## Run it

Requires Node.js 24 or later (uses the built-in `node:sqlite`).

```bash
npm install
npm run seed   # optional: sample tickets in every SLA state
npm run dev    # http://localhost:3000
```

```bash
npm test       # SLA logic tests
```

The database is created at `data/tickets.db` (git-ignored).

## Limitations

- No login: agents type their name, so the audit trail trusts what they type.
- The SLA clock runs 24/7 (calendar time, not business hours).
- SQLite means a single server. Use Postgres for serverless hosting like Vercel.
