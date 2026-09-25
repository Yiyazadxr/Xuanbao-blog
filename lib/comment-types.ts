import type { MuteInfo } from "@/lib/mute-types";
import type { z } from "zod";
import type { commentCursorSchema } from "@/lib/validation";

export type CommentCursor = z.infer<typeof commentCursorSchema>;

export type CommentData = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
};

export type CommentWithReplies = CommentData & { replies: CommentData[] };

export type CommentsPayload = {
  comments: CommentWithReplies[];
  nextCursor: CommentCursor | null;
  topLevel: number;
  total: number;
  canModerate: boolean;
  currentUserId: string | null;
  muteInfo: MuteInfo | null;
};
