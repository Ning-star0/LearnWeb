import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeSanitize from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';

export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="atlas-markdown">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeSanitize, rehypeKatex]}>{children}</ReactMarkdown>
    </div>
  );
}
