import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import {
  users, authUsers, userSportProfiles, userEvents, sessions,
  sessionParticipants, sessionMessages, messages, matches, swipes,
  notifications, pushSubscriptions, workoutLogs, exercises, personalRecords,
  userAchievements, trainingPlans, trainingPlanWeeks, userStats,
  sessionReviews, planReviews, userFollows, activityFeed,
  stravaTokens, stravaActivities, stravaGear, stravaBestEfforts,
  forumPosts, forumComments, forumLikes, gymCheckins, spotterRequests,
  friends, feedComments, feedLikes,
} from '@/lib/db/schema';
import { eq, or, inArray } from 'drizzle-orm';
import { sanitizeText } from '@/lib/utils';
import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/jwt';
import { unauthorized, serverError, badRequest, ErrorCode } from '@/lib/api-errors';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const result = await db.select().from(users).where(eq(users.authEmail, userId)).limit(1);
    if (result.length === 0) {
      return NextResponse.json(null);
    }
    return NextResponse.json(result[0]);
  } catch (err) {
    console.error('GET /api/users/profile error:', err);
    return serverError();
  }
}

export async function PUT(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const body = await request.json() as {
      username?: string;
      bio?: string;
      sportTypes?: string[];
      pacePerKm?: number | null;
      weeklyKm?: number | null;
      city?: string;
      lat?: number | null;
      lon?: number | null;
      availability?: string[];
      avatarUrl?: string | null;
      gymName?: string | null;
      strengthLevel?: string | null;
      trainingSplits?: string[];
      goals?: string[];
      heightCm?: number | null;
      // Advanced athlete fields
      athleteLevel?: string | null;
      ftpWatts?: number | null;
      vo2max?: number | null;
      restingHr?: number | null;
      maxHr?: number | null;
      // Demographics
      age?: number | null;
      gender?: string | null;
      weightKg?: number | null;
      profileSongUrl?: string | null;
    };

    // Sanitize free-text fields
    if (typeof body.bio === 'string') {
      body.bio = sanitizeText(body.bio);
    }

    // Basic input validation
    if (body.username !== undefined) {
      const u = body.username.trim();
      if (u.length < 3 || u.length > 30) {
        return badRequest(ErrorCode.INVALID_USERNAME, 'Username must be 3-30 characters');
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(u)) {
        return badRequest(ErrorCode.INVALID_USERNAME, 'Username may only contain letters, digits, underscores, dots and hyphens');
      }
    }
    if (body.age !== undefined && body.age !== null && (body.age < 10 || body.age > 100)) {
      return badRequest(ErrorCode.INVALID_AGE, 'Age must be between 10 and 100');
    }
    if (body.weightKg !== undefined && body.weightKg !== null && (body.weightKg < 30 || body.weightKg > 300)) {
      return badRequest(ErrorCode.INVALID_WEIGHT, 'Weight must be between 30 and 300 kg');
    }
    if (body.ftpWatts !== undefined && body.ftpWatts !== null && (body.ftpWatts < 50 || body.ftpWatts > 600)) {
      return badRequest(ErrorCode.INVALID_FTP, 'FTP must be between 50 and 600 watts');
    }
    if (body.heightCm !== undefined && body.heightCm !== null && (body.heightCm < 100 || body.heightCm > 250)) {
      return badRequest(ErrorCode.INVALID_HEIGHT, 'Height must be between 100 and 250 cm');
    }

    const existing = await db.select().from(users).where(eq(users.authEmail, userId)).limit(1);

    if (existing.length === 0) {
      const [created] = await db
        .insert(users)
        .values({
          authEmail: userId,
          username: body.username ?? null,
          bio: body.bio ?? null,
          avatarUrl: body.avatarUrl ?? null,
          sportTypes: body.sportTypes ?? [],
          pacePerKm: body.pacePerKm ?? null,
          weeklyKm: body.weeklyKm ?? null,
          city: body.city ?? null,
          lat: body.lat ?? null,
          lon: body.lon ?? null,
          availability: body.availability ?? [],
          gymName: body.gymName ?? null,
          strengthLevel: body.strengthLevel ?? null,
          trainingSplits: body.trainingSplits ?? [],
          goals: body.goals ?? [],
          heightCm: body.heightCm ?? null,
          athleteLevel: body.athleteLevel ?? null,
          ftpWatts: body.ftpWatts ?? null,
          vo2max: body.vo2max ?? null,
          restingHr: body.restingHr ?? null,
          maxHr: body.maxHr ?? null,
          age: body.age ?? null,
          gender: body.gender ?? null,
          weightKg: body.weightKg ?? null,
          profileSongUrl: body.profileSongUrl ?? null,
        })
        .returning();
      return NextResponse.json(created);
    } else {
      // Merge: only override fields that were explicitly sent (not undefined)
      const updates = Object.fromEntries(
        Object.entries(body).filter(([, v]) => v !== undefined),
      );
      const [updated] = await db
        .update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.authEmail, userId))
        .returning();
      return NextResponse.json(updated);
    }
  } catch (err) {
    console.error('PUT /api/users/profile error:', err);
    return serverError();
  }
}

