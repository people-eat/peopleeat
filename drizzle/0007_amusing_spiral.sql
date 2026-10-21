ALTER TABLE "BookingRequestOffers" ADD COLUMN "preparationsCompletedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "BookingRequestOffers" ADD COLUMN "participantAmendment" jsonb;