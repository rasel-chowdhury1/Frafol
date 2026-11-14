/**
 * Workshop dates in the payment-time invoice email, the new-participant email and the completion emails
 * must always be the Slovak calendar day — whatever timezone the SERVER runs in.
 *
 * The real code runs in a child process per host timezone (TZ=...) so the timezone really differs
 * (see helpers/workshopDatesScenario.ts). Models are in-memory fakes and the mail sender is a stub:
 * no database, no SMTP.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const SCENARIO = path.join(__dirname, 'helpers', 'workshopDatesScenario.ts');

// The same workshop day reaches the database in two shapes: Slovak local midnight and UTC midnight.
const CASES = [
  // winter time (CET, UTC+1) — workshop 15 Nov, ends 13:00 local
  { name: 'winter, stored as Slovak midnight', stored: '2026-11-14T23:00:00.000Z', afterEnd: '2026-11-15T15:00:00.000Z', expected: '15/11/2026', wrong: '14/11/2026' },
  { name: 'winter, stored as UTC midnight', stored: '2026-11-15T00:00:00.000Z', afterEnd: '2026-11-15T15:00:00.000Z', expected: '15/11/2026', wrong: '14/11/2026' },
  // summer time (CEST, UTC+2) — workshop 15 Jun
  { name: 'summer, stored as Slovak midnight', stored: '2026-06-14T22:00:00.000Z', afterEnd: '2026-06-15T15:00:00.000Z', expected: '15/06/2026', wrong: '14/06/2026' },
  { name: 'summer, stored as UTC midnight', stored: '2026-06-15T00:00:00.000Z', afterEnd: '2026-06-15T15:00:00.000Z', expected: '15/06/2026', wrong: '14/06/2026' },
];

const run = (tz: string) => {
  const r = spawnSync(process.execPath, ['--require', 'ts-node/register/transpile-only', SCENARIO], {
    env: { ...process.env, TZ: tz, CASES: JSON.stringify(CASES) },
    encoding: 'utf-8',
    cwd: process.cwd(),
    maxBuffer: 20 * 1024 * 1024,
  });
  assert.equal(r.status, 0, `child failed under TZ=${tz}:\n${r.stderr}`);
  const line = r.stdout.split('\n').find((l) => l.startsWith('RESULT:'));
  assert.ok(line, `no result under TZ=${tz}:\n${r.stdout}\n${r.stderr}`);
  return JSON.parse(line!.slice('RESULT:'.length));
};

describe('workshop dates in emails are Slovak calendar days (server TZ independent)', () => {
  for (const tz of ['UTC', 'Europe/Bratislava', 'Asia/Dhaka', 'America/New_York', 'Pacific/Auckland']) {
    test(`server TZ=${tz}`, () => {
      const { results, todaySlovakia } = run(tz);
      assert.equal(results.length, CASES.length);

      results.forEach((res: any, i: number) => {
        const c = CASES[i];
        const label = `${c.name} @ TZ=${tz}`;

        // payment-time: invoice to the participant + new-participant email to the instructor
        const invoice = res.paymentTime.find((m: any) => m.to === 'client@example.com');
        const newParticipant = res.paymentTime.find((m: any) => m.to === 'instructor@example.com');
        assert.ok(invoice, `payment-time invoice sent (${label})`);
        assert.ok(newParticipant, `new-participant email sent (${label})`);

        // Participant mails carry two dates: the workshop day and the payment date (= today, Slovak time).
        // Remove the payment date once; what is left must be exactly the Slovak workshop day.
        const workshopDatesOf = (all: string[]) => {
          const rest = [...all];
          const i = rest.indexOf(todaySlovakia);
          assert.ok(i >= 0, `payment date ${todaySlovakia} present (${label}): ${all}`);
          rest.splice(i, 1);
          return rest;
        };

        assert.deepEqual(workshopDatesOf(invoice.dates), [c.expected], `payment-time invoice (${label})`);
        assert.deepEqual(newParticipant.dates, [c.expected], `new-participant email (${label})`);

        // completion emails (participant + instructor)
        const doneClient = res.completion.find((m: any) => m.to === 'client@example.com');
        const doneInstructor = res.completion.find((m: any) => m.to === 'instructor@example.com');
        assert.ok(doneClient && doneInstructor, `completion emails sent (${label})`);
        assert.deepEqual(workshopDatesOf(doneClient.dates), [c.expected], `completion email, participant (${label})`);
        assert.deepEqual(doneInstructor.dates, [c.expected], `completion email, instructor (${label})`);
      });
    });
  }
});
