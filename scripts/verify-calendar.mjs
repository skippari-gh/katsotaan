import assert from 'node:assert/strict';
import { calendarDays, formatWatchDate, shiftCalendarMonth, watchDateKey, watchedMoviesByDay } from '../lib/watch-calendar.ts';

// These checks run without a browser, production data, network calls or credentials.
for (const deviceZone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
  process.env.TZ = deviceZone;
  assert.equal(watchDateKey(Date.parse('2026-09-26T21:30:00Z')), '2026-09-27', `Finnish midnight on a ${deviceZone} device`);
  assert.equal(formatWatchDate(Date.parse('2026-09-26T21:30:00Z')), '27.9.2026');
}
assert.equal(watchDateKey(Date.parse('2026-03-28T22:30:00Z')), '2026-03-29', 'Finnish winter time before DST');
assert.equal(watchDateKey(Date.parse('2026-03-29T21:30:00Z')), '2026-03-30', 'Finnish summer time after DST');
assert.equal(watchDateKey(Date.parse('2026-10-25T22:30:00Z')), '2026-10-26', 'Return to Finnish winter time');
assert.equal(shiftCalendarMonth('2026-12', 1), '2027-01');
assert.equal(shiftCalendarMonth('2026-01', -1), '2025-12');
const september = calendarDays('2026-09');
assert.equal(september[0], null, 'September starts on Tuesday, leaving Monday empty');
assert.equal(september[1], '2026-09-01');
assert.equal(september.filter(Boolean).length, 30);
assert.equal(calendarDays('2024-02').filter(Boolean).length, 29, 'Leap-year February');
assert.equal(calendarDays('2026-02').filter(Boolean).length, 28, 'Non-leap-year February');

const movie = (key, time, extra = {}) => ({ key, mediaType: 'movie', status: 'watched', watchedAt: time === null ? null : Date.parse(time), ...extra });
const entries = [
  movie('movie:1', '2026-09-26T18:00:00Z'),
  movie('movie:2', '2026-09-26T20:00:00Z'),
  movie('movie:3', '2026-09-26T21:30:00Z'),
  movie('movie:4', null),
  movie('movie:5', '2026-09-26T18:00:00Z', { status: 'watchlist' }),
  movie('tv:6', '2026-09-26T18:00:00Z', { mediaType: 'tv' }),
];
const original = structuredClone(entries);
const grouped = watchedMoviesByDay(entries);
assert.deepEqual(Object.keys(grouped).sort(), ['2026-09-26', '2026-09-27']);
assert.deepEqual(grouped['2026-09-26'].map(item => item.key), ['movie:2', 'movie:1'], 'Two movies share a day without replacing one another');
assert.deepEqual(grouped['2026-09-27'].map(item => item.key), ['movie:3'], 'Late-night movie belongs to the Finnish day');
assert.deepEqual(entries, original, 'Calendar never mutates shared records');
assert.deepEqual(watchedMoviesByDay([]), {}, 'Empty calendar');
console.log('PASS: Calendar dates, Finnish time and DST, month boundaries, leap years, shared-day grouping and data preservation.');
