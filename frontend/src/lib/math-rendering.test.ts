import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeMarkdownFormatting, printMathMarkdown } from './math-rendering';

test('块公式中的普通分式提升为印刷式大分式', () => {
  assert.equal(printMathMarkdown('$$x=\\frac{1}{2}$$'), '$$x=\\dfrac{1}{2}$$');
});

test('行内公式保持紧凑且不被改写', () => {
  assert.equal(printMathMarkdown('条件为 $x=\\frac{1}{2}$。'), '条件为 $x=\\frac{1}{2}$。');
});

test('已经使用大分式时不会重复改写', () => {
  assert.equal(printMathMarkdown('$$\\dfrac{a}{b}$$'), '$$\\dfrac{a}{b}$$');
});

test('兼容结束标记前带空格的旧加粗格式', () => {
  assert.equal(normalizeMarkdownFormatting('**错误发生在哪里： **\n\n待补充。'), '**错误发生在哪里：**\n\n待补充。');
});

test('正确的 Markdown 加粗格式保持不变', () => {
  assert.equal(normalizeMarkdownFormatting('**根本原因：** 概念不清。'), '**根本原因：** 概念不清。');
});
