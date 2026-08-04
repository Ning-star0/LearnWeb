type BookOrderQuestion = {
  materialType: string;
  sourcePage: string | null;
  sourceQuestionNumber: string | null;
  createdAt: Date;
  textbook: { name: string; sortOrder: number };
  chapter: { name: string; sortOrder: number };
};

const natural = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });

function compareNullable(left: string | null, right: string | null) {
  if (left === right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return natural.compare(left, right);
}

export function compareBookQuestions(left: BookOrderQuestion, right: BookOrderQuestion) {
  return left.textbook.sortOrder - right.textbook.sortOrder
    || natural.compare(left.textbook.name, right.textbook.name)
    || (left.materialType === 'EXAMPLE' ? 0 : 1) - (right.materialType === 'EXAMPLE' ? 0 : 1)
    || compareNullable(left.sourceQuestionNumber, right.sourceQuestionNumber)
    || compareNullable(left.sourcePage, right.sourcePage)
    || left.chapter.sortOrder - right.chapter.sortOrder
    || natural.compare(left.chapter.name, right.chapter.name)
    || left.createdAt.getTime() - right.createdAt.getTime();
}
