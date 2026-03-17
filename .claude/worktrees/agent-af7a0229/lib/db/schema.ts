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
  stravaVerified: boolean('strava_verified').default(false).notNull(),
  verifiedPacePerKm: integer('verified_pace_per_km'),
  availability: text('availability').array().default([]),
  gymName: text('gym_name'),
  strengthLevel: text('strength_level'),
  trainingSplits: jsonb('training_splits').$type<string[]>().default([]),
  goals: jsonb('goals').$type<string[]>().default([]),
  heightCm: integer('height_cm'),
  // Advanced fields
  paceUnit: text('pace_unit').default('min_km'),         // 'min_km' | 'km_h'
  athleteLevel: text('athlete_level'),                    // beginner/recreational/competitive/elite
  ftpWatts: integer('ftp_watts'),                        // cycling FTP
  vo2max: doublePrecision('vo2max'),                     // ml/kg/min
  restingHr: integer('resting_hr'),
  maxHr: integer('max_hr'),
  age: integer('age'),
  gender: text('gender'), // 'male' | 'female' | 'other'
  weightKg: doublePrecision('weight_kg'), // only shown/used for females
  photoUrls: jsonb('photo_urls').$type<string[]>().default([]),
  profileSongUrl: text('profile_song_url'),
  stravaStatsJson: jsonb('strava_stats_json').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Per-sport detailed profile with zones
