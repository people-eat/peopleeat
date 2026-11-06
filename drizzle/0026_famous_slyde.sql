CREATE TABLE "CookOfferAddons" (
	"cookOfferAddonId" varchar(20) PRIMARY KEY NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"bookingRequestOfferId" varchar(20),
	"copyOfCookOfferAddonId" varchar(20),
	"copyOfOfferAddonTemplateId" varchar(20),
	"title" varchar NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"imageFileUploadId" varchar(20),
	"pricingUnit" varchar NOT NULL,
	"priceCents" integer NOT NULL,
	"inclusion" varchar DEFAULT 'OPTIONAL' NOT NULL,
	"customerSelected" boolean DEFAULT false NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OfferAddonTemplates" (
	"offerAddonTemplateId" varchar(20) PRIMARY KEY NOT NULL,
	"titleDe" varchar NOT NULL,
	"titleEn" varchar NOT NULL,
	"descriptionDe" text DEFAULT '' NOT NULL,
	"descriptionEn" text DEFAULT '' NOT NULL,
	"pricingUnit" varchar NOT NULL,
	"suggestedPriceCents" integer NOT NULL,
	"imageFileUploadId" varchar(20),
	"position" integer DEFAULT 0 NOT NULL,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "BookingRequestOffers" ADD COLUMN "addonPriceCents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "BookingRequestOffers" ADD COLUMN "selectedAddons" jsonb;--> statement-breakpoint
ALTER TABLE "CookOfferAddons" ADD CONSTRAINT "CookOfferAddons_bookingRequestOfferId_BookingRequestOffers_bookingRequestOfferId_fk" FOREIGN KEY ("bookingRequestOfferId") REFERENCES "public"."BookingRequestOffers"("bookingRequestOfferId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookOfferAddons" ADD CONSTRAINT "CookOfferAddons_copyOfCookOfferAddonId_CookOfferAddons_cookOfferAddonId_fk" FOREIGN KEY ("copyOfCookOfferAddonId") REFERENCES "public"."CookOfferAddons"("cookOfferAddonId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookOfferAddons" ADD CONSTRAINT "CookOfferAddons_copyOfOfferAddonTemplateId_OfferAddonTemplates_offerAddonTemplateId_fk" FOREIGN KEY ("copyOfOfferAddonTemplateId") REFERENCES "public"."OfferAddonTemplates"("offerAddonTemplateId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookOfferAddons" ADD CONSTRAINT "CookOfferAddons_imageFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("imageFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookOfferAddons" ADD CONSTRAINT "CookOfferAddons_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OfferAddonTemplates" ADD CONSTRAINT "OfferAddonTemplates_imageFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("imageFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "CookOfferAddons_cookId_idx" ON "CookOfferAddons" USING btree ("cookId");--> statement-breakpoint
CREATE INDEX "CookOfferAddons_bookingRequestOfferId_idx" ON "CookOfferAddons" USING btree ("bookingRequestOfferId");--> statement-breakpoint
CREATE INDEX "CookOfferAddons_copyOfCookOfferAddonId_idx" ON "CookOfferAddons" USING btree ("copyOfCookOfferAddonId");--> statement-breakpoint
CREATE INDEX "CookOfferAddons_copyOfOfferAddonTemplateId_idx" ON "CookOfferAddons" USING btree ("copyOfOfferAddonTemplateId");--> statement-breakpoint
CREATE INDEX "CookOfferAddons_deletedAt_idx" ON "CookOfferAddons" USING btree ("deletedAt");--> statement-breakpoint
CREATE INDEX "CookOfferAddons_imageFileUploadId_idx" ON "CookOfferAddons" USING btree ("imageFileUploadId");--> statement-breakpoint
CREATE INDEX "OfferAddonTemplates_publishedAt_idx" ON "OfferAddonTemplates" USING btree ("publishedAt");--> statement-breakpoint
CREATE INDEX "OfferAddonTemplates_position_idx" ON "OfferAddonTemplates" USING btree ("position");--> statement-breakpoint
CREATE INDEX "OfferAddonTemplates_imageFileUploadId_idx" ON "OfferAddonTemplates" USING btree ("imageFileUploadId");