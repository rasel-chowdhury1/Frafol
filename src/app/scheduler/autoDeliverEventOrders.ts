import cron from 'node-cron';
import { EventOrder } from '../modules/eventOrder/eventOrder.model';
import { GearOrder } from '../modules/gearOrder/gearOrder.model';
import { Workshop } from '../modules/workshop/workshop.model';
import { WorkshopService } from '../modules/workshop/workshop.service';
import { logger } from '../utils/logger';
import moment from 'moment-timezone';
import { isWorkshopFinished, WORKSHOP_TIMEZONE } from '../utils/workshopTime';
import {
  sentNotificationForOrderAutoCancelled,
  sentNotificationForOrderAutoDelivered,
  sentNotificationForAutoDeliveryReminder,
} from '../../socketIo';

// ─── Timing rules (all calculated in milliseconds, so they are timezone / DST independent) ──
export const HOUR_MS = 60 * 60 * 1000;
export const AUTO_CANCEL_HOURS = 72; // unpaid package/custom orders: 3 days
export const AUTO_DELIVER_HOURS = 168; // package/custom/marketplace orders: 7 days
export const AUTO_DELIVER_REMINDER_LEAD_HOURS = 48; // client is reminded 48h before auto-delivery
export const AUTO_DELIVER_REMINDER_HOURS = AUTO_DELIVER_HOURS - AUTO_DELIVER_REMINDER_LEAD_HOURS; // 120h after deliveryRequestAt

/** Orders whose reference timestamp is <= this value have reached the threshold (boundary is inclusive). */
export const cutoffFor = (now: Date, hours: number): Date =>
  new Date(now.getTime() - hours * HOUR_MS);

// Notifications are injectable so the jobs can be tested without sockets / SMTP
export interface AutoJobDeps {
  notifyAutoCancelled: typeof sentNotificationForOrderAutoCancelled;
  notifyAutoDelivered: typeof sentNotificationForOrderAutoDelivered;
  notifyReminder: typeof sentNotificationForAutoDeliveryReminder;
}
const defaultDeps: AutoJobDeps = {
  notifyAutoCancelled: sentNotificationForOrderAutoCancelled,
  notifyAutoDelivered: sentNotificationForOrderAutoDelivered,
  notifyReminder: sentNotificationForAutoDeliveryReminder,
};

// In-process guard: a slow run must not overlap with the next cron tick.
// (Across processes / instances the atomic updates below are what prevent double processing.)
const runningJobs = new Set<string>();
const guarded = async (name: string, job: () => Promise<number>): Promise<number> => {
  if (runningJobs.has(name)) {
    logger.warn(`[Scheduler] ${name} is still running — skipping this tick`);
    return 0;
  }
  runningJobs.add(name);
  try {
    return await job();
  } finally {
    runningJobs.delete(name);
  }
};

// ─── Event (package + custom): auto-cancel unpaid orders after 72 hours ──────
// The payment clock starts when the professional ACCEPTS the order (that is when the
// client is asked to pay). Orders still `pending` are waiting for the professional,
// not for a payment, so they are not touched here.
export const processAutoCancelUnpaid = async (
  now: Date = new Date(),
  deps: AutoJobDeps = defaultDeps,
): Promise<number> => {
    const cutoff = cutoffFor(now, AUTO_CANCEL_HOURS);

    const eligible = {
      isDeleted: false,
      status: 'accepted',
      paymentId: null, // never paid (matches missing or null)
      'statusTimestamps.acceptedAt': { $lte: cutoff },
    };

    const candidates = await EventOrder.find(eligible).select('_id').lean();
    const reason = `Auto-cancelled after ${AUTO_CANCEL_HOURS} hours — payment not received`;
    let cancelled = 0;

    for (const { _id } of candidates) {
      try {
        // Atomic claim: only ONE run can flip the order, and only if it is STILL eligible
        // (so a payment / manual cancel that happened in between is never overwritten).
        const order = await EventOrder.findOneAndUpdate(
          { _id, ...eligible },
          {
            $set: {
              status: 'cancelled',
              cancelReason: reason,
              'statusTimestamps.cancelledAt': now,
            },
            $push: { statusHistory: { status: 'cancelled', reason, changedAt: now } },
          },
          { new: true },
        ).populate('packageId', 'title');

        if (!order) continue; // someone else got it, or it is no longer eligible
        cancelled++;

        // Only the winner of the claim notifies, so each party is notified exactly once
        await deps
          .notifyAutoCancelled({
            clientId: order.userId,
            professionalId: order.serviceProviderId,
            orderId: order.orderId,
            title: (order.packageId as any)?.title || order.title,
          })
          .catch((err) => logger.error(`[AutoCancel] Notification failed for ${order.orderId}`, err));
      } catch (err) {
        logger.error(`[AutoCancel] Failed to cancel order ${_id}`, err);
      }
    }

    if (cancelled) logger.info(`[AutoCancel] Cancelled ${cancelled} unpaid event order(s) (${AUTO_CANCEL_HOURS}h)`);
    return cancelled;
};

