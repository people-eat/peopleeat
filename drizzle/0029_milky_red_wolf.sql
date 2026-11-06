CREATE TABLE "AuthOauthIdentities" (
	"authOauthIdentityId" varchar(20) PRIMARY KEY NOT NULL,
	"userId" varchar(20) NOT NULL,
	"provider" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuthOauthStates" (
	"authOauthStateId" varchar(20) PRIMARY KEY NOT NULL,
	"sessionId" varchar(20) NOT NULL,
	"state" varchar NOT NULL,
	"codeVerifier" varchar NOT NULL,
	"nonce" varchar NOT NULL,
	"returnTo" varchar NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuthOauthTickets" (
	"authOauthTicketId" varchar(20) PRIMARY KEY NOT NULL,
	"sessionId" varchar(20) NOT NULL,
	"provider" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"emailAddress" varchar NOT NULL,
	"firstName" varchar,
	"lastName" varchar,
	"phoneNumber" varchar,
	"birthDate" date,
	"verifiedAt" timestamp with time zone NOT NULL,
	"consumedAt" timestamp with time zone,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AuthOauthIdentities" ADD CONSTRAINT "AuthOauthIdentities_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AuthOauthStates" ADD CONSTRAINT "AuthOauthStates_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AuthOauthTickets" ADD CONSTRAINT "AuthOauthTickets_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "AuthOauthIdentities_provider_subject_uidx" ON "AuthOauthIdentities" USING btree ("provider","subject");--> statement-breakpoint
CREATE INDEX "AuthOauthIdentities_userId_idx" ON "AuthOauthIdentities" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "AuthOauthStates_state_uidx" ON "AuthOauthStates" USING btree ("state");--> statement-breakpoint
CREATE INDEX "AuthOauthStates_sessionId_idx" ON "AuthOauthStates" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "AuthOauthTickets_sessionId_idx" ON "AuthOauthTickets" USING btree ("sessionId");