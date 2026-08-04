type QuestionReferenceInput = {
  materialType: string;
  sourcePage: string | null;
  sourceQuestionNumber: string | null;
};

export function questionReference(question: QuestionReferenceInput) {
  const kind = question.materialType === 'EXAMPLE' ? '例' : '练习';
  const number = question.sourceQuestionNumber?.trim();
  const page = question.sourcePage?.trim();
  return {
    kind,
    primary: number ? `${kind} ${number}` : `${kind} · 未编号`,
    page: page ? `第 ${page.replace(/^第|页$/g, '')} 页` : null,
  };
}

export function referenceSearchTerm(query: string) {
  return query
    .replace(/\s+/g, '')
    .replace(/^(?:例题?|练习题?|习题?)/, '')
    .replace(/^第/, '')
    .replace(/题$/, '');
}
