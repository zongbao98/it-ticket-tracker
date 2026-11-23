import { test } from "node:test";
import assert from "node:assert/strict";
import { dueAt, formatLeft, slaState } from "./sla.ts";

const created = new Date("2026-01-01T00:00:00Z");
const at = (h: number) => new Date(created.getTime() + h * 3_600_000);

test("dueAt adds the SLA for the priority", () => {
  assert.equal(dueAt(created, "P1").toISOString(), "2026-01-01T04:00:00.000Z");
  assert.equal(dueAt(created, "P4").toISOString(), "2026-01-04T00:00:00.000Z");
});

test("slaState: ok, at-risk (<25% left), breached", () => {
  const t = { priority: "P1" as const, due_at: dueAt(created, "P1").toISOString(), resolved_at: null };
  assert.equal(slaState(t, at(2)).state, "ok");
  assert.equal(slaState(t, at(3)).state, "ok"); // exactly 25% left
  assert.equal(slaState(t, at(3.5)).state, "at-risk");
  assert.equal(slaState(t, at(5)).state, "breached");
});

test("slaState: clock stops at resolution", () => {
  const t = { priority: "P1" as const, due_at: dueAt(created, "P1").toISOString(), resolved_at: at(1).toISOString() };
  assert.equal(slaState(t, at(100)).state, "ok");
});

test("formatLeft", () => {
  assert.equal(formatLeft(90 * 60_000), "1h 30m left");
  assert.equal(formatLeft(-26 * 3_600_000), "1d 2h overdue");
});
