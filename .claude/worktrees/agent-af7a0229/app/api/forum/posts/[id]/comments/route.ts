import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { forumComments, forumPosts, users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

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
    const comments = await db
      .select()
      .from(forumComments)
      .where(eq(forumComments.postId, postId));

    const enriched = await Promise.all(
      comments.map(async (comment) => {
        const author = await db
          .select({ username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.clerkId, comment.userId))
          .limit(1);
        return {
          ...comment,
          username: author[0]?.username ?? null,
          avatarUrl: author[0]?.avatarUrl ?? null,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/forum/posts/[id]/comments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length < 1) {
      return NextResponse.json({ error: 'Treść komentarza jest wymagana' }, { status: 400 });
    }

    // Check post exists
    const postRows = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!postRows.length) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const [comment] = await db
      .insert(forumComments)
      .values({ postId, userId, content: content.trim() })
      .returning();

    await db
      .update(forumPosts)
      .set({ commentsCount: sql`${forumPosts.commentsCount} + 1` })
      .where(eq(forumPosts.id, postId));

    // Enrich comment with author info
    const author = await db
      .select({ username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    return NextResponse.json(
      {
        ...comment,
        username: author[0]?.username ?? null,
        avatarUrl: author[0]?.avatarUrl ?? null,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/forum/posts/[id]/comments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
