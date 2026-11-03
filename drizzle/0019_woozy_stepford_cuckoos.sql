ALTER TABLE "OutboundWhatsAppMessages" ADD COLUMN "templateSnapshot" jsonb;--> statement-breakpoint
ALTER TABLE "OutboundWhatsAppMessages" ADD COLUMN "linkPath" varchar;--> statement-breakpoint
ALTER TABLE "OutboundWhatsAppMessages" ADD COLUMN "linkClickedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "WhatsAppMessages" ADD COLUMN "templateSnapshot" jsonb;--> statement-breakpoint
ALTER TABLE "WhatsAppMessages" ADD COLUMN "linkClickedAt" timestamp with time zone;