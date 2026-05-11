import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Reference to Supabase's `auth.users` table, declared so we can express
 * foreign keys against it. We never INSERT/UPDATE here — Supabase manages it.
 */
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

/**
 * Application-level profile, 1:1 with auth.users. Auto-created via a Postgres
 * trigger (see migrations/0001_rls_and_triggers.sql).
 */
export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Lookup table for challenge types (fitness, reading, cooking, …).
 * Seeded; new types added via SQL + a strategy file in code (Factory pattern).
 */
export const challengeTypes = pgTable("challenge_types", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  icon: text("icon").notNull(),
  defaultMetrics: jsonb("default_metrics").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    description: text("description"),
    typeKey: text("type_key")
      .notNull()
      .references(() => challengeTypes.key, { onDelete: "restrict" }),
    goalMetric: text("goal_metric"),
    goalTarget: numeric("goal_target"),
    goalDirection: text("goal_direction"),
    status: text("status").notNull().default("planned"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    winnerId: uuid("winner_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    tie: boolean("tie").notNull().default(false),
    winnerNote: text("winner_note"),
    winnerPhotoUrl: text("winner_photo_url"),
    coverImageUrl: text("cover_image_url"),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{"schema_version":1}'::jsonb`),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("challenges_status_end_date_idx").on(t.status, t.endDate),
    index("challenges_type_key_idx").on(t.typeKey),
    check(
      "challenges_status_check",
      sql`${t.status} in ('planned','active','completed','cancelled')`,
    ),
    check(
      "challenges_goal_direction_check",
      sql`${t.goalDirection} is null or ${t.goalDirection} in ('higher','lower')`,
    ),
    check(
      "challenges_dates_check",
      sql`${t.endDate} is null or ${t.startDate} is null or ${t.endDate} >= ${t.startDate}`,
    ),
    check(
      "challenges_winner_consistency_check",
      sql`${t.winnerId} is null or ${t.status} = 'completed' or ${t.tie} = true`,
    ),
  ],
);

export const challengeParticipants = pgTable(
  "challenge_participants",
  {
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    startingValue: numeric("starting_value"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.challengeId, t.profileId] }),
    index("challenge_participants_profile_idx").on(t.profileId),
  ],
);

export const statEntries = pgTable(
  "stat_entries",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    metric: text("metric").notNull(),
    value: numeric("value").notNull(),
    unit: text("unit").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    note: text("note"),
    photoUrl: text("photo_url"),
  },
  (t) => [
    index("stat_entries_challenge_recorded_idx").on(
      t.challengeId,
      t.recordedAt,
    ),
    index("stat_entries_profile_recorded_idx").on(t.profileId, t.recordedAt),
  ],
);

/**
 * Producer/consumer queue for in-app notifications.
 *
 * Producers (server actions: addStatEntry, updateChallenge, declareWinner,
 * createChallenge) call notifyChallengeParticipants() which inserts one
 * row per *other* participant of the affected challenge.
 *
 * Consumers:
 *   1) the /news page reads recent rows for the current user;
 *   2) (Phase 11) an email worker reads unread, sends a digest, marks read.
 *
 * `payload` carries the small extras needed to render a friendly summary
 * line ({ metric, value, unit } for stat_added, etc.) — kept as jsonb so
 * adding a new kind doesn't need a migration.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    challengeId: uuid("challenge_id").references(() => challenges.id, {
      onDelete: "cascade",
    }),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    readAt: timestamp("read_at", { withTimezone: true }),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_recipient_created_idx").on(
      t.recipientId,
      t.createdAt.desc(),
    ),
    index("notifications_recipient_unread_idx").on(t.recipientId, t.readAt),
    check(
      "notifications_kind_check",
      sql`${t.kind} in ('stat_added','challenge_edited','winner_declared','challenge_created')`,
    ),
  ],
);

export const milestones = pgTable("milestones", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id").references(() => profiles.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  targetValue: numeric("target_value"),
  achievedAt: timestamp("achieved_at", { withTimezone: true }),
  orderIndex: integer("order_index").notNull().default(0),
});
