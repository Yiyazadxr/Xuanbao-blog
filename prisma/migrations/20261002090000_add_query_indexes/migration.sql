-- Add indexes for bounded public lists, comments and engagement queries.
CREATE INDEX "PostTag_tagId_idx" ON "PostTag"("tagId");
CREATE INDEX "Post_published_archived_createdAt_idx" ON "Post"("published", "archived", "createdAt");
CREATE INDEX "Post_categoryId_idx" ON "Post"("categoryId");
CREATE INDEX "Post_seriesId_createdAt_idx" ON "Post"("seriesId", "createdAt");
CREATE INDEX "Post_viewCount_createdAt_idx" ON "Post"("viewCount", "createdAt");
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");
CREATE INDEX "Comment_isApproved_createdAt_idx" ON "Comment"("isApproved", "createdAt");
CREATE INDEX "Like_postId_idx" ON "Like"("postId");
CREATE INDEX "Like_userId_createdAt_idx" ON "Like"("userId", "createdAt");
CREATE INDEX "Bookmark_postId_idx" ON "Bookmark"("postId");
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");
CREATE INDEX "AccountRequest_email_createdAt_idx" ON "AccountRequest"("email", "createdAt");