export const userSportProfiles = pgTable('user_sport_profiles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  sport: text('sport').notNull(),
  level: text('level').notNull().default('recreational'), // beginner/recreational/competitive/elite
  avgSpeedKmh: doublePrecision('avg_speed_kmh'),
  pacePerKmSec: integer('pace_per_km_sec'),
  ftpWatts: integer('ftp_watts'),
  vo2max: doublePrecision('vo2max'),
  weeklyKm: integer('weekly_km'),
  weeklyHours: doublePrecision('weekly_hours'),
  restingHr: integer('resting_hr'),
  maxHr: integer('max_hr'),
  big4Json: jsonb('big4_json').$type<{ bench?: number; squat?: number; deadlift?: number; ohp?: number }>().default({}),
  primaryGoal: text('primary_goal'),
  targetRaceDate: date('target_race_date'),
  yearsExperience: integer('years_experience'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Upcoming races & events
export const userEvents = pgTable('user_events', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  eventName: text('event_name').notNull(),
  eventType: text('event_type').notNull(), // race/sportive/competition/fun_run/triathlon/marathon/gran_fondo
  sport: text('sport').notNull(),
  eventDate: date('event_date').notNull(),
  location: text('location'),
  distanceKm: doublePrecision('distance_km'),
  targetTimeSec: integer('target_time_sec'),
  status: text('status').notNull().default('registered'), // registered/considering/completed/dnf
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Recurring session series (e.g. every Wednesday evening ride)
export const sessionSeries = pgTable('session_series', {
  id: serial('id').primaryKey(),
  creatorId: text('creator_id').notNull(),
  title: text('title').notNull(),
  sportType: text('sport_type').notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Mon … 6=Sun
  time: text('time').notNull(),
  frequency: text('frequency').notNull().default('weekly'), // weekly/biweekly
  location: text('location').notNull(),
  lat: doublePrecision('lat'),
  lon: doublePrecision('lon'),
  maxParticipants: integer('max_participants').notNull().default(10),
  description: text('description'),
  minLevel: text('min_level'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  routeSegments: jsonb('route_segments').$type<string[]>().default([]),
  seriesId: integer('series_id'),
  minLevel: text('min_level'),
  // Cycling/Running/Endurance fields
  estimatedDistanceKm: doublePrecision('estimated_distance_km'),
  estimatedDurationMin: integer('estimated_duration_min'),
  targetAvgPowerWatts: integer('target_avg_power_watts'),  // cycling
  elevationGainM: integer('elevation_gain_m'),
  stops: jsonb('stops').$type<{name: string; location: string}[]>().default([]),
  targetPaceSecPerKm: text('target_pace_sec_per_km'),      // running: e.g. "5:30"
  terrain: text('terrain'),                                  // running: road/trail/track
  // Privacy: 'public' = everyone, 'friends' = accepted friends only
  privacy: text('privacy').notNull().default('public'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessionParticipants = pgTable('session_participants', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  userId: text('user_id').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'host'
});

export const sessionMessages = pgTable('session_messages', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  senderId: text('sender_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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

export const swipes = pgTable('swipes', {
  id: serial('id').primaryKey(),
  swiperId: text('swiper_id').notNull(),
  targetId: text('target_id').notNull(),
  direction: text('direction').notNull(), // 'like' | 'pass'
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

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  subscription: jsonb('subscription').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workoutLogs = pgTable('workout_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  date: date('date').notNull(),
  type: text('type').notNull(),
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
  difficulty: text('difficulty').notNull(),
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
  type: text('type').notNull(),
  dataJson: jsonb('data_json').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Strava OAuth tokens
export const stravaTokens = pgTable('strava_tokens', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  stravaAthleteId: text('strava_athlete_id').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Strava synced activities
export const stravaActivities = pgTable('strava_activities', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  stravaId: text('strava_id').notNull().unique(),
  type: text('type').notNull(),
  sportType: text('sport_type'),
  name: text('name').notNull(),
  distanceM: doublePrecision('distance_m'),
  movingTimeSec: integer('moving_time_sec'),
  elapsedTimeSec: integer('elapsed_time_sec'),
  averageSpeedMs: doublePrecision('average_speed_ms'),
  maxSpeedMs: doublePrecision('max_speed_ms'),
  elevationGainM: doublePrecision('elevation_gain_m'),
  averageWatts: doublePrecision('average_watts'),
  weightedAvgWatts: integer('weighted_avg_watts'),
  averageHeartrate: doublePrecision('average_heartrate'),
  maxHeartrate: doublePrecision('max_heartrate'),
  averageCadence: doublePrecision('average_cadence'),
  startLat: doublePrecision('start_lat'),
  startLon: doublePrecision('start_lon'),
  isTrainer: boolean('is_trainer').default(false),
  kudosCount: integer('kudos_count').default(0),
  achievementCount: integer('achievement_count').default(0),
  startDate: timestamp('start_date').notNull(),
  summaryPolyline: text('summary_polyline'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Forum posts
export const forumPosts = pgTable('forum_posts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull().default('general'),
  imageUrl: text('image_url'),
  workoutLogId: integer('workout_log_id'),
  sessionId: integer('session_id'),
  likesCount: integer('likes_count').notNull().default(0),
  commentsCount: integer('comments_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Forum comments
export const forumComments = pgTable('forum_comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull(),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  likesCount: integer('likes_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Forum likes (posts and comments)
export const forumLikes = pgTable('forum_likes', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  postId: integer('post_id'),
  commentId: integer('comment_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Gym tables
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

export const friends = pgTable('friends', {
  id: serial('id').primaryKey(),
  requesterId: text('requester_id').notNull(), // clerkId of person who sent request
  receiverId: text('receiver_id').notNull(),   // clerkId of person who received
  status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'rejected'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const feedComments = pgTable('feed_comments', {
  id: serial('id').primaryKey(),
  workoutLogId: integer('workout_log_id').notNull(),
  authorId: text('author_id').notNull(), // clerkId
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Strava gear (bikes and shoes)
export const stravaGear = pgTable('strava_gear', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  stravaGearId: text('strava_gear_id').notNull().unique(),
  gearType: text('gear_type').notNull(), // 'bike' | 'shoe'
  name: text('name').notNull(),
  brandName: text('brand_name'),
  modelName: text('model_name'),
  distanceM: doublePrecision('distance_m'),
  description: text('description'),
  isDefault: boolean('is_default').default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Strava best efforts / personal records for standard distances
export const stravaBestEfforts = pgTable('strava_best_efforts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  effortName: text('effort_name').notNull(), // '400m', '1/2 mile', '1k', '1 mile', '2 mile', '5k', '10k', '15k', '20k', 'Half-Marathon', 'Marathon'
  distanceM: integer('distance_m').notNull(),
  movingTimeSec: integer('moving_time_sec').notNull(),
  activityStravaId: text('activity_strava_id'),
  startDate: timestamp('start_date'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type SessionMessage = typeof sessionMessages.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type Swipe = typeof swipes.$inferSelect;
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
export type StravaToken = typeof stravaTokens.$inferSelect;
export type StravaActivity = typeof stravaActivities.$inferSelect;
export type StravaGear = typeof stravaGear.$inferSelect;
export type StravaBestEffort = typeof stravaBestEfforts.$inferSelect;
export type ForumPost = typeof forumPosts.$inferSelect;
export type ForumComment = typeof forumComments.$inferSelect;
export type ForumLike = typeof forumLikes.$inferSelect;
export type GymCheckin = typeof gymCheckins.$inferSelect;
export type NewGymCheckin = typeof gymCheckins.$inferInsert;
export type SpotterRequest = typeof spotterRequests.$inferSelect;
export type NewSpotterRequest = typeof spotterRequests.$inferInsert;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export type UserSportProfile = typeof userSportProfiles.$inferSelect;
export type NewUserSportProfile = typeof userSportProfiles.$inferInsert;
export type UserEvent = typeof userEvents.$inferSelect;
export type NewUserEvent = typeof userEvents.$inferInsert;
export type SessionSeries = typeof sessionSeries.$inferSelect;
export type NewSessionSeries = typeof sessionSeries.$inferInsert;
export type Friend = typeof friends.$inferSelect;
export type NewFriend = typeof friends.$inferInsert;
export type FeedComment = typeof feedComments.$inferSelect;
export type NewFeedComment = typeof feedComments.$inferInsert;