export async function DELETE() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    // Get user's workout log IDs for cascading exercises/feedComments/feedLikes
    const userWorkouts = await db.select({ id: workoutLogs.id }).from(workoutLogs).where(eq(workoutLogs.userId, userId));
    const workoutIds = userWorkouts.map((w) => w.id);

    // Get user's training plan IDs for cascading weeks/reviews
    const userPlans = await db.select({ id: trainingPlans.id }).from(trainingPlans).where(eq(trainingPlans.creatorId, userId));
    const planIds = userPlans.map((p) => p.id);

    // Get user's forum post IDs for cascading comments/likes
    const userPosts = await db.select({ id: forumPosts.id }).from(forumPosts).where(eq(forumPosts.userId, userId));
    const postIds = userPosts.map((p) => p.id);

    // Get user's session IDs for cascading messages/reviews/participants
    const userSessions = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.creatorId, userId));
    const sessionIds = userSessions.map((s) => s.id);

    // Delete cascade: children first, parents last
    if (workoutIds.length > 0) {
      await db.delete(exercises).where(inArray(exercises.workoutLogId, workoutIds));
      await db.delete(feedComments).where(inArray(feedComments.workoutLogId, workoutIds));
      await db.delete(feedLikes).where(inArray(feedLikes.workoutLogId, workoutIds));
    }
    if (planIds.length > 0) {
      await db.delete(trainingPlanWeeks).where(inArray(trainingPlanWeeks.planId, planIds));
      await db.delete(planReviews).where(inArray(planReviews.planId, planIds));
    }
    if (postIds.length > 0) {
      await db.delete(forumComments).where(inArray(forumComments.postId, postIds));
      await db.delete(forumLikes).where(inArray(forumLikes.postId, postIds));
    }
    if (sessionIds.length > 0) {
      await db.delete(sessionMessages).where(inArray(sessionMessages.sessionId, sessionIds));
      await db.delete(sessionReviews).where(inArray(sessionReviews.sessionId, sessionIds));
      await db.delete(sessionParticipants).where(inArray(sessionParticipants.sessionId, sessionIds));
    }

    // Delete user's own data from all tables
    await db.delete(workoutLogs).where(eq(workoutLogs.userId, userId));
    await db.delete(personalRecords).where(eq(personalRecords.userId, userId));
    await db.delete(userAchievements).where(eq(userAchievements.userId, userId));
    await db.delete(trainingPlans).where(eq(trainingPlans.creatorId, userId));
    await db.delete(userStats).where(eq(userStats.userId, userId));
    await db.delete(userSportProfiles).where(eq(userSportProfiles.userId, userId));
    await db.delete(userEvents).where(eq(userEvents.userId, userId));
    await db.delete(sessions).where(eq(sessions.creatorId, userId));
    await db.delete(sessionParticipants).where(eq(sessionParticipants.userId, userId));
    await db.delete(sessionMessages).where(eq(sessionMessages.senderId, userId));
    await db.delete(sessionReviews).where(eq(sessionReviews.reviewerId, userId));
    await db.delete(messages).where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)));
    await db.delete(matches).where(or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)));
    await db.delete(swipes).where(or(eq(swipes.swiperId, userId), eq(swipes.targetId, userId)));
    await db.delete(notifications).where(eq(notifications.userId, userId));
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    await db.delete(userFollows).where(or(eq(userFollows.followerId, userId), eq(userFollows.followingId, userId)));
    await db.delete(activityFeed).where(eq(activityFeed.userId, userId));
    await db.delete(stravaTokens).where(eq(stravaTokens.userId, userId));
    await db.delete(stravaActivities).where(eq(stravaActivities.userId, userId));
    await db.delete(stravaGear).where(eq(stravaGear.userId, userId));
    await db.delete(stravaBestEfforts).where(eq(stravaBestEfforts.userId, userId));
    await db.delete(forumPosts).where(eq(forumPosts.userId, userId));
    await db.delete(forumComments).where(eq(forumComments.userId, userId));
    await db.delete(forumLikes).where(eq(forumLikes.userId, userId));
    await db.delete(gymCheckins).where(eq(gymCheckins.userId, userId));
    await db.delete(spotterRequests).where(eq(spotterRequests.requesterId, userId));
    await db.delete(friends).where(or(eq(friends.requesterId, userId), eq(friends.receiverId, userId)));
    await db.delete(feedComments).where(eq(feedComments.authorId, userId));
    await db.delete(feedLikes).where(eq(feedLikes.userId, userId));
    await db.delete(planReviews).where(eq(planReviews.reviewerId, userId));

    // Delete user profile and auth record
    await db.delete(users).where(eq(users.authEmail, userId));
    await db.delete(authUsers).where(eq(authUsers.email, userId));

    // Clear auth cookie
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/users/profile error:', err);
    return serverError();
  }
}
