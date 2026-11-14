/**
 * Workshop "finished" logic — the post-workshop emails must never go out before the workshop ends.
 * Pure functions, no database, no mail.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { getWorkshopEnd, getWorkshopStart, isWorkshopFinished, formatWorkshopDate, finishedWorkshopIds } from '../app/utils/workshopTime';

// Workshop on 15 Nov 2026 (Slovakia = CET, UTC+1), 10:00 - 13:00 → ends 12:00Z
const END_UTC = '2026-11-15T12:00:00.000Z';

// The two ways the same workshop day can reach the database
const STORED_AS_SLOVAK_MIDNIGHT = new Date('2026-11-14T23:00:00.000Z'); // browser local midnight
const STORED_AS_UTC_MIDNIGHT = new Date('2026-11-15T00:00:00.000Z'); // plain "2026-11-15"
const at = (iso: string) => new Date(iso);

describe('getWorkshopEnd / isWorkshopFinished (Slovak time)', () => {
  for (const [label, stored] of [
    ['stored as Slovak local midnight (23:00Z the day before)', STORED_AS_SLOVAK_MIDNIGHT],
    ['stored as UTC midnight', STORED_AS_UTC_MIDNIGHT],
  ] as const) {
    test(`${label}: ends at 13:00 Slovak time on the workshop day`, () => {
      assert.equal(getWorkshopEnd(stored, '10:00 - 13:00').toISOString(), END_UTC);
    });

    test(`${label}: NOT finished the day before — the reported bug (email arrived a day early)`, () => {
      // 14 Nov afternoon, long after 13:00 UTC: the OLD server-timezone logic treated 14 Nov as the workshop day
      assert.equal(isWorkshopFinished(stored, '10:00 - 13:00', at('2026-11-14T14:00:00.000Z')), false);
      assert.equal(isWorkshopFinished(stored, '10:00 - 13:00', at('2026-11-14T23:59:59.000Z')), false);
    });

    test(`${label}: not finished during the workshop, finished at exactly the end time`, () => {
      assert.equal(isWorkshopFinished(stored, '10:00 - 13:00', at('2026-11-15T11:59:59.999Z')), false);
      assert.equal(isWorkshopFinished(stored, '10:00 - 13:00', at(END_UTC)), true);
      assert.equal(isWorkshopFinished(stored, '10:00 - 13:00', at('2026-11-16T08:00:00.000Z')), true);
    });
  }

  test('time formats: "14:00", "10:00-13:30", "10:00 - 13:00"', () => {
    assert.equal(getWorkshopEnd(STORED_AS_UTC_MIDNIGHT, '14:00').toISOString(), '2026-11-15T13:00:00.000Z');
    assert.equal(getWorkshopEnd(STORED_AS_UTC_MIDNIGHT, '10:00-13:30').toISOString(), '2026-11-15T12:30:00.000Z');
    assert.equal(getWorkshopEnd(STORED_AS_UTC_MIDNIGHT, ' 10:00 - 13:00 ').toISOString(), END_UTC);
  });

  test('no / unusable time → the workshop day is over only at the end of that day (Slovak time)', () => {
    for (const t of [undefined, '', 'afternoon', '25:99']) {
      assert.equal(isWorkshopFinished(STORED_AS_UTC_MIDNIGHT, t, at('2026-11-15T22:59:59.000Z')), false, String(t));
      assert.equal(isWorkshopFinished(STORED_AS_UTC_MIDNIGHT, t, at('2026-11-15T23:00:00.000Z')), true, String(t));
    }
  });

  test('summer time (CEST, UTC+2) is handled', () => {
    // 15 Jun 2026, ends 13:00 CEST = 11:00Z
    assert.equal(getWorkshopEnd(new Date('2026-06-14T22:00:00.000Z'), '10:00 - 13:00').toISOString(), '2026-06-15T11:00:00.000Z');
    assert.equal(getWorkshopEnd(new Date('2026-06-15T00:00:00.000Z'), '10:00 - 13:00').toISOString(), '2026-06-15T11:00:00.000Z');
  });

  test('DST change day: 29 Mar 2026 (clocks forward at 02:00) — 13:00 is CEST', () => {
    assert.equal(getWorkshopEnd(new Date('2026-03-29T00:00:00.000Z'), '10:00 - 13:00').toISOString(), '2026-03-29T11:00:00.000Z');
  });

  test('formatWorkshopDate shows the Slovak calendar day (DD/MM/YYYY)', () => {
    assert.equal(formatWorkshopDate(STORED_AS_SLOVAK_MIDNIGHT), '15/11/2026');
    assert.equal(formatWorkshopDate(STORED_AS_UTC_MIDNIGHT), '15/11/2026');
  });
});

describe('result does not depend on the server timezone', () => {
  // Re-run the key checks in separate processes with different host timezones
  const script = `
    const { isWorkshopFinished, getWorkshopEnd } = require('./src/app/utils/workshopTime');
    const stored = new Date('2026-11-14T23:00:00.000Z');
    console.log(JSON.stringify({
      end: getWorkshopEnd(stored, '10:00 - 13:00').toISOString(),
      dayBefore: isWorkshopFinished(stored, '10:00 - 13:00', new Date('2026-11-14T14:00:00.000Z')),
      atEnd: isWorkshopFinished(stored, '10:00 - 13:00', new Date('2026-11-15T12:00:00.000Z')),
    }));`;

  for (const tz of ['UTC', 'Europe/Bratislava', 'America/New_York', 'Asia/Dhaka', 'Pacific/Auckland']) {
    test(`TZ=${tz}`, () => {
      const r = spawnSync(
        process.execPath,
        ['--require', 'ts-node/register/transpile-only', '-e', script],
        { env: { ...process.env, TZ: tz }, encoding: 'utf-8', cwd: process.cwd() },
      );
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(JSON.parse(r.stdout.trim().split('\n').pop()!), {
        end: END_UTC,
        dayBefore: false,
        atEnd: true,
      });
    });
  }

  test('the OLD server-timezone logic WAS wrong on a UTC server (documents the root cause)', () => {
    const oldLogic = `
      const isWorkshopFinishedOld = (date, timeStr) => {
        const now = new Date('2026-11-14T14:00:00.000Z'); // the day BEFORE the workshop, 14:00 UTC
        const workshopEnd = new Date(date);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const workshopDay = new Date(workshopEnd.getFullYear(), workshopEnd.getMonth(), workshopEnd.getDate());
        if (workshopDay < todayStart) return true;
        if (workshopDay.getTime() === todayStart.getTime()) {
          const m = timeStr.split('-').pop().trim().match(/(\\d{1,2}):(\\d{2})/);
          workshopEnd.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
          return now >= workshopEnd;
        }
        return false;
      };
      console.log(isWorkshopFinishedOld(new Date('2026-11-14T23:00:00.000Z'), '10:00 - 13:00'));`;
    const r = spawnSync(process.execPath, ['-e', oldLogic], { env: { ...process.env, TZ: 'UTC' }, encoding: 'utf-8' });
    assert.equal(r.stdout.trim(), 'true', 'old logic reports the workshop finished a day early');
  });
});

describe('getWorkshopStart (registration "already expired" check) and finishedWorkshopIds', () => {
  test('start is the first time on the Slovak workshop day, for both stored forms and in summer', () => {
    for (const stored of [STORED_AS_SLOVAK_MIDNIGHT, STORED_AS_UTC_MIDNIGHT]) {
      assert.equal(getWorkshopStart(stored, '10:00 - 13:00').toISOString(), '2026-11-15T09:00:00.000Z');
      assert.equal(getWorkshopStart(stored, '14:30').toISOString(), '2026-11-15T13:30:00.000Z');
    }
    assert.equal(getWorkshopStart(new Date('2026-06-14T22:00:00.000Z'), '10:00').toISOString(), '2026-06-15T08:00:00.000Z');
  });

  test('registration is still open the evening before (old logic on a UTC server said "expired" a day early)', () => {
    const eveningBefore = at('2026-11-14T20:00:00.000Z');
    assert.equal(getWorkshopStart(STORED_AS_SLOVAK_MIDNIGHT, '10:00') < eveningBefore, false);
    assert.equal(getWorkshopStart(STORED_AS_SLOVAK_MIDNIGHT, '10:00') < at('2026-11-15T09:00:00.001Z'), true);
  });

  test('no / invalid time → start of the Slovak day', () => {
    for (const t of [undefined, '', 'x', '99:99']) {
      assert.equal(getWorkshopStart(STORED_AS_UTC_MIDNIGHT, t).toISOString(), '2026-11-14T23:00:00.000Z');
    }
  });

  test('finishedWorkshopIds keeps only workshops whose end has passed', () => {
    const list = [
      { _id: 'ended', date: STORED_AS_UTC_MIDNIGHT, time: '10:00 - 13:00' },
      { _id: 'running', date: STORED_AS_UTC_MIDNIGHT, time: '10:00 - 18:00' },
      { _id: 'future', date: new Date('2026-12-01T00:00:00.000Z'), time: '10:00' },
    ];
    assert.deepEqual(finishedWorkshopIds(list, at('2026-11-15T12:00:00.000Z')), ['ended']);
    assert.deepEqual(finishedWorkshopIds(list, at('2026-11-15T17:00:00.000Z')), ['ended', 'running']);
  });
});