// Guarded entry point used by the cron schedule
export const runAutoCancelUnpaidJob = (now?: Date, deps?: AutoJobDeps) =>
  guarded('AutoCancel', () => processAutoCancelUnpaid(now, deps));

// ─── Event (package + custom): auto-deliver 168 hours after the delivery request ──
export const processAutoDeliver = async (
  now: Date = new Date(),
  deps: AutoJobDeps = defaultDeps,
): Promise<number> => {
    const cutoff = cutoffFor(now, AUTO_DELIVER_HOURS);

    // Only orders still waiting for the client's confirmation. Delivered / cancelled /
    // declined-delivery orders have a different status and are never matched.
    const eligible = {
      isDeleted: false,
      status: 'deliveryRequest',
      'statusTimestamps.deliveryRequestAt': { $lte: cutoff },
    };

    const candidates = await EventOrder.find(eligible).select('_id').lean();
    const reason = `Auto-delivered after ${AUTO_DELIVER_HOURS} hours — client did not confirm`;
    let delivered = 0;

    for (const { _id } of candidates) {
      try {
        const order = await EventOrder.findOneAndUpdate(
          { _id, ...eligible },
          {
            $set: { status: 'delivered', 'statusTimestamps.deliveredAt': now },
            $push: { statusHistory: { status: 'delivered', reason, changedAt: now } },
          },
          { new: true },
        ).populate('packageId', 'title');

        if (!order) continue;
        delivered++;

        await deps
          .notifyAutoDelivered({
            kind: 'event',
            clientId: order.userId,
            professionalId: order.serviceProviderId,
            orderId: order.orderId,
            title: (order.packageId as any)?.title || order.title,
          })
          .catch((err) => logger.error(`[AutoDeliver] Notification failed for ${order.orderId}`, err));
      } catch (err) {
        logger.error(`[AutoDeliver] Failed to deliver order ${_id}`, err);
      }
    }

    if (delivered) logger.info(`[AutoDeliver] Marked ${delivered} event order(s) as delivered (${AUTO_DELIVER_HOURS}h)`);
    return delivered;
};

// Guarded entry point used by the cron schedule
export const runAutoDeliverJob = (now?: Date, deps?: AutoJobDeps) =>
  guarded('AutoDeliver', () => processAutoDeliver(now, deps));

// ─── Gear (marketplace): auto-deliver 168 hours after the delivery request ───
export const processGearAutoDeliver = async (
  now: Date = new Date(),
  deps: AutoJobDeps = defaultDeps,
): Promise<number> => {
    const cutoff = cutoffFor(now, AUTO_DELIVER_HOURS);

    const eligible = {
      isDeleted: false,
      orderStatus: 'deliveryRequest',
      'statusTimestamps.deliveryRequestAt': { $lte: cutoff },
    };

    const candidates = await GearOrder.find(eligible).select('_id').lean();
    let delivered = 0;

    for (const { _id } of candidates) {
      try {
        const order = await GearOrder.findOneAndUpdate(
          { _id, ...eligible },
          { $set: { orderStatus: 'delivered', 'statusTimestamps.deliveredAt': now } },
          { new: true },
        ).populate('gearMarketplaceId', 'name');

        if (!order) continue;
        delivered++;

        await deps
          .notifyAutoDelivered({
            kind: 'gear',
            clientId: order.clientId,
            professionalId: order.sellerId,
            orderId: order.orderId,
            title: (order.gearMarketplaceId as any)?.name,
          })
          .catch((err) => logger.error(`[GearAutoDeliver] Notification failed for ${order.orderId}`, err));
      } catch (err) {
        logger.error(`[GearAutoDeliver] Failed to deliver order ${_id}`, err);
      }
    }

    if (delivered) logger.info(`[GearAutoDeliver] Marked ${delivered} gear order(s) as delivered (${AUTO_DELIVER_HOURS}h)`);
    return delivered;
};

