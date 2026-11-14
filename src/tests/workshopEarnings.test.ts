/**
 * Workshop earnings must only count a workshop once it has actually ENDED (Slovak time).
 * Covers getOverviewOfSpecificProfessional (totalOverallEarnings) and
 * getMonthlyEarningsOfSpecificProfessional.
 *
 * Mocked (NOT a real MongoDB): Workshop.find comes from the in-memory fake and
 * WorkshopParticipant.aggregate is a small interpreter of the two pipelines this code builds
 * ($match → $group). The clock is mocked with node:test's mock.timers.
 */
import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { FakeCollection, installMailStub, matches, oid } from './helpers/fakeDb';

installMailStub();

/* eslint-disable @typescript-eslint/no-var-requires */
const { Workshop } = require('../app/modules/workshop/workshop.model');
const { WorkshopParticipant } = require('../app/modules/workshopParticipant/workshopParticipant.model');
const { User } = require('../app/modules/user/user.model');
const { GearOrder } = require('../app/modules/gearOrder/gearOrder.model');
const { EventOrder } = require('../app/modules/eventOrder/eventOrder.model');
const { Payment } = require('../app/modules/payment/payment.model');
const { Review } = require('../app/modules/review/review.model');
const { userService } = require('../app/modules/user/user.service');
/* eslint-enable @typescript-eslint/no-var-requires */

const workshops = new FakeCollection();
workshops.install(Workshop);

// participants live in a plain array; aggregate() interprets the pipeline
let participantDocs: any[] = [];
let lastPipeline: any[] = [];
mock.method(WorkshopParticipant, 'aggregate', async (pipeline: any[]) => {
  lastPipeline = pipeline;
  const matchStage = pipeline.find((st) => st.$match)!.$match;
  const rows = participantDocs.filter((d) => matches(d, matchStage));
  const group = pipeline.find((st) => st.$group)!.$group;
  if (group._id === null) {
    return rows.length ? [{ _id: null, totalEarnings: rows.reduce((a, d) => a + d.instructorPayment.amount, 0) }] : [];
  }
  const byMonth = new Map<number, number>(); // { $month: '$createdAt' }
  for (const d of rows) {
    const m = d.createdAt.getUTCMonth() + 1;
    byMonth.set(m, (byMonth.get(m) || 0) + d.instructorPayment.amount);
  }
  return [...byMonth].map(([m, t]) => ({ _id: m, totalEarnings: t }));
});

// everything else the two service functions touch → neutral values
mock.method(User, 'findById', () => ({ select: async () => ({ name: 'Lektor' }) }));
mock.method(GearOrder, 'countDocuments', async () => 0);
mock.method(EventOrder, 'countDocuments', async () => 0);
mock.method(Review, 'countDocuments', async () => 0);
mock.method(Payment, 'aggregate', async () => []);

const instructorId = oid();
const AMOUNT = 40;

const setWorkshop = (stored: string, time: string | undefined) => {
  workshops.reset();
  const w = workshops.insert({ _id: oid(), authorId: instructorId, date: new Date(stored), time });
  participantDocs = [
    {
      instructorId,
      workshopId: w._id,
      paymentStatus: 'completed',
      isDeleted: false,
      instructorPayment: { amount: AMOUNT },
      createdAt: new Date('2026-11-01T10:00:00.000Z'),
    },
  ];
};

const overallAt = async (iso: string) => {
  mock.timers.setTime(new Date(iso).getTime());
  return (await userService.getOverviewOfSpecificProfessional(String(instructorId))).totalOverallEarnings;
};

const novemberAt = async (iso: string) => {
  mock.timers.setTime(new Date(iso).getTime());
  const r = await userService.getMonthlyEarningsOfSpecificProfessional(String(instructorId), 2026);
  return r.monthlyEarnings[10].totalEarnings; // Nov
};

