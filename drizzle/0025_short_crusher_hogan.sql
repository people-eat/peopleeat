CREATE TABLE "BookingRequestKitchenDetailsPhotos" (
	"bookingRequestId" varchar(20) NOT NULL,
	"fileUploadId" varchar(20) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "BookingRequests" ADD COLUMN "setting" varchar;--> statement-breakpoint
ALTER TABLE "BookingRequests" ADD COLUMN "kitchenDetails" jsonb;--> statement-breakpoint
ALTER TABLE "BookingRequestKitchenDetailsPhotos" ADD CONSTRAINT "BookingRequestKitchenDetailsPhotos_bookingRequestId_BookingRequests_bookingRequestId_fk" FOREIGN KEY ("bookingRequestId") REFERENCES "public"."BookingRequests"("bookingRequestId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestKitchenDetailsPhotos" ADD CONSTRAINT "BookingRequestKitchenDetailsPhotos_fileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("fileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "BookingRequestKitchenDetailsPhotos_pk" ON "BookingRequestKitchenDetailsPhotos" USING btree ("bookingRequestId","fileUploadId");--> statement-breakpoint
CREATE UNIQUE INDEX "BookingRequestKitchenDetailsPhotos_position_uidx" ON "BookingRequestKitchenDetailsPhotos" USING btree ("bookingRequestId","position");--> statement-breakpoint
CREATE INDEX "BookingRequestKitchenDetailsPhotos_bookingRequestId_idx" ON "BookingRequestKitchenDetailsPhotos" USING btree ("bookingRequestId");--> statement-breakpoint
CREATE INDEX "BookingRequestKitchenDetailsPhotos_fileUploadId_idx" ON "BookingRequestKitchenDetailsPhotos" USING btree ("fileUploadId");