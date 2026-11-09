ALTER TABLE "Partners" RENAME TO "PartnerVenues";
--> statement-breakpoint
ALTER TABLE "PartnerVenues" RENAME COLUMN "partnerId" TO "partnerVenueId";
--> statement-breakpoint
ALTER TABLE "PartnerVenues" RENAME CONSTRAINT "Partners_pkey" TO "PartnerVenues_pkey";
--> statement-breakpoint
ALTER INDEX "Partners_pathName_uidx" RENAME TO "PartnerVenues_pathName_uidx";
--> statement-breakpoint
ALTER INDEX "Partners_publishedAt_idx" RENAME TO "PartnerVenues_publishedAt_idx";
--> statement-breakpoint
ALTER INDEX "Partners_promoCodeId_idx" RENAME TO "PartnerVenues_promoCodeId_idx";
--> statement-breakpoint
ALTER TABLE "PartnerVenues" RENAME CONSTRAINT "Partners_heroImageFileUploadId_FileUploads_fileUploadId_fk" TO "PartnerVenues_heroImageFileUploadId_FileUploads_fileUploadId_fk";
--> statement-breakpoint
ALTER TABLE "PartnerVenues" RENAME CONSTRAINT "Partners_firstSectionImageFileUploadId_FileUploads_fileUploadId_fk" TO "PartnerVenues_firstSectionImageFileUploadId_FileUploads_fileUploadId_fk";
--> statement-breakpoint
ALTER TABLE "PartnerVenues" RENAME CONSTRAINT "Partners_promoCodeId_PromoCodes_promoCodeId_fk" TO "PartnerVenues_promoCodeId_PromoCodes_promoCodeId_fk";
--> statement-breakpoint
ALTER TABLE "PartnerCooks" RENAME TO "PartnerVenueCooks";
--> statement-breakpoint
ALTER TABLE "PartnerVenueCooks" RENAME COLUMN "partnerId" TO "partnerVenueId";
--> statement-breakpoint
ALTER INDEX "PartnerCooks_pk" RENAME TO "PartnerVenueCooks_pk";
--> statement-breakpoint
ALTER INDEX "PartnerCooks_partnerId_idx" RENAME TO "PartnerVenueCooks_partnerVenueId_idx";
--> statement-breakpoint
ALTER TABLE "PartnerVenueCooks" RENAME CONSTRAINT "PartnerCooks_partnerId_Partners_partnerId_fk" TO "PartnerVenueCooks_partnerVenueId_PartnerVenues_partnerVenueId_fk";
--> statement-breakpoint
ALTER TABLE "PartnerVenueCooks" RENAME CONSTRAINT "PartnerCooks_cookId_Cooks_cookId_fk" TO "PartnerVenueCooks_cookId_Cooks_cookId_fk";
--> statement-breakpoint
ALTER TABLE "PartnerTestimonials" RENAME TO "PartnerVenueTestimonials";
--> statement-breakpoint
ALTER TABLE "PartnerVenueTestimonials" RENAME COLUMN "partnerId" TO "partnerVenueId";
--> statement-breakpoint
ALTER INDEX "PartnerTestimonials_partnerId_idx" RENAME TO "PartnerVenueTestimonials_partnerVenueId_idx";
--> statement-breakpoint
ALTER TABLE "PartnerVenueTestimonials" RENAME CONSTRAINT "PartnerTestimonials_partnerId_Partners_partnerId_fk" TO "PartnerVenueTestimonials_partnerVenueId_PartnerVenues_partnerVenueId_fk";
--> statement-breakpoint
ALTER TABLE "PartnerVenueTestimonials" RENAME CONSTRAINT "PartnerTestimonials_partnerId_testimonialType_testimonialId_pk" TO "PartnerVenueTestimonials_partnerVenueId_testimonialType_testimonialId_pk";
--> statement-breakpoint
CREATE TABLE "Partners" (
	"partnerId" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "Partners" ("partnerId", "name", "createdAt", "updatedAt")
SELECT "partnerVenueId", "name", "createdAt", "updatedAt" FROM "PartnerVenues";
--> statement-breakpoint
ALTER TABLE "PartnerVenues" ADD COLUMN "partnerId" varchar(20);
--> statement-breakpoint
UPDATE "PartnerVenues" SET "partnerId" = "partnerVenueId";
--> statement-breakpoint
ALTER TABLE "PartnerVenues" ALTER COLUMN "partnerId" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "PartnerVenues" ADD CONSTRAINT "PartnerVenues_partnerId_Partners_partnerId_fk" FOREIGN KEY ("partnerId") REFERENCES "public"."Partners"("partnerId") ON DELETE restrict ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "PartnerVenues_partnerId_idx" ON "PartnerVenues" USING btree ("partnerId");
--> statement-breakpoint
UPDATE "FeatureToggles"
SET "featureToggleKey" = 'VENUE_PAGE_VENUES_EXPLORE'
WHERE "featureToggleKey" = 'PARTNER_PAGE_PARTNERS_EXPLORE';
--> statement-breakpoint
UPDATE "FeatureToggleUserOverrides"
SET "featureToggleKey" = 'VENUE_PAGE_VENUES_EXPLORE'
WHERE "featureToggleKey" = 'PARTNER_PAGE_PARTNERS_EXPLORE';
--> statement-breakpoint
UPDATE "WebPages"
SET "webPageKey" = 'VENUES'
WHERE "webPageKey" = 'PARTNERS';
--> statement-breakpoint
UPDATE "PartnerVenues"
SET "firstSectionCtaUrl" = replace("firstSectionCtaUrl", 'partnerId=', 'venueId=')
WHERE "firstSectionCtaUrl" LIKE '%partnerId=%';