// Guarded entry point used by the cron schedule
export const runGearAutoDeliverJob = (now?: Date, deps?: AutoJobDeps) =>
  guarded('GearAutoDeliver', () => processGearAutoDeliver(now, deps));

// ─── 48h pre-delivery reminder (event: package + custom, and gear) ───────────
// Sent to the CLIENT 120h after deliveryRequestAt, i.e. exactly 48h BEFORE auto-delivery.
// - Eligible: still `deliveryRequest` (delivered / cancelled / declined-delivery orders never match)
//   and NOT yet at the 168h auto-delivery point (so a late first check never sends a false
//   "48 hours left" message right before delivering).
// - Exactly once per delivery request: the atomic claim sets autoDeliveryReminderSentAt only if it
//   is still empty; only the run that wins the claim sends. A new delivery request clears the flag.
export const processAutoDeliveryReminders = async (
  now: Date = new Date(),
  deps: AutoJobDeps = defaultDeps,
): Promise<number> => {
  const reminderCutoff = cutoffFor(now, AUTO_DELIVER_REMINDER_HOURS);
  const deliverCutoff = cutoffFor(now, AUTO_DELIVER_HOURS);

  // `$gt: deliverCutoff` = younger than 168h (not yet due for auto-delivery)
  const window = { $lte: reminderCutoff, $gt: deliverCutoff };
  let sent = 0;

  // ── package + custom orders
  const eventEligible = {
    isDeleted: false,
    status: 'deliveryRequest',
    autoDeliveryReminderSentAt: null, // matches missing or null
    'statusTimestamps.deliveryRequestAt': window,
  };
  for (const { _id } of await EventOrder.find(eventEligible).select('_id').lean()) {
    try {
      const order = await EventOrder.findOneAndUpdate(
        { _id, ...eventEligible },
        { $set: { autoDeliveryReminderSentAt: now } },
        { new: true },
      ).populate('packageId', 'title');
      if (!order) continue;
      sent++;
      await deps
        .notifyReminder({
          kind: 'event',
          clientId: order.userId,
          professionalId: order.serviceProviderId,
          orderId: order.orderId,
          title: (order.packageId as any)?.title || order.title,
        })
        .catch((err) => logger.error(`[DeliveryReminder] Notification failed for ${order.orderId}`, err));
    } catch (err) {
      logger.error(`[DeliveryReminder] Failed for event order ${_id}`, err);
    }
  }

  // ── marketplace orders
  const gearEligible = {
    isDeleted: false,
    orderStatus: 'deliveryRequest',
    autoDeliveryReminderSentAt: null,
    'statusTimestamps.deliveryRequestAt': window,
  };
  for (const { _id } of await GearOrder.find(gearEligible).select('_id').lean()) {
    try {
      const order = await GearOrder.findOneAndUpdate(
        { _id, ...gearEligible },
        { $set: { autoDeliveryReminderSentAt: now } },
        { new: true },
      ).populate('gearMarketplaceId', 'name');
      if (!order) continue;
      sent++;
      await deps
        .notifyReminder({
          kind: 'gear',
          clientId: order.clientId,
          professionalId: order.sellerId,
          orderId: order.orderId,
          title: (order.gearMarketplaceId as any)?.name,
        })
        .catch((err) => logger.error(`[DeliveryReminder] Notification failed for ${order.orderId}`, err));
    } catch (err) {
      logger.error(`[DeliveryReminder] Failed for gear order ${_id}`, err);
    }
  }

  if (sent) logger.info(`[DeliveryReminder] Sent ${sent} 48h auto-delivery reminder(s)`);
  return sent;
};

// Guarded entry point used by the cron schedule
export const runAutoDeliveryReminderJob = (now?: Date, deps?: AutoJobDeps) =>
  guarded('DeliveryReminder', () => processAutoDeliveryReminders(now, deps));

// ─── Gear: auto-cancel unpaid pending orders after 7 days ────────────────────
const runGearAutoCancelJob = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const orders = await GearOrder.find({
    orderStatus: 'pending',
    createdAt: { $lte: cutoff },
    isDeleted: false,
  });

  if (!orders.length) return;

  const now = new Date();

  await Promise.all(
    orders.map((order) => {
      order.orderStatus = 'cancelled';
      order.statusTimestamps.cancelledAt = now;
      return order.save();
    }),
  );

  logger.info(`[GearAutoCancel] Cancelled ${orders.length} unpaid gear order(s) (7-day auto-cancel)`);
};