beforeEach(() => mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-01T00:00:00.000Z') }));
afterEach(() => mock.timers.reset());

// Workshop on 15 Nov 2026 "10:00 - 13:00" (CET, UTC+1): starts 09:00Z, ends 12:00Z.
// Stored either as Slovak local midnight (14 Nov 23:00Z) or UTC midnight (15 Nov 00:00Z).
const STORAGE = [
  ['Slovak midnight', '2026-11-14T23:00:00.000Z'],
  ['UTC midnight', '2026-11-15T00:00:00.000Z'],
] as const;

describe('earnings only count once the workshop has ended (time "10:00 - 13:00")', () => {
  for (const [label, stored] of STORAGE) {
    describe(`stored as ${label}`, () => {
      beforeEach(() => setWorkshop(stored, '10:00 - 13:00'));

      const cases: [string, string, number][] = [
        ['the day before', '2026-11-14T12:00:00.000Z', 0],
        ['the moment the date (midnight) begins — the old logic counted it here', '2026-11-14T23:00:00.000Z', 0],
        ['workshop day, before the start (08:59 local)', '2026-11-15T07:59:00.000Z', 0],
        ['in progress (11:00 local)', '2026-11-15T10:00:00.000Z', 0],
        ['one millisecond before the end', '2026-11-15T11:59:59.999Z', 0],
        ['exactly at the end (13:00 local)', '2026-11-15T12:00:00.000Z', AMOUNT],
        ['after the end', '2026-11-15T15:00:00.000Z', AMOUNT],
        ['days later', '2026-11-20T09:00:00.000Z', AMOUNT],
      ];
      for (const [what, now, expected] of cases) {
        test(`${what} → totalOverallEarnings ${expected}`, async () => {
          assert.equal(await overallAt(now), expected);
        });
        test(`${what} → monthly earnings (Nov) ${expected}`, async () => {
          assert.equal(await novemberAt(now), expected);
        });
      }
    });
  }
});

describe('workshops without a valid configured time → finished only at the end of the Slovak day', () => {
  for (const time of [undefined, '', 'afternoon', '25:99']) {
    describe(`time = ${JSON.stringify(time)}`, () => {
      beforeEach(() => setWorkshop('2026-11-15T00:00:00.000Z', time));

      test('workshop day, 22:59:59 Slovak time → not counted', async () => {
        assert.equal(await overallAt('2026-11-15T21:59:59.000Z'), 0);
        assert.equal(await novemberAt('2026-11-15T21:59:59.000Z'), 0);
      });
      test('end of the workshop day (23:59:59.999 Slovak time) → counted', async () => {
        assert.equal(await overallAt('2026-11-15T22:59:59.999Z'), AMOUNT);
        assert.equal(await novemberAt('2026-11-15T22:59:59.999Z'), AMOUNT);
      });
      test('next day → counted', async () => {
        assert.equal(await overallAt('2026-11-16T08:00:00.000Z'), AMOUNT);
      });
    });
  }
});

describe('summer time (CEST, UTC+2)', () => {
  test('15 Jun, ends 13:00 local = 11:00Z', async () => {
    setWorkshop('2026-06-14T22:00:00.000Z', '10:00 - 13:00'); // Slovak midnight
    assert.equal(await overallAt('2026-06-15T10:59:59.999Z'), 0);
    assert.equal(await overallAt('2026-06-15T11:00:00.000Z'), AMOUNT);
    setWorkshop('2026-06-15T00:00:00.000Z', '10:00 - 13:00'); // UTC midnight
    assert.equal(await overallAt('2026-06-15T10:59:59.999Z'), 0);
    assert.equal(await overallAt('2026-06-15T11:00:00.000Z'), AMOUNT);
  });
});

describe('only ended workshops are queried, other rules unchanged', () => {
  test('the aggregation is restricted to the ids of ended workshops; commission / payout fields untouched', async () => {
    workshops.reset();
    const ended = workshops.insert({ _id: oid(), authorId: instructorId, date: new Date('2026-11-10T00:00:00.000Z'), time: '10:00' });
    const future = workshops.insert({ _id: oid(), authorId: instructorId, date: new Date('2026-11-20T00:00:00.000Z'), time: '10:00' });
    const others = workshops.insert({ _id: oid(), authorId: oid(), date: new Date('2026-11-10T00:00:00.000Z'), time: '10:00' });
    const base = { instructorId, paymentStatus: 'completed', isDeleted: false, createdAt: new Date('2026-11-01T10:00:00.000Z') };
    participantDocs = [
      { ...base, workshopId: ended._id, instructorPayment: { amount: 40 } },
      { ...base, workshopId: ended._id, instructorPayment: { amount: 25 } },
      { ...base, workshopId: future._id, instructorPayment: { amount: 99 } }, // not ended
      { ...base, workshopId: ended._id, paymentStatus: 'pending', instructorPayment: { amount: 7 } }, // unpaid
      { ...base, workshopId: ended._id, isDeleted: true, instructorPayment: { amount: 5 } }, // deleted
      { ...base, instructorId: oid(), workshopId: others._id, instructorPayment: { amount: 1000 } }, // someone else
    ];

    assert.equal(await overallAt('2026-11-14T12:00:00.000Z'), 65); // 40 + 25 only
    const match = lastPipeline.find((st) => st.$match).$match;
    assert.deepEqual(match.workshopId.$in.map(String), [String(ended._id)]);
    assert.equal(match.paymentStatus, 'completed');
    assert.equal(match.isDeleted, false);
    assert.equal(lastPipeline.find((st) => st.$group).$group.totalEarnings.$sum, '$instructorPayment.amount');
  });
});
