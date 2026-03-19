import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/server-auth';
import { db } from '@/lib/db';
import {
  users, userSportProfiles, userEvents, sessions,
  sessionParticipants, messages, matches, swipes,
  notifications, workoutLogs, exercises, personalRecords,
  userAchievements, trainingPlans, userStats,
  sessionReviews, userFollows, activityFeed,
  stravaActivities, stravaGear, stravaBestEfforts,
  forumPosts, forumComments, gymCheckins, spotterRequests,
  friends, feedComments, feedLikes,
} from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { unauthorized, serverError } from '@/lib/api-errors';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const [profile] = await db.select().from(users).where(eq(users.authEmail, userId)).limit(1);

    const sportProfiles = await db.select().from(userSportProfiles).where(eq(userSportProfiles.userId, userId));
    const events = await db.select().from(userEvents).where(eq(userEvents.userId, userId));
    const createdSessions = await db.select().from(sessions).where(eq(sessions.creatorId, userId));
    const joinedSessions = await db.select().from(sessionParticipants).where(eq(sessionParticipants.userId, userId));
    const sentMessages = await db.select().from(messages).where(eq(messages.senderId, userId));
    const receivedMessages = await db.select().from(messages).where(eq(messages.receiverId, userId));
    const userMatches = await db.select().from(matches).where(or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)));
    const userSwipes = await db.select().from(swipes).where(eq(swipes.swiperId, userId));
    const userNotifications = await db.select().from(notifications).where(eq(notifications.userId, userId));
    const workouts = await db.select().from(workoutLogs).where(eq(workoutLogs.userId, userId));
    const records = await db.select().from(personalRecords).where(eq(personalRecords.userId, userId));
    const achievements = await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
    const plans = await db.select().from(trainingPlans).where(eq(trainingPlans.creatorId, userId));
    const stats = await db.select().from(userStats).where(eq(userStats.userId, userId));
    const reviews = await db.select().from(sessionReviews).where(eq(sessionReviews.reviewerId, userId));
    const follows = await db.select().from(userFollows).where(or(eq(userFollows.followerId, userId), eq(userFollows.followingId, userId)));
    const feed = await db.select().from(activityFeed).where(eq(activityFeed.userId, userId));
    const activities = await db.select().from(stravaActivities).where(eq(stravaActivities.userId, userId));
    const gear = await db.select().from(stravaGear).where(eq(stravaGear.userId, userId));
    const bestEfforts = await db.select().from(stravaBestEfforts).where(eq(stravaBestEfforts.userId, userId));
    const posts = await db.select().from(forumPosts).where(eq(forumPosts.userId, userId));
    const comments = await db.select().from(forumComments).where(eq(forumComments.userId, userId));
    const checkins = await db.select().from(gymCheckins).where(eq(gymCheckins.userId, userId));
    const spotterReqs = await db.select().from(spotterRequests).where(eq(spotterRequests.requesterId, userId));
    const userFriends = await db.select().from(friends).where(or(eq(friends.requesterId, userId), eq(friends.receiverId, userId)));
    const userFeedComments = await db.select().from(feedComments).where(eq(feedComments.authorId, userId));
    const userFeedLikes = await db.select().from(feedLikes).where(eq(feedLikes.userId, userId));

    // Get exercises for user's workouts
    let workoutExercises: Record<string, unknown>[] = [];
    if (workouts.length > 0) {
      const workoutIds = workouts.map((w) => w.id);
      const { inArray } = await import('drizzle-orm');
      workoutExercises = await db.select().from(exercises).where(inArray(exercises.workoutLogId, workoutIds));
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      profile: profile ?? null,
      sportProfiles,
      events,
      sessions: { created: createdSessions, joined: joinedSessions },
      messages: { sent: sentMessages, received: receivedMessages },
      matches: userMatches,
      swipes: userSwipes,
      notifications: userNotifications,
      workouts,
      exercises: workoutExercises,
      personalRecords: records,
      achievements,
      trainingPlans: plans,
      stats,
      sessionReviews: reviews,
      follows,
      activityFeed: feed,
      strava: { activities, gear, bestEfforts },
      forum: { posts, comments },
      gym: { checkins, spotterRequests: spotterReqs },
      friends: userFriends,
      feedComments: userFeedComments,
      feedLikes: userFeedLikes,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="trainmate-export-${Date.now()}.json"`,
      },
    });
  } catch (err) {
    console.error('GET /api/users/export error:', err);
    return serverError();
  }
}
