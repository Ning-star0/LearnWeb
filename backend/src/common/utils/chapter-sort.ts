const CHINESE_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

interface ChapterSortKey {
  group: number;
  number: number;
  raw: string;
}

export function compareChapterNatural(a?: string | null, b?: string | null) {
  const left = getChapterSortKey(a);
  const right = getChapterSortKey(b);
  if (left.group !== right.group) return left.group - right.group;
  if (left.number !== right.number) return left.number - right.number;
  return left.raw.localeCompare(right.raw, 'zh-CN', { numeric: true, sensitivity: 'base' });
}

function getChapterSortKey(value?: string | null): ChapterSortKey {
  const raw = String(value || '').trim();
  if (!raw) return { group: 3, number: Number.MAX_SAFE_INTEGER, raw };

  if (/绪论|导论|引言|总论|概论/.test(raw)) {
    return { group: 0, number: 0, raw };
  }

  const chapterMatch =
    raw.match(/第\s*([一二两三四五六七八九十百千万零〇\d]+)\s*[章节篇单元部分]/) ||
    raw.match(/^([一二两三四五六七八九十百千万零〇\d]+)[、.．]\s*/);
  if (chapterMatch) {
    return { group: 1, number: parseChapterNumber(chapterMatch[1]), raw };
  }

  const numericMatch = raw.match(/(\d+)\s*[章节]/);
  if (numericMatch) {
    return { group: 1, number: Number(numericMatch[1]), raw };
  }

  return { group: 2, number: Number.MAX_SAFE_INTEGER, raw };
}

function parseChapterNumber(value: string) {
  if (/^\d+$/.test(value)) return Number(value);

  let total = 0;
  let section = 0;
  let current = 0;
  for (const char of value) {
    if (char === '万') {
      section = (section + current) * 10000;
      total += section;
      section = 0;
      current = 0;
    } else if (char === '千') {
      section += (current || 1) * 1000;
      current = 0;
    } else if (char === '百') {
      section += (current || 1) * 100;
      current = 0;
    } else if (char === '十') {
      section += (current || 1) * 10;
      current = 0;
    } else if (CHINESE_DIGITS[char] !== undefined) {
      current = CHINESE_DIGITS[char];
    }
  }

  const parsed = total + section + current;
  return parsed > 0 ? parsed : Number.MAX_SAFE_INTEGER;
}
