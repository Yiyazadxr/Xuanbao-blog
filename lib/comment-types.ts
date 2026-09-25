import type { MuteInfo } from "@/lib/mute-types";

export type CommentData = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; image: string | null };
};

export type CommentWithReplies = CommentData & { replies: CommentData[] };

export type CommentsPayload = {
  comments: CommentWithReplies[];
  topLevel: number;
  total: number;
  canModerate: boolean;
  currentUserId: string | null;
  muteInfo: MuteInfo | null;
};
