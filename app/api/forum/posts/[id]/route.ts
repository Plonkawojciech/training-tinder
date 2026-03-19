import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { forumPosts, forumComments, forumLikes, users } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { unauthorized, forbidden, notFound, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid post id');

  try {
    const postRows = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!postRows.length) {
      return notFound('Post not found');
    }

    const post = postRows[0];

    // Fetch comments + likes in parallel
    const [comments, likeRows] = await Promise.all([
      db.select().from(forumComments).where(eq(forumComments.postId, postId)),
      db.select().from(forumLikes).where(and(eq(forumLikes.userId, userId), eq(forumLikes.postId, postId))).limit(1),
    ]);

    // Batch-fetch all needed users (post author + all comment authors) in one query
    const allUserIds = [...new Set([post.userId, ...comments.map((c) => c.userId)])];
    const allUserRows = await db
      .select({ authEmail: users.authEmail, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.authEmail, allUserIds));
    const userMap = Object.fromEntries(allUserRows.map((u) => [u.authEmail, u]));

    const enrichedComments = comments.map((comment) => ({
      ...comment,
      username: userMap[comment.userId]?.username ?? null,
      avatarUrl: userMap[comment.userId]?.avatarUrl ?? null,
    }));

    return NextResponse.json({
      post: {
        ...post,
        username: userMap[post.userId]?.username ?? null,
        avatarUrl: userMap[post.userId]?.avatarUrl ?? null,
      },
      comments: enrichedComments,
      isLiked: likeRows.length > 0,
    });
  } catch (err) {
    console.error('GET /api/forum/posts/[id] error:', err);
    return serverError();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid post id');

  try {
    const postRows = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!postRows.length) {
      return notFound('Post not found');
    }

    if (postRows[0].userId !== userId) {
      return forbidden();
    }

    // Delete all related records before deleting the post
    await db.delete(forumComments).where(eq(forumComments.postId, postId));
    await db.delete(forumLikes).where(eq(forumLikes.postId, postId));
    await db.delete(forumPosts).where(eq(forumPosts.id, postId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/forum/posts/[id] error:', err);
    return serverError();
  }
}
