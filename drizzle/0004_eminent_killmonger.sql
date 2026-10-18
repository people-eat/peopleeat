CREATE TABLE "WhatsAppMessageReactions" (
	"whatsAppMessageReactionId" varchar(20) PRIMARY KEY NOT NULL,
	"whatsAppMessageId" varchar(20) NOT NULL,
	"direction" varchar NOT NULL,
	"emoji" varchar,
	"providerMessageId" varchar NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "WhatsAppMessageReactions" ADD CONSTRAINT "WhatsAppMessageReactions_whatsAppMessageId_WhatsAppMessages_whatsAppMessageId_fk" FOREIGN KEY ("whatsAppMessageId") REFERENCES "public"."WhatsAppMessages"("whatsAppMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "WhatsAppMessageReactions_message_direction_uidx" ON "WhatsAppMessageReactions" USING btree ("whatsAppMessageId","direction");--> statement-breakpoint
CREATE UNIQUE INDEX "WhatsAppMessageReactions_providerMessageId_uidx" ON "WhatsAppMessageReactions" USING btree ("providerMessageId");--> statement-breakpoint
CREATE INDEX "WhatsAppMessageReactions_messageId_idx" ON "WhatsAppMessageReactions" USING btree ("whatsAppMessageId");