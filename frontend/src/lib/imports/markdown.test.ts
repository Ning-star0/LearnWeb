import assert from 'node:assert/strict';
import test from 'node:test';
import { QuestionType } from '@prisma/client';
import { parseMarkdownBatch } from './markdown.ts';

const valid = `---
schema_version: "1.0"
external_id: "math-2026-000001"
subject: "数学"
book: "张宇1000题"
chapter_path:
  - "第一章 函数、极限与连续"
  - "函数极限"
question_type: "计算题"
source:
  page: 36
  question_number: "1.9"
difficulty: 3
priority: "HIGH"
occurred_at: "2026-08-01"
knowledge_points:
  - "变量代换"
error_types:
  - "方法没有想到"
tags:
  - "极限"
image_files: []
next_review_at: "2026-08-03"
---

# 题目

计算：$\\lim_{x\\to+\\infty}x(a^{1/x}-1)$

## 我的错因

没有想到变量代换。

## 一句话提醒

优先令 $t=1/x$。

## 复盘备注

先转换趋近方向。`;

test('解析正式 YAML Front Matter 与 Markdown 区块', () => {
  const result = parseMarkdownBatch(valid, 'one.md');
  assert.equal(result.errors.length, 0);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].externalId, 'math-2026-000001');
  assert.equal(result.items[0].questionType, QuestionType.CALCULATION);
  assert.deepEqual(result.items[0].chapterPath, ['第一章 函数、极限与连续', '函数极限']);
  assert.equal(result.items[0].priority, 3);
  assert.equal(result.items[0].sourceQuestionNumber, '1.9');
  assert.equal(result.items[0].reminder, '优先令 $t=1/x$。');
});

test('同一批内容可包含多个正式文档', () => {
  const result = parseMarkdownBatch(`${valid}\n${valid.replace('math-2026-000001', 'math-2026-000002')}`);
  assert.equal(result.documentCount, 2);
  assert.equal(result.items.length, 2);
});

test('缺少必填错因区块时返回定位明确的错误', () => {
  const result = parseMarkdownBatch(valid.replace('## 我的错因', '## 其他'));
  assert.equal(result.items.length, 0);
  assert.match(result.errors[0].message, /我的错因/);
});

test('相同题干生成稳定指纹', () => {
  const first = parseMarkdownBatch(valid).items[0].contentFingerprint;
  const second = parseMarkdownBatch(valid.replace('计算：', '计 算：')).items[0].contentFingerprint;
  assert.equal(first, second);
});
