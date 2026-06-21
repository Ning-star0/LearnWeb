export type ObjectiveQuestionType = 'SINGLE' | 'MULTIPLE';
export type SupportedQuestionType = ObjectiveQuestionType | 'JUDGE' | 'SHORT';

export interface AnswerOption {
  label: string;
  content: string;
  orderNo?: number;
}

const OPTION_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function normalizeQuestionAnswer(
  raw: string,
  type: string,
  options: AnswerOption[] = [],
): { answerRaw: string; answerJson: unknown; errors: string[] } {
  const answerRaw = cleanAnswerText(raw);
  const normalizedType = type as SupportedQuestionType;

  if (normalizedType === 'SHORT') {
    return {
      answerRaw,
      answerJson: answerRaw,
      errors: answerRaw ? [] : ['简答题必须填写参考答案'],
    };
  }

  if (normalizedType === 'JUDGE') {
    const parsed = parseJudgeAnswer(answerRaw);
    return parsed === null
      ? { answerRaw, answerJson: null, errors: ['判断题答案只能填写“正确/错误、对/错、true/false、1/0”'] }
      : { answerRaw, answerJson: parsed, errors: [] };
  }

  if (normalizedType !== 'SINGLE' && normalizedType !== 'MULTIPLE') {
    return { answerRaw, answerJson: null, errors: [`不支持的题型: ${type}`] };
  }

  const labels = parseObjectiveLabels(answerRaw);
  const optionLabelSet = new Set(options.map((option) => normalizeLabel(option.label)).filter(Boolean));
  const errors: string[] = [];

  if (labels.length === 0) {
    errors.push('客观题必须填写正确答案');
  }
  if (normalizedType === 'SINGLE' && labels.length !== 1) {
    errors.push('单选题只能有一个正确答案');
  }
  for (const label of labels) {
    if (optionLabelSet.size > 0 && !optionLabelSet.has(label)) {
      errors.push(`答案 ${label} 没有对应选项`);
    }
  }

  const deduped = [...new Set(labels)];
  if (deduped.length !== labels.length) {
    errors.push('答案中存在重复选项');
  }

  return {
    answerRaw,
    answerJson: normalizedType === 'SINGLE' ? deduped.slice(0, 1) : deduped,
    errors,
  };
}

export function shuffleOptionsAndAnswer<T extends AnswerOption>(
  type: string,
  options: T[],
  answerJson: unknown,
): { options: T[]; answerJson: unknown; answerRaw: string } {
  if ((type !== 'SINGLE' && type !== 'MULTIPLE') || options.length < 2 || !Array.isArray(answerJson)) {
    return { options, answerJson, answerRaw: formatAnswerRaw(answerJson) };
  }

  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  const oldToNew = new Map<string, string>();
  const relabeled = shuffled.map((option, index) => {
    const nextLabel = OPTION_LABELS[index] || String(index + 1);
    oldToNew.set(normalizeLabel(option.label), nextLabel);
    return { ...option, label: nextLabel, orderNo: index + 1 };
  });
  const nextAnswerJson = answerJson.map((label) => oldToNew.get(normalizeLabel(String(label))) || String(label));

  return {
    options: relabeled,
    answerJson: nextAnswerJson,
    answerRaw: formatAnswerRaw(nextAnswerJson),
  };
}

export function formatAnswerRaw(answerJson: unknown) {
  if (Array.isArray(answerJson)) return answerJson.join(',');
  if (typeof answerJson === 'boolean') return answerJson ? '正确' : '错误';
  return String(answerJson ?? '');
}

function parseObjectiveLabels(raw: string) {
  const normalized = raw
    .normalize('NFKC')
    .replace(/[，、；;|/\\\s]+/g, ',')
    .replace(/[（）()【】\[\]]/g, '')
    .toUpperCase();
  return normalized
    .split(',')
    .flatMap((part) => {
      const token = part.trim();
      if (!token) return [];
      if (/^\d+$/.test(token)) {
        const index = Number(token) - 1;
        return OPTION_LABELS[index] ? [OPTION_LABELS[index]] : [token];
      }
      if (/^[A-Z]+$/.test(token) && token.length > 1) return token.split('');
      return [normalizeLabel(token)];
    })
    .filter(Boolean);
}

function parseJudgeAnswer(raw: string) {
  const normalized = raw.normalize('NFKC').trim().toLowerCase();
  if (['true', 't', 'yes', 'y', '1', '正确', '对', '是'].includes(normalized)) return true;
  if (['false', 'f', 'no', 'n', '0', '错误', '错', '否'].includes(normalized)) return false;
  return null;
}

function normalizeLabel(label: string) {
  return label.normalize('NFKC').trim().toUpperCase();
}

function cleanAnswerText(value: unknown) {
  return String(value ?? '').normalize('NFKC').trim();
}
