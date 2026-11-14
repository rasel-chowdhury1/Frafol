/**
 * Tests for the automatic order lifecycle:
 *   - auto-cancel of unpaid package/custom orders after 72h
 *   - 48h reminder to the client (at 120h) before auto-delivery
 *   - auto-delivery of package/custom/marketplace orders after 168h
 *
 * Run with:  npm test
 *
 * IMPORTANT: no real database and no SMTP are used.
 *  - EventOrder / GearOrder static methods are replaced by a small in-memory fake that implements
 *    exactly the Mongo semantics the jobs rely on (dotted paths, $lte, null-matches-missing,
 *    $set, $push and a find-and-update that is atomic per document).
 *  - ./mailSender is replaced in the require cache BEFORE anything imports it, so no SMTP
 *    connection is opened and no mail can be sent.
 * Because of that, these tests prove the job LOGIC and the atomic-claim pattern; they do not
 * prove how a real MongoDB server behaves (see the final report).
 */
process.env.TZ = process.env.TZ || 'Europe/Bratislava';

import { test, describe, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// ── 1. Stub the mail sender before the app code can load it ──────────────────
type SentMail = { to: string; subject: string; html: string };
const sentMails: SentMail[] = [];
const mailSenderPath = require.resolve('../app/utils/mailSender');
(require.cache as any)[mailSenderPath] = {
  id: mailSenderPath,
  filename: mailSenderPath,
  loaded: true,
  children: [],
  paths: [],
  exports: {
    sendEmail: async (to: string, subject: string, html: string) => {
      sentMails.push({ to, subject, html });
    },
  },
};

// ── 2. Load the code under test ──────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-var-requires */
const { EventOrder } = require('../app/modules/eventOrder/eventOrder.model');
const { GearOrder } = require('../app/modules/gearOrder/gearOrder.model');
const { User } = require('../app/modules/user/user.model');
const sched = require('../app/scheduler/autoDeliverEventOrders');
const socket = require('../socketIo');
/* eslint-enable @typescript-eslint/no-var-requires */

const {
  HOUR_MS,
  AUTO_CANCEL_HOURS,
  AUTO_DELIVER_HOURS,
  cutoffFor,
  processAutoCancelUnpaid,
  processAutoDeliver,
  processGearAutoDeliver,
  runAutoCancelUnpaidJob,
  processAutoDeliveryReminders,
  AUTO_DELIVER_REMINDER_HOURS,
  AUTO_DELIVER_REMINDER_LEAD_HOURS,
} = sched;

// ── 3. Minimal in-memory Mongo fake ──────────────────────────────────────────
const getPath = (obj: any, path: string) =>
  path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

const setPath = (obj: any, path: string, value: any) => {
  const keys = path.split('.');
  let cur = obj;
  keys.slice(0, -1).forEach((k) => {
    if (cur[k] == null) cur[k] = {};
    cur = cur[k];
  });
  cur[keys[keys.length - 1]] = value;
};

const matchesCondition = (actual: any, cond: any): boolean => {
  if (cond && typeof cond === 'object' && !(cond instanceof Date) && !(cond instanceof mongoose.Types.ObjectId)) {
    return Object.entries(cond).every(([op, v]: [string, any]) => {
      if (op === '$lte') return actual != null && actual <= v;
      if (op === '$gt') return actual != null && actual > v;
      throw new Error(`fake mongo: operator ${op} not implemented`);
    });
  }
  if (cond === null) return actual === null || actual === undefined; // Mongo: null matches missing
  return String(actual) === String(cond);
};

const matches = (doc: any, filter: Record<string, any>) =>
  Object.entries(filter).every(([path, cond]) => matchesCondition(getPath(doc, path), cond));

const applyUpdate = (doc: any, update: any) => {
  for (const [path, v] of Object.entries(update.$set || {})) setPath(doc, path, v);
  for (const [path, v] of Object.entries(update.$push || {})) {
    const arr = getPath(doc, path) || [];
    arr.push(v);
    setPath(doc, path, arr);
  }
};

// Deep copy that keeps ObjectId / Date instances intact (structuredClone would strip their prototypes)
const clone = (v: any): any => {
  if (v instanceof mongoose.Types.ObjectId) return v;
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
  return v;
};

class FakeCollection {
  docs: any[] = [];
  reset() {
    this.docs = [];
  }
  insert(doc: any) {
    this.docs.push(doc);
    return doc;
  }
  install(model: any) {
    mock.method(model, 'find', (filter: any) => {
      const chain: any = {
        select: () => chain,
        lean: async () => {
          await Promise.resolve(); // real queries are async: lets concurrent runs interleave
          return this.docs.filter((d) => matches(d, filter)).map(clone);
        },
      };
      return chain;
    });
    mock.method(model, 'findOneAndUpdate', (filter: any, update: any) => ({
      // Executed synchronously = atomic per document, like a single Mongo findAndModify
      populate: (path: string) => {
        const doc = this.docs.find((d) => matches(d, filter));
        if (!doc) return Promise.resolve(null);
        applyUpdate(doc, update);
        const out = clone(doc);
        if (path === 'packageId') out.packageId = { title: doc._pkgTitle };
        if (path === 'gearMarketplaceId') out.gearMarketplaceId = { name: doc._itemName };
        return Promise.resolve(out);
      },
    }));
  }
}

const events = new FakeCollection();
const gears = new FakeCollection();
events.install(EventOrder);
gears.install(GearOrder);

// ── 4. Test data helpers ─────────────────────────────────────────────────────
const oid = () => new mongoose.Types.ObjectId();
const NOW = new Date('2026-06-15T12:00:00.000Z');
const hoursAgo = (h: number, ms = 0) => new Date(NOW.getTime() - h * HOUR_MS + ms);

const makeEvent = (over: any = {}) =>
  events.insert({
    _id: oid(),
    orderId: `EVT-${Math.floor(Math.random() * 1e6)}`,
    orderType: 'direct',
    title: 'Wedding',
    userId: oid(),
    serviceProviderId: oid(),
    status: 'accepted',
    isDeleted: false,
    statusHistory: [],
    statusTimestamps: {},
    _pkgTitle: 'Gold package',
    ...over,
  });

const makeGear = (over: any = {}) =>
  gears.insert({
    _id: oid(),
    orderId: `GEAR-${Math.floor(Math.random() * 1e6)}`,
    clientId: oid(),
    sellerId: oid(),
    orderStatus: 'deliveryRequest',
    isDeleted: false,
    statusTimestamps: {},
    _itemName: 'Canon 24-70',
    ...over,
  });

interface Call {
  clientId: any;
  professionalId: any;
  orderId: string;
  title?: string;
  kind?: string;
}
const makeDeps = () => {
  const cancelled: Call[] = [];
  const delivered: Call[] = [];
  const reminders: Call[] = [];
  return {
    cancelled,
    delivered,
    reminders,
    deps: {
      notifyAutoCancelled: async (c: Call) => void cancelled.push(c),
      notifyAutoDelivered: async (c: Call) => void delivered.push(c),
      notifyReminder: async (c: Call) => void reminders.push(c),
    },
  };
};

beforeEach(() => {
  events.reset();
  gears.reset();
  sentMails.length = 0;
});

// ═════════════════════════════════════════════════════════════════════════════
describe('timing / timezone', () => {
  test('constants are exactly 72h and 168h', () => {
    assert.equal(AUTO_CANCEL_HOURS, 72);
    assert.equal(AUTO_DELIVER_HOURS, 168);
    assert.equal(AUTO_DELIVER_REMINDER_LEAD_HOURS, 48);
    assert.equal(AUTO_DELIVER_REMINDER_HOURS, 120);
  });

  test('cutoff is an exact millisecond offset, even across DST changes (host TZ: ' + process.env.TZ + ')', () => {
    const dstDates = [
      '2026-03-29T12:00:00.000Z', // EU spring-forward week
      '2026-10-25T12:00:00.000Z', // EU fall-back week
      '2026-03-09T12:00:00.000Z', // US spring-forward week
      '2026-11-02T12:00:00.000Z', // US fall-back week
    ];
    for (const d of dstDates) {
      const now = new Date(d);
      assert.equal(now.getTime() - cutoffFor(now, 72).getTime(), 72 * HOUR_MS);
      assert.equal(now.getTime() - cutoffFor(now, 168).getTime(), 168 * HOUR_MS);
    }
  });

  test('the OLD calendar-day logic was off by one hour across DST (documents the root cause)', () => {
    // Old code: cutoff.setDate(cutoff.getDate() - 7). Only differs when the host TZ observes DST.
    const now = new Date('2026-04-02T12:00:00.000Z'); // 7 days after the EU DST change
    const oldCutoff = new Date(now);
    oldCutoff.setDate(oldCutoff.getDate() - 7);
    const diffHours = (now.getTime() - oldCutoff.getTime()) / HOUR_MS;
    if (diffHours === 168) {
      // host TZ has no DST (or TZ override unsupported on this OS) — nothing to demonstrate
      return;
    }
    assert.equal(diffHours, 167);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('auto-cancel unpaid package + custom orders (72h)', () => {
  for (const orderType of ['direct', 'custom']) {
    test(`${orderType}: accepted + unpaid order is cancelled at exactly 72h`, async () => {
      const o = makeEvent({ orderType, statusTimestamps: { acceptedAt: hoursAgo(72) } });
      const { deps, cancelled } = makeDeps();

      const count = await processAutoCancelUnpaid(NOW, deps);

      assert.equal(count, 1);
      const saved = events.docs[0];
      assert.equal(saved.status, 'cancelled');
      assert.match(saved.cancelReason, /72 hours — payment not received/);
      assert.deepEqual(saved.statusTimestamps.cancelledAt, NOW);
      assert.equal(saved.statusHistory.length, 1);
      assert.equal(saved.statusHistory[0].status, 'cancelled');
      assert.equal(cancelled.length, 1);
      assert.equal(String(cancelled[0].clientId), String(o.userId));
      assert.equal(String(cancelled[0].professionalId), String(o.serviceProviderId));
      assert.equal(cancelled[0].title, 'Gold package');
    });
  }

  test('1 ms before 72h is NOT cancelled; 1 ms after is', async () => {
    makeEvent({ statusTimestamps: { acceptedAt: hoursAgo(72, +1) } }); // 71h59m59.999s old
    makeEvent({ statusTimestamps: { acceptedAt: hoursAgo(72, -1) } }); // 72h00m00.001s old
    const { deps, cancelled } = makeDeps();

    assert.equal(await processAutoCancelUnpaid(NOW, deps), 1);
    assert.equal(events.docs[0].status, 'accepted');
    assert.equal(events.docs[1].status, 'cancelled');
    assert.equal(cancelled.length, 1);
  });

  test('ineligible orders are never touched', async () => {
    const old = { acceptedAt: hoursAgo(200), deliveryRequestAt: hoursAgo(200) };
    const ineligible = [
      makeEvent({ status: 'pending', statusTimestamps: old, createdAt: hoursAgo(200) }), // waiting for the professional, not for payment
      makeEvent({ status: 'inProgress', statusTimestamps: old }),
      makeEvent({ status: 'deliveryRequest', statusTimestamps: old }),
      makeEvent({ status: 'delivered', statusTimestamps: old }),
      makeEvent({ status: 'cancelled', statusTimestamps: old }),
      makeEvent({ status: 'declined', statusTimestamps: old }),
      makeEvent({ status: 'cancelRequest', statusTimestamps: old }),
      makeEvent({ status: 'accepted', isDeleted: true, statusTimestamps: old }),
      makeEvent({ status: 'accepted', paymentId: oid(), statusTimestamps: old }), // already paid
    ];
    const before = ineligible.map((d) => JSON.stringify(d));
    const { deps, cancelled } = makeDeps();

    assert.equal(await processAutoCancelUnpaid(NOW, deps), 0);
    assert.deepEqual(events.docs.map((d) => JSON.stringify(d)), before);
    assert.equal(cancelled.length, 0);
  });

  test('duplicate processing: a second run cancels and notifies nothing', async () => {
    makeEvent({ statusTimestamps: { acceptedAt: hoursAgo(80) } });
    const { deps, cancelled } = makeDeps();

    assert.equal(await processAutoCancelUnpaid(NOW, deps), 1);
    assert.equal(await processAutoCancelUnpaid(NOW, deps), 0);
    assert.equal(cancelled.length, 1);
    assert.equal(events.docs[0].statusHistory.length, 1);
  });

  test('concurrent runs (two instances): every order is cancelled and notified exactly once', async () => {
    for (let i = 0; i < 5; i++) makeEvent({ statusTimestamps: { acceptedAt: hoursAgo(100) } });
    const { deps, cancelled } = makeDeps();

    const [a, b] = await Promise.all([
      processAutoCancelUnpaid(NOW, deps),
      processAutoCancelUnpaid(NOW, deps),
    ]);

    assert.equal(a + b, 5, 'total cancellations across both runs');
    assert.equal(cancelled.length, 5, 'one notification batch per order');
    assert.equal(new Set(cancelled.map((c) => c.orderId)).size, 5);
    for (const d of events.docs) assert.equal(d.statusHistory.length, 1);
  });

  test('race: an order that gets paid between the lookup and the claim is NOT cancelled', async () => {
    const o = makeEvent({ statusTimestamps: { acceptedAt: hoursAgo(100) } });
    // Simulate the payment webhook landing right after the candidate lookup
    const realFind = EventOrder.find;
    mock.method(EventOrder, 'find', (filter: any) => {
      const chain = realFind(filter);
      const realLean = chain.lean;
      chain.lean = async () => {
        const res = await realLean();
        o.status = 'inProgress';
        o.paymentId = oid();
        return res;
      };
      return chain;
    });
    const { deps, cancelled } = makeDeps();

    assert.equal(await processAutoCancelUnpaid(NOW, deps), 0);
    assert.equal(o.status, 'inProgress');
    assert.equal(cancelled.length, 0);

    (EventOrder.find as any).mock.restore(); // back to the plain in-memory fake
  });

  test('overlapping cron ticks in one process: the second tick is skipped', async () => {
    makeEvent({ statusTimestamps: { acceptedAt: hoursAgo(100) } });
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow = {
      notifyAutoCancelled: async () => void (await gate),
      notifyAutoDelivered: async () => undefined,
    };

    const first = runAutoCancelUnpaidJob(NOW, slow); // blocks inside the notification
    await new Promise((r) => setImmediate(r));
    const second = await runAutoCancelUnpaidJob(NOW, slow); // must be skipped
    release();

    assert.equal(second, 0);
    assert.equal(await first, 1);
  });

  test('a failing notification does not stop the cancellation of other orders', async () => {
    makeEvent({ statusTimestamps: { acceptedAt: hoursAgo(100) } });
    makeEvent({ statusTimestamps: { acceptedAt: hoursAgo(100) } });
    const deps = {
      notifyAutoCancelled: async () => {
        throw new Error('smtp down');
      },
      notifyAutoDelivered: async () => undefined,
    };
    assert.equal(await processAutoCancelUnpaid(NOW, deps), 2);
    assert.ok(events.docs.every((d) => d.status === 'cancelled'));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('auto-delivery (168h) — package, custom and marketplace', () => {
  for (const orderType of ['direct', 'custom']) {
    test(`${orderType}: deliveryRequest is delivered at exactly 168h`, async () => {
      const o = makeEvent({
        orderType,
        status: 'deliveryRequest',
        statusTimestamps: { deliveryRequestAt: hoursAgo(168) },
      });
      const { deps, delivered } = makeDeps();

      assert.equal(await processAutoDeliver(NOW, deps), 1);
      const saved = events.docs[0];
      assert.equal(saved.status, 'delivered');
      assert.deepEqual(saved.statusTimestamps.deliveredAt, NOW);
      assert.match(saved.statusHistory[0].reason, /168 hours/);
      assert.equal(delivered.length, 1);
      assert.equal(delivered[0].kind, 'event');
      assert.equal(String(delivered[0].clientId), String(o.userId));
      assert.equal(String(delivered[0].professionalId), String(o.serviceProviderId));
    });
  }

  test('marketplace: deliveryRequest is delivered at exactly 168h (was 120h / 5 days)', async () => {
    const g = makeGear({ statusTimestamps: { deliveryRequestAt: hoursAgo(168) } });
    const { deps, delivered } = makeDeps();

    assert.equal(await processGearAutoDeliver(NOW, deps), 1);
    assert.equal(gears.docs[0].orderStatus, 'delivered');
    assert.deepEqual(gears.docs[0].statusTimestamps.deliveredAt, NOW);
    assert.equal(delivered[0].kind, 'gear');
    assert.equal(String(delivered[0].clientId), String(g.clientId));
    assert.equal(String(delivered[0].professionalId), String(g.sellerId));
    assert.equal(delivered[0].title, 'Canon 24-70');
  });

  test('marketplace order only 5 days old is NOT delivered any more', async () => {
    makeGear({ statusTimestamps: { deliveryRequestAt: hoursAgo(120) } });
    const { deps } = makeDeps();
    assert.equal(await processGearAutoDeliver(NOW, deps), 0);
    assert.equal(gears.docs[0].orderStatus, 'deliveryRequest');
  });

  test('boundaries: 1 ms before 168h is skipped, 1 ms after is delivered (event + gear)', async () => {
    makeEvent({ status: 'deliveryRequest', statusTimestamps: { deliveryRequestAt: hoursAgo(168, +1) } });
    makeEvent({ status: 'deliveryRequest', statusTimestamps: { deliveryRequestAt: hoursAgo(168, -1) } });
    makeGear({ statusTimestamps: { deliveryRequestAt: hoursAgo(168, +1) } });
    makeGear({ statusTimestamps: { deliveryRequestAt: hoursAgo(168, -1) } });
    const { deps } = makeDeps();

    assert.equal(await processAutoDeliver(NOW, deps), 1);
    assert.equal(await processGearAutoDeliver(NOW, deps), 1);
    assert.deepEqual(events.docs.map((d) => d.status), ['deliveryRequest', 'delivered']);
    assert.deepEqual(gears.docs.map((d) => d.orderStatus), ['deliveryRequest', 'delivered']);
  });

  test('ineligible event orders are untouched (manual delivery, cancelled, declined delivery, deleted…)', async () => {
    const t = { deliveryRequestAt: hoursAgo(500) };
    const manualDeliveredAt = hoursAgo(300);
    const manual = makeEvent({ status: 'delivered', statusTimestamps: { ...t, deliveredAt: manualDeliveredAt } });
    const rest = [
      makeEvent({ status: 'cancelled', statusTimestamps: t }),
      makeEvent({ status: 'cancelRequest', statusTimestamps: t }),
      makeEvent({ status: 'deliveryRequestDeclined', statusTimestamps: t }),
      makeEvent({ status: 'inProgress', statusTimestamps: t }),
      makeEvent({ status: 'accepted', statusTimestamps: t }),
      makeEvent({ status: 'deliveryRequest', isDeleted: true, statusTimestamps: t }),
      makeEvent({ status: 'deliveryRequest', statusTimestamps: {} }), // no reference timestamp → never guess
    ];
    const before = rest.map((d) => JSON.stringify(d));
    const { deps, delivered } = makeDeps();

    assert.equal(await processAutoDeliver(NOW, deps), 0);
    assert.deepEqual(rest.map((d) => JSON.stringify(d)), before);
    assert.deepEqual(manual.statusTimestamps.deliveredAt, manualDeliveredAt, 'manual delivery timestamp preserved');
    assert.equal(delivered.length, 0);
  });

  test('ineligible gear orders are untouched', async () => {
    const t = { deliveryRequestAt: hoursAgo(500) };
    const docs = [
      makeGear({ orderStatus: 'delivered', statusTimestamps: { ...t, deliveredAt: hoursAgo(300) } }),
      makeGear({ orderStatus: 'cancelled', statusTimestamps: t }),
      makeGear({ orderStatus: 'deliveryRequestDeclined', statusTimestamps: t }),
      makeGear({ orderStatus: 'inProgress', statusTimestamps: t }),
      makeGear({ orderStatus: 'pending', statusTimestamps: t }),
      makeGear({ orderStatus: 'deliveryRequest', isDeleted: true, statusTimestamps: t }),
    ];
    const before = docs.map((d) => JSON.stringify(d));
    const { deps, delivered } = makeDeps();

    assert.equal(await processGearAutoDeliver(NOW, deps), 0);
    assert.deepEqual(docs.map((d) => JSON.stringify(d)), before);
    assert.equal(delivered.length, 0);
  });

  test('duplicate + concurrent processing: exactly one delivery and one notification batch per order', async () => {
    for (let i = 0; i < 4; i++) {
      makeEvent({ status: 'deliveryRequest', statusTimestamps: { deliveryRequestAt: hoursAgo(200) } });
      makeGear({ statusTimestamps: { deliveryRequestAt: hoursAgo(200) } });
    }
    const { deps, delivered } = makeDeps();

    const results = await Promise.all([
      processAutoDeliver(NOW, deps),
      processAutoDeliver(NOW, deps),
      processGearAutoDeliver(NOW, deps),
      processGearAutoDeliver(NOW, deps),
    ]);
    assert.equal(results[0] + results[1], 4);
    assert.equal(results[2] + results[3], 4);
    assert.equal(delivered.length, 8);
    assert.equal(new Set(delivered.map((d) => d.orderId)).size, 8);

    // and a later re-run does nothing
    assert.equal(await processAutoDeliver(NOW, deps), 0);
    assert.equal(await processGearAutoDeliver(NOW, deps), 0);
    assert.equal(delivered.length, 8);
    for (const d of events.docs) assert.equal(d.statusHistory.length, 1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('notifications + emails reach BOTH parties', () => {
  const client = { _id: oid(), name: 'Klient Novák', email: 'client@example.com' };
  const pro = { _id: oid(), name: 'Fotograf Mac', email: 'pro@example.com' };

  interface InApp { userId: any; receiverId: any; text: string; type: string }
  let inApp: InApp[];
  const emit = async (p: any) => {
    inApp.push({ userId: p.userId, receiverId: p.receiverId, text: p.userMsg.text, type: p.type });
  };

  beforeEach(() => {
    inApp = [];
    mock.method(User, 'findById', (id: any) => ({
      select: async () => [client, pro].find((u) => String(u._id) === String(id)) ?? null,
    }));
  });

  const mailTo = (addr: string) => sentMails.filter((m) => m.to === addr);

  test('auto-cancel: client AND professional get an in-app notification and an email naming the 72h payment reason', async () => {
    await socket.sentNotificationForOrderAutoCancelled({
      clientId: client._id, professionalId: pro._id, orderId: 'EVT-1', title: 'Wedding', emit,
    });

    const toClient = inApp.find((n) => String(n.receiverId) === String(client._id))!;
    const toPro = inApp.find((n) => String(n.receiverId) === String(pro._id))!;
    assert.equal(inApp.length, 2);
    assert.equal(toClient.type, 'OrderCancelled');
    assert.match(toClient.text, /platba nebola prijatá do 72 hodín/);
    assert.match(toPro.text, /klient neuhradil platbu do 72 hodín/);

    assert.equal(sentMails.length, 2);
    const clientMail = mailTo(client.email)[0];
    const proMail = mailTo(pro.email)[0];
    assert.match(clientMail.html, /platba nebola prijatá do 72 hodín/);
    assert.match(proMail.html, /klient neuhradil platbu do 72 hodín/);
    assert.match(clientMail.html, /EVT-1/);
    assert.match(clientMail.subject, /EVT-1/);
  });

  for (const kind of ['event', 'gear']) {
    test(`auto-delivery (${kind}): professional is told payment is released within 15 days, client is told it was auto-delivered`, async () => {
      await socket.sentNotificationForOrderAutoDelivered({
        kind, clientId: client._id, professionalId: pro._id, orderId: 'X-1', title: 'Item', emit,
      });

      const toClient = inApp.find((n) => String(n.receiverId) === String(client._id))!;
      const toPro = inApp.find((n) => String(n.receiverId) === String(pro._id))!;
      assert.equal(inApp.length, 2);
      assert.equal(toPro.type, kind === 'gear' ? 'GearDeliveryAccepted' : 'DeliveryAccepted');
      assert.match(toPro.text, /do 15 kalendárnych dní/);
      assert.match(toClient.text, /automaticky označená ako doručená/);
      assert.doesNotMatch(toClient.text, /48 hodin/); // the 48h notice is the PRE-delivery reminder now

      assert.equal(sentMails.length, 2);
      assert.match(mailTo(pro.email)[0].html, /do 15 kalendárnych dní/);
      assert.match(mailTo(client.email)[0].html, /automaticky doručená/);
      assert.doesNotMatch(mailTo(client.email)[0].html, /48 hodin/);
      // the professional email must NOT carry the client wording, and vice versa
      assert.doesNotMatch(mailTo(pro.email)[0].html, /48 hodin/);
      assert.doesNotMatch(mailTo(client.email)[0].html, /15 kalendárnych dní/);
    });
  }

  test('one party without an email still gets the in-app notification, and the other party is unaffected', async () => {
    client.email = '';
    try {
      await socket.sentNotificationForOrderAutoCancelled({
        clientId: client._id, professionalId: pro._id, orderId: 'EVT-2', emit,
      });
      assert.equal(inApp.length, 2);
      assert.equal(sentMails.length, 1);
      assert.equal(sentMails[0].to, pro.email);
    } finally {
      client.email = 'client@example.com';
    }
  });

  test('a failing in-app emit for one party does not stop the other party', async () => {
    const flaky = async (p: any) => {
      if (String(p.receiverId) === String(client._id)) throw new Error('socket down');
      await emit(p);
    };
    await socket.sentNotificationForOrderAutoDelivered({
      kind: 'event', clientId: client._id, professionalId: pro._id, orderId: 'X-2', emit: flaky,
    });
    assert.equal(inApp.length, 1);
    assert.equal(String(inApp[0].receiverId), String(pro._id));
    assert.equal(sentMails.length, 2, 'both emails still sent');
  });

  test('end to end: scheduler job + real notification functions → one batch of 2 notifications + 2 emails per order', async () => {
    const order = makeEvent({
      userId: client._id,
      serviceProviderId: pro._id,
      status: 'deliveryRequest',
      statusTimestamps: { deliveryRequestAt: hoursAgo(168) },
    });
    const deps = {
      notifyAutoCancelled: (a: any) => socket.sentNotificationForOrderAutoCancelled({ ...a, emit }),
      notifyAutoDelivered: (a: any) => socket.sentNotificationForOrderAutoDelivered({ ...a, emit }),
    };

    assert.equal(await processAutoDeliver(NOW, deps), 1);
    assert.equal(await processAutoDeliver(NOW, deps), 0); // idempotent
    assert.equal(order.status, 'delivered');
    assert.equal(inApp.length, 2);
    assert.equal(sentMails.length, 2);
  });
});


// ═════════════════════════════════════════════════════════════════════════════
describe('48h pre-delivery reminder (120h after deliveryRequestAt)', () => {
  const eventAt = (hoursOld: number, over: any = {}, ms = 0) =>
    makeEvent({ status: 'deliveryRequest', statusTimestamps: { deliveryRequestAt: hoursAgo(hoursOld, ms) }, ...over });
  const gearAt = (hoursOld: number, over: any = {}, ms = 0) =>
    makeGear({ statusTimestamps: { deliveryRequestAt: hoursAgo(hoursOld, ms) }, ...over });

  test('1. NOT sent before 120h (1 ms early)', async () => {
    eventAt(120, {}, +1);
    gearAt(120, {}, +1);
    const { deps, reminders } = makeDeps();

    assert.equal(await processAutoDeliveryReminders(NOW, deps), 0);
    assert.equal(reminders.length, 0);
    assert.equal(events.docs[0].autoDeliveryReminderSentAt, undefined);
    assert.equal(gears.docs[0].autoDeliveryReminderSentAt, undefined);
  });

  test('2 + 6. sent at exactly 120h for package, custom and marketplace orders — to the client', async () => {
    const direct = eventAt(120, { orderType: 'direct' });
    const custom = eventAt(120, { orderType: 'custom' });
    const gear = gearAt(120);
    const { deps, reminders } = makeDeps();

    assert.equal(await processAutoDeliveryReminders(NOW, deps), 3);
    assert.equal(reminders.length, 3);

    const byOrder = (id: string) => reminders.find((r) => r.orderId === id)!;
    assert.equal(byOrder(direct.orderId).kind, 'event');
    assert.equal(String(byOrder(direct.orderId).clientId), String(direct.userId));
    assert.equal(byOrder(custom.orderId).kind, 'event');
    assert.equal(String(byOrder(custom.orderId).clientId), String(custom.userId));
    assert.equal(byOrder(gear.orderId).kind, 'gear');
    assert.equal(String(byOrder(gear.orderId).clientId), String(gear.clientId));
    assert.equal(byOrder(gear.orderId).title, 'Canon 24-70');

    for (const d of [...events.docs, ...gears.docs]) assert.deepEqual(d.autoDeliveryReminderSentAt, NOW);
    // reminding must not change the order itself
    assert.ok(events.docs.every((d) => d.status === 'deliveryRequest'));
    assert.equal(gears.docs[0].orderStatus, 'deliveryRequest');
  });

  test('3. sent only once, even when the cron runs again and again', async () => {
    eventAt(130);
    gearAt(130);
    const { deps, reminders } = makeDeps();

    assert.equal(await processAutoDeliveryReminders(NOW, deps), 2);
    assert.equal(await processAutoDeliveryReminders(NOW, deps), 0);
    assert.equal(await processAutoDeliveryReminders(new Date(NOW.getTime() + 5 * 60 * 1000), deps), 0);
    assert.equal(reminders.length, 2);
  });

  test('4. concurrent scheduler runs never send a duplicate reminder', async () => {
    for (let i = 0; i < 4; i++) {
      eventAt(125);
      gearAt(125);
    }
    const { deps, reminders } = makeDeps();

    const results = await Promise.all([
      processAutoDeliveryReminders(NOW, deps),
      processAutoDeliveryReminders(NOW, deps),
      processAutoDeliveryReminders(NOW, deps),
    ]);

    assert.equal(results.reduce((a: number, b: number) => a + b, 0), 8);
    assert.equal(reminders.length, 8);
    assert.equal(new Set(reminders.map((r) => r.orderId)).size, 8);
  });

  test('5. ineligible orders get no reminder', async () => {
    const t = (h: number) => ({ deliveryRequestAt: hoursAgo(h) });
    const ineligible = [
      makeEvent({ status: 'delivered', statusTimestamps: { ...t(130), deliveredAt: hoursAgo(10) } }), // delivered manually
      makeEvent({ status: 'cancelled', statusTimestamps: t(130) }),
      makeEvent({ status: 'cancelRequest', statusTimestamps: t(130) }),
      makeEvent({ status: 'deliveryRequestDeclined', statusTimestamps: t(130) }), // client already acted
      makeEvent({ status: 'inProgress', statusTimestamps: t(130) }),
      makeEvent({ status: 'deliveryRequest', isDeleted: true, statusTimestamps: t(130) }),
      makeEvent({ status: 'deliveryRequest', statusTimestamps: t(130), autoDeliveryReminderSentAt: hoursAgo(5) }), // already reminded
      makeEvent({ status: 'deliveryRequest', statusTimestamps: {} }), // no reference timestamp → never guess
      makeEvent({ status: 'deliveryRequest', statusTimestamps: t(168) }), // due for auto-delivery now: a "48h left" message would be false
      makeEvent({ status: 'deliveryRequest', statusTimestamps: t(300) }),
      makeGear({ orderStatus: 'delivered', statusTimestamps: { ...t(130), deliveredAt: hoursAgo(10) } }),
      makeGear({ orderStatus: 'cancelled', statusTimestamps: t(130) }),
      makeGear({ orderStatus: 'deliveryRequestDeclined', statusTimestamps: t(130) }),
      makeGear({ orderStatus: 'inProgress', statusTimestamps: t(130) }),
      makeGear({ orderStatus: 'pending', statusTimestamps: t(130) }),
      makeGear({ orderStatus: 'deliveryRequest', isDeleted: true, statusTimestamps: t(130) }),
      makeGear({ orderStatus: 'deliveryRequest', statusTimestamps: t(130), autoDeliveryReminderSentAt: hoursAgo(5) }),
      makeGear({ orderStatus: 'deliveryRequest', statusTimestamps: t(168) }),
    ];
    const before = ineligible.map((d) => JSON.stringify(d));
    const { deps, reminders } = makeDeps();

    assert.equal(await processAutoDeliveryReminders(NOW, deps), 0);
    assert.equal(reminders.length, 0);
    assert.deepEqual(ineligible.map((d) => JSON.stringify(d)), before);
  });

  test('a new delivery request (flag cleared) can be reminded again', async () => {
    const o = eventAt(130, { autoDeliveryReminderSentAt: hoursAgo(5) });
    const { deps, reminders } = makeDeps();
    assert.equal(await processAutoDeliveryReminders(NOW, deps), 0);

    // what requestOrderDelivery does on a fresh request
    o.autoDeliveryReminderSentAt = null;
    o.statusTimestamps.deliveryRequestAt = hoursAgo(121);
    assert.equal(await processAutoDeliveryReminders(NOW, deps), 1);
    assert.equal(reminders.length, 1);
  });

  test('a notification failure does not stop the other reminders', async () => {
    eventAt(130);
    gearAt(130);
    const deps = {
      notifyAutoCancelled: async () => undefined,
      notifyAutoDelivered: async () => undefined,
      notifyReminder: async () => {
        throw new Error('smtp down');
      },
    };
    assert.equal(await processAutoDeliveryReminders(NOW, deps), 2);
  });

  test('7. full timeline: reminder at 120h, nothing extra until 168h, auto-delivery at exactly 168h, no reminder afterwards', async () => {
    const t0 = NOW;
    const ev = makeEvent({ status: 'deliveryRequest', statusTimestamps: { deliveryRequestAt: t0 } });
    const gr = makeGear({ statusTimestamps: { deliveryRequestAt: t0 } });
    const { deps, reminders, delivered } = makeDeps();
    const at = (h: number, ms = 0) => new Date(t0.getTime() + h * HOUR_MS + ms);

    const tick = async (now: Date) => ({
      reminded: await processAutoDeliveryReminders(now, deps),
      deliveredEvents: await processAutoDeliver(now, deps),
      deliveredGear: await processGearAutoDeliver(now, deps),
    });

    // before 120h: nothing
    assert.deepEqual(await tick(at(119, 59 * 60 * 1000)), { reminded: 0, deliveredEvents: 0, deliveredGear: 0 });
    // 120h: reminder only
    assert.deepEqual(await tick(at(120)), { reminded: 2, deliveredEvents: 0, deliveredGear: 0 });
    // later cron ticks before 168h: still nothing new
    assert.deepEqual(await tick(at(120, 5 * 60 * 1000)), { reminded: 0, deliveredEvents: 0, deliveredGear: 0 });
    assert.deepEqual(await tick(at(167, 59 * 60 * 1000 + 59 * 1000 + 999)), { reminded: 0, deliveredEvents: 0, deliveredGear: 0 });
    assert.equal(ev.status, 'deliveryRequest');
    // exactly 168h: auto-delivery happens (unchanged behaviour)
    assert.deepEqual(await tick(at(168)), { reminded: 0, deliveredEvents: 1, deliveredGear: 1 });
    assert.equal(ev.status, 'delivered');
    assert.equal(gr.orderStatus, 'delivered');
    assert.equal(delivered.length, 2);
    // afterwards nothing is re-sent
    assert.deepEqual(await tick(at(170)), { reminded: 0, deliveredEvents: 0, deliveredGear: 0 });
    assert.equal(reminders.length, 2);
  });

  test('a late first check (order already past 168h) is auto-delivered WITHOUT a false "48h left" reminder', async () => {
    eventAt(200);
    const { deps, reminders, delivered } = makeDeps();
    assert.equal(await processAutoDeliveryReminders(NOW, deps), 0);
    assert.equal(await processAutoDeliver(NOW, deps), 1);
    assert.equal(reminders.length, 0);
    assert.equal(delivered.length, 1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('reminder content (in-app + email, client only)', () => {
  const client = { _id: oid(), name: 'Klient Novák', email: 'client@example.com' };
  const pro = { _id: oid(), name: 'Fotograf Mac', email: 'pro@example.com' };
  let inApp: any[];
  const emit = async (p: any) => void inApp.push({ receiverId: p.receiverId, userId: p.userId, text: p.userMsg.text, type: p.type });

  beforeEach(() => {
    inApp = [];
    mock.method(User, 'findById', (id: any) => ({
      select: async () => [client, pro].find((u) => String(u._id) === String(id)) ?? null,
    }));
  });

  for (const kind of ['event', 'gear']) {
    test(`${kind}: only the client gets an in-app notification and an email explaining the 48h auto-delivery`, async () => {
      await socket.sentNotificationForAutoDeliveryReminder({
        kind, clientId: client._id, professionalId: pro._id, orderId: 'R-1', title: 'Wedding', emit,
      });

      assert.equal(inApp.length, 1);
      assert.equal(String(inApp[0].receiverId), String(client._id));
      assert.equal(inApp[0].type, kind === 'gear' ? 'GearDeliveryRequest' : 'DeliveryRequest');
      assert.match(inApp[0].text, /po nasledujúcich 48 hodinách automaticky doručená/);
      assert.match(inApp[0].text, /Skontrolujte/);

      assert.equal(sentMails.length, 1);
      assert.equal(sentMails[0].to, client.email);
      assert.match(sentMails[0].subject, /48 hodín/);
      assert.match(sentMails[0].html, /po nasledujúcich 48 hodinách automaticky doručená/);
      assert.match(sentMails[0].html, /skontrolujte odovzdanú prácu/i);
      assert.match(sentMails[0].html, /R-1/);
    });
  }

  test('gear reminder: a professional buyer gets the professional purchases link, a regular client keeps the client link', async () => {
    const buyer: any = { _id: oid(), name: 'Buyer', email: 'buyer@example.com', role: 'photographer' };
    const seller = { _id: oid(), name: 'Seller', email: 'seller@example.com' };
    mock.method(User, 'findById', (id: any) => ({
      select: async () => [buyer, seller].find((u: any) => String(u._id) === String(id)) ?? null,
    }));
    const send = () =>
      socket.sentNotificationForAutoDeliveryReminder({ kind: 'gear', clientId: buyer._id, professionalId: seller._id, orderId: 'G-1', emit });

    for (const role of ['photographer', 'videographer', 'both']) {
      sentMails.length = 0;
      buyer.role = role;
      await send();
      assert.match(sentMails[0].html, /\/dashboard\/professional\/gear-purchases\?tab=toConfirm/, role);
      assert.doesNotMatch(sentMails[0].html, /my-account\/gear-order/, role);
    }
    for (const role of ['user', 'company']) {
      sentMails.length = 0;
      buyer.role = role;
      await send();
      assert.match(sentMails[0].html, /\/dashboard\/my-account\/gear-order\?tab=toConfirm/, role);
      assert.doesNotMatch(sentMails[0].html, /gear-purchases/, role);
    }
  });

  test('event reminder link is unchanged whatever the role (professional link applies to gear only)', async () => {
    const buyer: any = { _id: oid(), name: 'Buyer', email: 'buyer@example.com', role: 'photographer' };
    mock.method(User, 'findById', () => ({ select: async () => buyer }));
    await socket.sentNotificationForAutoDeliveryReminder({ kind: 'event', clientId: buyer._id, professionalId: oid(), orderId: 'E-1', emit });
    assert.match(sentMails[0].html, /\/dashboard\/my-account\/orders\?tab=toConfirm/);
    assert.doesNotMatch(sentMails[0].html, /gear-purchases/);
  });

  test('end to end with the real notification function: one reminder (1 in-app + 1 email) per order, never repeated', async () => {
    const o = makeEvent({
      userId: client._id,
      serviceProviderId: pro._id,
      status: 'deliveryRequest',
      statusTimestamps: { deliveryRequestAt: hoursAgo(120) },
    });
    const deps = {
      notifyAutoCancelled: async () => undefined,
      notifyAutoDelivered: async () => undefined,
      notifyReminder: (a: any) => socket.sentNotificationForAutoDeliveryReminder({ ...a, emit }),
    };

    assert.equal(await processAutoDeliveryReminders(NOW, deps), 1);
    assert.equal(await processAutoDeliveryReminders(NOW, deps), 0);
    assert.equal(o.status, 'deliveryRequest');
    assert.equal(inApp.length, 1);
    assert.equal(sentMails.length, 1);
  });
});
