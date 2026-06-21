import * as XLSX from 'xlsx';

export interface ParsedQuestion {
  orderNo: number;
  type: 'SINGLE' | 'MULTIPLE' | 'JUDGE' | 'SHORT';
  stem: string;
  knowledgePoint?: string;
  chapter?: string;
  difficulty?: string;
  courseObjective?: string;
  preface?: string;
  score?: number;
  gradingMethod?: string;
  answerRaw: string;
  answerJson: any;
  options: { label: string; content: string; orderNo: number }[];
  rawRow: number;
  errors: string[];
}

export interface ParseResult {
  success: boolean;
  questions: ParsedQuestion[];
  errors: { row: number; message: string }[];
  summary: {
    total: number;
    single: number;
    multiple: number;
    judge: number;
    short: number;
  };
}

export interface ParseExcelOptions {
  maxRows?: number;
}

/**
 * 解析上传的 Excel 文件
 */
export function parseExcel(
  buffer: Buffer,
  options: ParseExcelOptions = {},
): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0]; // 只读 Sheet1
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rows.length < 2) {
    return {
      success: false,
      questions: [],
      errors: [{ row: 0, message: 'Excel 文件为空或只有表头' }],
      summary: { total: 0, single: 0, multiple: 0, judge: 0, short: 0 },
    };
  }

  // 跳过表头行；不要相信 UsedRange，后面会按真实题目行过滤。
  const dataRows = rows.slice(1);
  const questions: ParsedQuestion[] = [];
  const errors: { row: number; message: string }[] = [];
  const maxRows = options.maxRows || 5000;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // Excel 行号（1-based，跳过表头）
    if (!isRealQuestionRow(row)) continue;
    if (questions.length >= maxRows) {
      errors.push({
        row: rowNum,
        message: `单个文件最多解析 ${maxRows} 行题目，请拆分后再上传`,
      });
      break;
    }

    try {
      const parsed = parseRow(row, i);
      if (parsed) {
        questions.push(parsed);
      }
    } catch (e: any) {
      errors.push({ row: rowNum, message: e.message || '解析错误' });
    }
  }

  return {
    success: errors.length === 0,
    questions,
    errors,
    summary: {
      total: questions.length,
      single: questions.filter((q) => q.type === 'SINGLE').length,
      multiple: questions.filter((q) => q.type === 'MULTIPLE').length,
      judge: questions.filter((q) => q.type === 'JUDGE').length,
      short: questions.filter((q) => q.type === 'SHORT').length,
    },
  };
}

function parseRow(row: any[], index: number): ParsedQuestion | null {
  const errors: string[] = [];
  const format = detectRowFormat(row);

  const colA = cleanCellText(row[0]);
  const knowledgePoint = format === 'legacy-simple' ? '' : cleanCellText(row[1]);
  const difficulty = format === 'legacy-simple' ? '' : cleanCellText(row[2]);
  const typeRaw =
    format === 'legacy-simple'
      ? cleanCellText(row[1])
      : cleanCellText(row[3]);
  const fifthColumn = format === 'legacy-simple' ? '' : cleanCellText(row[4]);
  const stem =
    format === 'legacy-simple'
      ? cleanCellText(row[2])
      : cleanCellText(row[5]);
  const scoreRaw = format === 'legacy-simple' ? '' : cleanCellText(row[6]);
  const answerColumn =
    format === 'legacy-simple'
      ? cleanCellText(row[3])
      : cleanCellText(row[7]);

  // 题目为空跳过
  if (!stem) return null;
  // 题型为空跳过
  if (!typeRaw) return null;

  const type = mapQuestionType(typeRaw, fifthColumn);
  if (!type) {
    return {
      orderNo: parseInt(colA) || index + 1,
      type: 'SINGLE',
      stem,
      knowledgePoint,
      chapter: normalizeChapter(knowledgePoint),
      difficulty,
      courseObjective: format === 'course-objective' ? fifthColumn : undefined,
      preface: format === 'preface' ? fifthColumn : undefined,
      score: parseScore(scoreRaw),
      answerRaw: '',
      answerJson: null,
      options: [],
      rawRow: index + 2,
      errors: [`无法识别的题型: ${typeRaw}`],
    };
  }

  // 解析选项。旧格式从 E 列开始，新格式从 I 列开始；连续非空选项都读取。
  const optionLabels = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
  ];
  const options: { label: string; content: string; orderNo: number }[] = [];
  const optionStart = format === 'legacy-simple' ? 4 : 8;
  for (let j = optionStart; j < Math.min(row.length, optionStart + optionLabels.length); j++) {
    const content = cleanCellText(row[j]);
    if (content) {
      const labelIndex = j - optionStart;
      if (labelIndex < optionLabels.length) {
        options.push({
          label: optionLabels[labelIndex],
          content,
          orderNo: labelIndex + 1,
        });
      }
    } else if (options.length > 0) {
      break;
    }
  }

  // 解析答案
  const { answerRaw, answerJson } = parseAnswer(answerColumn, type, options);
  const isManualShort =
    type === 'SHORT' &&
    (typeRaw.includes('手动评分') || fifthColumn.includes('简答'));

  return {
    orderNo: parseInt(colA) || index + 1,
    type,
    stem,
    knowledgePoint: knowledgePoint || undefined,
    chapter: normalizeChapter(knowledgePoint),
    difficulty: difficulty || undefined,
    courseObjective: format === 'course-objective' ? fifthColumn || undefined : undefined,
    preface: format === 'preface' ? fifthColumn || undefined : undefined,
    score: parseScore(scoreRaw),
    gradingMethod: isManualShort ? '手动评分' : undefined,
    answerRaw,
    answerJson,
    options,
    rawRow: index + 2,
    errors,
  };
}

