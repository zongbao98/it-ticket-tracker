// Fills an empty database with sample tickets covering every SLA colour. Refuses if tickets already exist.
import { db, insertTicket } from "../lib/db.ts";
import { dueAt, type Priority } from "../lib/sla.ts";

const { n } = db.prepare("SELECT COUNT(*) AS n FROM tickets").get() as { n: number };
if (n > 0) {
  console.error(`Database already has ${n} tickets; not seeding.`);
  process.exit(1);
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
const samples: [Priority, string, string, string, number][] = [
  ["P1", "Network", "Office Wi-Fi down on floor 3", "Alice", 1],                // on track
  ["P1", "Access", "CEO locked out of email before board meeting", "Bob", 3.5], // at risk
  ["P2", "Software", "Payroll app crashes on export", "Chen", 10],             // breached
  ["P3", "Hardware", "Monitor flickering", "Dana", 4],                        // on track
  ["P4", "Other", "Request a second keyboard", "Eve", 70],                    // at risk
];

for (const [priority, category, description, raised_by, age] of samples) {
  const created = hoursAgo(age);
  insertTicket({
    priority, category, description, raised_by,
    created_at: created.toISOString(),
    due_at: dueAt(created, priority).toISOString(),
  });
}
console.log(`Seeded ${samples.length} tickets.`);