// ─── Workshop: auto-complete finished workshops and send post-workshop final invoices ──
// "Finished" is decided in Slovak time (see utils/workshopTime.ts), never in the server's timezone.
// Hourly, daily and startup triggers all end up here. The in-process guard stops them overlapping inside
// one process; the atomic claims inside processWorkshopCompletion protect across processes.
export const runWorkshopCompletionJob = (now: Date = new Date()) =>
  guarded('WorkshopCompletion', () => processWorkshopCompletions(now));

export const processWorkshopCompletions = async (now: Date = new Date()): Promise<number> => {
  // End of "today" in Slovakia — candidate workshops are those scheduled on or before it
  const todayEnd = moment.tz(now, WORKSHOP_TIMEZONE).endOf('day').toDate();

  // Find workshops that are approved, not deleted, post-workshop emails not sent yet, and scheduled on or before today
  const workshops = await Workshop.find({
    approvalStatus: 'approved',
    isDeleted: false,
    postWorkshopEmailsSent: { $ne: true },
    date: { $lte: todayEnd },
  });

  if (!workshops.length) return 0;

  let completedCount = 0;

  for (const workshop of workshops) {
    try {
      if (isWorkshopFinished(workshop.date, workshop.time, now)) {
        const result = await WorkshopService.processWorkshopCompletion(workshop._id, now);
        if (result?.postWorkshopEmailsSent) completedCount++; // only count workshops that are really done
      }
    } catch (err) {
      logger.error(`[WorkshopScheduler] Error completing workshop ${workshop._id}:`, err);
    }
  }

  if (completedCount > 0) {
    logger.info(
      `[WorkshopScheduler] Successfully completed ${completedCount} workshop(s) and dispatched final invoices to professional & clients`,
    );
  }
  return completedCount;
};

// ─── Register schedulers ──────────────────────────────────────────────────────
export const  startAutoDeliverScheduler = () => {
  // Event / gear thresholds are 72h and 168h, so these run every 5 minutes
  // (a daily run would let an order wait up to 24h past its deadline).

  // Event: auto-deliver deliveryRequest after 168h
  cron.schedule('*/5 * * * *', async () => {
    try {
      await runAutoDeliverJob();
    } catch (err) {
      logger.error('[AutoDeliver] Error during event auto-delivery job', err);
    }
  });

  // Event: auto-cancel unpaid package/custom orders after 72h
  cron.schedule('*/5 * * * *', async () => {
    try {
      await runAutoCancelUnpaidJob();
    } catch (err) {
      logger.error('[AutoCancel] Error during event auto-cancel job', err);
    }
  });

  // Gear: auto-deliver deliveryRequest after 168h
  cron.schedule('*/5 * * * *', async () => {
    try {
      await runGearAutoDeliverJob();
    } catch (err) {
      logger.error('[GearAutoDeliver] Error during gear auto-delivery job', err);
    }
  });

  // Client reminder 48h before auto-delivery (120h after the delivery request)
  cron.schedule('*/5 * * * *', async () => {
    try {
      await runAutoDeliveryReminderJob();
    } catch (err) {
      logger.error('[DeliveryReminder] Error during auto-delivery reminder job', err);
    }
  });

  // Gear: auto-cancel unpaid — daily at 03:30 AM (unchanged rule)
  cron.schedule('30 3 * * *', async () => {
    logger.info('[GearAutoCancel] Running gear unpaid cancellation check...');
    try {
      await runGearAutoCancelJob();
    } catch (err) {
      logger.error('[GearAutoCancel] Error during gear auto-cancel job', err);
    }
  });

  // Workshop: post-workshop final invoices & payout notification check — runs every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('[WorkshopScheduler] Checking for finished workshops...');
    try {
      await runWorkshopCompletionJob();
    } catch (err) {
      logger.error('[WorkshopScheduler] Error during hourly workshop completion check', err);
    }
  });

  // Workshop: post-workshop final invoices check — daily at 04:00 AM
  cron.schedule('0 4 * * *', async () => {
    logger.info('[WorkshopScheduler] Running daily workshop completion check...');
    try {
      await runWorkshopCompletionJob();
    } catch (err) {
      logger.error('[WorkshopScheduler] Error during daily workshop completion check', err);
    }
  });

  // Also run on startup after 5 seconds to catch any workshops finished while server was offline
  setTimeout(() => {
    runWorkshopCompletionJob().catch((err) =>
      logger.error('[WorkshopScheduler] Error during startup workshop check', err),
    );
  }, 5000);

  logger.info('[Scheduler] All jobs registered: event & gear auto-deliver/cancel + workshop completion');
};
