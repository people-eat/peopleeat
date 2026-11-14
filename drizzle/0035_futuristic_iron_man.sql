CREATE TABLE "CookInviteRewards" (
	"cookInviteRewardId" varchar(20) PRIMARY KEY NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"fromInviteeCookId" varchar(20) NOT NULL,
	"terms" jsonb NOT NULL,
	"consumption" jsonb NOT NULL,
	"status" varchar DEFAULT 'OPEN' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastModifiedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "BookingRequestOffers" ADD COLUMN "cookInviteRewardId" varchar(20);--> statement-breakpoint
ALTER TABLE "Cooks" ADD COLUMN "invitedByCookId" varchar(20);--> statement-breakpoint
ALTER TABLE "Cooks" ADD COLUMN "inviteReward" jsonb;--> statement-breakpoint
ALTER TABLE "CookInviteRewards" ADD CONSTRAINT "CookInviteRewards_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookInviteRewards" ADD CONSTRAINT "CookInviteRewards_fromInviteeCookId_Cooks_cookId_fk" FOREIGN KEY ("fromInviteeCookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "CookInviteRewards_fromInviteeCookId_uidx" ON "CookInviteRewards" USING btree ("fromInviteeCookId");--> statement-breakpoint
CREATE INDEX "CookInviteRewards_cookId_status_idx" ON "CookInviteRewards" USING btree ("cookId","status");--> statement-breakpoint
ALTER TABLE "BookingRequestOffers" ADD CONSTRAINT "BookingRequestOffers_cookInviteRewardId_CookInviteRewards_cookInviteRewardId_fk" FOREIGN KEY ("cookInviteRewardId") REFERENCES "public"."CookInviteRewards"("cookInviteRewardId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Cooks" ADD CONSTRAINT "Cooks_invitedByCookId_Cooks_cookId_fk" FOREIGN KEY ("invitedByCookId") REFERENCES "public"."Cooks"("cookId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "BookingRequestOffers_cookInviteRewardId_idx" ON "BookingRequestOffers" USING btree ("cookInviteRewardId");--> statement-breakpoint
CREATE INDEX "Cooks_invitedByCookId_idx" ON "Cooks" USING btree ("invitedByCookId");