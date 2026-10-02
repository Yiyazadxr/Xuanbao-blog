import type { PostListItem } from "@/lib/posts";

export type PostPageFilters = { categorySlug?: string; tagSlug?: string; seriesSlug?: string };
export type PostPageResponse = {
  posts: (Omit<PostListItem, "createdAt"> & { createdAt: string })[];
  total: number;
  page: number;
};
