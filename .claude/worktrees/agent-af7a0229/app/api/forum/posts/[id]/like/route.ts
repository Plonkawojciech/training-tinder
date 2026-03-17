import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { forumLikes, forumPosts } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });

  try {
    // Check if post exists
    const postRows = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!postRows.length) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check existing like
    const existingLike = await db
      .select()
      .from(forumLikes)
      .where(and(eq(forumLikes.userId, userId), eq(forumLikes.postId, postId)))
      .limit(1);

    let liked: boolean;

    if (existingLike.length > 0) {
      // Unlike
      await db
        .delete(forumLikes)
        .where(and(eq(forumLikes.userId, userId), eq(forumLikes.postId, postId)));

      await db
        .update(forumPosts)
        .set({ likesCount: sql`greatest(${forumPosts.likesCount} - 1, 0)` })
        .where(eq(forumPosts.id, postId));

      liked = false;
    } else {
      // Like
      await db.insert(forumLikes).values({ userId, postId });

      await db
        .update(forumPosts)
        .set({ likesCount: sql`${forumPosts.likesCount} + 1` })
        .where(eq(forumPosts.id, postId));

      liked = true;
    }

    // Fetch updated count
    const updated = await db
      .select({ likesCount: forumPosts.likesCount })
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    return NextResponse.json({ liked, likesCount: updated[0]?.likesCount ?? 0 });
  } catch (err) {
    console.error('POST /api/forum/posts/[id]/like error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
