import assert from 'node:assert/strict';
import test from 'node:test';
import { isViewedThisWeek, isViewedToday, memoryDateKey, memoryWeekStartKey, nextMemoryReviewAt } from './memory-schedule';

test('按北京时间生成公式复习日期', () => {
  assert.equal(memoryDateKey(new Date('2026-08-07T16:30:00Z')), '2026-08-08');
  assert.equal(isViewedToday(new Date('2026-08-07T16:10:00Z'), new Date('2026-08-08T01:00:00Z')), true);
});

test('周一作为公式复习周的开始', () => {
  const now = new Date('2026-08-08T04:00:00Z');
  assert.equal(memoryWeekStartKey(now), '2026-08-03');
  assert.equal(isViewedThisWeek(new Date('2026-08-02T20:00:00Z'), now), true);
  assert.equal(isViewedThisWeek(new Date('2026-08-02T12:00:00Z'), now), false);
});

test('首次看过后默认隔两天复习', () => {
  assert.equal(nextMemoryReviewAt(new Date('2026-08-08T00:00:00Z'), 2).toISOString(), '2026-08-10T00:00:00.000Z');
});
