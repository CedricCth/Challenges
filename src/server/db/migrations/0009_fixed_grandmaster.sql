-- Extend the notifications.kind enum with 'stat_deleted' so that the
-- delete-entry action can produce a news/email event (matches the
-- 'stat_added' producer call for symmetry).
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_kind_check";--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_kind_check" CHECK ("notifications"."kind" in ('stat_added','stat_deleted','challenge_edited','winner_declared','challenge_created'));
