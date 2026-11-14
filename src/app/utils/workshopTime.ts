import moment from 'moment-timezone';

/**
 * Workshops happen in Slovakia, so "which day is the workshop" and "when does it end"
 * must be answered in Slovak time — NOT in the server's own timezone.
 *
 * Why this matters: `Workshop.date` is a UTC instant, and the time of day is a separate string.
 * A workshop on 15 Nov picked in a Slovak browser is stored as 2026-11-14T23:00:00Z (local midnight).
 * On a UTC server, `new Date(date).getDate()` says "14 Nov" — a whole day early — so the
 * "workshop finished" check passed a day before the workshop and the final invoices went out early.
 */
export const WORKSHOP_TIMEZONE = 'Europe/Bratislava';

/** "14:00", "10:00 - 13:00", "10:00-13:30" → the LAST time found is the end time. */
const parseEndTime = (timeStr?: string): { hour: number; minute: number } | null => {
  if (!timeStr) return null;
  const parts = timeStr.split('-');
  const match = (parts[parts.length - 1] || '').trim().match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
};

/** The exact instant the workshop ends. With no usable time, the end of that day (Slovak time). */
export const getWorkshopEnd = (date: Date | string, timeStr?: string): Date => {
  // The calendar day of the workshop, as seen in Slovakia
  const day = moment.tz(date, WORKSHOP_TIMEZONE);
  const end = parseEndTime(timeStr);

  if (!end) return day.clone().endOf('day').toDate();

  return moment
    .tz(
      { year: day.year(), month: day.month(), date: day.date(), hour: end.hour, minute: end.minute },
      WORKSHOP_TIMEZONE,
    )
    .toDate();
};

/** The instant the workshop starts (first time found, Slovak time). No usable time → start of that day. */
export const getWorkshopStart = (date: Date | string, timeStr?: string): Date => {
  const day = moment.tz(date, WORKSHOP_TIMEZONE);
  const match = (timeStr || '').match(/(\d{1,2}):(\d{2})/);
  const hour = match ? parseInt(match[1], 10) : 0;
  const minute = match ? parseInt(match[2], 10) : 0;
  if (!match || hour > 23 || minute > 59) return day.clone().startOf('day').toDate();

  return moment
    .tz({ year: day.year(), month: day.month(), date: day.date(), hour, minute }, WORKSHOP_TIMEZONE)
    .toDate();
};

/**
 * IDs of the workshops that have actually ENDED (Slovak time). Used by the earnings calculation —
 * a date stored at midnight must not count as "finished" the moment that day begins.
 */
export const finishedWorkshopIds = <T extends { _id: any; date: Date | string; time?: string }>(
  workshops: T[],
  now: Date = new Date(),
): T['_id'][] => workshops.filter((w) => isWorkshopFinished(w.date, w.time, now)).map((w) => w._id);

/** True only once the workshop's end time (Slovak time) has actually passed. */
export const isWorkshopFinished = (
  date: Date | string,
  timeStr?: string,
  now: Date = new Date(),
): boolean => now.getTime() >= getWorkshopEnd(date, timeStr).getTime();

/** DD/MM/YYYY of the workshop day in Slovak time (same look as toLocaleDateString('en-GB')). */
export const formatWorkshopDate = (date: Date | string): string =>
  moment.tz(date, WORKSHOP_TIMEZONE).format('DD/MM/YYYY');
