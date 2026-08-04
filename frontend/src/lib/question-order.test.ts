import assert from 'node:assert/strict';
import test from 'node:test';
import { compareBookQuestions } from './question-order';

function question(number: string, materialType = 'EXERCISE') {
  return {
    materialType, sourcePage: '69', sourceQuestionNumber: number, createdAt: new Date('2026-08-04'),
    textbook: { name: '张宇基础30讲', sortOrder: 0 }, chapter: { name: '高等数学分册', sortOrder: 0 },
  };
}

test('书本题号按数字分段自然排序', () => {
  const ordered = ['1.11', '1.4', '1.7', '1.6'].map((number) => question(number)).sort(compareBookQuestions);
  assert.deepEqual(ordered.map((item) => item.sourceQuestionNumber), ['1.4', '1.6', '1.7', '1.11']);
});

test('同一本书和章节中例题排在练习题前', () => {
  const ordered = [question('1.1'), question('1.38', 'EXAMPLE')].sort(compareBookQuestions);
  assert.deepEqual(ordered.map((item) => item.materialType), ['EXAMPLE', 'EXERCISE']);
});
