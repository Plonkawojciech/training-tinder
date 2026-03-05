import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  serial,
  jsonb,
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
