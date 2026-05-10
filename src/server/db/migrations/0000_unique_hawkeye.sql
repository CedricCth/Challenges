-- Note: auth.users is owned by Supabase; we only declared it in Drizzle for
-- FK type-safety, not to (re)create it here.
--> statement-breakpoint
CREATE TABLE "challenge_participants" (
	"challenge_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"starting_value" numeric,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_participants_challenge_id_profile_id_pk" PRIMARY KEY("challenge_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "challenge_types" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"icon" text NOT NULL,
	"default_metrics" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type_key" text NOT NULL,
	"goal_metric" text,
	"goal_target" numeric,
	"goal_direction" text,
	"status" text DEFAULT 'planned' NOT NULL,
	"start_date" date,
	"end_date" date,
	"winner_id" uuid,
	"tie" boolean DEFAULT false NOT NULL,
	"cover_image_url" text,
	"metadata" jsonb DEFAULT '{"schema_version":1}'::jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenges_status_check" CHECK ("challenges"."status" in ('planned','active','completed','cancelled')),
	CONSTRAINT "challenges_goal_direction_check" CHECK ("challenges"."goal_direction" is null or "challenges"."goal_direction" in ('higher','lower')),
	CONSTRAINT "challenges_dates_check" CHECK ("challenges"."end_date" is null or "challenges"."start_date" is null or "challenges"."end_date" >= "challenges"."start_date"),
	CONSTRAINT "challenges_winner_consistency_check" CHECK ("challenges"."winner_id" is null or "challenges"."status" = 'completed' or "challenges"."tie" = true)
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"profile_id" uuid,
	"title" text NOT NULL,
	"target_value" numeric,
	"achieved_at" timestamp with time zone,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stat_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"value" numeric NOT NULL,
	"unit" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"photo_url" text
);
--> statement-breakpoint
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_type_key_challenge_types_key_fk" FOREIGN KEY ("type_key") REFERENCES "public"."challenge_types"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_winner_id_profiles_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stat_entries" ADD CONSTRAINT "stat_entries_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stat_entries" ADD CONSTRAINT "stat_entries_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenge_participants_profile_idx" ON "challenge_participants" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "challenges_status_end_date_idx" ON "challenges" USING btree ("status","end_date");--> statement-breakpoint
CREATE INDEX "challenges_type_key_idx" ON "challenges" USING btree ("type_key");--> statement-breakpoint
CREATE INDEX "stat_entries_challenge_recorded_idx" ON "stat_entries" USING btree ("challenge_id","recorded_at");--> statement-breakpoint
CREATE INDEX "stat_entries_profile_recorded_idx" ON "stat_entries" USING btree ("profile_id","recorded_at");