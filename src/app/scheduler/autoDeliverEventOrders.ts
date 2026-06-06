import cron from 'node-cron';
import { EventOrder } from '../modules/eventOrder/eventOrder.model';
import { GearOrder } from '../modules/gearOrder/gearOrder.model';
import { logger } from '../utils/logger';

const AUTO_DELIVER_DAYS = 5;
const AUTO_CANCEL_DAYS = 7;

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
      order.cancelReason = 'Auto-cancelled after 7 days — payment not received';
      order.statusTimestamps.cancelledAt = now;
      order.statusHistory.push({
        status: 'cancelled',
        reason: 'Auto-cancelled after 7 days — payment not received',
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

  logger.info('[Scheduler] All 4 jobs registered: event & gear auto-deliver/cancel');
};