function isRealQuestionRow(row: any[]) {
  const legacyStem = cleanCellText(row[2]);
  const normalizedStem = cleanCellText(row[5]);
  const orderNo = cleanCellText(row[0]);
  const legacyType = cleanCellText(row[1]);
  const normalizedType = cleanCellText(row[3]);
  if (isHeaderRow(row)) return false;
  return Boolean((orderNo || legacyStem || normalizedStem) && (legacyType || normalizedType) && (legacyStem || normalizedStem));
}

function isHeaderRow(row: any[]) {
  const values = row.slice(0, 9).map(cleanCellText).join('|');
  return /题序|题型|题目|答案|知识点/.test(values) && !cleanCellText(row[0]).match(/^\d+$/);
}

function detectRowFormat(row: any[]): 'legacy-simple' | 'course-objective' | 'preface' {
  const simpleType = mapQuestionType(cleanCellText(row[1]));
  const normalizedType = mapQuestionType(cleanCellText(row[3]), cleanCellText(row[4]));
  if (normalizedType) {
    const fifthColumn = cleanCellText(row[4]);
    return fifthColumn.includes('课程目标') ? 'course-objective' : 'preface';
  }
  if (simpleType) return 'legacy-simple';
  return 'course-objective';
}

function cleanCellText(value: unknown): string {
  return String(value ?? '')
    .replace(/_x000D_/gi, '\n')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}

function mapQuestionType(
  input: string,
  hint = '',
): 'SINGLE' | 'MULTIPLE' | 'JUDGE' | 'SHORT' | null {
  const t = `${input}${hint}`.replace(/\s/g, '');
  if (t.includes('单选')) return 'SINGLE';
  if (t.includes('多选')) return 'MULTIPLE';
  if (t.includes('判断')) return 'JUDGE';
  if (
    t.includes('简答') ||
    t.includes('材料') ||
    t.includes('分析') ||
    t.includes('论述') ||
    t.includes('问答') ||
    t.includes('手动评分填空题')
  ) return 'SHORT';
  return null;
}

function normalizeChapter(knowledgePoint: string) {
  return cleanCellText(knowledgePoint) || undefined;
}

function parseScore(raw: string) {
  const match = raw.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function parseAnswer(
  raw: string,
  type: string,
  options: { label: string; content: string }[],
): { answerRaw: string; answerJson: any } {
  const trimmed = raw.trim();

  switch (type) {
    case 'SINGLE': {
      // 1 -> A, 2 -> B, 3 -> C, etc.
      const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const num = parseInt(trimmed);
      if (!isNaN(num) && num >= 1 && num <= optionLabels.length) {
        return { answerRaw: trimmed, answerJson: [optionLabels[num - 1]] };
      }
      return { answerRaw: trimmed, answerJson: [trimmed] };
    }

    case 'MULTIPLE': {
      // 兼容 1,2,3 和 1，2，3（中文逗号）
      const normalized = trimmed.replace(/，/g, ',');
      const parts = normalized
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const labels = parts.map((p) => {
        const num = parseInt(p);
        if (!isNaN(num) && num >= 1 && num <= optionLabels.length) {
          return optionLabels[num - 1];
        }
        return p;
      });
      return { answerRaw: trimmed, answerJson: labels };
    }

    case 'JUDGE': {
      const lower = trimmed.toLowerCase();
      if (lower === 'true' || lower === '正确' || lower === '对') {
        return { answerRaw: trimmed, answerJson: true };
      }
      return { answerRaw: trimmed, answerJson: false };
    }

    case 'SHORT': {
      return { answerRaw: trimmed, answerJson: trimmed };
    }

    default:
      return { answerRaw: trimmed, answerJson: null };
  }
}
