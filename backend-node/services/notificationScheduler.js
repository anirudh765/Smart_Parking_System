const Reservation = require('../models/Reservation');
const notificationService = require('./notificationService');
const { isEmailEnabled } = require('./smtpEmail');

const UPCOMING_MINUTES = parseInt(process.env.NOTIFY_RESERVATION_UPCOMING_MINUTES || '30', 10);
const EXPIRY_MINUTES = parseInt(process.env.NOTIFY_RESERVATION_EXPIRY_MINUTES || '10', 10);
const EXPIRED_WINDOW_MINUTES = parseInt(process.env.NOTIFY_RESERVATION_EXPIRED_WINDOW_MINUTES || '5', 10);
const RUN_INTERVAL_MINUTES = parseInt(process.env.NOTIFY_SCHEDULER_INTERVAL_MINUTES || '5', 10);

const fetchWindow = (startOffsetMinutes, endOffsetMinutes) => {
  const now = new Date();
  const start = new Date(now.getTime() + startOffsetMinutes * 60 * 1000);
  const end = new Date(now.getTime() + endOffsetMinutes * 60 * 1000);
  return { start, end };
};

const runReservationChecks = async () => {
  if (!isEmailEnabled()) {
    return;
  }

  const now = new Date();
  const upcomingWindow = fetchWindow(0, UPCOMING_MINUTES);
  const expiringWindow = fetchWindow(0, EXPIRY_MINUTES);
  const expiredWindowStart = new Date(now.getTime() - EXPIRED_WINDOW_MINUTES * 60 * 1000);

  const upcomingReservations = await Reservation.find({
    status: 'confirmed',
    startTime: { $gte: upcomingWindow.start, $lte: upcomingWindow.end }
  }).populate('slot', 'slotCode floor zone');

  for (const reservation of upcomingReservations) {
    await notificationService.sendReservationUpcoming(reservation, reservation.slot);
  }

  const expiringReservations = await Reservation.find({
    status: { $in: ['confirmed', 'active'] },
    endTime: { $gte: expiringWindow.start, $lte: expiringWindow.end }
  }).populate('slot', 'slotCode floor zone');

  for (const reservation of expiringReservations) {
    await notificationService.sendReservationExpiring(reservation, reservation.slot);
  }

  const expiredReservations = await Reservation.find({
    status: { $in: ['confirmed', 'active'] },
    endTime: { $gte: expiredWindowStart, $lt: now }
  }).populate('slot', 'slotCode floor zone');

  for (const reservation of expiredReservations) {
    await notificationService.sendReservationExpired(reservation, reservation.slot);
  }
};

const startNotificationScheduler = () => {
  const isEnabled = process.env.NOTIFY_SCHEDULER_ENABLED !== 'false';
  if (!isEnabled) {
    return;
  }

  const intervalMs = RUN_INTERVAL_MINUTES * 60 * 1000;

  const tick = async () => {
    try {
      await runReservationChecks();
    } catch (error) {
      console.warn('[notifications] Scheduler error:', error.message || error);
    }
  };

  tick();
  setInterval(tick, intervalMs);
};

module.exports = {
  startNotificationScheduler
};
