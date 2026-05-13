import cron from 'node-cron';
import { EventOrder } from '../modules/eventOrder/eventOrder.model';
import { logger } from '../utils/logger';

const AUTO_DELIVER_DAYS = 7;
const AUTO_CANCEL_DAYS = 5;

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
        reason: 'Auto-delivered after 7 days — customer did not confirm',
        changedAt: now,
      });
      return order.save();
    }),
  );

  logger.info(`[AutoDeliver] Marked ${orders.length} event order(s) as delivered (7-day auto-confirm)`);
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
      order.cancelReason = 'Auto-cancelled after 5 days — payment not received';
      order.statusTimestamps.cancelledAt = now;
      order.statusHistory.push({
        status: 'cancelled',
        reason: 'Auto-cancelled after 5 days — payment not received',
        changedAt: now,
      });
      return order.save();
    }),
  );

  logger.info(`[AutoCancel] Cancelled ${orders.length} unpaid event order(s) (5-day auto-cancel)`);
};

// ─── Register schedulers ──────────────────────────────────────────────────────
export const startAutoDeliverScheduler = () => {
  // Auto-deliver: daily at 02:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('[AutoDeliver] Running auto-delivery check...');
    try {
      await runAutoDeliverJob();
    } catch (err) {
      logger.error('[AutoDeliver] Error during auto-delivery job', err);
    }
  });

  // Auto-cancel unpaid: daily at 03:00 AM
  cron.schedule('0 3 * * *', async () => {
    logger.info('[AutoCancel] Running unpaid order cancellation check...');
    try {
      await runAutoCancelUnpaidJob();
    } catch (err) {
      logger.error('[AutoCancel] Error during auto-cancel job', err);
    }
  });

  logger.info('[Scheduler] Auto-deliver (02:00 AM) and auto-cancel unpaid (03:00 AM) registered');
};
