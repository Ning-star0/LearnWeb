import assert from 'node:assert/strict';
import test from 'node:test';
import { questionReference, referenceSearchTerm } from './question-reference';

test('书本例题编号作为主要显示内容', () => {
  assert.deepEqual(questionReference({ materialType: 'EXAMPLE', sourcePage: '36', sourceQuestionNumber: '1.9' }), {
    kind: '例题', primary: '例题 1.9', page: '第 36 页',
  });
});

test('没有书本题号时不编造编号', () => {
  assert.equal(questionReference({ materialType: 'EXERCISE', sourcePage: null, sourceQuestionNumber: null }).primary, '习题 · 未编号');
});

test('搜索例题前缀时提取书本题号', () => {
  assert.equal(referenceSearchTerm('例 3-x'), '3-x');
  assert.equal(referenceSearchTerm('例题 1.9'), '1.9');
});
