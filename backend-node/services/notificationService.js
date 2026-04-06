const NotificationLog = require('../models/NotificationLog');
const User = require('../models/User');
const { sendEmail, isEmailEnabled } = require('./smtpEmail');

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

const normalizePhone = (value) => {
  if (!value) return null;
  const digits = value.toString().replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
};

const resolveReservationRecipient = async (reservation) => {
  if (reservation?.customerEmail) {
    return reservation.customerEmail;
  }

  if (reservation?.user) {
    const user = await User.findById(reservation.user).select('email');
    if (user?.email) return user.email;
  }

  const phone = normalizePhone(reservation?.customerPhone);
  if (phone) {
    const user = await User.findOne({ phone }).select('email');
    if (user?.email) return user.email;
  }

  return null;
};

const safeSend = async ({
  dedupeKey,
  type,
  targetModel,
  targetId,
  recipient,
  subject,
  text,
  html,
  meta
}) => {
//   console.log('[notifications] send attempt', {
//     type,
//     targetModel,
//     targetId: targetId?.toString?.() || targetId,
//     recipient,
//     subject
//   });

  if (!recipient) {
    console.warn('[notifications] missing recipient', { type, targetId: targetId?.toString?.() || targetId });
    return { skipped: true, reason: 'missing-recipient' };
  }

  if (!isEmailEnabled()) {
    console.warn('[notifications] SMTP email client not configured. Skipping email send.');
    return { skipped: true, reason: 'email-disabled' };
  }

  const alreadySent = await NotificationLog.findOne({ dedupeKey, status: 'sent' });
  if (alreadySent) {
    //console.log('[notifications] duplicate skipped', { type, dedupeKey });
    return { skipped: true, reason: 'duplicate' };
  }

  try {
    const result = await sendEmail({ to: recipient, subject, text, html, meta });
    // console.log('[notifications] send success', {
    //   type,
    //   recipient,
    //   messageId: result?.messageId || result?.message_id || null
    // });
    await NotificationLog.create({
      dedupeKey,
      type,
      targetModel,
      targetId,
      recipient,
      subject,
      status: 'sent',
      meta
    });
    return { sent: true };
  } catch (error) {
    await NotificationLog.create({
      dedupeKey,
      type,
      targetModel,
      targetId,
      recipient,
      subject,
      status: 'failed',
      error: error.message || 'Email send failed',
      meta
    });
    console.warn(`[notifications] Failed to send ${type} email:`, error.message || error);
    return { sent: false, error };
  }
};

const buildReservationDetails = (reservation, slot) => {
  const slotLabel = slot?.slotCode || reservation.slotCode || 'N/A';
  return {
    name: reservation.customerName,
    vehicleId: reservation.vehicleId,
    vehicleType: reservation.vehicleType,
    slotCode: slotLabel,
    startTime: formatDateTime(reservation.startTime),
    endTime: formatDateTime(reservation.endTime),
    durationHours: reservation.expectedDuration
  };
};

const sendReservationCreated = async (reservation, slot) => {
  const recipient = await resolveReservationRecipient(reservation);
  const details = buildReservationDetails(reservation, slot);
  const subject = `Reservation confirmed for ${details.vehicleId}`;
  const text = `Hi ${details.name}, your reservation is confirmed. Slot ${details.slotCode}, starts ${details.startTime} and ends ${details.endTime}. Expected duration: ${details.durationHours} hours.`;
  const html = `<p>Hi ${details.name},</p><p>Your reservation is confirmed.</p><ul><li>Vehicle: ${details.vehicleId} (${details.vehicleType})</li><li>Slot: ${details.slotCode}</li><li>Start: ${details.startTime}</li><li>End: ${details.endTime}</li><li>Expected duration: ${details.durationHours} hours</li></ul>`;

  return safeSend({
    dedupeKey: `reservation_created_${reservation._id}`,
    type: 'reservation_created',
    targetModel: 'Reservation',
    targetId: reservation._id,
    recipient,
    subject,
    text,
    html,
    meta: details
  });
};

const sendReservationCancelled = async (reservation, slot, reason) => {
  const recipient = await resolveReservationRecipient(reservation);
  const details = buildReservationDetails(reservation, slot);
  const subject = `Reservation cancelled for ${details.vehicleId}`;
  const text = `Hi ${details.name}, your reservation was cancelled. Reason: ${reason || 'Cancelled by user'}. Slot ${details.slotCode}, start ${details.startTime}.`;
  const html = `<p>Hi ${details.name},</p><p>Your reservation has been cancelled.</p><p>Reason: ${reason || 'Cancelled by user'}</p><ul><li>Vehicle: ${details.vehicleId}</li><li>Slot: ${details.slotCode}</li><li>Start: ${details.startTime}</li></ul>`;

  return safeSend({
    dedupeKey: `reservation_cancelled_${reservation._id}`,
    type: 'reservation_cancelled',
    targetModel: 'Reservation',
    targetId: reservation._id,
    recipient,
    subject,
    text,
    html,
    meta: { ...details, reason: reason || null }
  });
};

const sendReservationCheckedIn = async (reservation, slot, sessionId) => {
  const recipient = await resolveReservationRecipient(reservation);
  const details = buildReservationDetails(reservation, slot);
  const subject = `Check-in confirmed for ${details.vehicleId}`;
  const text = `Hi ${details.name}, your reservation check-in is complete. Slot ${details.slotCode}.`;
  const html = `<p>Hi ${details.name},</p><p>Your reservation has been checked in successfully.</p><ul><li>Vehicle: ${details.vehicleId}</li><li>Slot: ${details.slotCode}</li><li>Session: ${sessionId}</li></ul>`;

  return safeSend({
    dedupeKey: `reservation_checked_in_${reservation._id}`,
    type: 'reservation_checked_in',
    targetModel: 'Reservation',
    targetId: reservation._id,
    recipient,
    subject,
    text,
    html,
    meta: { ...details, sessionId }
  });
};

