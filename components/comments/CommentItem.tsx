"use client";

import { useState } from "react";
import { CommentForm } from "@/components/comments/CommentForm";
import type { CommentWithReplies } from "@/lib/comments";
import { formatDate } from "@/lib/utils";

// 单条评论（含一层回复 + 回复表单开关）
export function CommentItem({
  comment,
  postId,
  slug,
}: {
  comment: CommentWithReplies;
  postId: string;
  slug: string;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <li className="py-5">
      <CommentBody
        name={comment.author.name}
        date={comment.createdAt}
        content={comment.content}
      />
      <button
        type="button"
        onClick={() => setReplying((v) => !v)}
        className="mt-2 cursor-pointer text-xs font-medium text-muted transition-colors duration-200 hover:text-accent"
      >
        {replying ? "收起" : "回复"}
      </button>

      {replying && (
        <div className="mt-3 pl-4 sm:pl-10">
          <CommentForm
            postId={postId}
            slug={slug}
            parentId={comment.id}
            onDone={() => setReplying(false)}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <ul className="mt-4 space-y-4 border-l-2 border-border pl-4 sm:pl-6">
          {comment.replies.map((reply) => (
            <li key={reply.id}>
              <CommentBody
                name={reply.author.name}
                date={reply.createdAt}
                content={reply.content}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function CommentBody({
  name,
  date,
  content,
}: {
  name: string;
  date: Date | string;
  content: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
        {name.slice(0, 1)}
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-sm font-semibold">{name}</span>
          <time className="text-xs text-muted">{formatDate(date)}</time>
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
