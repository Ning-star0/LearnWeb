import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateMastery } from './mastery.ts';

test('连续三次独立做对后掌握', () => {
  assert.deepEqual(calculateMastery(['INDEPENDENT_CORRECT', 'INDEPENDENT_CORRECT', 'INDEPENDENT_CORRECT'], 3), { correctStreak: 3, wrongCount: 0, mastered: true });
});

test('提示后做对会清零连续次数', () => {
  assert.deepEqual(calculateMastery(['INDEPENDENT_CORRECT', 'HINTED_CORRECT', 'INDEPENDENT_CORRECT'], 3), { correctStreak: 1, wrongCount: 0, mastered: false });
});

test('做错和完全不会都会计数并清零', () => {
  assert.deepEqual(calculateMastery(['INDEPENDENT_CORRECT', 'WRONG', 'INDEPENDENT_CORRECT', 'UNABLE'], 3), { correctStreak: 0, wrongCount: 2, mastered: false });
});

test('跳过不会改变连续次数', () => {
  assert.deepEqual(calculateMastery(['INDEPENDENT_CORRECT', 'SKIPPED', 'INDEPENDENT_CORRECT'], 3), { correctStreak: 2, wrongCount: 0, mastered: false });
});

test('已掌握后再次做错会退回学习中', () => {
  assert.deepEqual(calculateMastery(['INDEPENDENT_CORRECT', 'INDEPENDENT_CORRECT', 'INDEPENDENT_CORRECT', 'WRONG'], 3), { correctStreak: 0, wrongCount: 1, mastered: false });
});
