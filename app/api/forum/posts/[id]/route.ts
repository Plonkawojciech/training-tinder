import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { forumPosts, forumComments, forumLikes, users } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });

  try {
    const postRows = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!postRows.length) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
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
      .select({ clerkId: users.clerkId, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.clerkId, allUserIds));
    const userMap = Object.fromEntries(allUserRows.map((u) => [u.clerkId, u]));

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
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });

  try {
    const postRows = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!postRows.length) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (postRows[0].userId !== userId) {
      return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
    }

    // Delete all related records before deleting the post
    await db.delete(forumComments).where(eq(forumComments.postId, postId));
    await db.delete(forumLikes).where(eq(forumLikes.postId, postId));
    await db.delete(forumPosts).where(eq(forumPosts.id, postId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/forum/posts/[id] error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
