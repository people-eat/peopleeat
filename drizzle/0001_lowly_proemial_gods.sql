-- Pending email OTPs are short-lived auth state; wipe before adding required ciphertext.
DELETE FROM "AuthEmailOtps";--> statement-breakpoint
ALTER TABLE "AuthEmailOtps" ADD COLUMN "codeEncrypted" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "AuthEmailOtps" ADD COLUMN "dismissedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "AuthEmailOtps" ADD COLUMN "lastSentAt" timestamp with time zone DEFAULT now() NOT NULL;
