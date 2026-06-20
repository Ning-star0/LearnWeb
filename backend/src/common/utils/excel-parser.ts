import * as XLSX from 'xlsx';

export interface ParsedQuestion {
  orderNo: number;
  type: 'SINGLE' | 'MULTIPLE' | 'JUDGE' | 'SHORT';
  stem: string;
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

/**
 * 解析上传的 Excel 文件
 */
export function parseExcel(buffer: Buffer): ParseResult {
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

  // 跳过表头行
  const dataRows = rows.slice(1);
  const questions: ParsedQuestion[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // Excel 行号（1-based，跳过表头）

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

  // 列映射：A=0(题序), B=1(题型), C=2(题目), D=3(答案), E+=4+(选项)
  const colA = String(row[0] ?? '').trim();
  const colB = String(row[1] ?? '').trim();
  const colC = String(row[2] ?? '').trim();
  const colD = String(row[3] ?? '').trim();

  // 题目为空跳过
  if (!colC) return null;
  // 题型为空跳过
  if (!colB) return null;

  const type = mapQuestionType(colB);
  if (!type) {
    return {
      orderNo: parseInt(colA) || index + 1,
      type: 'SINGLE',
      stem: colC,
      answerRaw: '',
      answerJson: null,
      options: [],
      rawRow: index + 2,
      errors: [`无法识别的题型: ${colB}`],
    };
  }

  // 解析选项（E列以后，前20列以内）
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
  for (let j = 4; j < Math.min(row.length, 20); j++) {
    const content = String(row[j] ?? '').trim();
    if (content) {
      const labelIndex = j - 4;
      if (labelIndex < optionLabels.length) {
        options.push({
          label: optionLabels[labelIndex],
          content,
          orderNo: labelIndex + 1,
        });
      }
    }
  }

  // 解析答案
  const { answerRaw, answerJson } = parseAnswer(colD, type, options);

  return {
    orderNo: parseInt(colA) || index + 1,
    type,
    stem: colC,
    answerRaw,
    answerJson,
    options,
    rawRow: index + 2,
    errors,
  };
}

function mapQuestionType(
  input: string,
): 'SINGLE' | 'MULTIPLE' | 'JUDGE' | 'SHORT' | null {
  const t = input.replace(/\s/g, '');
  if (t.includes('单选')) return 'SINGLE';
  if (t.includes('多选')) return 'MULTIPLE';
  if (t.includes('判断')) return 'JUDGE';
  if (t.includes('简答')) return 'SHORT';
  return null;
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
