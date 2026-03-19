import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { forumPosts, activityFeed, users } from '@/lib/db/schema';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { isRateLimited } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/utils';
import { unauthorized, serverError, rateLimited, badRequest, ErrorCode } from '@/lib/api-errors';

const VALID_CATEGORIES = ['general', 'training', 'nutrition', 'gear', 'race-report', 'question'] as const;

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? 'all';
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20') || 20));
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0') || 0);

  try {
    const query = db
      .select()
      .from(forumPosts)
      .orderBy(desc(forumPosts.createdAt))
      .limit(limit)
      .offset(offset);

    let posts;
    if (category && category !== 'all') {
      posts = await db
        .select()
        .from(forumPosts)
        .where(eq(forumPosts.category, category))
        .orderBy(desc(forumPosts.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      posts = await query;
    }

    // Batch-fetch all authors in one query
    const authorIds = [...new Set(posts.map((p) => p.userId))];
    const authorRows = authorIds.length > 0
      ? await db
          .select({ authEmail: users.authEmail, username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(inArray(users.authEmail, authorIds))
      : [];
    const authorMap = Object.fromEntries(authorRows.map((u) => [u.authEmail, u]));

    const enriched = posts.map((post) => ({
      ...post,
      username: authorMap[post.userId]?.username ?? null,
      avatarUrl: authorMap[post.userId]?.avatarUrl ?? null,
    }));

    // Count total
    let total: number;
    if (category && category !== 'all') {
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(forumPosts)
        .where(eq(forumPosts.category, category));
      total = Number(countResult[0]?.count ?? 0);
    } else {
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(forumPosts);
      total = Number(countResult[0]?.count ?? 0);
    }

    return NextResponse.json({ posts: enriched, total });
  } catch (err) {
    console.error('GET /api/forum/posts error:', err);
    return serverError();
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  // Rate limit: 10 posts per user per 5 minutes
  if (isRateLimited(`forum-post:${userId}`, 10, 5 * 60 * 1000)) {
    return rateLimited();
  }

  try {
    const body = await request.json() as { title?: unknown; content?: unknown; category?: unknown; imageUrl?: unknown; workoutLogId?: unknown; sessionId?: unknown };
    const title = typeof body.title === 'string' ? sanitizeText(body.title) : '';
    const content = typeof body.content === 'string' ? sanitizeText(body.content) : '';
    const category = typeof body.category === 'string' ? body.category : 'general';

    if (title.length < 3) {
      return badRequest(ErrorCode.TITLE_TOO_SHORT, 'Title must be at least 3 characters');
    }
    if (title.length > 200) {
      return badRequest(ErrorCode.CONTENT_TOO_LONG, 'Title must be at most 200 characters');
    }
    if (content.length < 10) {
      return badRequest(ErrorCode.CONTENT_TOO_SHORT, 'Content must be at least 10 characters');
    }
    if (content.length > 10000) {
      return badRequest(ErrorCode.CONTENT_TOO_LONG, 'Content must be at most 10,000 characters');
    }
    if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
      return badRequest(ErrorCode.INVALID_CATEGORY, 'Invalid category');
    }

    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.slice(0, 500) : null;
    const workoutLogId = typeof body.workoutLogId === 'number' ? body.workoutLogId : null;
    const sessionId = typeof body.sessionId === 'number' ? body.sessionId : null;

    const [post] = await db
      .insert(forumPosts)
      .values({
        userId,
        title,
        content,
        category: category as typeof VALID_CATEGORIES[number],
        imageUrl,
        workoutLogId,
        sessionId,
      })
      .returning();

    await db.insert(activityFeed).values({
      userId,
      type: 'forum_post',
      dataJson: { postId: post.id, title: post.title },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    console.error('POST /api/forum/posts error:', err);
    return serverError();
  }
}
