ALTER TABLE "BookingRequestCooks" ADD COLUMN "requestedMenuId" varchar(20);--> statement-breakpoint
ALTER TABLE "BookingRequestCooks" ADD COLUMN "requestedMenu" jsonb;--> statement-breakpoint
ALTER TABLE "BookingRequestCooks" ADD CONSTRAINT "BookingRequestCooks_requestedMenuId_Menus_menuId_fk" FOREIGN KEY ("requestedMenuId") REFERENCES "public"."Menus"("menuId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "BookingRequestCooks_requestedMenuId_idx" ON "BookingRequestCooks" USING btree ("requestedMenuId");