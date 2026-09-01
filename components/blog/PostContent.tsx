import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/blog/CodeBlock";

// Markdown 正文渲染：GFM + 代码高亮 + 标题锚点（服务端渲染，零客户端 JS）
// 代码块走 CodeBlock 客户端渲染器（复制按钮 + 语言标签需要交互），其余节点仍服务端渲染
export function PostContent({ content }: { content: string }) {
  return (
    <div className="prose prose-stone dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-headings:tracking-tight prose-a:text-accent prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:m-0 prose-pre:px-4 prose-pre:py-3.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={{ pre: CodeBlock }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
