import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { sessions, sessionParticipants, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

  try {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = result[0];

    const participants = await db
      .select({ userId: sessionParticipants.userId, joinedAt: sessionParticipants.joinedAt })
      .from(sessionParticipants)
      .where(eq(sessionParticipants.sessionId, sessionId));

    const participantUsers = await Promise.all(
      participants.map(async (p) => {
        const user = await db
          .select({ clerkId: users.clerkId, username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.clerkId, p.userId))
          .limit(1);
        return { ...p, ...user[0] };
      })
    );

    const creator = await db
      .select({ username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.clerkId, session.creatorId))
      .limit(1);

    return NextResponse.json({
      ...session,
      participants: participantUsers,
      participantCount: participants.length,
      creatorName: creator[0]?.username ?? null,
      creatorAvatar: creator[0]?.avatarUrl ?? null,
    });
  } catch (err) {
    console.error('GET /api/sessions/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

  try {
    const existing = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (existing[0].creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json() as Partial<{
      title: string;
      description: string;
      status: string;
      maxParticipants: number;
    }>;

    const [updated] = await db
      .update(sessions)
      .set({
        title: body.title ?? existing[0].title,
        description: body.description !== undefined ? body.description : existing[0].description,
        status: body.status ?? existing[0].status,
        maxParticipants: body.maxParticipants ?? existing[0].maxParticipants,
      })
      .where(eq(sessions.id, sessionId))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/sessions/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sessionId = parseInt(id);

  try {
    const existing = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (existing[0].creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(sessionParticipants).where(eq(sessionParticipants.sessionId, sessionId));
    await db.delete(sessions).where(eq(sessions.id, sessionId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/sessions/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
