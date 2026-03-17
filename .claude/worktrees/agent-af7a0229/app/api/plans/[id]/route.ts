import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { trainingPlans, trainingPlanWeeks, users } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const planId = parseInt(id);

  try {
    const [plan] = await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.id, planId))
      .limit(1);

    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!plan.isPublic && plan.creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const weeks = await db
      .select()
      .from(trainingPlanWeeks)
      .where(eq(trainingPlanWeeks.planId, planId))
      .orderBy(asc(trainingPlanWeeks.weekNumber));

    const creator = await db
      .select({ username: users.username, avatarUrl: users.avatarUrl, clerkId: users.clerkId })
      .from(users)
      .where(eq(users.clerkId, plan.creatorId))
      .limit(1);

    return NextResponse.json({ ...plan, weeks, creator: creator[0] ?? null });
  } catch (err) {
    console.error('GET /api/plans/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const planId = parseInt(id);

  try {
    const body = await request.json() as Partial<{
      title: string;
      description: string;
      sportType: string;
      difficulty: string;
      durationWeeks: number;
      isPublic: boolean;
    }>;

    const [updated] = await db
      .update(trainingPlans)
      .set(body)
      .where(and(eq(trainingPlans.id, planId), eq(trainingPlans.creatorId, userId)))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/plans/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const planId = parseInt(id);

  try {
    await db.delete(trainingPlanWeeks).where(eq(trainingPlanWeeks.planId, planId));
    const [deleted] = await db
      .delete(trainingPlans)
      .where(and(eq(trainingPlans.id, planId), eq(trainingPlans.creatorId, userId)))
      .returning();

    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/plans/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
