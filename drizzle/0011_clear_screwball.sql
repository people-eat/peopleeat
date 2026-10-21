CREATE INDEX "BookingRequests_createdAt_idx" ON "BookingRequests" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Chats_createdAt_idx" ON "Chats" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "CookCallSlotBookings_createdAt_idx" ON "CookCallSlotBookings" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Logs_createdAt_idx" ON "Logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "SessionEvents_webPageVisit_webPageKey_createdAt_idx" ON "SessionEvents" USING btree (("payload"->>'webPageKey'),"createdAt") WHERE "SessionEvents"."type" = 'WEB_PAGE_VISITED';--> statement-breakpoint
CREATE INDEX "Users_createdAt_idx" ON "Users" USING btree ("createdAt");