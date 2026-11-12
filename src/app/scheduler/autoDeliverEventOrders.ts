import cron from 'node-cron';
import { EventOrder } from '../modules/eventOrder/eventOrder.model';
import { GearOrder } from '../modules/gearOrder/gearOrder.model';
import { Workshop } from '../modules/workshop/workshop.model';
import { WorkshopService } from '../modules/workshop/workshop.service';
import { logger } from '../utils/logger';

const AUTO_DELIVER_DAYS = 7;
const AUTO_CANCEL_DAYS = 3;

// ─── Auto-deliver ────────────────────────────────────────────────────────────
const runAutoDeliverJob = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AUTO_DELIVER_DAYS);

  const orders = await EventOrder.find({
    status: 'deliveryRequest',
    'statusTimestamps.deliveryRequestAt': { $lte: cutoff },
    isDeleted: false,
  });

  if (!orders.length) return;

  const now = new Date();

  await Promise.all(
    orders.map((order) => {
      order.status = 'delivered';
      order.statusTimestamps.deliveredAt = now;
      order.statusHistory.push({
        status: 'delivered',
        reason: 'Auto-delivered after 5 days — customer did not confirm',
        changedAt: now,
      });
      return order.save();
    }),
  );

  logger.info(`[AutoDeliver] Marked ${orders.length} event order(s) as delivered (5-day auto-confirm)`);
};

// ─── Auto-cancel unpaid ───────────────────────────────────────────────────────
const runAutoCancelUnpaidJob = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AUTO_CANCEL_DAYS);

  const orders = await EventOrder.find({
    isDeleted: false,
    $or: [
      { status: 'pending', createdAt: { $lte: cutoff } },
      { status: 'accepted', 'statusTimestamps.acceptedAt': { $lte: cutoff } },
    ],
  });

  if (!orders.length) return;

  const now = new Date();

  await Promise.all(
    orders.map((order) => {
      order.status = 'cancelled';
      order.cancelReason = 'Auto-cancelled after 3 days — payment not received';
      order.statusTimestamps.cancelledAt = now;
      order.statusHistory.push({
        status: 'cancelled',
        reason: 'Auto-cancelled after 3 days — payment not received',
        changedAt: now,
      });
      return order.save();
    }),
  );

  logger.info(`[AutoCancel] Cancelled ${orders.length} unpaid event order(s) (5-day auto-cancel)`);
};

// ─── Gear: auto-deliver deliveryRequest after 5 days ─────────────────────────
const runGearAutoDeliverJob = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 5);

  const orders = await GearOrder.find({
    orderStatus: 'deliveryRequest',
    'statusTimestamps.deliveryRequestAt': { $lte: cutoff },
    isDeleted: false,
  });

  if (!orders.length) return;

  const now = new Date();

  await Promise.all(
    orders.map((order) => {
      order.orderStatus = 'delivered';
      order.statusTimestamps.deliveredAt = now;
      return order.save();
    }),
  );

  logger.info(`[GearAutoDeliver] Marked ${orders.length} gear order(s) as delivered (5-day auto-confirm)`);
};

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
const isWorkshopFinished = (date: Date, timeStr?: string): boolean => {
  const now = new Date();
  const workshopEnd = new Date(date);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const workshopDay = new Date(workshopEnd.getFullYear(), workshopEnd.getMonth(), workshopEnd.getDate());

  // If workshop date was yesterday or earlier, it is definitely over
  if (workshopDay < todayStart) {
    return true;
  }

  // If workshop is scheduled for today, check whether the time has ended
  if (workshopDay.getTime() === todayStart.getTime()) {
    if (!timeStr) {
      workshopEnd.setHours(23, 59, 59, 999);
      return now >= workshopEnd;
    }

    // Parse end time from formats like "14:00", "10:00 - 13:00", "10:00-13:30"
    const parts = timeStr.split('-');
    const endTimeStr = (parts[parts.length - 1] || '').trim();
    const match = endTimeStr.match(/(\d{1,2}):(\d{2})/);

    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      workshopEnd.setHours(hours, minutes, 0, 0);
      return now >= workshopEnd;
    } else {
      workshopEnd.setHours(23, 59, 59, 999);
      return now >= workshopEnd;
    }
  }

  // Workshop date is in the future
  return false;
};

const runWorkshopCompletionJob = async () => {
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Find workshops that are approved, not deleted, post-workshop emails not sent yet, and scheduled on or before today
  const workshops = await Workshop.find({
    approvalStatus: 'approved',
    isDeleted: false,
    postWorkshopEmailsSent: { $ne: true },
    date: { $lte: todayEnd },
  });

  if (!workshops.length) return;

  let completedCount = 0;

  for (const workshop of workshops) {
    try {
      if (isWorkshopFinished(workshop.date, workshop.time)) {
        await WorkshopService.processWorkshopCompletion(workshop._id);
        completedCount++;
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
};

// ─── Register schedulers ──────────────────────────────────────────────────────
export const startAutoDeliverScheduler = () => {
  // Event: auto-deliver deliveryRequest — daily at 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('[AutoDeliver] Running event auto-delivery check...');
    try {
      await runAutoDeliverJob();
    } catch (err) {
      logger.error('[AutoDeliver] Error during event auto-delivery job', err);
    }
  });

  // Event: auto-cancel unpaid — daily at 03:00 AM
  cron.schedule('0 3 * * *', async () => {
    logger.info('[AutoCancel] Running event unpaid cancellation check...');
    try {
      await runAutoCancelUnpaidJob();
    } catch (err) {
      logger.error('[AutoCancel] Error during event auto-cancel job', err);
    }
  });

  // Gear: auto-deliver deliveryRequest — daily at 02:30 AM
  cron.schedule('30 2 * * *', async () => {
    logger.info('[GearAutoDeliver] Running gear auto-delivery check...');
    try {
      await runGearAutoDeliverJob();
    } catch (err) {
      logger.error('[GearAutoDeliver] Error during gear auto-delivery job', err);
    }
  });

  // Gear: auto-cancel unpaid — daily at 03:30 AM
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
