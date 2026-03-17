CREATE TABLE "activity_feed" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"garmin_email" text,
	"garmin_password" text,
	"strava_refresh_token" text,
	"wahoo_refresh_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_log_id" integer NOT NULL,
	"name" text NOT NULL,
	"sets" integer DEFAULT 1 NOT NULL,
	"reps_per_set" jsonb DEFAULT '[]'::jsonb,
	"weight_kg" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_log_id" integer NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"post_id" integer,
	"comment_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"image_url" text,
	"workout_log_id" integer,
	"session_id" integer,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friends" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gym_checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"gym_name" text NOT NULL,
	"gym_place_id" text,
	"lat" double precision,
	"lon" double precision,
	"checked_in_at" timestamp DEFAULT now(),
	"checked_out_at" timestamp,
	"workout_type" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user1_id" text NOT NULL,
	"user2_id" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"content" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"data_json" jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"exercise_name" text NOT NULL,
	"weight_kg" double precision NOT NULL,
	"reps" integer NOT NULL,
	"achieved_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "plan_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"reviewer_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subscription" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"reviewer_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_series" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"title" text NOT NULL,
	"sport_type" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"time" text NOT NULL,
	"frequency" text DEFAULT 'weekly' NOT NULL,
	"location" text NOT NULL,
	"lat" double precision,
	"lon" double precision,
	"max_participants" integer DEFAULT 10 NOT NULL,
	"description" text,
	"min_level" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"title" text NOT NULL,
	"sport_type" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"location" text NOT NULL,
	"lat" double precision,
	"lon" double precision,
	"max_participants" integer DEFAULT 10 NOT NULL,
	"gpx_url" text,
	"description" text,
	"status" text DEFAULT 'open' NOT NULL,
	"gym_name" text,
	"equipment_needed" jsonb DEFAULT '[]'::jsonb,
	"workout_type" text,
	"strength_level_required" text,
	"route_segments" jsonb DEFAULT '[]'::jsonb,
	"series_id" integer,
	"min_level" text,
	"estimated_distance_km" double precision,
	"estimated_duration_min" integer,
	"target_avg_power_watts" integer,
	"elevation_gain_m" integer,
	"stops" jsonb DEFAULT '[]'::jsonb,
	"target_pace_sec_per_km" text,
	"terrain" text,
	"privacy" text DEFAULT 'public' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spotter_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_id" text NOT NULL,
	"exercise" text NOT NULL,
	"weight_kg" integer,
	"gym_name" text NOT NULL,
	"gym_place_id" text,
	"message" text,
	"status" text DEFAULT 'open' NOT NULL,
	"accepted_by_id" text,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "strava_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"strava_id" text NOT NULL,
	"type" text NOT NULL,
	"sport_type" text,
	"name" text NOT NULL,
	"distance_m" double precision,
	"moving_time_sec" integer,
	"elapsed_time_sec" integer,
	"average_speed_ms" double precision,
	"max_speed_ms" double precision,
	"elevation_gain_m" double precision,
	"average_watts" double precision,
	"weighted_avg_watts" integer,
	"average_heartrate" double precision,
	"max_heartrate" double precision,
	"average_cadence" double precision,
	"start_lat" double precision,
	"start_lon" double precision,
	"is_trainer" boolean DEFAULT false,
	"kudos_count" integer DEFAULT 0,
	"achievement_count" integer DEFAULT 0,
	"start_date" timestamp NOT NULL,
	"summary_polyline" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "strava_activities_strava_id_unique" UNIQUE("strava_id")
);
--> statement-breakpoint
CREATE TABLE "strava_best_efforts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"effort_name" text NOT NULL,
	"distance_m" integer NOT NULL,
	"moving_time_sec" integer NOT NULL,
	"activity_strava_id" text,
	"start_date" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strava_gear" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"strava_gear_id" text NOT NULL,
	"gear_type" text NOT NULL,
	"name" text NOT NULL,
	"brand_name" text,
	"model_name" text,
	"distance_m" double precision,
	"description" text,
	"is_default" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "strava_gear_strava_gear_id_unique" UNIQUE("strava_gear_id")
);
--> statement-breakpoint
CREATE TABLE "strava_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"strava_athlete_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "strava_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "swipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"swiper_id" text NOT NULL,
	"target_id" text NOT NULL,
	"direction" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_plan_weeks" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"week_number" integer NOT NULL,
	"days_json" jsonb DEFAULT '{}'::jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "training_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sport_type" text NOT NULL,
	"difficulty" text NOT NULL,
	"duration_weeks" integer NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"event_name" text NOT NULL,
	"event_type" text NOT NULL,
	"sport" text NOT NULL,
	"event_date" date NOT NULL,
	"location" text,
	"distance_km" double precision,
	"target_time_sec" integer,
	"status" text DEFAULT 'registered' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sport_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"sport" text NOT NULL,
	"level" text DEFAULT 'recreational' NOT NULL,
	"avg_speed_kmh" double precision,
	"pace_per_km_sec" integer,
	"ftp_watts" integer,
	"vo2max" double precision,
	"weekly_km" integer,
	"weekly_hours" double precision,
	"resting_hr" integer,
	"max_hr" integer,
	"big4_json" jsonb DEFAULT '{}'::jsonb,
	"primary_goal" text,
	"target_race_date" date,
	"years_experience" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"weight_kg" double precision,
	"body_fat_pct" double precision,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"username" text,
	"bio" text,
	"avatar_url" text,
	"sport_types" text[] DEFAULT '{}' NOT NULL,
	"pace_per_km" integer,
	"weekly_km" integer,
	"city" text,
	"lat" double precision,
	"lon" double precision,
	"strava_id" text,
	"strava_verified" boolean DEFAULT false NOT NULL,
	"verified_pace_per_km" integer,
	"availability" text[] DEFAULT '{}',
	"gym_name" text,
	"strength_level" text,
	"training_splits" jsonb DEFAULT '[]'::jsonb,
	"goals" jsonb DEFAULT '[]'::jsonb,
	"height_cm" integer,
	"pace_unit" text DEFAULT 'min_km',
	"athlete_level" text,
	"ftp_watts" integer,
	"vo2max" double precision,
	"resting_hr" integer,
	"max_hr" integer,
	"age" integer,
	"gender" text,
	"weight_kg" double precision,
	"photo_urls" jsonb DEFAULT '[]'::jsonb,
	"profile_song_url" text,
	"strava_stats_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "workout_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"duration_min" integer,
	"notes" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
