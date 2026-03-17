import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { forumPosts, forumComments, forumLikes, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    // Enrich post author
    const author = await db
      .select({ username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.clerkId, post.userId))
      .limit(1);

    // Fetch comments
    const comments = await db
      .select()
      .from(forumComments)
      .where(eq(forumComments.postId, postId));

    const enrichedComments = await Promise.all(
      comments.map(async (comment) => {
        const commentAuthor = await db
          .select({ username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.clerkId, comment.userId))
          .limit(1);
        return {
          ...comment,
          username: commentAuthor[0]?.username ?? null,
          avatarUrl: commentAuthor[0]?.avatarUrl ?? null,
        };
      })
    );

    // Check if user liked this post
    const likeRows = await db
      .select()
      .from(forumLikes)
      .where(and(eq(forumLikes.userId, userId), eq(forumLikes.postId, postId)))
      .limit(1);

    return NextResponse.json({
      post: {
        ...post,
        username: author[0]?.username ?? null,
        avatarUrl: author[0]?.avatarUrl ?? null,
      },
      comments: enrichedComments,
      isLiked: likeRows.length > 0,
    });
  } catch (err) {
    console.error('GET /api/forum/posts/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(forumPosts).where(eq(forumPosts.id, postId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/forum/posts/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
