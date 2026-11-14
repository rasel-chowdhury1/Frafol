/**
 * Workshop completion emails — each recipient must get exactly ONE email, retries must work.
 *
 * Mocked (NOT a real MongoDB): see helpers/fakeDb.ts. The atomic claims are proven against a fake that
 * applies single-document updates atomically, so these tests demonstrate the claim logic and the
 * duplicate/retry behaviour, not how a real MongoDB server behaves.
 */
import { test, describe, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { FakeCollection, installMailStub, sentMails, mailFailures, oid } from './helpers/fakeDb';

installMailStub(); // before the app code is loaded

/* eslint-disable @typescript-eslint/no-var-requires */
const { Workshop } = require('../app/modules/workshop/workshop.model');
const { WorkshopParticipant } = require('../app/modules/workshopParticipant/workshopParticipant.model');
const { User } = require('../app/modules/user/user.model');
const { Payment } = require('../app/modules/payment/payment.model');
const { WorkshopService, WORKSHOP_COMPLETION_LEASE_MS } = require('../app/modules/workshop/workshop.service');
const sched = require('../app/scheduler/autoDeliverEventOrders');
const socket = require('../socketIo');
/* eslint-enable @typescript-eslint/no-var-requires */

const workshops = new FakeCollection();
const participants = new FakeCollection();
const users = new FakeCollection();
const payments = new FakeCollection();
workshops.install(Workshop);
participants.install(WorkshopParticipant);
users.install(User);
payments.install(Payment);

// in-app notifications (observable because workshop.service calls them through the module object)
const clientNotes: any[] = [];
const instructorNotes: any[] = [];
mock.method(socket, 'sentNotificationForWorkshopCompletedToClient', async (a: any) => void clientNotes.push(a));
mock.method(socket, 'sentNotificationForWorkshopCompletedToInstructor', async (a: any) => void instructorNotes.push(a));

// Workshop 15 Nov 2026, ends 13:00 Slovak time = 12:00Z
const ENDED = new Date('2026-11-15T12:00:00.000Z');
const AFTER_END = new Date('2026-11-15T15:00:00.000Z');

let instructor: any;
let clientA: any;
let clientB: any;
let ws: any;

const addParticipant = (client: any, orderId: string, over: any = {}) =>
  participants.insert({
    _id: oid(),
    orderId,
    clientId: client._id,
    workshopId: ws._id,
    instructorId: instructor._id,
    paymentStatus: 'completed',
    isDeleted: false,
    finalInvoiceSent: false,
    isCompleted: false,
    instructorPayment: { amount: 40 },
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    ...over,
  });

const mailsTo = (addr: string) => sentMails.filter((m) => m.to === addr);

beforeEach(() => {
  [workshops, participants, users, payments].forEach((c) => c.reset());
  sentMails.length = 0;
  mailFailures.clear();
  clientNotes.length = 0;
  instructorNotes.length = 0;

  instructor = users.insert({ _id: oid(), name: 'Lektor', email: 'instructor@example.com', role: 'photographer' });
  clientA = users.insert({ _id: oid(), name: 'Klient A', email: 'a@example.com', role: 'user' });
  clientB = users.insert({ _id: oid(), name: 'Klient B', email: 'b@example.com', role: 'user' });
  ws = workshops.insert({
    _id: oid(),
    authorId: instructor._id,
    title: 'Portrait course',
    date: new Date('2026-11-15T00:00:00.000Z'),
    time: '10:00 - 13:00',
    locationType: 'offline',
    location: 'Bratislava',
    price: 50,
    mainPrice: 60,
    vatAmount: 5,
    approvalStatus: 'approved',
    isDeleted: false,
    postWorkshopEmailsSent: false,
    completionClaimedAt: null,
    instructorFinalInvoiceSent: false,
  });
  addParticipant(clientA, 'WORKSHOP-1');
  addParticipant(clientB, 'WORKSHOP-2');
});

const expectEachRecipientOnce = () => {
  assert.equal(mailsTo('a@example.com').length, 1, 'participant A');
  assert.equal(mailsTo('b@example.com').length, 1, 'participant B');
  assert.equal(mailsTo('instructor@example.com').length, 1, 'instructor');
  assert.equal(sentMails.length, 3);
};

describe('successful processing', () => {
  test('one run: every recipient gets exactly one email, workshop is marked done', async () => {
    const res = await WorkshopService.processWorkshopCompletion(ws._id, AFTER_END);

    expectEachRecipientOnce();
    assert.equal(res.postWorkshopEmailsSent, true);
    assert.equal(workshops.docs[0].isCompleted, true);
    assert.equal(workshops.docs[0].completionClaimedAt, null);
    assert.ok(participants.docs.every((p) => p.finalInvoiceSent && p.isCompleted));
    assert.equal(clientNotes.length, 2);
    assert.equal(instructorNotes.length, 1);
  });

  test('a participant without an email address is still marked done (no email, no crash)', async () => {
    users.docs.find((u) => u._id === clientB._id).email = '';
    await WorkshopService.processWorkshopCompletion(ws._id, AFTER_END);
    assert.equal(sentMails.length, 2);
    assert.equal(workshops.docs[0].postWorkshopEmailsSent, true);
  });

  test('re-running after completion sends nothing', async () => {
    await WorkshopService.processWorkshopCompletion(ws._id, AFTER_END);
    await WorkshopService.processWorkshopCompletion(ws._id, AFTER_END);
    await WorkshopService.processWorkshopCompletion(ws._id, new Date(AFTER_END.getTime() + 86_400_000));
    expectEachRecipientOnce();
  });

  test('a workshop that has not ended is not processed and not claimed', async () => {
    const res = await WorkshopService.processWorkshopCompletion(ws._id, new Date('2026-11-15T11:59:59.999Z'));
    assert.equal(res, null);
    assert.equal(sentMails.length, 0);
    assert.equal(workshops.docs[0].completionClaimedAt, null);
  });
});

describe('duplicate / overlapping scheduler executions', () => {
  test('two concurrent runs → each recipient still gets exactly one email', async () => {
    await Promise.all([
      WorkshopService.processWorkshopCompletion(ws._id, AFTER_END),
      WorkshopService.processWorkshopCompletion(ws._id, AFTER_END),
    ]);
    expectEachRecipientOnce();
    assert.equal(clientNotes.length, 2);
    assert.equal(instructorNotes.length, 1);
  });

  test('hourly + daily + startup overlap (5 concurrent job executions, guard bypassed) → one email each', async () => {
    await Promise.all(Array.from({ length: 5 }, () => sched.processWorkshopCompletions(AFTER_END)));
    expectEachRecipientOnce();
  });

  test('hourly + daily + startup through the guarded entry point → one email each', async () => {
    await Promise.all([
      sched.runWorkshopCompletionJob(AFTER_END), // hourly
      sched.runWorkshopCompletionJob(AFTER_END), // daily (04:00 coincides with the hourly run)
      sched.runWorkshopCompletionJob(AFTER_END), // startup
    ]);
    expectEachRecipientOnce();
  });

  test('a run that arrives while another owns the lease does nothing', async () => {
    workshops.docs[0].completionClaimedAt = new Date(AFTER_END.getTime() - 60_000); // claimed 1 minute ago
    assert.equal(await WorkshopService.processWorkshopCompletion(ws._id, AFTER_END), null);
    assert.equal(sentMails.length, 0);
  });

  test('a crashed run (lease older than 30 minutes) is taken over', async () => {
    workshops.docs[0].completionClaimedAt = new Date(AFTER_END.getTime() - WORKSHOP_COMPLETION_LEASE_MS - 1000);
    await WorkshopService.processWorkshopCompletion(ws._id, AFTER_END);
    expectEachRecipientOnce();
  });
});

describe('email failure and retry', () => {
  test('participant email fails once: run 1 mails the others, run 2 (after the lease) mails only the missing one', async () => {
    mailFailures.set('b@example.com', 1);

    const run1 = await WorkshopService.processWorkshopCompletion(ws._id, AFTER_END);
    assert.equal(run1.postWorkshopEmailsSent, false, 'not marked done while someone is missing');
    assert.equal(mailsTo('a@example.com').length, 1);
    assert.equal(mailsTo('b@example.com').length, 0);
    assert.equal(mailsTo('instructor@example.com').length, 1);
    const pB = participants.docs.find((p) => p.orderId === 'WORKSHOP-2');
    assert.equal(pB.finalInvoiceSent, false, 'claim released so it can be retried');
    assert.equal(clientNotes.length, 1, 'no in-app "done" notification for the failed participant');

    // immediately again: still inside the lease → back-off, nothing happens
    assert.equal(await WorkshopService.processWorkshopCompletion(ws._id, new Date(AFTER_END.getTime() + 60_000)), null);
    assert.equal(sentMails.length, 2);

    // after the lease: retry sends ONLY the missing email
    const later = new Date(AFTER_END.getTime() + WORKSHOP_COMPLETION_LEASE_MS + 1000);
    const run2 = await WorkshopService.processWorkshopCompletion(ws._id, later);
    assert.equal(run2.postWorkshopEmailsSent, true);
    expectEachRecipientOnce();
    assert.equal(clientNotes.length, 2);
    assert.equal(instructorNotes.length, 1);

    // and then it is final
    await WorkshopService.processWorkshopCompletion(ws._id, new Date(later.getTime() + 86_400_000));
    expectEachRecipientOnce();
  });

  test('instructor email fails once: participants are not re-mailed on retry, instructor is', async () => {
    mailFailures.set('instructor@example.com', 1);

    const run1 = await WorkshopService.processWorkshopCompletion(ws._id, AFTER_END);
    assert.equal(run1.postWorkshopEmailsSent, false);
    assert.equal(workshops.docs[0].instructorFinalInvoiceSent, false);
    assert.equal(sentMails.length, 2); // A and B

    const later = new Date(AFTER_END.getTime() + WORKSHOP_COMPLETION_LEASE_MS + 1000);
    await WorkshopService.processWorkshopCompletion(ws._id, later);
    expectEachRecipientOnce();
    assert.equal(workshops.docs[0].postWorkshopEmailsSent, true);
  });

  test('concurrent runs during a failure/retry cycle still never double-send', async () => {
    mailFailures.set('a@example.com', 1);
    const later = new Date(AFTER_END.getTime() + WORKSHOP_COMPLETION_LEASE_MS + 1000);

    await Promise.all([
      WorkshopService.processWorkshopCompletion(ws._id, AFTER_END),
      WorkshopService.processWorkshopCompletion(ws._id, AFTER_END),
    ]);
    await Promise.all([
      WorkshopService.processWorkshopCompletion(ws._id, later),
      WorkshopService.processWorkshopCompletion(ws._id, later),
      WorkshopService.processWorkshopCompletion(ws._id, later),
    ]);
    expectEachRecipientOnce();
  });

  test('the scheduler only counts workshops that are really done', async () => {
    mailFailures.set('b@example.com', 1);
    assert.equal(await sched.processWorkshopCompletions(AFTER_END), 0, 'failed run is not counted as completed');
    const later = new Date(AFTER_END.getTime() + WORKSHOP_COMPLETION_LEASE_MS + 1000);
    assert.equal(await sched.processWorkshopCompletions(later), 1);
  });
});

describe('workshop date shown in the completion emails', () => {
  test('both stored forms of the date show the Slovak calendar day', async () => {
    for (const stored of ['2026-11-14T23:00:00.000Z', '2026-11-15T00:00:00.000Z']) {
      workshops.docs[0].date = new Date(stored);
      workshops.docs[0].postWorkshopEmailsSent = false;
      workshops.docs[0].completionClaimedAt = null;
      workshops.docs[0].instructorFinalInvoiceSent = false;
      participants.docs.forEach((p) => (p.finalInvoiceSent = false));
      sentMails.length = 0;

      await WorkshopService.processWorkshopCompletion(ws._id, AFTER_END);
      assert.ok(sentMails.length === 3);
      for (const m of sentMails) {
        assert.match(m.html, /15\/11\/2026/, `${stored} → ${m.to}`);
        assert.doesNotMatch(m.html, /14\/11\/2026/, `${stored} → ${m.to}`);
      }
    }
  });
});
