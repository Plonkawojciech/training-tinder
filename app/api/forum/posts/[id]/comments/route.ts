import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { forumComments, forumPosts, users } from '@/lib/db/schema';
import { eq, sql, inArray, asc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50') || 50));
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0') || 0);

  try {
    const comments = await db
      .select()
      .from(forumComments)
      .where(eq(forumComments.postId, postId))
      .orderBy(asc(forumComments.createdAt))
      .limit(limit)
      .offset(offset);

    if (comments.length === 0) return NextResponse.json([]);

    // Batch-fetch all authors in one query — no N+1
    const authorIds = [...new Set(comments.map((c) => c.userId))];
    const authorRows = await db
      .select({ clerkId: users.clerkId, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.clerkId, authorIds));
    const authorMap = Object.fromEntries(authorRows.map((u) => [u.clerkId, u]));

    const enriched = comments.map((comment) => ({
      ...comment,
      username: authorMap[comment.userId]?.username ?? null,
      avatarUrl: authorMap[comment.userId]?.avatarUrl ?? null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/forum/posts/[id]/comments error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });

  try {
    const body = await request.json() as { content?: unknown };
    const raw = typeof body.content === 'string' ? body.content.trim() : '';

    if (raw.length < 1) {
      return NextResponse.json({ error: 'Treść komentarza jest wymagana' }, { status: 400 });
    }
    if (raw.length > 2000) {
      return NextResponse.json({ error: 'Komentarz może mieć max. 2000 znaków' }, { status: 400 });
    }

    const postRows = await db
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!postRows.length) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const [comment] = await db
      .insert(forumComments)
      .values({ postId, userId, content: raw })
      .returning();

    await db
      .update(forumPosts)
      .set({ commentsCount: sql`${forumPosts.commentsCount} + 1` })
      .where(eq(forumPosts.id, postId));

    const author = await db
      .select({ username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    return NextResponse.json(
      { ...comment, username: author[0]?.username ?? null, avatarUrl: author[0]?.avatarUrl ?? null },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/forum/posts/[id]/comments error:', err);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
