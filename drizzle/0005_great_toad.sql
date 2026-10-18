CREATE TABLE "BookingRequestOfferEventReactions" (
	"bookingRequestOfferEventReactionId" varchar(20) PRIMARY KEY NOT NULL,
	"bookingRequestOfferEventId" varchar(20) NOT NULL,
	"reactorRole" varchar NOT NULL,
	"reactorUserId" varchar(20) NOT NULL,
	"emoji" varchar,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "BookingRequestOfferEventReactions" ADD CONSTRAINT "BookingRequestOfferEventReactions_bookingRequestOfferEventId_BookingRequestOfferEvents_bookingRequestOfferEventId_fk" FOREIGN KEY ("bookingRequestOfferEventId") REFERENCES "public"."BookingRequestOfferEvents"("bookingRequestOfferEventId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestOfferEventReactions" ADD CONSTRAINT "BookingRequestOfferEventReactions_reactorUserId_Users_userId_fk" FOREIGN KEY ("reactorUserId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "BookingRequestOfferEventReactions_event_role_uidx" ON "BookingRequestOfferEventReactions" USING btree ("bookingRequestOfferEventId","reactorRole");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferEventReactions_eventId_idx" ON "BookingRequestOfferEventReactions" USING btree ("bookingRequestOfferEventId");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferEventReactions_reactorUserId_idx" ON "BookingRequestOfferEventReactions" USING btree ("reactorUserId");