const sendReservationUpcoming = async (reservation, slot) => {
  const recipient = await resolveReservationRecipient(reservation);
  const details = buildReservationDetails(reservation, slot);
  const subject = `Upcoming reservation for ${details.vehicleId}`;
  const text = `Hi ${details.name}, your reservation starts at ${details.startTime} in slot ${details.slotCode}.`;
  const html = `<p>Hi ${details.name},</p><p>Your reservation starts soon.</p><ul><li>Vehicle: ${details.vehicleId}</li><li>Slot: ${details.slotCode}</li><li>Start: ${details.startTime}</li></ul>`;

  return safeSend({
    dedupeKey: `reservation_upcoming_${reservation._id}`,
    type: 'reservation_upcoming',
    targetModel: 'Reservation',
    targetId: reservation._id,
    recipient,
    subject,
    text,
    html,
    meta: details
  });
};

const sendReservationExpiring = async (reservation, slot) => {
  const recipient = await resolveReservationRecipient(reservation);
  const details = buildReservationDetails(reservation, slot);
  const subject = `Reservation ending soon for ${details.vehicleId}`;
  const text = `Hi ${details.name}, your reservation ends at ${details.endTime}. Please extend or check-in if needed.`;
  const html = `<p>Hi ${details.name},</p><p>Your reservation is about to end.</p><ul><li>Vehicle: ${details.vehicleId}</li><li>Slot: ${details.slotCode}</li><li>End: ${details.endTime}</li></ul>`;

  return safeSend({
    dedupeKey: `reservation_expiring_${reservation._id}`,
    type: 'reservation_expiring',
    targetModel: 'Reservation',
    targetId: reservation._id,
    recipient,
    subject,
    text,
    html,
    meta: details
  });
};

const sendReservationExpired = async (reservation, slot) => {
  const recipient = await resolveReservationRecipient(reservation);
  const details = buildReservationDetails(reservation, slot);
  const subject = `Reservation expired for ${details.vehicleId}`;
  const text = `Hi ${details.name}, your reservation window has ended. Please make a new booking if needed.`;
  const html = `<p>Hi ${details.name},</p><p>Your reservation window has ended.</p><ul><li>Vehicle: ${details.vehicleId}</li><li>Slot: ${details.slotCode}</li><li>End: ${details.endTime}</li></ul>`;

  return safeSend({
    dedupeKey: `reservation_expired_${reservation._id}`,
    type: 'reservation_expired',
    targetModel: 'Reservation',
    targetId: reservation._id,
    recipient,
    subject,
    text,
    html,
    meta: details
  });
};

const sendParkingExit = async ({ session, receipt, recipient }) => {
  if (!recipient) {
    return { skipped: true, reason: 'missing-recipient' };
  }

  const subject = `Parking exit receipt for ${session.vehicleId}`;
  const text = `Thanks for visiting. Vehicle ${session.vehicleId} exited at ${formatDateTime(session.exitTime)}. Total: Rs. ${receipt.totalAmount}.`;
  const html = `<p>Thanks for visiting.</p><ul><li>Vehicle: ${session.vehicleId}</li><li>Exit time: ${formatDateTime(session.exitTime)}</li><li>Total amount: Rs. ${receipt.totalAmount}</li><li>Visit Again!</li></ul>`;

  return safeSend({
    dedupeKey: `parking_exit_${session._id}`,
    type: 'parking_exit',
    targetModel: 'ParkingSession',
    targetId: session._id,
    recipient,
    subject,
    text,
    html,
    meta: {
      vehicleId: session.vehicleId,
      totalAmount: receipt.totalAmount,
      exitTime: session.exitTime
    }
  });
};

const sendParkingEntry = async ({ session, slot, recipient, estimatedExitTime }) => {
  if (!recipient) {
    return { skipped: true, reason: 'missing-recipient' };
  }

  const entryTime = formatDateTime(session.entryTime);
  const exitTimeLabel = estimatedExitTime ? formatDateTime(estimatedExitTime) : null;
  const subject = `Parking entry confirmed for ${session.vehicleId}`;
  const text = `Your vehicle ${session.vehicleId} is parked at slot ${slot.slotCode} (No. ${slot.slotNumber}). Entry time: ${entryTime}${exitTimeLabel ? `, estimated exit: ${exitTimeLabel}` : ''}.`;
  const html = `<p>Your vehicle <strong>${session.vehicleId}</strong> is parked.</p>
    <ul>
      <li>Slot: ${slot.slotCode} (No. ${slot.slotNumber})</li>
      <li>Entry time: ${entryTime}</li>
      ${exitTimeLabel ? `<li>Estimated exit: ${exitTimeLabel}</li>` : ''}
    </ul>`;

  return safeSend({
    dedupeKey: `parking_entry_${session._id}`,
    type: 'parking_entry',
    targetModel: 'ParkingSession',
    targetId: session._id,
    recipient,
    subject,
    text,
    html,
    meta: {
      vehicleId: session.vehicleId,
      slotCode: slot.slotCode,
      slotNumber: slot.slotNumber,
      entryTime: session.entryTime,
      estimatedExitTime: estimatedExitTime || null
    }
  });
};

module.exports = {
  sendReservationCreated,
  sendReservationCancelled,
  sendReservationCheckedIn,
  sendReservationUpcoming,
  sendReservationExpiring,
  sendReservationExpired,
  sendParkingExit,
  sendParkingEntry
};
