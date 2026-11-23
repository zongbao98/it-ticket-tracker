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

Uses Postgres (Supabase). The tables are created automatically on first request.

### 1. Supabase
1. Create a project at supabase.com.
2. Click **Connect** → **Transaction pooler** and copy the URI (port `6543`). Replace `[YOUR-PASSWORD]` with your database password.

### 2. Local
```bash
cp .env.example .env.local   # then paste your DATABASE_URL
npm install
npm run seed   # optional: sample tickets in every SLA state
npm run dev    # http://localhost:3000
npm test       # SLA logic tests
```

### 3. Vercel
Project → **Settings → Environment Variables**: add `DATABASE_URL` (and optionally `APP_TIMEZONE`, e.g. `Asia/Singapore`; Vercel runs in UTC). Then redeploy.

Row Level Security is switched on for both tables with no policies, so Supabase's public API can't read them. The app connects as the database owner and is unaffected.

## Limitations

- No login: agents type their name, so the audit trail trusts what they type.
- The SLA clock runs 24/7 (calendar time, not business hours).
