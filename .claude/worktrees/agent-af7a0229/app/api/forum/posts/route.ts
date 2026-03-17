import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { forumPosts, activityFeed, users } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

const VALID_CATEGORIES = ['general', 'training', 'nutrition', 'gear', 'race-report', 'question'] as const;

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? 'all';
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '20') || 20);
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

    const enriched = await Promise.all(
      posts.map(async (post) => {
        const author = await db
          .select({ username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.clerkId, post.userId))
          .limit(1);
        return {
          ...post,
          username: author[0]?.username ?? null,
          avatarUrl: author[0]?.avatarUrl ?? null,
        };
      })
    );

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { title, content, category = 'general', imageUrl, workoutLogId, sessionId } = body;

    if (!title || title.trim().length < 3) {
      return NextResponse.json({ error: 'Tytuł musi mieć co najmniej 3 znaki' }, { status: 400 });
    }
    if (!content || content.trim().length < 10) {
      return NextResponse.json({ error: 'Treść musi mieć co najmniej 10 znaków' }, { status: 400 });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Nieprawidłowa kategoria' }, { status: 400 });
    }

    const [post] = await db
      .insert(forumPosts)
      .values({
        userId,
        title: title.trim(),
        content: content.trim(),
        category,
        imageUrl: imageUrl ?? null,
        workoutLogId: workoutLogId ?? null,
        sessionId: sessionId ?? null,
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
