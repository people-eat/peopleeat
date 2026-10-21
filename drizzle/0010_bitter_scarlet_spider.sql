UPDATE "BookingRequestOffers"
SET "priceAutoAdjustReason" = 'UNKNOWN'
WHERE "isPriceAutoAdjusted" = true
  AND "priceAutoAdjustReason" IS NULL;
--> statement-breakpoint
ALTER TABLE "BookingRequestOffers" DROP COLUMN "isPriceAutoAdjusted";
