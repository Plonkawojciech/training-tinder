import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  serial,
  jsonb,
  date,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  username: text('username'),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  sportTypes: text('sport_types').array().notNull().default([]),
  pacePerKm: integer('pace_per_km'),
  weeklyKm: integer('weekly_km'),
  city: text('city'),
  lat: doublePrecision('lat'),
  lon: doublePrecision('lon'),
  stravaId: text('strava_id'),
  availability: text('availability').array().default([]),
  gymName: text('gym_name'),
  strengthLevel: text('strength_level'),
  trainingSplits: jsonb('training_splits').$type<string[]>().default([]),
  goals: jsonb('goals').$type<string[]>().default([]),
  heightCm: integer('height_cm'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  creatorId: text('creator_id').notNull(),
  title: text('title').notNull(),
  sportType: text('sport_type').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  location: text('location').notNull(),
  lat: doublePrecision('lat'),
  lon: doublePrecision('lon'),
  maxParticipants: integer('max_participants').notNull().default(10),
  gpxUrl: text('gpx_url'),
  description: text('description'),
  status: text('status').notNull().default('open'),
  gymName: text('gym_name'),
  equipmentNeeded: jsonb('equipment_needed').$type<string[]>().default([]),
  workoutType: text('workout_type'),
  strengthLevelRequired: text('strength_level_required'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessionParticipants = pgTable('session_participants', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  userId: text('user_id').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: text('sender_id').notNull(),
  receiverId: text('receiver_id').notNull(),
  content: text('content').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  user1Id: text('user1_id').notNull(),
  user2Id: text('user2_id').notNull(),
  score: integer('score').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  dataJson: jsonb('data_json'),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workoutLogs = pgTable('workout_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  date: date('date').notNull(),
  type: text('type').notNull(), // push/pull/legs/fullbody/upper/lower/custom
  name: text('name').notNull(),
  durationMin: integer('duration_min'),
  notes: text('notes'),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const exercises = pgTable('exercises', {
  id: serial('id').primaryKey(),
  workoutLogId: integer('workout_log_id').notNull(),
  name: text('name').notNull(),
  sets: integer('sets').notNull().default(1),
  repsPerSet: jsonb('reps_per_set').$type<number[]>().default([]),
  weightKg: jsonb('weight_kg').$type<number[]>().default([]),
  notes: text('notes'),
  orderIndex: integer('order_index').notNull().default(0),
});

export const personalRecords = pgTable('personal_records', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  exerciseName: text('exercise_name').notNull(),
  weightKg: doublePrecision('weight_kg').notNull(),
  reps: integer('reps').notNull(),
  achievedAt: timestamp('achieved_at').defaultNow().notNull(),
  notes: text('notes'),
});

export const userAchievements = pgTable('user_achievements', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
});

export const trainingPlans = pgTable('training_plans', {
  id: serial('id').primaryKey(),
  creatorId: text('creator_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  sportType: text('sport_type').notNull(),
  difficulty: text('difficulty').notNull(), // beginner/intermediate/advanced/elite
  durationWeeks: integer('duration_weeks').notNull(),
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const trainingPlanWeeks = pgTable('training_plan_weeks', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').notNull(),
  weekNumber: integer('week_number').notNull(),
  daysJson: jsonb('days_json').$type<Record<string, unknown>>().default({}),
  notes: text('notes'),
});

export const userStats = pgTable('user_stats', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  date: date('date').notNull(),
  weightKg: doublePrecision('weight_kg'),
  bodyFatPct: doublePrecision('body_fat_pct'),
  notes: text('notes'),
});

export const sessionReviews = pgTable('session_reviews', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  reviewerId: text('reviewer_id').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userFollows = pgTable('user_follows', {
  id: serial('id').primaryKey(),
  followerId: text('follower_id').notNull(),
  followingId: text('following_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityFeed = pgTable('activity_feed', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(), // workout_completed/pr_set/session_joined/plan_shared/achievement
  dataJson: jsonb('data_json').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type NewWorkoutLog = typeof workoutLogs.$inferInsert;
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type PersonalRecord = typeof personalRecords.$inferSelect;
export type NewPersonalRecord = typeof personalRecords.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type NewTrainingPlan = typeof trainingPlans.$inferInsert;
export type TrainingPlanWeek = typeof trainingPlanWeeks.$inferSelect;
export type UserStat = typeof userStats.$inferSelect;
export type NewUserStat = typeof userStats.$inferInsert;
export type SessionReview = typeof sessionReviews.$inferSelect;
export type UserFollow = typeof userFollows.$inferSelect;
export type ActivityFeedItem = typeof activityFeed.$inferSelect;

export const gymCheckins = pgTable('gym_checkins', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  gymName: text('gym_name').notNull(),
  gymPlaceId: text('gym_place_id'),
  lat: doublePrecision('lat'),
  lon: doublePrecision('lon'),
  checkedInAt: timestamp('checked_in_at').defaultNow(),
  checkedOutAt: timestamp('checked_out_at'),
  workoutType: text('workout_type'),
  isActive: boolean('is_active').default(true).notNull(),
});

export const spotterRequests = pgTable('spotter_requests', {
  id: serial('id').primaryKey(),
  requesterId: text('requester_id').notNull(),
  exercise: text('exercise').notNull(),
  weightKg: integer('weight_kg'),
  gymName: text('gym_name').notNull(),
  gymPlaceId: text('gym_place_id'),
  message: text('message'),
  status: text('status').default('open').notNull(),
  acceptedById: text('accepted_by_id'),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
});

export type GymCheckin = typeof gymCheckins.$inferSelect;
export type NewGymCheckin = typeof gymCheckins.$inferInsert;
export type SpotterRequest = typeof spotterRequests.$inferSelect;
export type NewSpotterRequest = typeof spotterRequests.$inferInsert;
