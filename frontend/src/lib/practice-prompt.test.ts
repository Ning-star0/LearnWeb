import assert from 'node:assert/strict';
import test from 'node:test';
import { practicePrompt } from './practice-prompt';

test('重做页隐藏旧模板中的答案与解法段落', () => {
  const markdown = '求函数的极限。\n\n**正确答案：**\n\n$1$\n\n**标准解法：**\n\n展开。';
  assert.equal(practicePrompt(markdown), '求函数的极限。');
});

test('普通题干保持完整', () => {
  const markdown = '求证：答案存在且唯一。\n\n其中“正确答案”只是题干文字。';
  assert.equal(practicePrompt(markdown), markdown);
});
