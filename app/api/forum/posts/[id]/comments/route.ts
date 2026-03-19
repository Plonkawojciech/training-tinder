import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { forumComments, forumPosts, users } from '@/lib/db/schema';
import { eq, sql, inArray, asc } from 'drizzle-orm';
import { sanitizeText } from '@/lib/utils';
import { unauthorized, notFound, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid post id');

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
      .select({ authEmail: users.authEmail, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.authEmail, authorIds));
    const authorMap = Object.fromEntries(authorRows.map((u) => [u.authEmail, u]));

    const enriched = comments.map((comment) => ({
      ...comment,
      username: authorMap[comment.userId]?.username ?? null,
      avatarUrl: authorMap[comment.userId]?.avatarUrl ?? null,
    }));

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('GET /api/forum/posts/[id]/comments error:', err);
    return serverError();
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) return badRequest(ErrorCode.INVALID_INPUT, 'Invalid post id');

  try {
    const body = await request.json() as { content?: unknown };
    const raw = typeof body.content === 'string' ? sanitizeText(body.content) : '';

    if (raw.length < 1) {
      return badRequest(ErrorCode.MISSING_FIELDS, 'Comment content is required');
    }
    if (raw.length > 2000) {
      return badRequest(ErrorCode.CONTENT_TOO_LONG, 'Comment must be at most 2000 characters');
    }

    const postRows = await db
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(eq(forumPosts.id, postId))
      .limit(1);

    if (!postRows.length) {
      return notFound('Post not found');
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
      .where(eq(users.authEmail, userId))
      .limit(1);

    return NextResponse.json(
      { ...comment, username: author[0]?.username ?? null, avatarUrl: author[0]?.avatarUrl ?? null },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/forum/posts/[id]/comments error:', err);
    return serverError();
  }
}
