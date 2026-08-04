import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeSanitize from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import { normalizeMarkdownFormatting, printMathMarkdown } from '@/lib/math-rendering';

const printKatexOptions = { throwOnError: false, strict: false, minRuleThickness: 0.06 } as const;

export function MarkdownContent({ children, printMath = true }: { children: string; printMath?: boolean }) {
  const normalized = normalizeMarkdownFormatting(children);
  const markdown = printMath ? printMathMarkdown(normalized) : normalized;
  return (
    <div className={`atlas-markdown ${printMath ? 'atlas-math-print' : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeSanitize, [rehypeKatex, printKatexOptions]]}>{markdown}</ReactMarkdown>
    </div>
  );
}
