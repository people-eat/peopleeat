ALTER TABLE "Cities" ADD COLUMN "countryCode" varchar DEFAULT 'DE' NOT NULL;--> statement-breakpoint
CREATE INDEX "Cities_countryCode_idx" ON "Cities" USING btree ("countryCode");