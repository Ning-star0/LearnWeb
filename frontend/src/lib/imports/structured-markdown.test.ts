import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryCardKind } from '@prisma/client';
import { parseStructuredMarkdownBatch } from './structured-markdown.ts';

const memory = `---
schema_version: "1.0"
record_type: "memory_card"
subject: "数学"
title: "泰勒公式"
category: "高等数学 / 级数"
kind: "公式"
summary: "常用展开式"
tags: ["泰勒展开", "常用公式"]
pinned: true
show_on_home: true
sort_order: 1
---

# 内容

$$
e^x=\\sum_{n=0}^{\\infty}\\dfrac{x^n}{n!}
$$`;

test('解析公式卡片并映射中文内容类型', () => {
  const result = parseStructuredMarkdownBatch(memory);
  assert.equal(result.errors.length, 0);
  assert.equal(result.records.length, 1);
  const card = result.records[0];
  assert.equal(card.recordType, 'memory_card');
  if (card.recordType !== 'memory_card') return;
  assert.equal(card.kind, MemoryCardKind.FORMULA);
  assert.match(card.contentMarkdown, /\\dfrac/);
});

test('一段 Markdown 可同时建立教材目录和知识点', () => {
  const taxonomy = `---
schema_version: "1.0"
record_type: "textbook"
subject: "数学"
name: "高等数学"
description: "主教材"
---
---
schema_version: "1.0"
record_type: "chapter"
subject: "数学"
book: "高等数学"
chapter_path: ["第一章 函数与极限", "极限"]
---
---
schema_version: "1.0"
record_type: "knowledge_point"
subject: "数学"
book: "高等数学"
chapter_path: ["第一章 函数与极限", "极限"]
name: "洛必达法则"
description: "不定式极限"
---`;
  const result = parseStructuredMarkdownBatch(taxonomy);
  assert.equal(result.documentCount, 3);
  assert.deepEqual(result.records.map((item) => item.recordType), ['textbook', 'chapter', 'knowledge_point']);
});

test('公式卡片缺少内容区块时返回明确错误', () => {
  const result = parseStructuredMarkdownBatch(memory.replace('# 内容', '# 其他'));
  assert.equal(result.records.length, 0);
  assert.match(result.errors[0].message, /# 内容/);
});

test('不接受规范之外的字段', () => {
  const result = parseStructuredMarkdownBatch(memory.replace('title: "泰勒公式"', 'title: "泰勒公式"\nanswer: "不应导入"'));
  assert.equal(result.records.length, 0);
  assert.match(result.errors[0].message, /answer/);
});

test('兼容旧提示词生成的 name、book 与 chapter_path 公式卡片', () => {
  const legacy = `---
schema_version: "1.0"
record_type: "memory_card"
subject: "数学"
book: "张宇基础30讲"
chapter_path: ["第9讲 一元函数积分学的计算", "基本积分公式"]
name: "幂函数基本积分"
kind: "公式"
tags: ["不定积分"]
---

# 内容

$$\\int x^k\\,dx=\\dfrac{x^{k+1}}{k+1}+C$$`;
  const result = parseStructuredMarkdownBatch(legacy);
  assert.equal(result.errors.length, 0);
  const card = result.records[0];
  assert.equal(card.recordType, 'memory_card');
  if (card.recordType !== 'memory_card') return;
  assert.equal(card.title, '幂函数基本积分');
  assert.equal(card.category, '张宇基础30讲 / 第9讲 一元函数积分学的计算 / 基本积分公式');
});

test('解析错误会保留 record_type 供页面按导入范围过滤', () => {
  const invalidChapter = `---
schema_version: "1.0"
record_type: "chapter"
subject: "数学"
book: "张宇基础30讲"
---`;
  const result = parseStructuredMarkdownBatch(invalidChapter);
  assert.equal(result.errors[0].recordType, 'chapter');
});
