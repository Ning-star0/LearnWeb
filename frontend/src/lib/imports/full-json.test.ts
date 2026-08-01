import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFullJsonExport } from './full-json';

const fixture = {
  version: 1, exportedAt: '2026-08-01T00:00:00.000Z',
  subjects: [{ id: 's1', slug: 'mathematics', name: '数学', shortName: '数学', description: null, icon: 'Sigma', color: '#2458d3', enabled: true, sortOrder: 1,
    textbooks: [{ id: 'b1', subjectId: 's1', name: '教材', description: null, sortOrder: 0, active: true,
      chapters: [{ id: 'c1', textbookId: 'b1', parentId: null, name: '章节', sortOrder: 0, active: true,
        knowledgePoints: [{ id: 'k1', chapterId: 'c1', name: '知识点', description: null, active: true }] }] }],
    errorTypes: [{ id: 'e1', subjectId: 's1', name: '计算失误', description: null, color: 'slate', active: true }] }],
  questions: [{ id: 'q1', code: 'MA-1', externalId: null, contentFingerprint: null, subjectId: 's1', textbookId: 'b1', chapterId: 'c1', title: '测试题', bodyMarkdown: '1+1', wrongReason: '算错', reflection: null, reminder: null, sourcePage: null, sourceQuestionNumber: null, tags: [], questionType: 'CALCULATION', difficulty: 3, priority: 2, status: 'ACTIVE', occurredAt: '2026-08-01T00:00:00.000Z', nextReviewAt: null, knowledgePoints: [{ knowledgePointId: 'k1', primary: true }], errorTypes: [{ errorTypeId: 'e1', primary: true }], attempts: [], attachments: [] }],
  siteSettings: null, learningSettings: null,
};

test('解析完整 JSON 导出并验证跨表引用', () => {
  const parsed = parseFullJsonExport(JSON.stringify(fixture));
  assert.equal(parsed.questions[0].title, '测试题');
});

test('拒绝题目引用不存在的章节', () => {
  const invalid = structuredClone(fixture); invalid.questions[0].chapterId = 'missing';
  assert.throws(() => parseFullJsonExport(JSON.stringify(invalid)), /引用无效/);
});

test('拒绝循环章节树', () => {
  const invalid = structuredClone(fixture); invalid.subjects[0].textbooks[0].chapters[0].parentId = 'c1';
  assert.throws(() => parseFullJsonExport(JSON.stringify(invalid)), /循环父子关系/);
});
