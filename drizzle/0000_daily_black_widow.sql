CREATE TABLE "AdminLegalImprints" (
	"imprintId" varchar(20) PRIMARY KEY NOT NULL,
	"bodyDe" text NOT NULL,
	"changeSummaryDe" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"publishedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "AdminLegalPrivacyPolicies" (
	"privacyPolicyId" varchar(20) PRIMARY KEY NOT NULL,
	"bodyDe" text NOT NULL,
	"changeSummaryDe" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"publishedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "AdminLegalTermsAndConditions" (
	"termsAndConditionsId" varchar(20) PRIMARY KEY NOT NULL,
	"bodyDe" text NOT NULL,
	"changeSummaryDe" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"publishedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "Admins" (
	"adminId" varchar(20) PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AiGenerations" (
	"aiGenerationId" varchar(20) PRIMARY KEY NOT NULL,
	"kind" varchar NOT NULL,
	"userId" varchar(20),
	"sessionId" varchar(20),
	"modelId" varchar,
	"system" text NOT NULL,
	"prompt" text NOT NULL,
	"output" text NOT NULL,
	"inputTokens" integer,
	"outputTokens" integer,
	"totalTokens" integer,
	"reasoningTokens" integer,
	"cachedInputTokens" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuthEmailOtps" (
	"authEmailOtpId" varchar(20) PRIMARY KEY NOT NULL,
	"sessionId" varchar(20) NOT NULL,
	"emailAddress" varchar NOT NULL,
	"codeHash" varchar NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"verifiedAt" timestamp with time zone,
	"consumedAt" timestamp with time zone,
	"attemptCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuthPasskeys" (
	"authPasskeyId" varchar(20) PRIMARY KEY NOT NULL,
	"userId" varchar(20) NOT NULL,
	"credentialId" varchar NOT NULL,
	"publicKey" "bytea" NOT NULL,
	"counter" integer NOT NULL,
	"transports" jsonb,
	"deviceType" varchar,
	"backedUp" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuthTimeBasedOneTimePasswords" (
	"authTimeBasedOneTimePasswordId" varchar(20) PRIMARY KEY NOT NULL,
	"userId" varchar(20) NOT NULL,
	"secretEncrypted" varchar NOT NULL,
	"confirmedAt" timestamp with time zone,
	"recoveryCodes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lastUsedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AuthWebAuthnChallenges" (
	"authWebAuthnChallengeId" varchar(20) PRIMARY KEY NOT NULL,
	"challenge" varchar NOT NULL,
	"type" varchar NOT NULL,
	"sessionId" varchar(20) NOT NULL,
	"userId" varchar(20),
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BlogPosts" (
	"blogPostId" varchar(20) PRIMARY KEY NOT NULL,
	"pathName" varchar NOT NULL,
	"previousPathNames" text[] DEFAULT '{}' NOT NULL,
	"titleDe" varchar NOT NULL,
	"titleEn" varchar DEFAULT '' NOT NULL,
	"descriptionDe" varchar NOT NULL,
	"descriptionEn" varchar DEFAULT '' NOT NULL,
	"headlineDe" varchar NOT NULL,
	"headlineEn" varchar DEFAULT '' NOT NULL,
	"subHeadlineDe" varchar NOT NULL,
	"subHeadlineEn" varchar DEFAULT '' NOT NULL,
	"heroImageFileUploadId" varchar(20),
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BookingRequestCooks" (
	"cookId" varchar(20) NOT NULL,
	"bookingRequestId" varchar(20) NOT NULL,
	"menuEvaluation" jsonb,
	"menuEvaluationLoading" boolean DEFAULT false NOT NULL,
	"declinationReason" varchar,
	"declinedAt" timestamp with time zone,
	"notifiedAt" timestamp with time zone,
	"firstOpenedAt" timestamp with time zone,
	CONSTRAINT "BookingRequestCooks_cookId_bookingRequestId_pk" PRIMARY KEY("cookId","bookingRequestId")
);
--> statement-breakpoint
CREATE TABLE "BookingRequestOfferCallRecordings" (
	"bookingRequestOfferCallRecordingId" varchar(20) PRIMARY KEY NOT NULL,
	"bookingRequestOfferCallRoomId" varchar(20) NOT NULL,
	"livekitEgressId" varchar,
	"objectKey" varchar NOT NULL,
	"mediaType" varchar,
	"byteSize" integer,
	"status" varchar DEFAULT 'PENDING' NOT NULL,
	"transcriptJson" jsonb,
	"transcriptText" text,
	"errorMessage" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"completedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "BookingRequestOfferCallRoomParticipants" (
	"bookingRequestOfferCallRoomParticipantId" varchar(20) PRIMARY KEY NOT NULL,
	"bookingRequestOfferCallRoomId" varchar(20) NOT NULL,
	"sessionId" varchar(20) NOT NULL,
	"userId" varchar(20) NOT NULL,
	"joinedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"leftAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "BookingRequestOfferCallRooms" (
	"bookingRequestOfferCallRoomId" varchar(20) PRIMARY KEY NOT NULL,
	"bookingRequestOfferId" varchar(20) NOT NULL,
	"livekitRoomName" varchar NOT NULL,
	"status" varchar DEFAULT 'ACTIVE' NOT NULL,
	"createdByUserId" varchar(20) NOT NULL,
	"startedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"endedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "BookingRequestOfferEventAttachments" (
	"bookingRequestOfferEventId" varchar(20) NOT NULL,
	"fileUploadId" varchar(20) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BookingRequestOfferEvents" (
	"bookingRequestOfferEventId" varchar(20) PRIMARY KEY NOT NULL,
	"bookingRequestOfferId" varchar(20) NOT NULL,
	"type" varchar NOT NULL,
	"payload" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BookingRequestOffers" (
	"bookingRequestOfferId" varchar(20) PRIMARY KEY NOT NULL,
	"bookingRequestId" varchar(20) NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"userAccepted" boolean,
	"cookAccepted" boolean,
	"userDeclinationReason" varchar,
	"cookDeclinationReason" varchar,
	"userUnreadNotificationCount" smallint DEFAULT 0 NOT NULL,
	"cookUnreadNotificationCount" smallint DEFAULT 0 NOT NULL,
	"adminChatReviewPendingCount" smallint DEFAULT 0 NOT NULL,
	"adminChatReviewedAt" timestamp with time zone,
	"isPriceAutoAdjusted" boolean,
	"userRequestedMenuAdjustments" boolean,
	"travelDistanceKm" double precision,
	"menuPriceCents" integer NOT NULL,
	"travelExpensesCents" integer NOT NULL,
	"paymentProviderFeeCents" integer NOT NULL,
	"platformFeePercentCook" smallint NOT NULL,
	"platformFeePercentCustomer" smallint NOT NULL,
	"platformFeeCentsCook" integer NOT NULL,
	"platformFeeCentsCustomer" integer NOT NULL,
	"payoutCentsCook" integer NOT NULL,
	"totalWithoutDiscountsCentsCustomer" integer NOT NULL,
	"totalCentsCustomer" integer,
	"configuredMenu" jsonb,
	"paymentData" jsonb,
	"paymentStatus" varchar DEFAULT 'EMPTY' NOT NULL,
	"plannedPaymentPullDateTime" timestamp with time zone,
	"paymentDateTime" timestamp with time zone,
	"plannedPayoutDateTime" timestamp with time zone,
	"payoutDateTime" timestamp with time zone,
	"testimonialMemoryNudgeJobId" varchar,
	"testimonialReminderMorningJobId" varchar,
	"testimonialReminderEveningJobId" varchar,
	"customerChatMessageNotifyJobId" varchar,
	"cookChatMessageNotifyJobId" varchar,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BookingRequestParticipants" (
	"bookingRequestParticipantId" varchar(20) PRIMARY KEY NOT NULL,
	"bookingRequestId" varchar(20) NOT NULL,
	"type" varchar NOT NULL,
	"name" varchar NOT NULL,
	"restrictions" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BookingRequests" (
	"bookingRequestId" varchar(20) PRIMARY KEY NOT NULL,
	"userId" varchar(20) NOT NULL,
	"occasion" varchar NOT NULL,
	"dateTime" timestamp with time zone NOT NULL,
	"exactEventAddress" jsonb NOT NULL,
	"priceClassType" varchar,
	"originalMessage" text NOT NULL,
	"adjustedMessage" text,
	"giftCardId" varchar(20),
	"promoCodeId" varchar(20),
	"expiresAt" timestamp with time zone,
	"canceledAt" timestamp with time zone,
	"cancellationReason" varchar,
	"publicationStatus" varchar NOT NULL,
	"preferences" jsonb NOT NULL,
	"invoiceAddress" jsonb,
	"references" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ChatMessageUserAttachments" (
	"chatMessageId" varchar(20) NOT NULL,
	"fileUploadId" varchar(20) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ChatMessages" (
	"chatMessageId" varchar(20) PRIMARY KEY NOT NULL,
	"chatTurnId" varchar(20) NOT NULL,
	"role" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"body" jsonb NOT NULL,
	"lastModifiedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ChatMessages_chatTurnId_role_unique" UNIQUE("chatTurnId","role")
);
--> statement-breakpoint
CREATE TABLE "ChatTurns" (
	"chatTurnId" varchar(20) PRIMARY KEY NOT NULL,
	"chatId" varchar(20) NOT NULL,
	"clientRequestId" varchar(20) NOT NULL,
	"sequence" integer GENERATED ALWAYS AS IDENTITY (sequence name "ChatTurns_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"status" varchar DEFAULT 'queued' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"locale" varchar,
	"agentName" varchar,
	"modelId" varchar,
	"finishReason" varchar,
	"usage" jsonb,
	"failureCode" varchar,
	"startedAt" timestamp with time zone,
	"completedAt" timestamp with time zone,
	"lastModifiedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ChatTurns_clientRequestId_unique" UNIQUE("clientRequestId")
);
--> statement-breakpoint
CREATE TABLE "Chats" (
	"chatId" varchar(20) PRIMARY KEY NOT NULL,
	"userId" varchar(20),
	"surface" varchar,
	"title" varchar DEFAULT '' NOT NULL,
	"deletedAt" timestamp with time zone,
	"lastModifiedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Cities" (
	"cityId" varchar(20) PRIMARY KEY NOT NULL,
	"nameDe" varchar NOT NULL,
	"nameEn" varchar DEFAULT '' NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"pathName" varchar NOT NULL,
	"previousPathNames" text[] DEFAULT '{}' NOT NULL,
	"titleDe" varchar NOT NULL,
	"titleEn" varchar DEFAULT '' NOT NULL,
	"descriptionDe" varchar NOT NULL,
	"descriptionEn" varchar DEFAULT '' NOT NULL,
	"headlineDe" varchar NOT NULL,
	"headlineEn" varchar DEFAULT '' NOT NULL,
	"subHeadlineDe" varchar NOT NULL,
	"subHeadlineEn" varchar DEFAULT '' NOT NULL,
	"heroImageFileUploadId" varchar(20),
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"firstSectionHeadlineDe" varchar DEFAULT '' NOT NULL,
	"firstSectionHeadlineEn" varchar DEFAULT '' NOT NULL,
	"firstSectionBodyDe" text DEFAULT '' NOT NULL,
	"firstSectionBodyEn" text DEFAULT '' NOT NULL,
	"firstSectionImageFileUploadId" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "CityCooks" (
	"cityId" varchar(20) NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CityTestimonials" (
	"cityId" varchar(20) NOT NULL,
	"testimonialType" varchar NOT NULL,
	"testimonialId" varchar(20) NOT NULL,
	"index" integer NOT NULL,
	CONSTRAINT "CityTestimonials_cityId_testimonialType_testimonialId_pk" PRIMARY KEY("cityId","testimonialType","testimonialId")
);
--> statement-breakpoint
CREATE TABLE "CookCallAvailabilityExceptions" (
	"cookCallAvailabilityExceptionId" varchar(20) PRIMARY KEY NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"date" date NOT NULL,
	"type" varchar NOT NULL,
	"startMinuteOfDay" integer,
	"endMinuteOfDay" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CookCallAvailabilityRules" (
	"cookCallAvailabilityRuleId" varchar(20) PRIMARY KEY NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"dayOfWeek" smallint NOT NULL,
	"startMinuteOfDay" integer NOT NULL,
	"endMinuteOfDay" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CookCallSlotBookings" (
	"cookCallSlotBookingId" varchar(20) PRIMARY KEY NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"userId" varchar(20) NOT NULL,
	"bookingRequestOfferId" varchar(20) NOT NULL,
	"startAt" timestamp with time zone NOT NULL,
	"endAt" timestamp with time zone NOT NULL,
	"status" varchar DEFAULT 'PENDING' NOT NULL,
	"initiator" varchar NOT NULL,
	"customerMessage" varchar,
	"cookMessage" varchar,
	"declineReason" varchar,
	"canceledBy" varchar,
	"canceledReason" varchar,
	"videoCallRoomId" varchar(20),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastModifiedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CookTestimonials" (
	"cookTestimonialId" varchar(20) PRIMARY KEY NOT NULL,
	"userId" varchar(20) NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"bookingRequestOfferId" varchar(20),
	"authorName" varchar,
	"location" varchar,
	"occasion" varchar,
	"body" text,
	"imageUrls" jsonb,
	"rating" smallint,
	"lowRatingAnswers" jsonb,
	"publicationStatus" varchar DEFAULT 'PUBLISHED' NOT NULL,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CookieSettings" (
	"sessionId" varchar(20) PRIMARY KEY NOT NULL,
	"googleAnalytics" boolean NOT NULL,
	"clarity" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Cooks" (
	"cookId" varchar(20) PRIMARY KEY NOT NULL,
	"isVisible" boolean DEFAULT false NOT NULL,
	"isApprovedByAdmin" boolean DEFAULT false NOT NULL,
	"stageName" varchar,
	"exactTravelOriginAddress" jsonb,
	"biography" text DEFAULT '' NOT NULL,
	"biographySummary" text DEFAULT '' NOT NULL,
	"logoFileUploadId" varchar(20),
	"cuisineStyle" varchar,
	"cookingPhilosophy" varchar,
	"travelExpensesAmount" integer DEFAULT 25 NOT NULL,
	"maximumTravelDistance" integer,
	"minimumPriceAmount" integer,
	"maximumPriceAmount" integer,
	"minimumParticipants" integer,
	"maximumParticipants" integer,
	"callSchedulingEnabled" boolean DEFAULT false NOT NULL,
	"callDurationMinutes" integer DEFAULT 30 NOT NULL,
	"stripeAccountId" varchar,
	"stripeAccountActive" boolean DEFAULT false NOT NULL,
	"stripeAccountActiveWasReset" boolean DEFAULT false NOT NULL,
	"legacyCityName" varchar,
	"legacyLatitude" double precision,
	"legacyLongitude" double precision,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastModifiedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CustomerTestimonials" (
	"customerTestimonialId" varchar(20) PRIMARY KEY NOT NULL,
	"userId" varchar(20) NOT NULL,
	"bookingRequestOfferId" varchar(20),
	"authorName" varchar,
	"location" varchar,
	"occasion" varchar,
	"body" text NOT NULL,
	"imageUrls" jsonb,
	"rating" smallint,
	"publicationStatus" varchar DEFAULT 'PUBLISHED' NOT NULL,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FeatureToggleUserOverrides" (
	"userId" varchar(20) NOT NULL,
	"featureToggleKey" varchar NOT NULL,
	"enabled" boolean NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "FeatureToggleUserOverrides_userId_featureToggleKey_pk" PRIMARY KEY("userId","featureToggleKey")
);
--> statement-breakpoint
CREATE TABLE "FeatureToggles" (
	"featureToggleKey" varchar PRIMARY KEY NOT NULL,
	"enabled" boolean NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "FileUploads" (
	"fileUploadId" varchar(20) PRIMARY KEY NOT NULL,
	"userId" varchar(20),
	"filename" varchar NOT NULL,
	"mediaType" varchar NOT NULL,
	"size" integer NOT NULL,
	"bytes" "bytea" NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "GiftCards" (
	"giftCardId" varchar(20) PRIMARY KEY NOT NULL,
	"sessionId" varchar(20) NOT NULL,
	"buyerUserId" varchar(20),
	"buyerEmail" varchar NOT NULL,
	"locale" varchar NOT NULL,
	"occasion" varchar NOT NULL,
	"recipientName" varchar NOT NULL,
	"message" varchar NOT NULL,
	"originalBalanceCents" integer NOT NULL,
	"balanceCents" integer NOT NULL,
	"redeemCode" varchar NOT NULL,
	"paymentIntentId" varchar NOT NULL,
	"paymentClientSecret" varchar NOT NULL,
	"paymentStatus" varchar DEFAULT 'PREPARED' NOT NULL,
	"invoiceAddress" jsonb,
	"invoiceFileUploadId" varchar(20),
	"voucherFileUploadId" varchar(20),
	"cleanupJobId" varchar,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Logs" (
	"logId" varchar(20) PRIMARY KEY NOT NULL,
	"sessionId" varchar(20),
	"level" varchar NOT NULL,
	"message" varchar NOT NULL,
	"context" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Meals" (
	"mealId" varchar(20) PRIMARY KEY NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"imageFileUploadId" varchar(20),
	"publishedAt" timestamp with time zone,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MenuCourseMealOptions" (
	"mealOptionId" varchar(20) PRIMARY KEY NOT NULL,
	"courseId" varchar(20) NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"mealId" varchar(20) NOT NULL,
	"index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MenuCourses" (
	"courseId" varchar(20) PRIMARY KEY NOT NULL,
	"menuId" varchar(20) NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"index" integer NOT NULL,
	"title" varchar NOT NULL,
	"mealSelectionLimit" integer
);
--> statement-breakpoint
CREATE TABLE "Menus" (
	"menuId" varchar(20) PRIMARY KEY NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"bookingRequestOfferId" varchar(20),
	"copyOfMenuId" varchar(20),
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"publishedAt" timestamp with time zone,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MigrationArchive" (
	"archiveId" varchar(20) PRIMARY KEY NOT NULL,
	"sourceTable" varchar NOT NULL,
	"sourceId" varchar NOT NULL,
	"payload" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "NewsletterSubscriptions" (
	"newsletterSubscriptionId" varchar(20) PRIMARY KEY NOT NULL,
	"emailAddress" varchar NOT NULL,
	"userId" varchar(20),
	"sessionId" varchar(20),
	"locale" varchar DEFAULT 'de' NOT NULL,
	"source" varchar NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OccasionCooks" (
	"occasionId" varchar(20) NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OccasionTestimonials" (
	"occasionId" varchar(20) NOT NULL,
	"testimonialType" varchar NOT NULL,
	"testimonialId" varchar(20) NOT NULL,
	"index" integer NOT NULL,
	CONSTRAINT "OccasionTestimonials_occasionId_testimonialType_testimonialId_pk" PRIMARY KEY("occasionId","testimonialType","testimonialId")
);
--> statement-breakpoint
CREATE TABLE "Occasions" (
	"occasionId" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"pathName" varchar NOT NULL,
	"previousPathNames" text[] DEFAULT '{}' NOT NULL,
	"titleDe" varchar NOT NULL,
	"titleEn" varchar DEFAULT '' NOT NULL,
	"descriptionDe" varchar NOT NULL,
	"descriptionEn" varchar DEFAULT '' NOT NULL,
	"headlineDe" varchar NOT NULL,
	"headlineEn" varchar DEFAULT '' NOT NULL,
	"subHeadlineDe" varchar NOT NULL,
	"subHeadlineEn" varchar DEFAULT '' NOT NULL,
	"heroImageFileUploadId" varchar(20),
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"firstSectionHeadlineDe" varchar DEFAULT '' NOT NULL,
	"firstSectionHeadlineEn" varchar DEFAULT '' NOT NULL,
	"firstSectionBodyDe" text DEFAULT '' NOT NULL,
	"firstSectionBodyEn" text DEFAULT '' NOT NULL,
	"firstSectionImageFileUploadId" varchar(20),
	"formatsSection" jsonb DEFAULT '{"titleDe":"","titleEn":"","subtitleDe":"","subtitleEn":"","cards":[{"imageFileUploadId":null,"titleDe":"","titleEn":"","bodyDe":"","bodyEn":"","fact1De":"","fact1En":"","fact2De":"","fact2En":"","fact3De":"","fact3En":""},{"imageFileUploadId":null,"titleDe":"","titleEn":"","bodyDe":"","bodyEn":"","fact1De":"","fact1En":"","fact2De":"","fact2En":"","fact3De":"","fact3En":""},{"imageFileUploadId":null,"titleDe":"","titleEn":"","bodyDe":"","bodyEn":"","fact1De":"","fact1En":"","fact2De":"","fact2En":"","fact3De":"","fact3En":""}]}'::jsonb NOT NULL,
	"promoCodeId" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "OutboundEmailAttachments" (
	"outboundEmailId" varchar(20) NOT NULL,
	"fileUploadId" varchar(20) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OutboundEmails" (
	"outboundEmailId" varchar(20) PRIMARY KEY NOT NULL,
	"provider" varchar NOT NULL,
	"providerMessageId" varchar,
	"purpose" varchar NOT NULL,
	"relatedEntityType" varchar,
	"relatedEntityId" varchar(20),
	"userId" varchar(20),
	"toEmail" varchar NOT NULL,
	"fromEmail" varchar,
	"subject" varchar NOT NULL,
	"locale" varchar NOT NULL,
	"failureReason" varchar,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"sentAt" timestamp with time zone,
	"failedAt" timestamp with time zone,
	"deliveredAt" timestamp with time zone,
	"deliveryDelayedAt" timestamp with time zone,
	"openedAt" timestamp with time zone,
	"clickedAt" timestamp with time zone,
	"bouncedAt" timestamp with time zone,
	"complainedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "OutboundWhatsAppMessages" (
	"outboundWhatsAppMessageId" varchar(20) PRIMARY KEY NOT NULL,
	"provider" varchar NOT NULL,
	"providerMessageId" varchar,
	"purpose" varchar NOT NULL,
	"relatedEntityType" varchar,
	"relatedEntityId" varchar(20),
	"userId" varchar(20),
	"toPhoneNumber" varchar NOT NULL,
	"templateName" varchar,
	"bodySnapshot" text NOT NULL,
	"locale" varchar NOT NULL,
	"whatsAppConversationId" varchar(20),
	"providerConversationId" varchar,
	"pricingCategory" varchar,
	"failureReason" varchar,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"sentAt" timestamp with time zone,
	"failedAt" timestamp with time zone,
	"deliveredAt" timestamp with time zone,
	"readAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "PartnerCooks" (
	"partnerId" varchar(20) NOT NULL,
	"cookId" varchar(20) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PartnerTestimonials" (
	"partnerId" varchar(20) NOT NULL,
	"testimonialType" varchar NOT NULL,
	"testimonialId" varchar(20) NOT NULL,
	"index" integer NOT NULL,
	CONSTRAINT "PartnerTestimonials_partnerId_testimonialType_testimonialId_pk" PRIMARY KEY("partnerId","testimonialType","testimonialId")
);
--> statement-breakpoint
CREATE TABLE "Partners" (
	"partnerId" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"pathName" varchar NOT NULL,
	"previousPathNames" text[] DEFAULT '{}' NOT NULL,
	"titleDe" varchar NOT NULL,
	"titleEn" varchar DEFAULT '' NOT NULL,
	"descriptionDe" varchar NOT NULL,
	"descriptionEn" varchar DEFAULT '' NOT NULL,
	"headlineDe" varchar NOT NULL,
	"headlineEn" varchar DEFAULT '' NOT NULL,
	"subHeadlineDe" varchar NOT NULL,
	"subHeadlineEn" varchar DEFAULT '' NOT NULL,
	"heroImageFileUploadId" varchar(20),
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"firstSectionHeadlineDe" varchar DEFAULT '' NOT NULL,
	"firstSectionHeadlineEn" varchar DEFAULT '' NOT NULL,
	"firstSectionBodyDe" text DEFAULT '' NOT NULL,
	"firstSectionBodyEn" text DEFAULT '' NOT NULL,
	"firstSectionImageFileUploadId" varchar(20),
	"promoCodeId" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "PromoCodes" (
	"promoCodeId" varchar(20) PRIMARY KEY NOT NULL,
	"redeemCode" varchar NOT NULL,
	"amountCents" integer NOT NULL,
	"minimumTotalAmountCustomerCents" integer,
	"bookingRequestId" varchar(20),
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SessionEvents" (
	"sessionEventId" varchar(20) PRIMARY KEY NOT NULL,
	"sessionId" varchar(20) NOT NULL,
	"type" varchar NOT NULL,
	"payload" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Sessions" (
	"sessionId" varchar(20) PRIMARY KEY NOT NULL,
	"userId" varchar(20),
	"previousSessionId" varchar(20),
	"lastInteractionAt" timestamp with time zone DEFAULT now() NOT NULL,
	"wasTerminatedAt" timestamp with time zone,
	"connectionActive" boolean DEFAULT false NOT NULL,
	"userAgent" varchar,
	"ipHash" varchar,
	"referrer" varchar,
	"landingPath" varchar,
	"geoInformation" jsonb,
	"isBot" boolean DEFAULT false NOT NULL,
	"giftCardPurchaseError" varchar,
	"pendingTotpUserId" varchar(20),
	"pendingTotpExpiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SupportRequestMessageAttachments" (
	"supportRequestMessageId" varchar(20) NOT NULL,
	"fileUploadId" varchar(20) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SupportRequestMessages" (
	"supportRequestMessageId" varchar(20) PRIMARY KEY NOT NULL,
	"supportRequestId" varchar(20) NOT NULL,
	"authorUserId" varchar(20) NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SupportRequests" (
	"supportRequestId" varchar(20) PRIMARY KEY NOT NULL,
	"userId" varchar(20) NOT NULL,
	"bookingRequestId" varchar(20),
	"subject" varchar NOT NULL,
	"status" varchar DEFAULT 'OPEN' NOT NULL,
	"userUnreadNotificationCount" smallint DEFAULT 0 NOT NULL,
	"adminUnreadNotificationCount" smallint DEFAULT 0 NOT NULL,
	"references" jsonb,
	"customerReplyNotifyJobId" varchar,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"resolvedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "Users" (
	"userId" varchar(20) PRIMARY KEY NOT NULL,
	"emailAddress" varchar,
	"previousEmailAddresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"firstName" varchar NOT NULL,
	"lastName" varchar NOT NULL,
	"status" varchar DEFAULT 'ACTIVE' NOT NULL,
	"phoneNumber" varchar,
	"legacyPasswordHash" varchar,
	"adminNote" text DEFAULT '' NOT NULL,
	"birthDate" date,
	"preferredCommunication" varchar,
	"locale" varchar DEFAULT 'de' NOT NULL,
	"timeZone" varchar DEFAULT 'Europe/Berlin' NOT NULL,
	"lastAcceptedPrivacyPolicy" timestamp with time zone,
	"lastAcceptedTerms" timestamp with time zone,
	"profilePictureFileUploadId" varchar(20),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WebPages" (
	"webPageKey" varchar PRIMARY KEY NOT NULL,
	"titleDe" varchar NOT NULL,
	"titleEn" varchar DEFAULT '' NOT NULL,
	"descriptionDe" varchar NOT NULL,
	"descriptionEn" varchar DEFAULT '' NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WhatsAppConversations" (
	"whatsAppConversationId" varchar(20) PRIMARY KEY NOT NULL,
	"phoneNumber" varchar NOT NULL,
	"displayName" varchar,
	"userId" varchar(20),
	"lastMessageAt" timestamp with time zone NOT NULL,
	"adminUnreadCount" smallint DEFAULT 0 NOT NULL,
	"customerServiceWindowExpiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WhatsAppMessageAttachments" (
	"whatsAppMessageId" varchar(20) NOT NULL,
	"fileUploadId" varchar(20) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WhatsAppMessages" (
	"whatsAppMessageId" varchar(20) PRIMARY KEY NOT NULL,
	"whatsAppConversationId" varchar(20) NOT NULL,
	"direction" varchar NOT NULL,
	"messageKind" varchar DEFAULT 'TEXT' NOT NULL,
	"body" text NOT NULL,
	"buttonPayload" varchar,
	"providerMessageId" varchar,
	"outboundWhatsAppMessageId" varchar(20),
	"sentByAdminUserId" varchar(20),
	"deliveredAt" timestamp with time zone,
	"readAt" timestamp with time zone,
	"failedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Admins" ADD CONSTRAINT "Admins_adminId_Users_userId_fk" FOREIGN KEY ("adminId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AiGenerations" ADD CONSTRAINT "AiGenerations_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AiGenerations" ADD CONSTRAINT "AiGenerations_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AuthEmailOtps" ADD CONSTRAINT "AuthEmailOtps_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AuthPasskeys" ADD CONSTRAINT "AuthPasskeys_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AuthTimeBasedOneTimePasswords" ADD CONSTRAINT "AuthTimeBasedOneTimePasswords_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AuthWebAuthnChallenges" ADD CONSTRAINT "AuthWebAuthnChallenges_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "AuthWebAuthnChallenges" ADD CONSTRAINT "AuthWebAuthnChallenges_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BlogPosts" ADD CONSTRAINT "BlogPosts_heroImageFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("heroImageFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestCooks" ADD CONSTRAINT "BookingRequestCooks_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestCooks" ADD CONSTRAINT "BookingRequestCooks_bookingRequestId_BookingRequests_bookingRequestId_fk" FOREIGN KEY ("bookingRequestId") REFERENCES "public"."BookingRequests"("bookingRequestId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestOfferCallRecordings" ADD CONSTRAINT "BookingRequestOfferCallRecordings_bookingRequestOfferCallRoomId_BookingRequestOfferCallRooms_bookingRequestOfferCallRoomId_fk" FOREIGN KEY ("bookingRequestOfferCallRoomId") REFERENCES "public"."BookingRequestOfferCallRooms"("bookingRequestOfferCallRoomId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestOfferCallRoomParticipants" ADD CONSTRAINT "BookingRequestOfferCallRoomParticipants_bookingRequestOfferCallRoomId_BookingRequestOfferCallRooms_bookingRequestOfferCallRoomId_fk" FOREIGN KEY ("bookingRequestOfferCallRoomId") REFERENCES "public"."BookingRequestOfferCallRooms"("bookingRequestOfferCallRoomId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestOfferCallRoomParticipants" ADD CONSTRAINT "BookingRequestOfferCallRoomParticipants_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestOfferCallRoomParticipants" ADD CONSTRAINT "BookingRequestOfferCallRoomParticipants_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestOfferCallRooms" ADD CONSTRAINT "BookingRequestOfferCallRooms_bookingRequestOfferId_BookingRequestOffers_bookingRequestOfferId_fk" FOREIGN KEY ("bookingRequestOfferId") REFERENCES "public"."BookingRequestOffers"("bookingRequestOfferId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestOfferCallRooms" ADD CONSTRAINT "BookingRequestOfferCallRooms_createdByUserId_Users_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestOfferEventAttachments" ADD CONSTRAINT "BookingRequestOfferEventAttachments_bookingRequestOfferEventId_BookingRequestOfferEvents_bookingRequestOfferEventId_fk" FOREIGN KEY ("bookingRequestOfferEventId") REFERENCES "public"."BookingRequestOfferEvents"("bookingRequestOfferEventId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestOfferEventAttachments" ADD CONSTRAINT "BookingRequestOfferEventAttachments_fileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("fileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestOfferEvents" ADD CONSTRAINT "BookingRequestOfferEvents_bookingRequestOfferId_BookingRequestOffers_bookingRequestOfferId_fk" FOREIGN KEY ("bookingRequestOfferId") REFERENCES "public"."BookingRequestOffers"("bookingRequestOfferId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestOffers" ADD CONSTRAINT "BookingRequestOffers_bookingRequestId_BookingRequests_bookingRequestId_fk" FOREIGN KEY ("bookingRequestId") REFERENCES "public"."BookingRequests"("bookingRequestId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestOffers" ADD CONSTRAINT "BookingRequestOffers_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequestParticipants" ADD CONSTRAINT "BookingRequestParticipants_bookingRequestId_BookingRequests_bookingRequestId_fk" FOREIGN KEY ("bookingRequestId") REFERENCES "public"."BookingRequests"("bookingRequestId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequests" ADD CONSTRAINT "BookingRequests_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequests" ADD CONSTRAINT "BookingRequests_giftCardId_GiftCards_giftCardId_fk" FOREIGN KEY ("giftCardId") REFERENCES "public"."GiftCards"("giftCardId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "BookingRequests" ADD CONSTRAINT "BookingRequests_promoCodeId_PromoCodes_promoCodeId_fk" FOREIGN KEY ("promoCodeId") REFERENCES "public"."PromoCodes"("promoCodeId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessageUserAttachments" ADD CONSTRAINT "ChatMessageUserAttachments_chatMessageId_ChatMessages_chatMessageId_fk" FOREIGN KEY ("chatMessageId") REFERENCES "public"."ChatMessages"("chatMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessageUserAttachments" ADD CONSTRAINT "ChatMessageUserAttachments_fileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("fileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatMessages" ADD CONSTRAINT "ChatMessages_chatTurnId_ChatTurns_chatTurnId_fk" FOREIGN KEY ("chatTurnId") REFERENCES "public"."ChatTurns"("chatTurnId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ChatTurns" ADD CONSTRAINT "ChatTurns_chatId_Chats_chatId_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chats"("chatId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Chats" ADD CONSTRAINT "Chats_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Cities" ADD CONSTRAINT "Cities_heroImageFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("heroImageFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Cities" ADD CONSTRAINT "Cities_firstSectionImageFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("firstSectionImageFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CityCooks" ADD CONSTRAINT "CityCooks_cityId_Cities_cityId_fk" FOREIGN KEY ("cityId") REFERENCES "public"."Cities"("cityId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CityCooks" ADD CONSTRAINT "CityCooks_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CityTestimonials" ADD CONSTRAINT "CityTestimonials_cityId_Cities_cityId_fk" FOREIGN KEY ("cityId") REFERENCES "public"."Cities"("cityId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookCallAvailabilityExceptions" ADD CONSTRAINT "CookCallAvailabilityExceptions_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookCallAvailabilityRules" ADD CONSTRAINT "CookCallAvailabilityRules_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookCallSlotBookings" ADD CONSTRAINT "CookCallSlotBookings_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookCallSlotBookings" ADD CONSTRAINT "CookCallSlotBookings_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookCallSlotBookings" ADD CONSTRAINT "CookCallSlotBookings_bookingRequestOfferId_BookingRequestOffers_bookingRequestOfferId_fk" FOREIGN KEY ("bookingRequestOfferId") REFERENCES "public"."BookingRequestOffers"("bookingRequestOfferId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookCallSlotBookings" ADD CONSTRAINT "CookCallSlotBookings_videoCallRoomId_BookingRequestOfferCallRooms_bookingRequestOfferCallRoomId_fk" FOREIGN KEY ("videoCallRoomId") REFERENCES "public"."BookingRequestOfferCallRooms"("bookingRequestOfferCallRoomId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookTestimonials" ADD CONSTRAINT "CookTestimonials_bookingRequestOfferId_BookingRequestOffers_bookingRequestOfferId_fk" FOREIGN KEY ("bookingRequestOfferId") REFERENCES "public"."BookingRequestOffers"("bookingRequestOfferId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookTestimonials" ADD CONSTRAINT "CookTestimonials_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookTestimonials" ADD CONSTRAINT "CookTestimonials_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CookieSettings" ADD CONSTRAINT "CookieSettings_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Cooks" ADD CONSTRAINT "Cooks_logoFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("logoFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Cooks" ADD CONSTRAINT "Cooks_cookId_Users_userId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CustomerTestimonials" ADD CONSTRAINT "CustomerTestimonials_bookingRequestOfferId_BookingRequestOffers_bookingRequestOfferId_fk" FOREIGN KEY ("bookingRequestOfferId") REFERENCES "public"."BookingRequestOffers"("bookingRequestOfferId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "CustomerTestimonials" ADD CONSTRAINT "CustomerTestimonials_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FeatureToggleUserOverrides" ADD CONSTRAINT "FeatureToggleUserOverrides_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "FileUploads" ADD CONSTRAINT "FileUploads_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GiftCards" ADD CONSTRAINT "GiftCards_invoiceFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("invoiceFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GiftCards" ADD CONSTRAINT "GiftCards_voucherFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("voucherFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GiftCards" ADD CONSTRAINT "GiftCards_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "GiftCards" ADD CONSTRAINT "GiftCards_buyerUserId_Users_userId_fk" FOREIGN KEY ("buyerUserId") REFERENCES "public"."Users"("userId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Meals" ADD CONSTRAINT "Meals_imageFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("imageFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Meals" ADD CONSTRAINT "Meals_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MenuCourseMealOptions" ADD CONSTRAINT "MenuCourseMealOptions_courseId_MenuCourses_courseId_fk" FOREIGN KEY ("courseId") REFERENCES "public"."MenuCourses"("courseId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MenuCourseMealOptions" ADD CONSTRAINT "MenuCourseMealOptions_mealId_Meals_mealId_fk" FOREIGN KEY ("mealId") REFERENCES "public"."Meals"("mealId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MenuCourseMealOptions" ADD CONSTRAINT "MenuCourseMealOptions_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MenuCourses" ADD CONSTRAINT "MenuCourses_menuId_Menus_menuId_fk" FOREIGN KEY ("menuId") REFERENCES "public"."Menus"("menuId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "MenuCourses" ADD CONSTRAINT "MenuCourses_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Menus" ADD CONSTRAINT "Menus_bookingRequestOfferId_BookingRequestOffers_bookingRequestOfferId_fk" FOREIGN KEY ("bookingRequestOfferId") REFERENCES "public"."BookingRequestOffers"("bookingRequestOfferId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Menus" ADD CONSTRAINT "Menus_copyOfMenuId_Menus_menuId_fk" FOREIGN KEY ("copyOfMenuId") REFERENCES "public"."Menus"("menuId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Menus" ADD CONSTRAINT "Menus_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "NewsletterSubscriptions" ADD CONSTRAINT "NewsletterSubscriptions_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "NewsletterSubscriptions" ADD CONSTRAINT "NewsletterSubscriptions_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OccasionCooks" ADD CONSTRAINT "OccasionCooks_occasionId_Occasions_occasionId_fk" FOREIGN KEY ("occasionId") REFERENCES "public"."Occasions"("occasionId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OccasionCooks" ADD CONSTRAINT "OccasionCooks_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OccasionTestimonials" ADD CONSTRAINT "OccasionTestimonials_occasionId_Occasions_occasionId_fk" FOREIGN KEY ("occasionId") REFERENCES "public"."Occasions"("occasionId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Occasions" ADD CONSTRAINT "Occasions_heroImageFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("heroImageFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Occasions" ADD CONSTRAINT "Occasions_firstSectionImageFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("firstSectionImageFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Occasions" ADD CONSTRAINT "Occasions_promoCodeId_PromoCodes_promoCodeId_fk" FOREIGN KEY ("promoCodeId") REFERENCES "public"."PromoCodes"("promoCodeId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OutboundEmailAttachments" ADD CONSTRAINT "OutboundEmailAttachments_outboundEmailId_OutboundEmails_outboundEmailId_fk" FOREIGN KEY ("outboundEmailId") REFERENCES "public"."OutboundEmails"("outboundEmailId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OutboundEmailAttachments" ADD CONSTRAINT "OutboundEmailAttachments_fileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("fileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OutboundEmails" ADD CONSTRAINT "OutboundEmails_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OutboundWhatsAppMessages" ADD CONSTRAINT "OutboundWhatsAppMessages_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OutboundWhatsAppMessages" ADD CONSTRAINT "OutboundWhatsAppMessages_whatsAppConversationId_WhatsAppConversations_whatsAppConversationId_fk" FOREIGN KEY ("whatsAppConversationId") REFERENCES "public"."WhatsAppConversations"("whatsAppConversationId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PartnerCooks" ADD CONSTRAINT "PartnerCooks_partnerId_Partners_partnerId_fk" FOREIGN KEY ("partnerId") REFERENCES "public"."Partners"("partnerId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PartnerCooks" ADD CONSTRAINT "PartnerCooks_cookId_Cooks_cookId_fk" FOREIGN KEY ("cookId") REFERENCES "public"."Cooks"("cookId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PartnerTestimonials" ADD CONSTRAINT "PartnerTestimonials_partnerId_Partners_partnerId_fk" FOREIGN KEY ("partnerId") REFERENCES "public"."Partners"("partnerId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Partners" ADD CONSTRAINT "Partners_heroImageFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("heroImageFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Partners" ADD CONSTRAINT "Partners_firstSectionImageFileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("firstSectionImageFileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Partners" ADD CONSTRAINT "Partners_promoCodeId_PromoCodes_promoCodeId_fk" FOREIGN KEY ("promoCodeId") REFERENCES "public"."PromoCodes"("promoCodeId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PromoCodes" ADD CONSTRAINT "PromoCodes_bookingRequestId_BookingRequests_bookingRequestId_fk" FOREIGN KEY ("bookingRequestId") REFERENCES "public"."BookingRequests"("bookingRequestId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SessionEvents" ADD CONSTRAINT "SessionEvents_sessionId_Sessions_sessionId_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."Sessions"("sessionId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_pendingTotpUserId_Users_userId_fk" FOREIGN KEY ("pendingTotpUserId") REFERENCES "public"."Users"("userId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SupportRequestMessageAttachments" ADD CONSTRAINT "SupportRequestMessageAttachments_supportRequestMessageId_SupportRequestMessages_supportRequestMessageId_fk" FOREIGN KEY ("supportRequestMessageId") REFERENCES "public"."SupportRequestMessages"("supportRequestMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SupportRequestMessageAttachments" ADD CONSTRAINT "SupportRequestMessageAttachments_fileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("fileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SupportRequestMessages" ADD CONSTRAINT "SupportRequestMessages_supportRequestId_SupportRequests_supportRequestId_fk" FOREIGN KEY ("supportRequestId") REFERENCES "public"."SupportRequests"("supportRequestId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SupportRequestMessages" ADD CONSTRAINT "SupportRequestMessages_authorUserId_Users_userId_fk" FOREIGN KEY ("authorUserId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SupportRequests" ADD CONSTRAINT "SupportRequests_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SupportRequests" ADD CONSTRAINT "SupportRequests_bookingRequestId_BookingRequests_bookingRequestId_fk" FOREIGN KEY ("bookingRequestId") REFERENCES "public"."BookingRequests"("bookingRequestId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WhatsAppConversations" ADD CONSTRAINT "WhatsAppConversations_userId_Users_userId_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("userId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WhatsAppMessageAttachments" ADD CONSTRAINT "WhatsAppMessageAttachments_whatsAppMessageId_WhatsAppMessages_whatsAppMessageId_fk" FOREIGN KEY ("whatsAppMessageId") REFERENCES "public"."WhatsAppMessages"("whatsAppMessageId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WhatsAppMessageAttachments" ADD CONSTRAINT "WhatsAppMessageAttachments_fileUploadId_FileUploads_fileUploadId_fk" FOREIGN KEY ("fileUploadId") REFERENCES "public"."FileUploads"("fileUploadId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WhatsAppMessages" ADD CONSTRAINT "WhatsAppMessages_whatsAppConversationId_WhatsAppConversations_whatsAppConversationId_fk" FOREIGN KEY ("whatsAppConversationId") REFERENCES "public"."WhatsAppConversations"("whatsAppConversationId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WhatsAppMessages" ADD CONSTRAINT "WhatsAppMessages_outboundWhatsAppMessageId_OutboundWhatsAppMessages_outboundWhatsAppMessageId_fk" FOREIGN KEY ("outboundWhatsAppMessageId") REFERENCES "public"."OutboundWhatsAppMessages"("outboundWhatsAppMessageId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "WhatsAppMessages" ADD CONSTRAINT "WhatsAppMessages_sentByAdminUserId_Users_userId_fk" FOREIGN KEY ("sentByAdminUserId") REFERENCES "public"."Users"("userId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "AiGenerations_createdAt_idx" ON "AiGenerations" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "AiGenerations_kind_createdAt_idx" ON "AiGenerations" USING btree ("kind","createdAt");--> statement-breakpoint
CREATE INDEX "AiGenerations_userId_createdAt_idx" ON "AiGenerations" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "AuthEmailOtps_sessionId_idx" ON "AuthEmailOtps" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "AuthEmailOtps_emailAddress_createdAt_idx" ON "AuthEmailOtps" USING btree ("emailAddress","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "AuthPasskeys_credentialId_uidx" ON "AuthPasskeys" USING btree ("credentialId");--> statement-breakpoint
CREATE INDEX "AuthPasskeys_userId_idx" ON "AuthPasskeys" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "AuthTimeBasedOneTimePasswords_userId_uidx" ON "AuthTimeBasedOneTimePasswords" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "AuthWebAuthnChallenges_challenge_uidx" ON "AuthWebAuthnChallenges" USING btree ("challenge");--> statement-breakpoint
CREATE INDEX "AuthWebAuthnChallenges_sessionId_idx" ON "AuthWebAuthnChallenges" USING btree ("sessionId");--> statement-breakpoint
CREATE UNIQUE INDEX "BlogPosts_pathName_uidx" ON "BlogPosts" USING btree ("pathName");--> statement-breakpoint
CREATE INDEX "BlogPosts_publishedAt_idx" ON "BlogPosts" USING btree ("publishedAt");--> statement-breakpoint
CREATE INDEX "BookingRequestCooks_bookingRequestId_idx" ON "BookingRequestCooks" USING btree ("bookingRequestId");--> statement-breakpoint
CREATE INDEX "BookingRequestCooks_notifiedAt_idx" ON "BookingRequestCooks" USING btree ("notifiedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "BookingRequestOfferCallRecordings_roomId_uidx" ON "BookingRequestOfferCallRecordings" USING btree ("bookingRequestOfferCallRoomId");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferCallRecordings_status_idx" ON "BookingRequestOfferCallRecordings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferCallRoomParticipants_roomId_idx" ON "BookingRequestOfferCallRoomParticipants" USING btree ("bookingRequestOfferCallRoomId");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferCallRoomParticipants_sessionId_idx" ON "BookingRequestOfferCallRoomParticipants" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferCallRooms_bookingRequestOfferId_idx" ON "BookingRequestOfferCallRooms" USING btree ("bookingRequestOfferId");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferCallRooms_status_idx" ON "BookingRequestOfferCallRooms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferCallRooms_startedAt_idx" ON "BookingRequestOfferCallRooms" USING btree ("startedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "BookingRequestOfferEventAttachments_pk" ON "BookingRequestOfferEventAttachments" USING btree ("bookingRequestOfferEventId","fileUploadId");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferEventAttachments_eventId_idx" ON "BookingRequestOfferEventAttachments" USING btree ("bookingRequestOfferEventId");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferEventAttachments_fileUploadId_idx" ON "BookingRequestOfferEventAttachments" USING btree ("fileUploadId");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferEvents_bookingRequestOfferId_idx" ON "BookingRequestOfferEvents" USING btree ("bookingRequestOfferId");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferEvents_createdAt_idx" ON "BookingRequestOfferEvents" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "BookingRequestOfferEvents_type_idx" ON "BookingRequestOfferEvents" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "BookingRequestOffers_bookingRequestId_cookId_uidx" ON "BookingRequestOffers" USING btree ("bookingRequestId","cookId");--> statement-breakpoint
CREATE UNIQUE INDEX "BookingRequestOffers_oneAccepted_uidx" ON "BookingRequestOffers" USING btree ("bookingRequestId") WHERE "BookingRequestOffers"."userAccepted" = true AND "BookingRequestOffers"."cookAccepted" = true;--> statement-breakpoint
CREATE INDEX "BookingRequestOffers_bookingRequestId_idx" ON "BookingRequestOffers" USING btree ("bookingRequestId");--> statement-breakpoint
CREATE INDEX "BookingRequestOffers_cookId_idx" ON "BookingRequestOffers" USING btree ("cookId");--> statement-breakpoint
CREATE INDEX "BookingRequestOffers_paymentStatus_idx" ON "BookingRequestOffers" USING btree ("paymentStatus");--> statement-breakpoint
CREATE INDEX "BookingRequestOffers_createdAt_idx" ON "BookingRequestOffers" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "BookingRequestOffers_adminChatReviewPendingCount_idx" ON "BookingRequestOffers" USING btree ("adminChatReviewPendingCount");--> statement-breakpoint
CREATE INDEX "BookingRequestParticipants_bookingRequestId_idx" ON "BookingRequestParticipants" USING btree ("bookingRequestId");--> statement-breakpoint
CREATE INDEX "BookingRequests_userId_idx" ON "BookingRequests" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "BookingRequests_dateTime_idx" ON "BookingRequests" USING btree ("dateTime");--> statement-breakpoint
CREATE INDEX "BookingRequests_publicationStatus_idx" ON "BookingRequests" USING btree ("publicationStatus");--> statement-breakpoint
CREATE INDEX "BookingRequests_expiresAt_idx" ON "BookingRequests" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "BookingRequests_canceledAt_idx" ON "BookingRequests" USING btree ("canceledAt");--> statement-breakpoint
CREATE INDEX "BookingRequests_giftCardId_idx" ON "BookingRequests" USING btree ("giftCardId");--> statement-breakpoint
CREATE INDEX "BookingRequests_promoCodeId_idx" ON "BookingRequests" USING btree ("promoCodeId");--> statement-breakpoint
CREATE UNIQUE INDEX "ChatMessageUserAttachments_pk" ON "ChatMessageUserAttachments" USING btree ("chatMessageId","fileUploadId");--> statement-breakpoint
CREATE INDEX "ChatMessageUserAttachments_chatMessageId_idx" ON "ChatMessageUserAttachments" USING btree ("chatMessageId");--> statement-breakpoint
CREATE INDEX "ChatMessages_chatTurnId_idx" ON "ChatMessages" USING btree ("chatTurnId");--> statement-breakpoint
CREATE INDEX "ChatTurns_chatId_sequence_idx" ON "ChatTurns" USING btree ("chatId","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "ChatTurns_chatId_active_unique" ON "ChatTurns" USING btree ("chatId") WHERE "ChatTurns"."status" in ('queued', 'running', 'awaitingInput');--> statement-breakpoint
CREATE INDEX "Chats_userId_lastModifiedAt_idx" ON "Chats" USING btree ("userId","lastModifiedAt");--> statement-breakpoint
CREATE INDEX "Chats_userId_surface_lastModifiedAt_idx" ON "Chats" USING btree ("userId","surface","lastModifiedAt");--> statement-breakpoint
CREATE INDEX "Chats_deletedAt_idx" ON "Chats" USING btree ("deletedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "Cities_pathName_uidx" ON "Cities" USING btree ("pathName");--> statement-breakpoint
CREATE INDEX "Cities_publishedAt_idx" ON "Cities" USING btree ("publishedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "CityCooks_pk" ON "CityCooks" USING btree ("cityId","cookId");--> statement-breakpoint
CREATE INDEX "CityCooks_cityId_idx" ON "CityCooks" USING btree ("cityId");--> statement-breakpoint
CREATE INDEX "CityTestimonials_cityId_idx" ON "CityTestimonials" USING btree ("cityId");--> statement-breakpoint
CREATE INDEX "CookCallAvailabilityExceptions_cookId_idx" ON "CookCallAvailabilityExceptions" USING btree ("cookId");--> statement-breakpoint
CREATE INDEX "CookCallAvailabilityExceptions_cookId_date_idx" ON "CookCallAvailabilityExceptions" USING btree ("cookId","date");--> statement-breakpoint
CREATE INDEX "CookCallAvailabilityRules_cookId_idx" ON "CookCallAvailabilityRules" USING btree ("cookId");--> statement-breakpoint
CREATE INDEX "CookCallSlotBookings_cookId_idx" ON "CookCallSlotBookings" USING btree ("cookId");--> statement-breakpoint
CREATE INDEX "CookCallSlotBookings_userId_idx" ON "CookCallSlotBookings" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "CookCallSlotBookings_bookingRequestOfferId_idx" ON "CookCallSlotBookings" USING btree ("bookingRequestOfferId");--> statement-breakpoint
CREATE INDEX "CookCallSlotBookings_startAt_idx" ON "CookCallSlotBookings" USING btree ("startAt");--> statement-breakpoint
CREATE INDEX "CookCallSlotBookings_status_idx" ON "CookCallSlotBookings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "CookTestimonials_bookingRequestOfferId_uidx" ON "CookTestimonials" USING btree ("bookingRequestOfferId");--> statement-breakpoint
CREATE INDEX "CookTestimonials_cookId_idx" ON "CookTestimonials" USING btree ("cookId");--> statement-breakpoint
CREATE INDEX "CookTestimonials_publicationStatus_idx" ON "CookTestimonials" USING btree ("publicationStatus");--> statement-breakpoint
CREATE INDEX "CookTestimonials_createdAt_idx" ON "CookTestimonials" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Cooks_isApprovedByAdmin_idx" ON "Cooks" USING btree ("isApprovedByAdmin");--> statement-breakpoint
CREATE INDEX "Cooks_logoFileUploadId_idx" ON "Cooks" USING btree ("logoFileUploadId");--> statement-breakpoint
CREATE UNIQUE INDEX "CustomerTestimonials_bookingRequestOfferId_uidx" ON "CustomerTestimonials" USING btree ("bookingRequestOfferId");--> statement-breakpoint
CREATE INDEX "CustomerTestimonials_userId_idx" ON "CustomerTestimonials" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "CustomerTestimonials_publicationStatus_idx" ON "CustomerTestimonials" USING btree ("publicationStatus");--> statement-breakpoint
CREATE INDEX "CustomerTestimonials_createdAt_idx" ON "CustomerTestimonials" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "FeatureToggleUserOverrides_featureToggleKey_idx" ON "FeatureToggleUserOverrides" USING btree ("featureToggleKey");--> statement-breakpoint
CREATE INDEX "FileUploads_userId_idx" ON "FileUploads" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "GiftCards_redeemCode_uidx" ON "GiftCards" USING btree ("redeemCode");--> statement-breakpoint
CREATE UNIQUE INDEX "GiftCards_sessionId_prepared_uidx" ON "GiftCards" USING btree ("sessionId") WHERE "GiftCards"."paymentStatus" = 'PREPARED';--> statement-breakpoint
CREATE INDEX "GiftCards_sessionId_idx" ON "GiftCards" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "GiftCards_buyerUserId_idx" ON "GiftCards" USING btree ("buyerUserId");--> statement-breakpoint
CREATE INDEX "GiftCards_paymentStatus_idx" ON "GiftCards" USING btree ("paymentStatus");--> statement-breakpoint
CREATE INDEX "GiftCards_createdAt_idx" ON "GiftCards" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "GiftCards_invoiceFileUploadId_idx" ON "GiftCards" USING btree ("invoiceFileUploadId");--> statement-breakpoint
CREATE INDEX "GiftCards_voucherFileUploadId_idx" ON "GiftCards" USING btree ("voucherFileUploadId");--> statement-breakpoint
CREATE INDEX "Meals_cookId_idx" ON "Meals" USING btree ("cookId");--> statement-breakpoint
CREATE INDEX "Meals_publishedAt_idx" ON "Meals" USING btree ("publishedAt");--> statement-breakpoint
CREATE INDEX "Meals_deletedAt_idx" ON "Meals" USING btree ("deletedAt");--> statement-breakpoint
CREATE INDEX "MenuCourseMealOptions_courseId_idx" ON "MenuCourseMealOptions" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX "MenuCourseMealOptions_mealId_idx" ON "MenuCourseMealOptions" USING btree ("mealId");--> statement-breakpoint
CREATE INDEX "MenuCourseMealOptions_cookId_idx" ON "MenuCourseMealOptions" USING btree ("cookId");--> statement-breakpoint
CREATE INDEX "MenuCourses_menuId_idx" ON "MenuCourses" USING btree ("menuId");--> statement-breakpoint
CREATE INDEX "MenuCourses_cookId_idx" ON "MenuCourses" USING btree ("cookId");--> statement-breakpoint
CREATE INDEX "Menus_cookId_idx" ON "Menus" USING btree ("cookId");--> statement-breakpoint
CREATE INDEX "Menus_publishedAt_idx" ON "Menus" USING btree ("publishedAt");--> statement-breakpoint
CREATE INDEX "Menus_deletedAt_idx" ON "Menus" USING btree ("deletedAt");--> statement-breakpoint
CREATE INDEX "Menus_bookingRequestOfferId_idx" ON "Menus" USING btree ("bookingRequestOfferId");--> statement-breakpoint
CREATE INDEX "Menus_copyOfMenuId_idx" ON "Menus" USING btree ("copyOfMenuId");--> statement-breakpoint
CREATE INDEX "MigrationArchive_sourceTable_sourceId_idx" ON "MigrationArchive" USING btree ("sourceTable","sourceId");--> statement-breakpoint
CREATE INDEX "MigrationArchive_createdAt_idx" ON "MigrationArchive" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "NewsletterSubscriptions_emailAddress_uidx" ON "NewsletterSubscriptions" USING btree ("emailAddress");--> statement-breakpoint
CREATE INDEX "NewsletterSubscriptions_userId_idx" ON "NewsletterSubscriptions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "NewsletterSubscriptions_sessionId_idx" ON "NewsletterSubscriptions" USING btree ("sessionId");--> statement-breakpoint
CREATE UNIQUE INDEX "OccasionCooks_pk" ON "OccasionCooks" USING btree ("occasionId","cookId");--> statement-breakpoint
CREATE INDEX "OccasionCooks_occasionId_idx" ON "OccasionCooks" USING btree ("occasionId");--> statement-breakpoint
CREATE INDEX "OccasionTestimonials_occasionId_idx" ON "OccasionTestimonials" USING btree ("occasionId");--> statement-breakpoint
CREATE UNIQUE INDEX "Occasions_pathName_uidx" ON "Occasions" USING btree ("pathName");--> statement-breakpoint
CREATE INDEX "Occasions_publishedAt_idx" ON "Occasions" USING btree ("publishedAt");--> statement-breakpoint
CREATE INDEX "Occasions_promoCodeId_idx" ON "Occasions" USING btree ("promoCodeId");--> statement-breakpoint
CREATE UNIQUE INDEX "OutboundEmailAttachments_pk" ON "OutboundEmailAttachments" USING btree ("outboundEmailId","fileUploadId");--> statement-breakpoint
CREATE INDEX "OutboundEmailAttachments_outboundEmailId_idx" ON "OutboundEmailAttachments" USING btree ("outboundEmailId");--> statement-breakpoint
CREATE INDEX "OutboundEmailAttachments_fileUploadId_idx" ON "OutboundEmailAttachments" USING btree ("fileUploadId");--> statement-breakpoint
CREATE UNIQUE INDEX "OutboundEmails_providerMessageId_uidx" ON "OutboundEmails" USING btree ("providerMessageId");--> statement-breakpoint
CREATE INDEX "OutboundEmails_relatedEntity_idx" ON "OutboundEmails" USING btree ("relatedEntityType","relatedEntityId");--> statement-breakpoint
CREATE INDEX "OutboundEmails_userId_createdAt_idx" ON "OutboundEmails" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "OutboundEmails_toEmail_idx" ON "OutboundEmails" USING btree ("toEmail");--> statement-breakpoint
CREATE INDEX "OutboundEmails_createdAt_idx" ON "OutboundEmails" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "OutboundEmails_purpose_idx" ON "OutboundEmails" USING btree ("purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "OutboundWhatsAppMessages_providerMessageId_uidx" ON "OutboundWhatsAppMessages" USING btree ("providerMessageId");--> statement-breakpoint
CREATE INDEX "OutboundWhatsAppMessages_relatedEntity_idx" ON "OutboundWhatsAppMessages" USING btree ("relatedEntityType","relatedEntityId");--> statement-breakpoint
CREATE INDEX "OutboundWhatsAppMessages_userId_createdAt_idx" ON "OutboundWhatsAppMessages" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "OutboundWhatsAppMessages_toPhoneNumber_idx" ON "OutboundWhatsAppMessages" USING btree ("toPhoneNumber");--> statement-breakpoint
CREATE INDEX "OutboundWhatsAppMessages_createdAt_idx" ON "OutboundWhatsAppMessages" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "OutboundWhatsAppMessages_purpose_idx" ON "OutboundWhatsAppMessages" USING btree ("purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "PartnerCooks_pk" ON "PartnerCooks" USING btree ("partnerId","cookId");--> statement-breakpoint
CREATE INDEX "PartnerCooks_partnerId_idx" ON "PartnerCooks" USING btree ("partnerId");--> statement-breakpoint
CREATE INDEX "PartnerTestimonials_partnerId_idx" ON "PartnerTestimonials" USING btree ("partnerId");--> statement-breakpoint
CREATE UNIQUE INDEX "Partners_pathName_uidx" ON "Partners" USING btree ("pathName");--> statement-breakpoint
CREATE INDEX "Partners_publishedAt_idx" ON "Partners" USING btree ("publishedAt");--> statement-breakpoint
CREATE INDEX "Partners_promoCodeId_idx" ON "Partners" USING btree ("promoCodeId");--> statement-breakpoint
CREATE UNIQUE INDEX "PromoCodes_redeemCode_uidx" ON "PromoCodes" USING btree ("redeemCode");--> statement-breakpoint
CREATE UNIQUE INDEX "PromoCodes_bookingRequestId_uidx" ON "PromoCodes" USING btree ("bookingRequestId");--> statement-breakpoint
CREATE INDEX "PromoCodes_createdAt_idx" ON "PromoCodes" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "PromoCodes_expiresAt_idx" ON "PromoCodes" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "SessionEvents_sessionId_createdAt_idx" ON "SessionEvents" USING btree ("sessionId","createdAt");--> statement-breakpoint
CREATE INDEX "SessionEvents_type_createdAt_idx" ON "SessionEvents" USING btree ("type","createdAt");--> statement-breakpoint
CREATE INDEX "Sessions_ipHash_idx" ON "Sessions" USING btree ("ipHash");--> statement-breakpoint
CREATE INDEX "Sessions_createdAt_idx" ON "Sessions" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Sessions_pendingTotpUserId_idx" ON "Sessions" USING btree ("pendingTotpUserId");--> statement-breakpoint
CREATE UNIQUE INDEX "SupportRequestMessageAttachments_pk" ON "SupportRequestMessageAttachments" USING btree ("supportRequestMessageId","fileUploadId");--> statement-breakpoint
CREATE INDEX "SupportRequestMessageAttachments_messageId_idx" ON "SupportRequestMessageAttachments" USING btree ("supportRequestMessageId");--> statement-breakpoint
CREATE INDEX "SupportRequestMessageAttachments_fileUploadId_idx" ON "SupportRequestMessageAttachments" USING btree ("fileUploadId");--> statement-breakpoint
CREATE INDEX "SupportRequestMessages_supportRequestId_createdAt_idx" ON "SupportRequestMessages" USING btree ("supportRequestId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "SupportRequests_bookingRequestId_uidx" ON "SupportRequests" USING btree ("bookingRequestId") WHERE "SupportRequests"."bookingRequestId" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "SupportRequests_userId_idx" ON "SupportRequests" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "SupportRequests_status_idx" ON "SupportRequests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "SupportRequests_adminUnreadNotificationCount_idx" ON "SupportRequests" USING btree ("adminUnreadNotificationCount");--> statement-breakpoint
CREATE INDEX "SupportRequests_createdAt_idx" ON "SupportRequests" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "Users_emailAddress_uidx" ON "Users" USING btree ("emailAddress");--> statement-breakpoint
CREATE UNIQUE INDEX "Users_phoneNumber_uidx" ON "Users" USING btree ("phoneNumber");--> statement-breakpoint
CREATE INDEX "Users_profilePictureFileUploadId_idx" ON "Users" USING btree ("profilePictureFileUploadId");--> statement-breakpoint
CREATE UNIQUE INDEX "WhatsAppConversations_phoneNumber_uidx" ON "WhatsAppConversations" USING btree ("phoneNumber");--> statement-breakpoint
CREATE INDEX "WhatsAppConversations_userId_idx" ON "WhatsAppConversations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "WhatsAppConversations_lastMessageAt_idx" ON "WhatsAppConversations" USING btree ("lastMessageAt");--> statement-breakpoint
CREATE INDEX "WhatsAppConversations_adminUnreadCount_idx" ON "WhatsAppConversations" USING btree ("adminUnreadCount");--> statement-breakpoint
CREATE UNIQUE INDEX "WhatsAppMessageAttachments_pk" ON "WhatsAppMessageAttachments" USING btree ("whatsAppMessageId","fileUploadId");--> statement-breakpoint
CREATE INDEX "WhatsAppMessageAttachments_messageId_idx" ON "WhatsAppMessageAttachments" USING btree ("whatsAppMessageId");--> statement-breakpoint
CREATE INDEX "WhatsAppMessageAttachments_fileUploadId_idx" ON "WhatsAppMessageAttachments" USING btree ("fileUploadId");--> statement-breakpoint
CREATE UNIQUE INDEX "WhatsAppMessages_providerMessageId_uidx" ON "WhatsAppMessages" USING btree ("providerMessageId");--> statement-breakpoint
CREATE INDEX "WhatsAppMessages_whatsAppConversationId_createdAt_idx" ON "WhatsAppMessages" USING btree ("whatsAppConversationId","createdAt");--> statement-breakpoint
CREATE INDEX "WhatsAppMessages_outboundWhatsAppMessageId_idx" ON "WhatsAppMessages" USING btree ("outboundWhatsAppMessageId");