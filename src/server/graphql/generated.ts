import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import * as z from 'zod';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: { input: string; output: string };
    String: { input: string; output: string };
    Boolean: { input: boolean; output: boolean };
    Int: { input: number; output: number };
    Float: { input: number; output: number };
    Date: { input: string; output: string };
    DateTime: { input: Date; output: Date };
    EmailAddress: { input: string; output: string };
    JSON: { input: unknown; output: unknown };
    Latitude: { input: number; output: number };
    Longitude: { input: number; output: number };
    PhoneNumber: { input: string; output: string };
    TimeZone: { input: string; output: string };
};

export interface GqlSAdmin {
    __typename?: 'Admin';
    adminId: Scalars['ID']['output'];
    aiGeneration?: Maybe<GqlSAdminAiGeneration>;
    aiGenerationCounts: Array<Scalars['Int']['output']>;
    aiGenerationCreations: Array<GqlSAdminTimeBucket>;
    aiGenerations: Array<GqlSAdminAiGeneration>;
    assistantChat?: Maybe<GqlSAdminAssistantChat>;
    assistantChatCreations: Array<GqlSAdminTimeBucket>;
    assistantChats: Array<GqlSAdminAssistantChat>;
    assistantChatsCounts: Array<Scalars['Int']['output']>;
    blogPost?: Maybe<GqlSAdminBlogPost>;
    blogPosts: Array<GqlSAdminBlogPost>;
    bookingRequest?: Maybe<GqlSAdminBookingRequest>;
    bookingRequestAverageParticipants: Scalars['Int']['output'];
    bookingRequestCheckoutFlow: GqlSAdminAnalyticsSessionFunnelFlow;
    bookingRequestCookOfferStats: Array<GqlSAdminBookingRequestCookOfferStat>;
    bookingRequestCreationMonthStats: Array<GqlSAdminBookingRequestCreationMonthStat>;
    bookingRequestCreations: Array<GqlSAdminTimeBucket>;
    bookingRequestFormFlow: GqlSAdminAnalyticsBookingRequestFormFlow;
    bookingRequestOccasionStats: Array<GqlSAdminBookingRequestOccasionStat>;
    bookingRequestOffer?: Maybe<GqlSAdminBookingRequestOffer>;
    bookingRequestOfferEconomics: GqlSAdminBookingRequestOfferEconomics;
    bookingRequestOffers: Array<GqlSAdminBookingRequestOffer>;
    bookingRequestOffersCounts: Array<Scalars['Int']['output']>;
    bookingRequests: Array<GqlSAdminBookingRequest>;
    bookingRequestsCounts: Array<Scalars['Int']['output']>;
    call?: Maybe<GqlSAdminCall>;
    callCookStats: Array<GqlSAdminCallCookStat>;
    callRoomCreations: Array<GqlSAdminTimeBucket>;
    callSlotCreations: Array<GqlSAdminTimeBucket>;
    callTraffic: Array<GqlSAdminCallListItem>;
    callTrafficCounts: Array<Scalars['Int']['output']>;
    calls: Array<GqlSAdminCallListItem>;
    chefSignUpFlow: GqlSAdminAnalyticsSessionFunnelFlow;
    cities: Array<GqlSAdminCity>;
    city?: Maybe<GqlSAdminCity>;
    cookBookingRequestOfferFlow: GqlSAdminAnalyticsCookBookingRequestOfferFlow;
    cookMeal?: Maybe<GqlSAdminCookMeal>;
    cookMeals: Array<GqlSAdminCookMeal>;
    cookMealsCounts: Array<Scalars['Int']['output']>;
    cookMenu?: Maybe<GqlSAdminCookMenu>;
    cookMenus: Array<GqlSAdminCookMenu>;
    cookMenusCounts: Array<Scalars['Int']['output']>;
    cookTestimonial?: Maybe<GqlSAdminCookTestimonial>;
    cookTestimonials: Array<GqlSAdminCookTestimonial>;
    cooksInTravelRadius: Array<GqlSAdminCookInTravelRadiusPreview>;
    customerTestimonial?: Maybe<GqlSAdminCustomerTestimonial>;
    customerTestimonials: Array<GqlSAdminCustomerTestimonial>;
    databaseSlowStatements: Array<GqlSAdminDatabaseSlowStatement>;
    featureToggles: Array<GqlSAdminFeatureToggle>;
    giftCard?: Maybe<GqlSAdminGiftCard>;
    giftCardCreations: Array<GqlSAdminTimeBucket>;
    giftCardFlow: GqlSAdminAnalyticsSessionFunnelFlow;
    giftCardOccasionStats: Array<GqlSAdminGiftCardOccasionStat>;
    giftCardPaidPurchaseAverageCents: Scalars['Int']['output'];
    giftCardSalesMonthStats: Array<GqlSAdminGiftCardSalesMonthStat>;
    giftCards: Array<GqlSAdminGiftCard>;
    giftCardsCounts: Array<Scalars['Int']['output']>;
    legalImprints: Array<GqlSAdminLegalImprint>;
    legalPrivacyPolicies: Array<GqlSAdminLegalPrivacyPolicy>;
    legalTermsAndConditions: Array<GqlSAdminLegalTermsAndConditions>;
    log?: Maybe<GqlSAdminLog>;
    logCounts: Array<Scalars['Int']['output']>;
    logCreations: Array<GqlSAdminTimeBucket>;
    logs: Array<GqlSAdminLog>;
    objectStorageObjects: GqlSAdminObjectStorageObjectPage;
    occasion?: Maybe<GqlSAdminOccasion>;
    occasions: Array<GqlSAdminOccasion>;
    outboundEmail?: Maybe<GqlSAdminOutboundEmail>;
    outboundEmailCreations: Array<GqlSAdminTimeBucket>;
    outboundEmailPurposeStats: Array<GqlSAdminOutboundEmailPurposeStat>;
    outboundEmailRecipientStats: Array<GqlSAdminOutboundEmailRecipientStat>;
    outboundEmails: Array<GqlSAdminOutboundEmail>;
    outboundEmailsCounts: Array<Scalars['Int']['output']>;
    partner?: Maybe<GqlSAdminPartner>;
    partners: Array<GqlSAdminPartner>;
    promoCode?: Maybe<GqlSAdminPromoCode>;
    promoCodes: Array<GqlSAdminPromoCode>;
    promoCodesCounts: Array<Scalars['Int']['output']>;
    queuedJobs: Array<GqlSAdminQueuedJob>;
    resendUsage?: Maybe<GqlSAdminResendUsage>;
    session?: Maybe<GqlSAdminSession>;
    sessionCounts: Array<Scalars['Int']['output']>;
    sessionCreations: Array<GqlSAdminTimeBucket>;
    sessionEventWebPageVisitCreations: Array<GqlSAdminTimeBucket>;
    sessionEvents: Array<GqlSAdminSessionEvent>;
    sessionEventsCounts: Array<Scalars['Int']['output']>;
    sessions: Array<GqlSAdminSession>;
    supportRequest?: Maybe<GqlSAdminSupportRequest>;
    supportRequests: Array<GqlSAdminSupportRequest>;
    supportRequestsCounts: Array<Scalars['Int']['output']>;
    upcomingBirthdays: Array<GqlSAdminUserUpcomingBirthday>;
    user?: Maybe<GqlSAdminUser>;
    userCounts: Array<Scalars['Int']['output']>;
    userInsights: GqlSAdminUserInsights;
    userRegistrations: Array<GqlSAdminTimeBucket>;
    users: Array<GqlSAdminUser>;
    webPage: GqlSAdminWebPage;
    webPages: Array<GqlSAdminWebPage>;
    whatsAppConversation?: Maybe<GqlSAdminWhatsAppConversation>;
    whatsAppConversations: Array<GqlSAdminWhatsAppConversation>;
    whatsAppConversationsAdminUnreadCount: Scalars['Int']['output'];
    whatsAppConversationsCounts: Array<Scalars['Int']['output']>;
}

export type GqlSAdminAiGenerationArgs = {
    aiGenerationId: Scalars['ID']['input'];
};

export type GqlSAdminAiGenerationCountsArgs = {
    criteria: Array<GqlSAdminAiGenerationCriterion>;
};

export type GqlSAdminAiGenerationCreationsArgs = {
    granularity?: GqlSAdminTimeBucketGranularity;
    range: GqlSDateTimeRange;
};

export type GqlSAdminAiGenerationsArgs = {
    criterion: GqlSAdminAiGenerationCriterion;
};

export type GqlSAdminAssistantChatArgs = {
    chatId: Scalars['ID']['input'];
};

export type GqlSAdminAssistantChatCreationsArgs = {
    granularity?: GqlSAdminTimeBucketGranularity;
    range: GqlSDateTimeRange;
};

export type GqlSAdminAssistantChatsArgs = {
    criterion: GqlSAdminAssistantChatCriterion;
};

export type GqlSAdminAssistantChatsCountsArgs = {
    criteria: Array<GqlSAdminAssistantChatCriterion>;
};

export type GqlSAdminBlogPostArgs = {
    blogPostId: Scalars['ID']['input'];
};

export type GqlSAdminBookingRequestArgs = {
    bookingRequestId: Scalars['ID']['input'];
};

export type GqlSAdminBookingRequestCheckoutFlowArgs = {
    range: GqlSDateTimeRange;
};

export type GqlSAdminBookingRequestCookOfferStatsArgs = {
    sortBy?: GqlSAdminBookingRequestCookOfferStatSortField;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminBookingRequestCreationMonthStatsArgs = {
    range?: InputMaybe<GqlSDateTimeRange>;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminBookingRequestCreationsArgs = {
    granularity?: GqlSAdminTimeBucketGranularity;
    range: GqlSDateTimeRange;
};

export type GqlSAdminBookingRequestFormFlowArgs = {
    range: GqlSDateTimeRange;
};

export type GqlSAdminBookingRequestOccasionStatsArgs = {
    range?: InputMaybe<GqlSDateTimeRange>;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminBookingRequestOfferArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSAdminBookingRequestOfferEconomicsArgs = {
    range?: InputMaybe<GqlSDateTimeRange>;
};

export type GqlSAdminBookingRequestOffersArgs = {
    criterion: GqlSAdminBookingRequestOfferCriterion;
};

export type GqlSAdminBookingRequestOffersCountsArgs = {
    criteria: Array<GqlSAdminBookingRequestOfferCriterion>;
};

export type GqlSAdminBookingRequestsArgs = {
    criterion: GqlSAdminBookingRequestCriterion;
};

export type GqlSAdminBookingRequestsCountsArgs = {
    criteria: Array<GqlSAdminBookingRequestCriterion>;
};

export type GqlSAdminCallArgs = {
    bookingRequestOfferCallRoomId: Scalars['ID']['input'];
};

export type GqlSAdminCallCookStatsArgs = {
    range: GqlSDateTimeRange;
    sortBy?: GqlSAdminCallCookStatSortField;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminCallRoomCreationsArgs = {
    granularity?: GqlSAdminTimeBucketGranularity;
    range: GqlSDateTimeRange;
};

export type GqlSAdminCallSlotCreationsArgs = {
    granularity?: GqlSAdminTimeBucketGranularity;
    range: GqlSDateTimeRange;
};

export type GqlSAdminCallTrafficArgs = {
    criterion: GqlSAdminCallTrafficCriterion;
};

export type GqlSAdminCallTrafficCountsArgs = {
    criteria: Array<GqlSAdminCallTrafficCriterion>;
};

export type GqlSAdminChefSignUpFlowArgs = {
    range: GqlSDateTimeRange;
};

export type GqlSAdminCityArgs = {
    cityId: Scalars['ID']['input'];
};

export type GqlSAdminCookBookingRequestOfferFlowArgs = {
    range: GqlSDateTimeRange;
};

export type GqlSAdminCookMealArgs = {
    mealId: Scalars['ID']['input'];
};

export type GqlSAdminCookMealsArgs = {
    criterion: GqlSAdminCookMealCriterion;
};

export type GqlSAdminCookMealsCountsArgs = {
    criteria: Array<GqlSAdminCookMealCriterion>;
};

export type GqlSAdminCookMenuArgs = {
    menuId: Scalars['ID']['input'];
};

export type GqlSAdminCookMenusArgs = {
    criterion: GqlSAdminCookMenuCriterion;
};

export type GqlSAdminCookMenusCountsArgs = {
    criteria: Array<GqlSAdminCookMenuCriterion>;
};

export type GqlSAdminCookTestimonialArgs = {
    cookTestimonialId: Scalars['ID']['input'];
};

export type GqlSAdminCookTestimonialsArgs = {
    criterion?: InputMaybe<GqlSAdminCookTestimonialCriterion>;
};

export type GqlSAdminCooksInTravelRadiusArgs = {
    excludeUserId?: InputMaybe<Scalars['ID']['input']>;
    latitude: Scalars['Latitude']['input'];
    longitude: Scalars['Longitude']['input'];
};

export type GqlSAdminCustomerTestimonialArgs = {
    customerTestimonialId: Scalars['ID']['input'];
};

export type GqlSAdminCustomerTestimonialsArgs = {
    criterion?: InputMaybe<GqlSAdminCustomerTestimonialCriterion>;
};

export type GqlSAdminDatabaseSlowStatementsArgs = {
    limit?: Scalars['Int']['input'];
};

export type GqlSAdminGiftCardArgs = {
    giftCardId: Scalars['ID']['input'];
};

export type GqlSAdminGiftCardCreationsArgs = {
    granularity?: GqlSAdminTimeBucketGranularity;
    range: GqlSDateTimeRange;
};

export type GqlSAdminGiftCardFlowArgs = {
    range: GqlSDateTimeRange;
};

export type GqlSAdminGiftCardOccasionStatsArgs = {
    range?: InputMaybe<GqlSDateTimeRange>;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminGiftCardSalesMonthStatsArgs = {
    range?: InputMaybe<GqlSDateTimeRange>;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminGiftCardsArgs = {
    criterion: GqlSAdminGiftCardCriterion;
};

export type GqlSAdminGiftCardsCountsArgs = {
    criteria: Array<GqlSAdminGiftCardCriterion>;
};

export type GqlSAdminLogArgs = {
    logId: Scalars['ID']['input'];
};

export type GqlSAdminLogCountsArgs = {
    criteria: Array<GqlSAdminLogCriterion>;
};

export type GqlSAdminLogCreationsArgs = {
    granularity?: GqlSAdminTimeBucketGranularity;
    range: GqlSDateTimeRange;
};

export type GqlSAdminLogsArgs = {
    criterion: GqlSAdminLogCriterion;
};

export type GqlSAdminObjectStorageObjectsArgs = {
    criterion: GqlSAdminObjectStorageObjectCriterion;
};

export type GqlSAdminOccasionArgs = {
    occasionId: Scalars['ID']['input'];
};

export type GqlSAdminOutboundEmailArgs = {
    outboundEmailId: Scalars['ID']['input'];
};

export type GqlSAdminOutboundEmailCreationsArgs = {
    granularity?: GqlSAdminTimeBucketGranularity;
    range: GqlSDateTimeRange;
};

export type GqlSAdminOutboundEmailPurposeStatsArgs = {
    range?: InputMaybe<GqlSDateTimeRange>;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminOutboundEmailRecipientStatsArgs = {
    range?: InputMaybe<GqlSDateTimeRange>;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminOutboundEmailsArgs = {
    criterion: GqlSAdminOutboundEmailCriterion;
};

export type GqlSAdminOutboundEmailsCountsArgs = {
    criteria: Array<GqlSAdminOutboundEmailCriterion>;
};

export type GqlSAdminPartnerArgs = {
    partnerId: Scalars['ID']['input'];
};

export type GqlSAdminPromoCodeArgs = {
    promoCodeId: Scalars['ID']['input'];
};

export type GqlSAdminPromoCodesArgs = {
    criterion: GqlSAdminPromoCodeCriterion;
};

export type GqlSAdminPromoCodesCountsArgs = {
    criteria: Array<GqlSAdminPromoCodeCriterion>;
};

export type GqlSAdminSessionArgs = {
    sessionId: Scalars['ID']['input'];
};

export type GqlSAdminSessionCountsArgs = {
    criteria: Array<GqlSAdminSessionCriterion>;
};

export type GqlSAdminSessionCreationsArgs = {
    granularity?: GqlSAdminTimeBucketGranularity;
    range: GqlSDateTimeRange;
};

export type GqlSAdminSessionEventWebPageVisitCreationsArgs = {
    granularity?: GqlSAdminTimeBucketGranularity;
    range: GqlSDateTimeRange;
    webPageKey: GqlSWebPageKey;
};

export type GqlSAdminSessionEventsArgs = {
    criterion: GqlSAdminSessionEventCriterion;
};

export type GqlSAdminSessionEventsCountsArgs = {
    criteria: Array<GqlSAdminSessionEventCriterion>;
};

export type GqlSAdminSessionsArgs = {
    criterion: GqlSAdminSessionCriterion;
};

export type GqlSAdminSupportRequestArgs = {
    supportRequestId: Scalars['ID']['input'];
};

export type GqlSAdminSupportRequestsArgs = {
    criterion: GqlSAdminSupportRequestCriterion;
};

export type GqlSAdminSupportRequestsCountsArgs = {
    criteria: Array<GqlSAdminSupportRequestCriterion>;
};

export type GqlSAdminUpcomingBirthdaysArgs = {
    take?: Scalars['Int']['input'];
};

export type GqlSAdminUserArgs = {
    userId: Scalars['ID']['input'];
};

export type GqlSAdminUserCountsArgs = {
    criteria: Array<GqlSAdminUserCriterion>;
};

export type GqlSAdminUserRegistrationsArgs = {
    granularity?: GqlSAdminTimeBucketGranularity;
    range: GqlSDateTimeRange;
};

export type GqlSAdminUsersArgs = {
    criterion: GqlSAdminUserCriterion;
};

export type GqlSAdminWebPageArgs = {
    webPageKey: GqlSWebPageKey;
};

export type GqlSAdminWhatsAppConversationArgs = {
    whatsAppConversationId: Scalars['ID']['input'];
};

export type GqlSAdminWhatsAppConversationsArgs = {
    criterion: GqlSAdminWhatsAppConversationCriterion;
};

export type GqlSAdminWhatsAppConversationsCountsArgs = {
    criteria: Array<GqlSAdminWhatsAppConversationCriterion>;
};

export interface GqlSAdminAiGeneration {
    __typename?: 'AdminAiGeneration';
    aiGenerationId: Scalars['ID']['output'];
    cachedInputTokens?: Maybe<Scalars['Int']['output']>;
    createdAt: Scalars['DateTime']['output'];
    inputTokens?: Maybe<Scalars['Int']['output']>;
    kind: GqlSAdminAiGenerationKind;
    modelId?: Maybe<Scalars['String']['output']>;
    output: Scalars['String']['output'];
    outputTokens?: Maybe<Scalars['Int']['output']>;
    prompt: Scalars['String']['output'];
    reasoningTokens?: Maybe<Scalars['Int']['output']>;
    session?: Maybe<GqlSAdminSession>;
    sessionId?: Maybe<Scalars['ID']['output']>;
    system: Scalars['String']['output'];
    totalTokens?: Maybe<Scalars['Int']['output']>;
    user?: Maybe<GqlSAdminUser>;
    userId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSAdminAiGenerationCriterion = {
    kinds: Array<GqlSAdminAiGenerationKind>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    sortDirection?: InputMaybe<GqlSSortDirection>;
    sortField?: InputMaybe<GqlSAdminAiGenerationSortField>;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminAiGenerationKind =
    | 'BOOKING_REQUEST_ADJUSTED_MESSAGE'
    | 'BOOKING_REQUEST_COOK_MENU_EVALUATION'
    | 'BOOKING_REQUEST_OFFER_CALL_RECORDING_SUMMARY'
    | 'BOOKING_REQUEST_OFFER_CALL_RECORDING_TRANSCRIPT'
    | 'CHAT_TITLE'
    | 'COOK_BIOGRAPHY_SUGGESTION'
    | 'COOK_BIOGRAPHY_SUMMARY'
    | 'COOK_MENU_SUGGESTION_FROM_INVENTORY'
    | 'COOK_MENU_SUGGESTION_FROM_TEXT'
    | 'COOK_MENU_TITLE_DESCRIPTION';

export type GqlSAdminAiGenerationSortField = 'createdAt' | 'kind' | 'modelId' | 'totalTokens';

export interface GqlSAdminAnalyticsBookingRequestFormFlow {
    __typename?: 'AdminAnalyticsBookingRequestFormFlow';
    bookingRequestsCreated: Scalars['Int']['output'];
    links: Array<GqlSAdminAnalyticsSankeyLink>;
    nodes: Array<GqlSAdminAnalyticsSankeyNode>;
    sessionsWithCompletion: Scalars['Int']['output'];
    steps: Array<GqlSAdminAnalyticsFunnelStepStats>;
}

export interface GqlSAdminAnalyticsCookBookingRequestOfferFlow {
    __typename?: 'AdminAnalyticsCookBookingRequestOfferFlow';
    declinedCount: Scalars['Int']['output'];
    links: Array<GqlSAdminAnalyticsSankeyLink>;
    nodes: Array<GqlSAdminAnalyticsSankeyNode>;
    notifiedCount: Scalars['Int']['output'];
    offersCreatedCount: Scalars['Int']['output'];
    openedCount: Scalars['Int']['output'];
    steps: Array<GqlSAdminAnalyticsFunnelStepStats>;
}

export interface GqlSAdminAnalyticsFunnelStepStats {
    __typename?: 'AdminAnalyticsFunnelStepStats';
    completedCount: Scalars['Int']['output'];
    enteredCount: Scalars['Int']['output'];
    id: Scalars['String']['output'];
    labelDe: Scalars['String']['output'];
    labelEn: Scalars['String']['output'];
}

export interface GqlSAdminAnalyticsSankeyLink {
    __typename?: 'AdminAnalyticsSankeyLink';
    source: Scalars['String']['output'];
    target: Scalars['String']['output'];
    value: Scalars['Int']['output'];
}

export interface GqlSAdminAnalyticsSankeyNode {
    __typename?: 'AdminAnalyticsSankeyNode';
    id: Scalars['String']['output'];
    labelDe: Scalars['String']['output'];
    labelEn: Scalars['String']['output'];
}

export interface GqlSAdminAnalyticsSessionFunnelFlow {
    __typename?: 'AdminAnalyticsSessionFunnelFlow';
    links: Array<GqlSAdminAnalyticsSankeyLink>;
    nodes: Array<GqlSAdminAnalyticsSankeyNode>;
    sessionsWithCompletion: Scalars['Int']['output'];
    steps: Array<GqlSAdminAnalyticsFunnelStepStats>;
    terminalCount: Scalars['Int']['output'];
}

export interface GqlSAdminAssistantChat {
    __typename?: 'AdminAssistantChat';
    chatId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    deletedAt?: Maybe<Scalars['DateTime']['output']>;
    lastModifiedAt: Scalars['DateTime']['output'];
    surface: GqlSChatSurface;
    title: Scalars['String']['output'];
    turns: Array<GqlSChatTurn>;
    user: GqlSAdminUser;
    userId: Scalars['ID']['output'];
}

export type GqlSAdminAssistantChatCriterion = {
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    surface?: InputMaybe<GqlSChatSurface>;
    take?: Scalars['Int']['input'];
    userIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export interface GqlSAdminBlogPost {
    __typename?: 'AdminBlogPost';
    blogPostId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    headlineDe: Scalars['String']['output'];
    headlineEn: Scalars['String']['output'];
    heroImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    heroImageUrl?: Maybe<Scalars['String']['output']>;
    pathName: Scalars['String']['output'];
    previousPathNames: Array<Scalars['String']['output']>;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    sections: Array<GqlSContentSection>;
    subHeadlineDe: Scalars['String']['output'];
    subHeadlineEn: Scalars['String']['output'];
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSAdminBookingRequest {
    __typename?: 'AdminBookingRequest';
    adjustedMessage?: Maybe<Scalars['String']['output']>;
    bookingRequestId: Scalars['ID']['output'];
    canceledAt?: Maybe<Scalars['DateTime']['output']>;
    cancellationReason?: Maybe<Scalars['String']['output']>;
    cook?: Maybe<GqlSAdminCook>;
    cooksInTravelRadius: Array<GqlSAdminBookingRequestCookInTravelRadius>;
    createdAt: Scalars['DateTime']['output'];
    customer: GqlSAdminUser;
    dateTime: Scalars['DateTime']['output'];
    exactEventAddress: GqlSCookTravelOriginAddress;
    expiresAt?: Maybe<Scalars['DateTime']['output']>;
    giftCard?: Maybe<GqlSUserBookingRequestGiftCard>;
    invoiceAddress?: Maybe<GqlSInvoiceAddress>;
    maxOfferAmountCents?: Maybe<Scalars['Int']['output']>;
    minOfferAmountCents?: Maybe<Scalars['Int']['output']>;
    minOfferAmountHardCents?: Maybe<Scalars['Int']['output']>;
    occasion: Scalars['String']['output'];
    offers: Array<GqlSAdminBookingRequestOffer>;
    originalMessage: Scalars['String']['output'];
    participants: Array<GqlSBookingRequestParticipant>;
    preferences: Array<Scalars['String']['output']>;
    priceClassType?: Maybe<GqlSBookingRequestPriceClassType>;
    promoCode?: Maybe<GqlSUserBookingRequestPromoCode>;
    publicationStatus: GqlSBookingRequestPublicationStatus;
    queuedJobs: Array<GqlSAdminQueuedJob>;
    status: GqlSBookingRequestStatus;
    suggestedOfferAmountCents: Scalars['Int']['output'];
    userId: Scalars['ID']['output'];
}

export interface GqlSAdminBookingRequestCookInTravelRadius {
    __typename?: 'AdminBookingRequestCookInTravelRadius';
    cook: GqlSAdminCook;
    estimatedTravelDistanceKm: Scalars['Float']['output'];
    estimatedTravelExpensesCents: Scalars['Int']['output'];
    notifiedAt?: Maybe<Scalars['DateTime']['output']>;
    suggestedMenuPriceCents: Scalars['Int']['output'];
}

export interface GqlSAdminBookingRequestCookOfferStat {
    __typename?: 'AdminBookingRequestCookOfferStat';
    conversionCount: Scalars['Int']['output'];
    cookId: Scalars['ID']['output'];
    displayName: Scalars['String']['output'];
    offerCount: Scalars['Int']['output'];
}

export type GqlSAdminBookingRequestCookOfferStatSortField = 'conversionCount' | 'offerCount';

export type GqlSAdminBookingRequestCreate = {
    cookIds: Array<Scalars['ID']['input']>;
    dateTime: Scalars['DateTime']['input'];
    exactEventAddress: GqlSAdminBookingRequestExactEventAddressInput;
    occasion: Scalars['String']['input'];
    originalMessage: Scalars['String']['input'];
    participants: Array<GqlSUserBookingRequestParticipantCreate>;
    preferences: Array<Scalars['String']['input']>;
    userId: Scalars['ID']['input'];
};

export interface GqlSAdminBookingRequestCreationMonthStat {
    __typename?: 'AdminBookingRequestCreationMonthStat';
    count: Scalars['Int']['output'];
    monthStart: Scalars['DateTime']['output'];
    totalParticipants: Scalars['Int']['output'];
}

export type GqlSAdminBookingRequestCriterion = {
    bookingRequestIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    cookIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    createdAtFrom?: InputMaybe<Scalars['DateTime']['input']>;
    createdAtTo?: InputMaybe<Scalars['DateTime']['input']>;
    notifiedOnly?: InputMaybe<Scalars['Boolean']['input']>;
    promoCodeId?: InputMaybe<Scalars['ID']['input']>;
    publicationStatuses?: InputMaybe<Array<GqlSBookingRequestPublicationStatus>>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    sortDirection?: InputMaybe<GqlSSortDirection>;
    sortField?: InputMaybe<GqlSAdminBookingRequestSortField>;
    statuses?: InputMaybe<Array<GqlSBookingRequestStatus>>;
    take?: Scalars['Int']['input'];
    userIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type GqlSAdminBookingRequestExactEventAddressInput = {
    addressLine1: Scalars['String']['input'];
    addressLine2: Scalars['String']['input'];
    city: Scalars['String']['input'];
    country: Scalars['String']['input'];
    displayText: Scalars['String']['input'];
    latitude: Scalars['Latitude']['input'];
    longitude: Scalars['Longitude']['input'];
    postCode: Scalars['String']['input'];
    state: Scalars['String']['input'];
};

export interface GqlSAdminBookingRequestOccasionStat {
    __typename?: 'AdminBookingRequestOccasionStat';
    count: Scalars['Int']['output'];
    occasion: Scalars['String']['output'];
    totalParticipants: Scalars['Int']['output'];
}

export interface GqlSAdminBookingRequestOffer {
    __typename?: 'AdminBookingRequestOffer';
    activeCallRoom?: Maybe<GqlSBookingRequestOfferCallRoom>;
    adminChatReviewPendingCount: Scalars['Int']['output'];
    adminChatReviewedAt?: Maybe<Scalars['DateTime']['output']>;
    bookingRequest: GqlSAdminBookingRequest;
    bookingRequestId: Scalars['ID']['output'];
    bookingRequestOfferId: Scalars['ID']['output'];
    callBookings: Array<GqlSCookCallSlotBooking>;
    callRecordings: Array<GqlSBookingRequestOfferCallRecording>;
    canCompletePreparations: Scalars['Boolean']['output'];
    canRequestParticipantAmendment: Scalars['Boolean']['output'];
    configuredMenu?: Maybe<GqlSBookingRequestOfferConfiguredMenu>;
    cook: GqlSAdminCook;
    cookAccepted?: Maybe<Scalars['Boolean']['output']>;
    cookDeclinationReason?: Maybe<Scalars['String']['output']>;
    cookId: Scalars['ID']['output'];
    cookPayoutBlockedReason?: Maybe<GqlSAdminCookPayoutBlockedReason>;
    cookPayoutReady: Scalars['Boolean']['output'];
    cookTestimonial?: Maybe<GqlSAdminCookTestimonial>;
    cookUnreadNotificationCount: Scalars['Int']['output'];
    costBreakdown: GqlSCostBreakdown;
    createdAt: Scalars['DateTime']['output'];
    customerTestimonial?: Maybe<GqlSAdminCustomerTestimonial>;
    menuPriceCents: Scalars['Int']['output'];
    messages: Array<GqlSHumanChatMessage>;
    participantAmendment?: Maybe<GqlSBookingRequestOfferParticipantAmendment>;
    payment?: Maybe<GqlSBookingRequestOfferPayment>;
    paymentDateTime?: Maybe<Scalars['DateTime']['output']>;
    paymentProviderFeeCents: Scalars['Int']['output'];
    paymentStatus: GqlSBookingRequestOfferPaymentStatus;
    payoutCentsCook: Scalars['Int']['output'];
    payoutDateTime?: Maybe<Scalars['DateTime']['output']>;
    plannedPaymentPullDateTime?: Maybe<Scalars['DateTime']['output']>;
    plannedPayoutDateTime?: Maybe<Scalars['DateTime']['output']>;
    platformFeeCentsCook: Scalars['Int']['output'];
    platformFeeCentsCustomer: Scalars['Int']['output'];
    platformFeePercentCook: Scalars['Int']['output'];
    platformFeePercentCustomer: Scalars['Int']['output'];
    preparationsCompletedAt?: Maybe<Scalars['DateTime']['output']>;
    priceAutoAdjustReason?: Maybe<GqlSBookingRequestOfferPriceAutoAdjustReason>;
    queuedJobs: Array<GqlSAdminQueuedJob>;
    status: GqlSBookingRequestOfferStatus;
    stripePaymentIntentUrl?: Maybe<Scalars['String']['output']>;
    stripeSetupIntentUrl?: Maybe<Scalars['String']['output']>;
    suggestedMenus: Array<GqlSCookMenu>;
    totalCentsCustomer?: Maybe<Scalars['Int']['output']>;
    totalWithoutDiscountsCentsCustomer: Scalars['Int']['output'];
    travelDistanceKm?: Maybe<Scalars['Float']['output']>;
    travelExpensesCents: Scalars['Int']['output'];
    userAccepted?: Maybe<Scalars['Boolean']['output']>;
    userDeclinationReason?: Maybe<Scalars['String']['output']>;
    userRequestedMenuAdjustments?: Maybe<Scalars['Boolean']['output']>;
    userUnreadNotificationCount: Scalars['Int']['output'];
}

export interface GqlSAdminBookingRequestOfferChatReviewAcknowledgeResult {
    __typename?: 'AdminBookingRequestOfferChatReviewAcknowledgeResult';
    acknowledgedOfferId: Scalars['ID']['output'];
    nextOfferId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSAdminBookingRequestOfferCreate = {
    bookingRequestId: Scalars['ID']['input'];
    cookAccepted?: InputMaybe<Scalars['Boolean']['input']>;
    cookId: Scalars['ID']['input'];
    createdAt?: InputMaybe<Scalars['DateTime']['input']>;
    menuPriceCents: Scalars['Int']['input'];
    message?: InputMaybe<Scalars['String']['input']>;
    notifyCustomer: Scalars['Boolean']['input'];
    paymentDateTime?: InputMaybe<Scalars['DateTime']['input']>;
    payoutDateTime?: InputMaybe<Scalars['DateTime']['input']>;
    plannedPayoutDateTime?: InputMaybe<Scalars['DateTime']['input']>;
    travelDistanceKm?: InputMaybe<Scalars['Float']['input']>;
    travelExpensesCents: Scalars['Int']['input'];
    userAccepted?: InputMaybe<Scalars['Boolean']['input']>;
};

export type GqlSAdminBookingRequestOfferCriterion = {
    cookIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    hasAdminChatReviewPending?: InputMaybe<Scalars['Boolean']['input']>;
    paymentStatuses?: InputMaybe<Array<GqlSBookingRequestOfferPaymentStatus>>;
    plannedPayoutDateTimeTo?: InputMaybe<Scalars['DateTime']['input']>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    take?: Scalars['Int']['input'];
};

export interface GqlSAdminBookingRequestOfferEconomics {
    __typename?: 'AdminBookingRequestOfferEconomics';
    averageMenuPriceCents: Scalars['Int']['output'];
    averageOffersPerRequest: Scalars['Float']['output'];
    averagePaidCustomerTotalCents: Scalars['Int']['output'];
    averagePaidPlatformRevenueCents: Scalars['Int']['output'];
    rangeTotalPaidCustomerTotalCents: Scalars['Int']['output'];
    rangeTotalPaidPlatformRevenueCents: Scalars['Int']['output'];
    totalPaidCustomerTotalCents: Scalars['Int']['output'];
    totalPaidPlatformRevenueCents: Scalars['Int']['output'];
}

export type GqlSAdminBookingRequestOfferHandover = {
    bookingRequestOfferId: Scalars['ID']['input'];
    confirmOutOfSystemMoneyHandled?: InputMaybe<Scalars['Boolean']['input']>;
    cookId: Scalars['ID']['input'];
    copyChatMessages: Scalars['Boolean']['input'];
    copyConfiguredMenu: Scalars['Boolean']['input'];
    copyPrice: Scalars['Boolean']['input'];
    copyScheduleTimestamps: Scalars['Boolean']['input'];
    menuPriceCents?: InputMaybe<Scalars['Int']['input']>;
    paymentDateTime?: InputMaybe<Scalars['DateTime']['input']>;
    plannedPaymentPullDateTime?: InputMaybe<Scalars['DateTime']['input']>;
    plannedPayoutDateTime?: InputMaybe<Scalars['DateTime']['input']>;
    travelDistanceKm?: InputMaybe<Scalars['Float']['input']>;
    travelExpensesCents?: InputMaybe<Scalars['Int']['input']>;
};

export type GqlSAdminBookingRequestOfferUpdate = {
    cookAccepted?: InputMaybe<Scalars['Boolean']['input']>;
    menuPriceCents?: InputMaybe<Scalars['Int']['input']>;
    paymentDateTime?: InputMaybe<Scalars['DateTime']['input']>;
    payoutDateTime?: InputMaybe<Scalars['DateTime']['input']>;
    plannedPayoutDateTime?: InputMaybe<Scalars['DateTime']['input']>;
    travelDistanceKm?: InputMaybe<Scalars['Float']['input']>;
    travelExpensesCents?: InputMaybe<Scalars['Int']['input']>;
    userAccepted?: InputMaybe<Scalars['Boolean']['input']>;
};

export type GqlSAdminBookingRequestSortField = 'createdAt' | 'dateTime' | 'occasion';

export type GqlSAdminBookingRequestUpdate = {
    adjustedMessage?: InputMaybe<Scalars['String']['input']>;
    createdAt?: InputMaybe<Scalars['DateTime']['input']>;
    dateTime?: InputMaybe<Scalars['DateTime']['input']>;
    exactEventAddress?: InputMaybe<GqlSAdminBookingRequestExactEventAddressInput>;
    expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
    occasion?: InputMaybe<Scalars['String']['input']>;
    originalMessage?: InputMaybe<Scalars['String']['input']>;
    participants?: InputMaybe<Array<GqlSUserBookingRequestParticipantCreate>>;
    priceClassType?: InputMaybe<GqlSBookingRequestPriceClassType>;
};

export interface GqlSAdminCall {
    __typename?: 'AdminCall';
    bookingRequestId: Scalars['ID']['output'];
    bookingRequestOfferCallRoomId: Scalars['ID']['output'];
    bookingRequestOfferId: Scalars['ID']['output'];
    cook: GqlSAdminCallParty;
    cookDisplayName: Scalars['String']['output'];
    cookId: Scalars['ID']['output'];
    customer: GqlSAdminCallParty;
    customerDisplayName: Scalars['String']['output'];
    customerUserId: Scalars['ID']['output'];
    endedAt?: Maybe<Scalars['DateTime']['output']>;
    livekitRoomName: Scalars['String']['output'];
    occasion: Scalars['String']['output'];
    recording?: Maybe<GqlSBookingRequestOfferCallRecording>;
    startedAt: Scalars['DateTime']['output'];
    status: GqlSBookingRequestOfferCallRoomStatus;
}

export interface GqlSAdminCallCookStat {
    __typename?: 'AdminCallCookStat';
    canceledCount: Scalars['Int']['output'];
    completedSlotCount: Scalars['Int']['output'];
    cookId: Scalars['ID']['output'];
    declinedCount: Scalars['Int']['output'];
    displayName: Scalars['String']['output'];
    pendingAwaitingCookCount: Scalars['Int']['output'];
    roomCount: Scalars['Int']['output'];
}

export type GqlSAdminCallCookStatSortField = 'completedSlotCount' | 'declinedCount' | 'pendingAwaitingCookCount' | 'roomCount';

export interface GqlSAdminCallListItem {
    __typename?: 'AdminCallListItem';
    bookingRequestId: Scalars['ID']['output'];
    bookingRequestOfferId: Scalars['ID']['output'];
    callRoom?: Maybe<GqlSBookingRequestOfferCallRoom>;
    callSlotBooking?: Maybe<GqlSCookCallSlotBooking>;
    cookDisplayName: Scalars['String']['output'];
    cookId: Scalars['ID']['output'];
    customerDisplayName: Scalars['String']['output'];
    customerUserId: Scalars['ID']['output'];
    kind: GqlSAdminCallListItemKind;
    occasion: Scalars['String']['output'];
}

export type GqlSAdminCallListItemKind = 'CANCELED' | 'DECLINED' | 'LIVE' | 'PENDING' | 'RECENT_ROOM' | 'RECENT_SLOT' | 'UPCOMING';

export interface GqlSAdminCallParty {
    __typename?: 'AdminCallParty';
    displayName: Scalars['String']['output'];
    emailAddress?: Maybe<Scalars['EmailAddress']['output']>;
    profilePicture?: Maybe<GqlSFileUpload>;
    userId: Scalars['ID']['output'];
}

export type GqlSAdminCallTrafficCriterion = {
    cookIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    initiators?: InputMaybe<Array<GqlSCookCallSlotBookingActor>>;
    kinds?: InputMaybe<Array<GqlSAdminCallListItemKind>>;
    range?: InputMaybe<GqlSDateTimeRange>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    sortDirection?: InputMaybe<GqlSSortDirection>;
    sortField?: InputMaybe<GqlSAdminCallTrafficSortField>;
    take?: Scalars['Int']['input'];
    userIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type GqlSAdminCallTrafficSortField = 'createdAt' | 'occurredAt';

export interface GqlSAdminCity {
    __typename?: 'AdminCity';
    cityId: Scalars['ID']['output'];
    cooks: Array<GqlSAdminCityCook>;
    cooksInTravelRadius: Array<GqlSAdminCook>;
    createdAt: Scalars['DateTime']['output'];
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    firstSectionBodyDe: Scalars['String']['output'];
    firstSectionBodyEn: Scalars['String']['output'];
    firstSectionHeadlineDe: Scalars['String']['output'];
    firstSectionHeadlineEn: Scalars['String']['output'];
    firstSectionImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    firstSectionImageUrl?: Maybe<Scalars['String']['output']>;
    headlineDe: Scalars['String']['output'];
    headlineEn: Scalars['String']['output'];
    heroImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    heroImageUrl?: Maybe<Scalars['String']['output']>;
    latitude: Scalars['Latitude']['output'];
    longitude: Scalars['Longitude']['output'];
    nameDe: Scalars['String']['output'];
    nameEn: Scalars['String']['output'];
    pathName: Scalars['String']['output'];
    previousPathNames: Array<Scalars['String']['output']>;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    sections: Array<GqlSContentSection>;
    subHeadlineDe: Scalars['String']['output'];
    subHeadlineEn: Scalars['String']['output'];
    testimonials: Array<GqlSAdminCityTestimonial>;
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSAdminCityCook {
    __typename?: 'AdminCityCook';
    cook: GqlSAdminCook;
    isPubliclyListed: Scalars['Boolean']['output'];
    position: Scalars['Int']['output'];
}

export interface GqlSAdminCityTestimonial {
    __typename?: 'AdminCityTestimonial';
    index: Scalars['Int']['output'];
    testimonial: GqlSAdminTestimonial;
}

export interface GqlSAdminCook {
    __typename?: 'AdminCook';
    biography: Scalars['String']['output'];
    biographySummary: Scalars['String']['output'];
    biographySummaryGenerating: Scalars['Boolean']['output'];
    callAvailabilityRules: Array<GqlSCookCallAvailabilityRule>;
    callDurationMinutes: Scalars['Int']['output'];
    callSchedulingEnabled: Scalars['Boolean']['output'];
    canCreateOffers: Scalars['Boolean']['output'];
    cookId: Scalars['ID']['output'];
    cookingPhilosophy?: Maybe<Scalars['String']['output']>;
    createdAt: Scalars['DateTime']['output'];
    cuisineStyle?: Maybe<Scalars['String']['output']>;
    exactTravelOriginAddress?: Maybe<GqlSCookTravelOriginAddress>;
    featuredOn: Array<GqlSAdminCookFeaturedLanding>;
    isApprovedByAdmin: Scalars['Boolean']['output'];
    isVisible: Scalars['Boolean']['output'];
    lastModifiedAt: Scalars['DateTime']['output'];
    logo?: Maybe<GqlSFileUpload>;
    maximumParticipants?: Maybe<Scalars['Int']['output']>;
    maximumPriceAmount?: Maybe<Scalars['Int']['output']>;
    maximumTravelDistance?: Maybe<Scalars['Int']['output']>;
    minimumParticipants?: Maybe<Scalars['Int']['output']>;
    minimumPriceAmount?: Maybe<Scalars['Int']['output']>;
    rating: GqlSPublicCookRating;
    stageName?: Maybe<Scalars['String']['output']>;
    stripeAccountActive: Scalars['Boolean']['output'];
    stripeAccountActiveWasReset: Scalars['Boolean']['output'];
    stripeAccountDetails?: Maybe<GqlSCookStripeAccountDetails>;
    stripeAccountId?: Maybe<Scalars['String']['output']>;
    stripeAccountUrl?: Maybe<Scalars['String']['output']>;
    stripeStatus: GqlSCookStripeStatus;
    stripeWallet?: Maybe<GqlSCookStripeWallet>;
    travelExpensesAmount: Scalars['Int']['output'];
    user: GqlSAdminUser;
}

export interface GqlSAdminCookFeaturedLanding {
    __typename?: 'AdminCookFeaturedLanding';
    id: Scalars['ID']['output'];
    kind: GqlSAdminCookFeaturedLandingKind;
    pathName: Scalars['String']['output'];
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
}

export type GqlSAdminCookFeaturedLandingKind = 'CITY' | 'OCCASION' | 'PARTNER';

export interface GqlSAdminCookInTravelRadiusPreview {
    __typename?: 'AdminCookInTravelRadiusPreview';
    cook: GqlSAdminCook;
    estimatedTravelDistanceKm: Scalars['Float']['output'];
}

export type GqlSAdminCookInventoryStatus = 'DELETED' | 'DRAFT' | 'PUBLISHED';

export interface GqlSAdminCookMeal {
    __typename?: 'AdminCookMeal';
    cookId: Scalars['ID']['output'];
    cookName: Scalars['String']['output'];
    createdAt: Scalars['DateTime']['output'];
    deletedAt?: Maybe<Scalars['DateTime']['output']>;
    description: Scalars['String']['output'];
    imageFileUploadId?: Maybe<Scalars['ID']['output']>;
    imageUrl?: Maybe<Scalars['String']['output']>;
    mealId: Scalars['ID']['output'];
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    relationships: GqlSCookMealRelationships;
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSAdminCookMealCriterion = {
    cookIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    imageFilter?: InputMaybe<GqlSAdminCookMealImageFilter>;
    includeDeleted?: Scalars['Boolean']['input'];
    mealIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    sortDirection?: InputMaybe<GqlSSortDirection>;
    sortField?: InputMaybe<GqlSAdminCookMealSortField>;
    status?: InputMaybe<GqlSAdminCookInventoryStatus>;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminCookMealImageFilter = 'NOT_ON_PUBLIC_PAGE' | 'ON_PUBLIC_PAGE' | 'WITHOUT_IMAGE' | 'WITH_IMAGE';

export type GqlSAdminCookMealSortField = 'createdAt' | 'deletedAt' | 'publishedAt' | 'title';

export interface GqlSAdminCookMenu {
    __typename?: 'AdminCookMenu';
    bookingRequestOfferId?: Maybe<Scalars['ID']['output']>;
    cookId: Scalars['ID']['output'];
    cookName: Scalars['String']['output'];
    copyOfMenuId?: Maybe<Scalars['ID']['output']>;
    courseCount: Scalars['Int']['output'];
    courseMealOptionImages: Array<Scalars['String']['output']>;
    courses: Array<GqlSAdminCookMenuCourse>;
    createdAt: Scalars['DateTime']['output'];
    deletedAt?: Maybe<Scalars['DateTime']['output']>;
    description: Scalars['String']['output'];
    menuId: Scalars['ID']['output'];
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSAdminCookMenuCourse {
    __typename?: 'AdminCookMenuCourse';
    courseId: Scalars['ID']['output'];
    mealOptions: Array<GqlSAdminCookMeal>;
    mealSelectionLimit?: Maybe<Scalars['Int']['output']>;
    title: Scalars['String']['output'];
}

export type GqlSAdminCookMenuCriterion = {
    cookIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    includeDeleted?: Scalars['Boolean']['input'];
    menuIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    sortDirection?: InputMaybe<GqlSSortDirection>;
    sortField?: InputMaybe<GqlSAdminCookMenuSortField>;
    status?: InputMaybe<GqlSAdminCookInventoryStatus>;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminCookMenuSortField = 'createdAt' | 'deletedAt' | 'publishedAt' | 'title';

export type GqlSAdminCookPayoutBlockedReason = 'MISSING_STRIPE_ACCOUNT' | 'STRIPE_ACCOUNT_INACTIVE' | 'STRIPE_PAYOUTS_DISABLED';

export interface GqlSAdminCookTestimonial {
    __typename?: 'AdminCookTestimonial';
    authorName?: Maybe<Scalars['String']['output']>;
    body?: Maybe<Scalars['String']['output']>;
    bookingRequestOfferId?: Maybe<Scalars['ID']['output']>;
    cook: GqlSAdminCook;
    cookId: Scalars['ID']['output'];
    cookTestimonialId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    displayAuthorName: Scalars['String']['output'];
    displayLocation?: Maybe<Scalars['String']['output']>;
    displayOccasion?: Maybe<Scalars['String']['output']>;
    imageUrls: Array<Scalars['String']['output']>;
    location?: Maybe<Scalars['String']['output']>;
    lowRatingAnswers?: Maybe<GqlSCookTestimonialLowRatingAnswers>;
    occasion?: Maybe<Scalars['String']['output']>;
    publicationStatus: GqlSTestimonialPublicationStatus;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    rating?: Maybe<Scalars['Int']['output']>;
    userId: Scalars['ID']['output'];
}

export type GqlSAdminCookTestimonialCreate = {
    authorName?: InputMaybe<Scalars['String']['input']>;
    body?: InputMaybe<Scalars['String']['input']>;
    bookingRequestOfferId?: InputMaybe<Scalars['ID']['input']>;
    cookId: Scalars['ID']['input'];
    imageFileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    location?: InputMaybe<Scalars['String']['input']>;
    occasion?: InputMaybe<Scalars['String']['input']>;
    rating?: InputMaybe<Scalars['Int']['input']>;
};

export type GqlSAdminCookTestimonialCriterion = {
    cookIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    skip?: Scalars['Int']['input'];
    take?: Scalars['Int']['input'];
};

export type GqlSAdminCookTestimonialUpdate = {
    authorName?: InputMaybe<Scalars['String']['input']>;
    body?: InputMaybe<Scalars['String']['input']>;
    location?: InputMaybe<Scalars['String']['input']>;
    occasion?: InputMaybe<Scalars['String']['input']>;
    rating?: InputMaybe<Scalars['Int']['input']>;
};

export interface GqlSAdminCustomerTestimonial {
    __typename?: 'AdminCustomerTestimonial';
    authorName?: Maybe<Scalars['String']['output']>;
    body: Scalars['String']['output'];
    bookingRequestOfferId?: Maybe<Scalars['ID']['output']>;
    createdAt: Scalars['DateTime']['output'];
    customerTestimonialId: Scalars['ID']['output'];
    displayAuthorName: Scalars['String']['output'];
    displayLocation?: Maybe<Scalars['String']['output']>;
    displayOccasion?: Maybe<Scalars['String']['output']>;
    imageUrls: Array<Scalars['String']['output']>;
    location?: Maybe<Scalars['String']['output']>;
    occasion?: Maybe<Scalars['String']['output']>;
    publicationStatus: GqlSTestimonialPublicationStatus;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    rating?: Maybe<Scalars['Int']['output']>;
    user: GqlSAdminUser;
    userId: Scalars['ID']['output'];
}

export type GqlSAdminCustomerTestimonialCreate = {
    authorName?: InputMaybe<Scalars['String']['input']>;
    body: Scalars['String']['input'];
    bookingRequestOfferId?: InputMaybe<Scalars['ID']['input']>;
    imageFileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    location?: InputMaybe<Scalars['String']['input']>;
    occasion?: InputMaybe<Scalars['String']['input']>;
    rating?: InputMaybe<Scalars['Int']['input']>;
    userId: Scalars['ID']['input'];
};

export type GqlSAdminCustomerTestimonialCriterion = {
    cookIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    skip?: Scalars['Int']['input'];
    take?: Scalars['Int']['input'];
};

export type GqlSAdminCustomerTestimonialUpdate = {
    authorName?: InputMaybe<Scalars['String']['input']>;
    body?: InputMaybe<Scalars['String']['input']>;
    location?: InputMaybe<Scalars['String']['input']>;
    occasion?: InputMaybe<Scalars['String']['input']>;
    rating?: InputMaybe<Scalars['Int']['input']>;
};

export interface GqlSAdminDatabaseSlowStatement {
    __typename?: 'AdminDatabaseSlowStatement';
    calls: Scalars['Int']['output'];
    meanExecTimeMs: Scalars['Float']['output'];
    query: Scalars['String']['output'];
    rows: Scalars['Int']['output'];
    totalExecTimeMs: Scalars['Float']['output'];
}

export interface GqlSAdminFeatureToggle {
    __typename?: 'AdminFeatureToggle';
    enabled: Scalars['Boolean']['output'];
    featureToggleKey: GqlSFeatureToggleKey;
    persisted: Scalars['Boolean']['output'];
    updatedAt?: Maybe<Scalars['DateTime']['output']>;
    userOverrides: Array<GqlSAdminFeatureToggleUserOverride>;
}

export interface GqlSAdminFeatureToggleUserOverride {
    __typename?: 'AdminFeatureToggleUserOverride';
    enabled: Scalars['Boolean']['output'];
    featureToggleKey: GqlSFeatureToggleKey;
    updatedAt: Scalars['DateTime']['output'];
    user: GqlSAdminUser;
    userId: Scalars['ID']['output'];
}

export interface GqlSAdminGiftCard {
    __typename?: 'AdminGiftCard';
    balanceCents: Scalars['Int']['output'];
    buyerEmail: Scalars['EmailAddress']['output'];
    buyerUserId?: Maybe<Scalars['ID']['output']>;
    createdAt: Scalars['DateTime']['output'];
    expiresAt: Scalars['DateTime']['output'];
    giftCardId: Scalars['ID']['output'];
    invoiceAddress?: Maybe<GqlSInvoiceAddress>;
    invoiceFileUpload?: Maybe<GqlSFileUpload>;
    invoiceFileUploadId?: Maybe<Scalars['ID']['output']>;
    message: Scalars['String']['output'];
    occasion: Scalars['String']['output'];
    originalBalanceCents: Scalars['Int']['output'];
    paymentStatus: GqlSGiftCardPaymentStatus;
    recipientName: Scalars['String']['output'];
    redeemCode: Scalars['String']['output'];
    voucherFileUpload?: Maybe<GqlSFileUpload>;
    voucherFileUploadId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSAdminGiftCardCriterion = {
    giftCardIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    paymentStatuses: Array<GqlSGiftCardPaymentStatus>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    sortDirection?: InputMaybe<GqlSSortDirection>;
    sortField?: InputMaybe<GqlSAdminGiftCardSortField>;
    take?: Scalars['Int']['input'];
};

export interface GqlSAdminGiftCardOccasionStat {
    __typename?: 'AdminGiftCardOccasionStat';
    count: Scalars['Int']['output'];
    occasion: Scalars['String']['output'];
    totalOriginalBalanceCents: Scalars['Int']['output'];
}

export interface GqlSAdminGiftCardSalesMonthStat {
    __typename?: 'AdminGiftCardSalesMonthStat';
    count: Scalars['Int']['output'];
    monthStart: Scalars['DateTime']['output'];
    totalOriginalBalanceCents: Scalars['Int']['output'];
}

export type GqlSAdminGiftCardSortField = 'buyerEmail' | 'createdAt' | 'originalBalanceCents';

export type GqlSAdminLegalDocumentDraftInput = {
    bodyDe: Scalars['String']['input'];
    changeSummaryDe: Scalars['String']['input'];
};

export interface GqlSAdminLegalImprint {
    __typename?: 'AdminLegalImprint';
    bodyDe: Scalars['String']['output'];
    changeSummaryDe: Scalars['String']['output'];
    createdAt: Scalars['DateTime']['output'];
    imprintId: Scalars['ID']['output'];
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSAdminLegalPrivacyPolicy {
    __typename?: 'AdminLegalPrivacyPolicy';
    bodyDe: Scalars['String']['output'];
    changeSummaryDe: Scalars['String']['output'];
    createdAt: Scalars['DateTime']['output'];
    privacyPolicyId: Scalars['ID']['output'];
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSAdminLegalTermsAndConditions {
    __typename?: 'AdminLegalTermsAndConditions';
    bodyDe: Scalars['String']['output'];
    changeSummaryDe: Scalars['String']['output'];
    createdAt: Scalars['DateTime']['output'];
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    termsAndConditionsId: Scalars['ID']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSAdminLog {
    __typename?: 'AdminLog';
    context?: Maybe<Scalars['JSON']['output']>;
    createdAt: Scalars['DateTime']['output'];
    level: GqlSAdminLogLevel;
    logId: Scalars['ID']['output'];
    message: Scalars['String']['output'];
    session?: Maybe<GqlSAdminSession>;
    sessionId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSAdminLogCriterion = {
    levels: Array<GqlSAdminLogLevel>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    sortDirection?: InputMaybe<GqlSSortDirection>;
    sortField?: InputMaybe<GqlSAdminLogSortField>;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminLogLevel = 'debug' | 'error' | 'info' | 'warn';

export type GqlSAdminLogSortField = 'createdAt' | 'message';

export interface GqlSAdminMutation {
    __typename?: 'AdminMutation';
    blogPostDelete: GqlSMutationResult;
    blogPostUpsert: GqlSMutationResult;
    bookingRequestCancel: GqlSMutationResult;
    bookingRequestCooksNotify: GqlSMutationResult;
    bookingRequestCreate: GqlSMutationResult;
    bookingRequestDiscountUpdate: GqlSMutationResult;
    bookingRequestOfferCallCreate: GqlSBookingRequestOfferCallTokenResult;
    bookingRequestOfferCallJoin: GqlSBookingRequestOfferCallTokenResult;
    bookingRequestOfferCallLeave: GqlSMutationResult;
    bookingRequestOfferCallRecordingDelete: GqlSMutationResult;
    bookingRequestOfferCallRecordingSummaryGenerate: Scalars['String']['output'];
    bookingRequestOfferCallSlotDecline: GqlSMutationResult;
    bookingRequestOfferChatMessageCreate: GqlSMutationResult;
    bookingRequestOfferChatMessageDelete: GqlSMutationResult;
    bookingRequestOfferChatMessageReactionUpsert: GqlSMutationResult;
    bookingRequestOfferChatMessageUpdate: GqlSMutationResult;
    bookingRequestOfferChatMessageVisibilityUpdate: GqlSMutationResult;
    bookingRequestOfferChatReviewAcknowledge: GqlSAdminBookingRequestOfferChatReviewAcknowledgeResult;
    bookingRequestOfferConfiguredMenuUpdate: GqlSMutationResult;
    bookingRequestOfferCreate: GqlSMutationResult;
    bookingRequestOfferHandover: GqlSMutationResult;
    bookingRequestOfferPayoutAlreadyTookPlaceCheck: GqlSMutationResult;
    bookingRequestOfferPayoutMarkOutOfSystem: GqlSMutationResult;
    bookingRequestOfferPayoutRelease: GqlSMutationResult;
    bookingRequestOfferPreparationsClear: GqlSMutationResult;
    bookingRequestOfferUpdate: GqlSMutationResult;
    bookingRequestPublicationApprove: GqlSMutationResult;
    bookingRequestUpdate: GqlSMutationResult;
    cityCooksUpdate: GqlSMutationResult;
    cityDelete: GqlSMutationResult;
    cityTestimonialsUpdate: GqlSMutationResult;
    cityUpsert: GqlSMutationResult;
    cookApprovalUpdate: GqlSMutationResult;
    cookBiographySuggest: Scalars['String']['output'];
    cookBiographySummarySuggest: Scalars['String']['output'];
    cookMealCreate: GqlSMutationResult;
    cookMealDelete: GqlSMutationResult;
    cookMealUpdate: GqlSMutationResult;
    cookMenuCopy: GqlSMutationResult;
    cookMenuCreate: GqlSMutationResult;
    cookMenuDelete: GqlSMutationResult;
    cookMenuUpdate: GqlSMutationResult;
    cookTestimonialCreate: GqlSMutationResult;
    cookTestimonialDelete: GqlSMutationResult;
    cookTestimonialImageUpdate: GqlSMutationResult;
    cookTestimonialPublish: GqlSMutationResult;
    cookTestimonialUpdate: GqlSMutationResult;
    cookUpdate: GqlSMutationResult;
    customerTestimonialCreate: GqlSMutationResult;
    customerTestimonialDelete: GqlSMutationResult;
    customerTestimonialImageUpdate: GqlSMutationResult;
    customerTestimonialPublish: GqlSMutationResult;
    customerTestimonialUpdate: GqlSMutationResult;
    featureToggleUpdate: GqlSMutationResult;
    featureToggleUserOverrideDelete: GqlSMutationResult;
    featureToggleUserOverrideUpsert: GqlSMutationResult;
    giftCardPdfsRegenerate: GqlSMutationResult;
    legalImprintDraftCreate: GqlSMutationResult;
    legalImprintDraftUpdate: GqlSMutationResult;
    legalImprintPublish: GqlSMutationResult;
    legalPrivacyPolicyDraftCreate: GqlSMutationResult;
    legalPrivacyPolicyDraftUpdate: GqlSMutationResult;
    legalPrivacyPolicyPublish: GqlSMutationResult;
    legalTermsAndConditionsDraftCreate: GqlSMutationResult;
    legalTermsAndConditionsDraftUpdate: GqlSMutationResult;
    legalTermsAndConditionsPublish: GqlSMutationResult;
    occasionCooksUpdate: GqlSMutationResult;
    occasionDelete: GqlSMutationResult;
    occasionTestimonialsUpdate: GqlSMutationResult;
    occasionUpsert: GqlSMutationResult;
    partnerCooksUpdate: GqlSMutationResult;
    partnerDelete: GqlSMutationResult;
    partnerTestimonialsUpdate: GqlSMutationResult;
    partnerUpsert: GqlSMutationResult;
    promoCodeCreate: GqlSMutationResult;
    promoCodeUpdate: GqlSMutationResult;
    queuedJobCancel: GqlSMutationResult;
    sessionUserBind: GqlSMutationResult;
    supportRequestMessageCreate: GqlSMutationResult;
    supportRequestResolve: GqlSMutationResult;
    supportRequestUnreadNotificationCountReset: GqlSMutationResult;
    terminateSessions: GqlSMutationResult;
    userAdminNoteUpdate: GqlSMutationResult;
    userAnonymize: GqlSMutationResult;
    userCreate: GqlSMutationResult;
    userEmailAddressUpdate: GqlSMutationResult;
    userStatusUpdate: GqlSMutationResult;
    userUpdate: GqlSMutationResult;
    webPageUpdate: GqlSMutationResult;
    whatsAppConversationUnreadCountReset: GqlSMutationResult;
    whatsAppMessageCreate: GqlSMutationResult;
    whatsAppMessageReactionUpsert: GqlSMutationResult;
}

export type GqlSAdminMutationBlogPostDeleteArgs = {
    blogPostId: Scalars['ID']['input'];
};

export type GqlSAdminMutationBlogPostUpsertArgs = {
    input: GqlSBlogPostUpsert;
};

export type GqlSAdminMutationBookingRequestCancelArgs = {
    bookingRequestId: Scalars['ID']['input'];
    reason: Scalars['String']['input'];
};

export type GqlSAdminMutationBookingRequestCooksNotifyArgs = {
    bookingRequestId: Scalars['ID']['input'];
    cookIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationBookingRequestCreateArgs = {
    input: GqlSAdminBookingRequestCreate;
};

export type GqlSAdminMutationBookingRequestDiscountUpdateArgs = {
    bookingRequestId: Scalars['ID']['input'];
    redeemCode?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSAdminMutationBookingRequestOfferCallCreateArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSAdminMutationBookingRequestOfferCallJoinArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSAdminMutationBookingRequestOfferCallLeaveArgs = {
    bookingRequestOfferCallRoomParticipantId: Scalars['ID']['input'];
};

export type GqlSAdminMutationBookingRequestOfferCallRecordingDeleteArgs = {
    bookingRequestOfferCallRecordingId: Scalars['ID']['input'];
};

export type GqlSAdminMutationBookingRequestOfferCallRecordingSummaryGenerateArgs = {
    bookingRequestOfferCallRecordingId: Scalars['ID']['input'];
};

export type GqlSAdminMutationBookingRequestOfferCallSlotDeclineArgs = {
    cookCallSlotBookingId: Scalars['ID']['input'];
    onBehalfOf: GqlSCookCallSlotBookingActor;
    reason?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSAdminMutationBookingRequestOfferChatMessageCreateArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    message: Scalars['String']['input'];
};

export type GqlSAdminMutationBookingRequestOfferChatMessageDeleteArgs = {
    bookingRequestOfferEventId: Scalars['ID']['input'];
};

export type GqlSAdminMutationBookingRequestOfferChatMessageReactionUpsertArgs = {
    bookingRequestOfferEventId: Scalars['ID']['input'];
    emoji: Scalars['String']['input'];
};

export type GqlSAdminMutationBookingRequestOfferChatMessageUpdateArgs = {
    bookingRequestOfferEventId: Scalars['ID']['input'];
    message: Scalars['String']['input'];
};

export type GqlSAdminMutationBookingRequestOfferChatMessageVisibilityUpdateArgs = {
    bookingRequestOfferEventId: Scalars['ID']['input'];
    hiddenByAdmin: Scalars['Boolean']['input'];
};

export type GqlSAdminMutationBookingRequestOfferChatReviewAcknowledgeArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSAdminMutationBookingRequestOfferConfiguredMenuUpdateArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
    configuredMenu: GqlSBookingRequestOfferConfiguredMenuInput;
};

export type GqlSAdminMutationBookingRequestOfferCreateArgs = {
    input: GqlSAdminBookingRequestOfferCreate;
};

export type GqlSAdminMutationBookingRequestOfferHandoverArgs = {
    input: GqlSAdminBookingRequestOfferHandover;
};

export type GqlSAdminMutationBookingRequestOfferPayoutAlreadyTookPlaceCheckArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSAdminMutationBookingRequestOfferPayoutMarkOutOfSystemArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSAdminMutationBookingRequestOfferPayoutReleaseArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSAdminMutationBookingRequestOfferPreparationsClearArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSAdminMutationBookingRequestOfferUpdateArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
    input: GqlSAdminBookingRequestOfferUpdate;
};

export type GqlSAdminMutationBookingRequestPublicationApproveArgs = {
    bookingRequestId: Scalars['ID']['input'];
    cookIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type GqlSAdminMutationBookingRequestUpdateArgs = {
    bookingRequestId: Scalars['ID']['input'];
    input: GqlSAdminBookingRequestUpdate;
};

export type GqlSAdminMutationCityCooksUpdateArgs = {
    cityId: Scalars['ID']['input'];
    cookIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCityDeleteArgs = {
    cityId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCityTestimonialsUpdateArgs = {
    cityId: Scalars['ID']['input'];
    entries: Array<GqlSTestimonialJunctionEntryInput>;
};

export type GqlSAdminMutationCityUpsertArgs = {
    input: GqlSCityUpsert;
};

export type GqlSAdminMutationCookApprovalUpdateArgs = {
    cookId: Scalars['ID']['input'];
    isApprovedByAdmin: Scalars['Boolean']['input'];
};

export type GqlSAdminMutationCookBiographySuggestArgs = {
    cookId: Scalars['ID']['input'];
    currentBiography: Scalars['String']['input'];
};

export type GqlSAdminMutationCookBiographySummarySuggestArgs = {
    biography: Scalars['String']['input'];
    cookId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCookMealCreateArgs = {
    cookId: Scalars['ID']['input'];
    meal?: InputMaybe<GqlSCookMealCreate>;
};

export type GqlSAdminMutationCookMealDeleteArgs = {
    mealId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCookMealUpdateArgs = {
    meal: GqlSCookMealUpdate;
    mealId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCookMenuCopyArgs = {
    menuId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCookMenuCreateArgs = {
    cookId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCookMenuDeleteArgs = {
    menuId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCookMenuUpdateArgs = {
    menu: GqlSCookMenuUpdate;
    menuId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCookTestimonialCreateArgs = {
    input: GqlSAdminCookTestimonialCreate;
};

export type GqlSAdminMutationCookTestimonialDeleteArgs = {
    cookTestimonialId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCookTestimonialImageUpdateArgs = {
    cookTestimonialId: Scalars['ID']['input'];
    imageFileUploadIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCookTestimonialPublishArgs = {
    cookTestimonialId: Scalars['ID']['input'];
    publicationStatus: GqlSTestimonialPublicationStatus;
};

export type GqlSAdminMutationCookTestimonialUpdateArgs = {
    cookTestimonialId: Scalars['ID']['input'];
    input: GqlSAdminCookTestimonialUpdate;
};

export type GqlSAdminMutationCookUpdateArgs = {
    cookId: Scalars['ID']['input'];
    input: GqlSCookUpdate;
};

export type GqlSAdminMutationCustomerTestimonialCreateArgs = {
    input: GqlSAdminCustomerTestimonialCreate;
};

export type GqlSAdminMutationCustomerTestimonialDeleteArgs = {
    customerTestimonialId: Scalars['ID']['input'];
};

export type GqlSAdminMutationCustomerTestimonialImageUpdateArgs = {
    customerTestimonialId: Scalars['ID']['input'];
    imageFileUploadIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationCustomerTestimonialPublishArgs = {
    customerTestimonialId: Scalars['ID']['input'];
    publicationStatus: GqlSTestimonialPublicationStatus;
};

export type GqlSAdminMutationCustomerTestimonialUpdateArgs = {
    customerTestimonialId: Scalars['ID']['input'];
    input: GqlSAdminCustomerTestimonialUpdate;
};

export type GqlSAdminMutationFeatureToggleUpdateArgs = {
    enabled: Scalars['Boolean']['input'];
    featureToggleKey: GqlSFeatureToggleKey;
};

export type GqlSAdminMutationFeatureToggleUserOverrideDeleteArgs = {
    featureToggleKey: GqlSFeatureToggleKey;
    userId: Scalars['ID']['input'];
};

export type GqlSAdminMutationFeatureToggleUserOverrideUpsertArgs = {
    enabled: Scalars['Boolean']['input'];
    featureToggleKey: GqlSFeatureToggleKey;
    userId: Scalars['ID']['input'];
};

export type GqlSAdminMutationGiftCardPdfsRegenerateArgs = {
    giftCardId: Scalars['ID']['input'];
};

export type GqlSAdminMutationLegalImprintDraftUpdateArgs = {
    input: GqlSAdminLegalDocumentDraftInput;
};

export type GqlSAdminMutationLegalImprintPublishArgs = {
    imprintId: Scalars['ID']['input'];
};

export type GqlSAdminMutationLegalPrivacyPolicyDraftUpdateArgs = {
    input: GqlSAdminLegalDocumentDraftInput;
};

export type GqlSAdminMutationLegalPrivacyPolicyPublishArgs = {
    privacyPolicyId: Scalars['ID']['input'];
};

export type GqlSAdminMutationLegalTermsAndConditionsDraftUpdateArgs = {
    input: GqlSAdminLegalDocumentDraftInput;
};

export type GqlSAdminMutationLegalTermsAndConditionsPublishArgs = {
    termsAndConditionsId: Scalars['ID']['input'];
};

export type GqlSAdminMutationOccasionCooksUpdateArgs = {
    cookIds: Array<Scalars['ID']['input']>;
    occasionId: Scalars['ID']['input'];
};

export type GqlSAdminMutationOccasionDeleteArgs = {
    occasionId: Scalars['ID']['input'];
};

export type GqlSAdminMutationOccasionTestimonialsUpdateArgs = {
    entries: Array<GqlSTestimonialJunctionEntryInput>;
    occasionId: Scalars['ID']['input'];
};

export type GqlSAdminMutationOccasionUpsertArgs = {
    input: GqlSOccasionUpsert;
};

export type GqlSAdminMutationPartnerCooksUpdateArgs = {
    cookIds: Array<Scalars['ID']['input']>;
    partnerId: Scalars['ID']['input'];
};

export type GqlSAdminMutationPartnerDeleteArgs = {
    partnerId: Scalars['ID']['input'];
};

export type GqlSAdminMutationPartnerTestimonialsUpdateArgs = {
    entries: Array<GqlSTestimonialJunctionEntryInput>;
    partnerId: Scalars['ID']['input'];
};

export type GqlSAdminMutationPartnerUpsertArgs = {
    input: GqlSPartnerUpsert;
};

export type GqlSAdminMutationPromoCodeCreateArgs = {
    input: GqlSAdminPromoCodeCreate;
};

export type GqlSAdminMutationPromoCodeUpdateArgs = {
    input: GqlSAdminPromoCodeUpdate;
};

export type GqlSAdminMutationQueuedJobCancelArgs = {
    jobId: Scalars['ID']['input'];
    name: Scalars['String']['input'];
};

export type GqlSAdminMutationSessionUserBindArgs = {
    userId: Scalars['ID']['input'];
};

export type GqlSAdminMutationSupportRequestMessageCreateArgs = {
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    message: Scalars['String']['input'];
    supportRequestId: Scalars['ID']['input'];
};

export type GqlSAdminMutationSupportRequestResolveArgs = {
    notifyCustomer?: Scalars['Boolean']['input'];
    supportRequestId: Scalars['ID']['input'];
};

export type GqlSAdminMutationSupportRequestUnreadNotificationCountResetArgs = {
    supportRequestId: Scalars['ID']['input'];
};

export type GqlSAdminMutationTerminateSessionsArgs = {
    sessionIds: Array<Scalars['ID']['input']>;
};

export type GqlSAdminMutationUserAdminNoteUpdateArgs = {
    adminNote: Scalars['String']['input'];
    userId: Scalars['ID']['input'];
};

export type GqlSAdminMutationUserAnonymizeArgs = {
    userId: Scalars['ID']['input'];
};

export type GqlSAdminMutationUserCreateArgs = {
    input: GqlSAdminUserCreate;
};

export type GqlSAdminMutationUserEmailAddressUpdateArgs = {
    emailAddress: Scalars['EmailAddress']['input'];
    userId: Scalars['ID']['input'];
};

export type GqlSAdminMutationUserStatusUpdateArgs = {
    status: GqlSUserStatus;
    userId: Scalars['ID']['input'];
};

export type GqlSAdminMutationUserUpdateArgs = {
    user: GqlSUserUpdate;
    userId: Scalars['ID']['input'];
};

export type GqlSAdminMutationWebPageUpdateArgs = {
    input: GqlSAdminWebPageUpdate;
    webPageKey: GqlSWebPageKey;
};

export type GqlSAdminMutationWhatsAppConversationUnreadCountResetArgs = {
    whatsAppConversationId: Scalars['ID']['input'];
};

export type GqlSAdminMutationWhatsAppMessageCreateArgs = {
    message: Scalars['String']['input'];
    whatsAppConversationId: Scalars['ID']['input'];
};

export type GqlSAdminMutationWhatsAppMessageReactionUpsertArgs = {
    emoji: Scalars['String']['input'];
    whatsAppMessageId: Scalars['ID']['input'];
};

export interface GqlSAdminObjectStorageObject {
    __typename?: 'AdminObjectStorageObject';
    etag?: Maybe<Scalars['String']['output']>;
    key: Scalars['String']['output'];
    lastModified?: Maybe<Scalars['DateTime']['output']>;
    size: Scalars['Int']['output'];
}

export type GqlSAdminObjectStorageObjectCriterion = {
    continuationToken?: InputMaybe<Scalars['String']['input']>;
    prefix?: InputMaybe<Scalars['String']['input']>;
    take?: InputMaybe<Scalars['Int']['input']>;
};

export interface GqlSAdminObjectStorageObjectPage {
    __typename?: 'AdminObjectStorageObjectPage';
    bucket?: Maybe<Scalars['String']['output']>;
    configured: Scalars['Boolean']['output'];
    isTruncated: Scalars['Boolean']['output'];
    nextContinuationToken?: Maybe<Scalars['String']['output']>;
    objects: Array<GqlSAdminObjectStorageObject>;
}

export interface GqlSAdminOccasion {
    __typename?: 'AdminOccasion';
    cooks: Array<GqlSAdminOccasionCook>;
    createdAt: Scalars['DateTime']['output'];
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    firstSectionBodyDe: Scalars['String']['output'];
    firstSectionBodyEn: Scalars['String']['output'];
    firstSectionHeadlineDe: Scalars['String']['output'];
    firstSectionHeadlineEn: Scalars['String']['output'];
    firstSectionImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    firstSectionImageUrl?: Maybe<Scalars['String']['output']>;
    formatsSection: GqlSOccasionFormatsSection;
    headlineDe: Scalars['String']['output'];
    headlineEn: Scalars['String']['output'];
    heroImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    heroImageUrl?: Maybe<Scalars['String']['output']>;
    name: Scalars['String']['output'];
    occasionId: Scalars['ID']['output'];
    pathName: Scalars['String']['output'];
    previousPathNames: Array<Scalars['String']['output']>;
    promo?: Maybe<GqlSOccasionPromo>;
    promoCodeId?: Maybe<Scalars['ID']['output']>;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    sections: Array<GqlSContentSection>;
    subHeadlineDe: Scalars['String']['output'];
    subHeadlineEn: Scalars['String']['output'];
    testimonials: Array<GqlSAdminOccasionTestimonial>;
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSAdminOccasionCook {
    __typename?: 'AdminOccasionCook';
    cook: GqlSAdminCook;
    isPubliclyListed: Scalars['Boolean']['output'];
    position: Scalars['Int']['output'];
}

export interface GqlSAdminOccasionTestimonial {
    __typename?: 'AdminOccasionTestimonial';
    index: Scalars['Int']['output'];
    testimonial: GqlSAdminTestimonial;
}

export interface GqlSAdminOutboundEmail {
    __typename?: 'AdminOutboundEmail';
    attachments: Array<GqlSFileUpload>;
    bouncedAt?: Maybe<Scalars['DateTime']['output']>;
    clickedAt?: Maybe<Scalars['DateTime']['output']>;
    complainedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    deliveredAt?: Maybe<Scalars['DateTime']['output']>;
    deliveryDelayedAt?: Maybe<Scalars['DateTime']['output']>;
    failedAt?: Maybe<Scalars['DateTime']['output']>;
    failureReason?: Maybe<Scalars['String']['output']>;
    fromEmail?: Maybe<Scalars['String']['output']>;
    locale: Scalars['String']['output'];
    openedAt?: Maybe<Scalars['DateTime']['output']>;
    outboundEmailId: Scalars['ID']['output'];
    provider: GqlSAdminOutboundEmailProvider;
    providerMessageId?: Maybe<Scalars['String']['output']>;
    purpose: GqlSAdminOutboundEmailPurpose;
    relatedEntityId?: Maybe<Scalars['ID']['output']>;
    relatedEntityType?: Maybe<GqlSAdminOutboundEmailRelatedEntityType>;
    sentAt?: Maybe<Scalars['DateTime']['output']>;
    subject: Scalars['String']['output'];
    toEmail: Scalars['String']['output'];
    user?: Maybe<GqlSAdminUser>;
    userId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSAdminOutboundEmailCriterion = {
    lifecycleStatuses?: InputMaybe<Array<GqlSAdminOutboundEmailLifecycleStatus>>;
    purposes: Array<GqlSAdminOutboundEmailPurpose>;
    relatedEntityId?: InputMaybe<Scalars['ID']['input']>;
    relatedEntityType?: InputMaybe<GqlSAdminOutboundEmailRelatedEntityType>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    sortDirection?: InputMaybe<GqlSSortDirection>;
    sortField?: InputMaybe<GqlSAdminOutboundEmailSortField>;
    take?: Scalars['Int']['input'];
    userIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type GqlSAdminOutboundEmailLifecycleStatus = 'BOUNCED' | 'FAILED' | 'OPENED' | 'PENDING' | 'SENT';

export type GqlSAdminOutboundEmailProvider = 'console' | 'resend';

export type GqlSAdminOutboundEmailPurpose =
    | 'AUTH_EMAIL_OTP'
    | 'BOOKING_REQUEST_CANCELED'
    | 'BOOKING_REQUEST_COOK_NOTIFY'
    | 'BOOKING_REQUEST_CREATED'
    | 'BOOKING_REQUEST_OFFER_ACCEPTED'
    | 'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK'
    | 'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_CUSTOMER'
    | 'BOOKING_REQUEST_OFFER_CREATED'
    | 'BOOKING_REQUEST_OFFER_DECLINED'
    | 'BOOKING_REQUEST_OFFER_MENU_UPDATED'
    | 'BOOKING_REQUEST_OFFER_NOT_CHOSEN'
    | 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_ACCEPTED'
    | 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_DECLINED'
    | 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_REQUESTED'
    | 'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED'
    | 'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT'
    | 'BOOKING_REQUEST_UPDATED'
    | 'CALL_SLOT_BOOKING_CANCEL'
    | 'CALL_SLOT_BOOKING_CONFIRM'
    | 'CALL_SLOT_BOOKING_DECLINE'
    | 'CALL_SLOT_BOOKING_REMINDER'
    | 'CALL_SLOT_BOOKING_REQUEST'
    | 'COOK_APPROVED_BY_ADMIN'
    | 'EMAIL_ADDRESS_UPDATE_CONFIRM'
    | 'GIFT_CARD_PURCHASED'
    | 'SUPPORT_REQUEST_CREATED'
    | 'SUPPORT_REQUEST_MESSAGE_FROM_ADMIN'
    | 'SUPPORT_REQUEST_RESOLVED'
    | 'TESTIMONIAL_MEMORY_NUDGE_COOK'
    | 'TESTIMONIAL_MEMORY_NUDGE_CUSTOMER'
    | 'TESTIMONIAL_REMINDER_EVENING_COOK'
    | 'TESTIMONIAL_REMINDER_EVENING_CUSTOMER'
    | 'TESTIMONIAL_REMINDER_MORNING_COOK'
    | 'TESTIMONIAL_REMINDER_MORNING_CUSTOMER';

export interface GqlSAdminOutboundEmailPurposeStat {
    __typename?: 'AdminOutboundEmailPurposeStat';
    count: Scalars['Int']['output'];
    purpose: GqlSAdminOutboundEmailPurpose;
}

export interface GqlSAdminOutboundEmailRecipientStat {
    __typename?: 'AdminOutboundEmailRecipientStat';
    count: Scalars['Int']['output'];
    displayName?: Maybe<Scalars['String']['output']>;
    toEmail: Scalars['String']['output'];
    userId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSAdminOutboundEmailRelatedEntityType =
    'BOOKING_REQUEST' | 'BOOKING_REQUEST_OFFER' | 'COOK' | 'COOK_CALL_SLOT_BOOKING' | 'GIFT_CARD' | 'SUPPORT_REQUEST';

export type GqlSAdminOutboundEmailSortField = 'createdAt' | 'subject' | 'toEmail';

export interface GqlSAdminPartner {
    __typename?: 'AdminPartner';
    cooks: Array<GqlSAdminPartnerCook>;
    createdAt: Scalars['DateTime']['output'];
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    firstSectionBodyDe: Scalars['String']['output'];
    firstSectionBodyEn: Scalars['String']['output'];
    firstSectionCtaUrl?: Maybe<Scalars['String']['output']>;
    firstSectionHeadlineDe: Scalars['String']['output'];
    firstSectionHeadlineEn: Scalars['String']['output'];
    firstSectionImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    firstSectionImageOverlay: Scalars['Boolean']['output'];
    firstSectionImageUrl?: Maybe<Scalars['String']['output']>;
    headlineDe: Scalars['String']['output'];
    headlineEn: Scalars['String']['output'];
    heroImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    heroImageOverlay: Scalars['Boolean']['output'];
    heroImageUrl?: Maybe<Scalars['String']['output']>;
    howItWorksAlternativeMedia: Scalars['Boolean']['output'];
    name: Scalars['String']['output'];
    partnerId: Scalars['ID']['output'];
    pathName: Scalars['String']['output'];
    previousPathNames: Array<Scalars['String']['output']>;
    promo?: Maybe<GqlSPartnerPromo>;
    promoCodeId?: Maybe<Scalars['ID']['output']>;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    sections: Array<GqlSContentSection>;
    subHeadlineDe: Scalars['String']['output'];
    subHeadlineEn: Scalars['String']['output'];
    testimonials: Array<GqlSAdminPartnerTestimonial>;
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSAdminPartnerCook {
    __typename?: 'AdminPartnerCook';
    cook: GqlSAdminCook;
    isPubliclyListed: Scalars['Boolean']['output'];
    position: Scalars['Int']['output'];
}

export interface GqlSAdminPartnerTestimonial {
    __typename?: 'AdminPartnerTestimonial';
    index: Scalars['Int']['output'];
    testimonial: GqlSAdminTestimonial;
}

export interface GqlSAdminPromoCode {
    __typename?: 'AdminPromoCode';
    amountCents: Scalars['Int']['output'];
    bookingRequests: Array<GqlSAdminBookingRequest>;
    createdAt: Scalars['DateTime']['output'];
    expiresAt: Scalars['DateTime']['output'];
    minimumTotalAmountCustomerCents?: Maybe<Scalars['Int']['output']>;
    promoCodeId: Scalars['ID']['output'];
    redeemCode: Scalars['String']['output'];
    scopedBookingRequestId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSAdminPromoCodeCreate = {
    amountCents: Scalars['Int']['input'];
    expiresAt: Scalars['DateTime']['input'];
    minimumTotalAmountCustomerCents?: InputMaybe<Scalars['Int']['input']>;
    redeemCode: Scalars['String']['input'];
};

export type GqlSAdminPromoCodeCriterion = {
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    sortDirection?: InputMaybe<GqlSSortDirection>;
    sortField?: InputMaybe<GqlSAdminPromoCodeSortField>;
    take?: Scalars['Int']['input'];
};

export type GqlSAdminPromoCodeSortField = 'amountCents' | 'createdAt' | 'expiresAt' | 'redeemCode';

export type GqlSAdminPromoCodeUpdate = {
    expiresAt: Scalars['DateTime']['input'];
    promoCodeId: Scalars['ID']['input'];
};

export interface GqlSAdminQueuedJob {
    __typename?: 'AdminQueuedJob';
    bookingRequestId?: Maybe<Scalars['ID']['output']>;
    bookingRequestOfferId?: Maybe<Scalars['ID']['output']>;
    chatId?: Maybe<Scalars['ID']['output']>;
    cookId?: Maybe<Scalars['ID']['output']>;
    createdOn: Scalars['DateTime']['output'];
    data: Scalars['JSON']['output'];
    giftCardId?: Maybe<Scalars['ID']['output']>;
    jobId: Scalars['ID']['output'];
    name: Scalars['String']['output'];
    startAfter: Scalars['DateTime']['output'];
    state: GqlSAdminQueuedJobState;
    supportRequestId?: Maybe<Scalars['ID']['output']>;
    userId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSAdminQueuedJobState = 'ACTIVE' | 'CREATED' | 'RETRY';

export interface GqlSAdminResendEmailQuota {
    __typename?: 'AdminResendEmailQuota';
    limit?: Maybe<Scalars['Int']['output']>;
    received: Scalars['Int']['output'];
    resetsAt: Scalars['DateTime']['output'];
    sent: Scalars['Int']['output'];
    used: Scalars['Int']['output'];
}

export interface GqlSAdminResendUsage {
    __typename?: 'AdminResendUsage';
    daily: GqlSAdminResendEmailQuota;
    monthly: GqlSAdminResendEmailQuota;
}

export interface GqlSAdminSession {
    __typename?: 'AdminSession';
    connectionActive: Scalars['Boolean']['output'];
    createdAt: Scalars['DateTime']['output'];
    ipHash?: Maybe<Scalars['String']['output']>;
    isBot: Scalars['Boolean']['output'];
    landingPath?: Maybe<Scalars['String']['output']>;
    lastInteractionAt: Scalars['DateTime']['output'];
    referrer?: Maybe<Scalars['String']['output']>;
    sessionId: Scalars['ID']['output'];
    user?: Maybe<GqlSAdminUser>;
    userAgent?: Maybe<Scalars['String']['output']>;
    userId?: Maybe<Scalars['ID']['output']>;
    wasTerminatedAt?: Maybe<Scalars['DateTime']['output']>;
}

export type GqlSAdminSessionCriterion = {
    kinds: Array<GqlSAdminSessionKind>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    sortDirection?: InputMaybe<GqlSSortDirection>;
    sortField?: InputMaybe<GqlSAdminSessionSortField>;
    take?: Scalars['Int']['input'];
    userIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export interface GqlSAdminSessionEvent {
    __typename?: 'AdminSessionEvent';
    createdAt: Scalars['DateTime']['output'];
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    link?: Maybe<Scalars['String']['output']>;
    sessionEventId: Scalars['ID']['output'];
    sessionId: Scalars['ID']['output'];
    type: Scalars['String']['output'];
}

export type GqlSAdminSessionEventCriterion = {
    sessionIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    skip?: Scalars['Int']['input'];
    take?: Scalars['Int']['input'];
    types?: InputMaybe<Array<Scalars['String']['input']>>;
    userIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type GqlSAdminSessionKind = 'bot' | 'human';

export type GqlSAdminSessionSortField = 'createdAt' | 'lastInteractionAt' | 'user' | 'userAgent';

export interface GqlSAdminSupportRequest {
    __typename?: 'AdminSupportRequest';
    adminUnreadNotificationCount: Scalars['Int']['output'];
    bookingRequest?: Maybe<GqlSSupportRequestBookingRequestSummary>;
    createdAt: Scalars['DateTime']['output'];
    customer: GqlSAdminUser;
    messages: Array<GqlSHumanChatMessage>;
    resolvedAt?: Maybe<Scalars['DateTime']['output']>;
    status: GqlSSupportRequestStatus;
    subject: Scalars['String']['output'];
    supportRequestId: Scalars['ID']['output'];
    userId: Scalars['ID']['output'];
}

export type GqlSAdminSupportRequestCriterion = {
    hasAdminUnread?: InputMaybe<Scalars['Boolean']['input']>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    sortField?: InputMaybe<GqlSAdminSupportRequestSortField>;
    statuses?: InputMaybe<Array<GqlSSupportRequestStatus>>;
    supportRequestIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    take?: Scalars['Int']['input'];
    unreadFirst?: InputMaybe<Scalars['Boolean']['input']>;
};

export type GqlSAdminSupportRequestSortField = 'bookingDateTime' | 'createdAt' | 'lastMessageAt';

export type GqlSAdminTestimonial = GqlSAdminCookTestimonial | GqlSAdminCustomerTestimonial;

export interface GqlSAdminTimeBucket {
    __typename?: 'AdminTimeBucket';
    bucketStart: Scalars['DateTime']['output'];
    count: Scalars['Int']['output'];
}

export type GqlSAdminTimeBucketGranularity = 'day' | 'month' | 'week';

export interface GqlSAdminUser {
    __typename?: 'AdminUser';
    adminNote: Scalars['String']['output'];
    birthDate?: Maybe<Scalars['Date']['output']>;
    cook?: Maybe<GqlSAdminCook>;
    createdAt: Scalars['DateTime']['output'];
    emailAddress?: Maybe<Scalars['EmailAddress']['output']>;
    featureToggleOverrides: Array<GqlSAdminFeatureToggleUserOverride>;
    firstName: Scalars['String']['output'];
    lastName: Scalars['String']['output'];
    locale: GqlSLocale;
    phoneNumber?: Maybe<Scalars['PhoneNumber']['output']>;
    preferredCommunication?: Maybe<GqlSUserPreferredCommunication>;
    previousEmailAddresses: Array<Scalars['EmailAddress']['output']>;
    profilePicture?: Maybe<GqlSFileUpload>;
    status: GqlSUserStatus;
    timeZone: Scalars['TimeZone']['output'];
    types: Array<GqlSAdminUserType>;
    userId: Scalars['ID']['output'];
}

export type GqlSAdminUserCreate = {
    asAdmin?: Scalars['Boolean']['input'];
    birthDate: Scalars['Date']['input'];
    cook?: InputMaybe<GqlSCookCreate>;
    emailAddress: Scalars['EmailAddress']['input'];
    firstName: Scalars['String']['input'];
    lastName: Scalars['String']['input'];
    locale?: InputMaybe<GqlSLocale>;
    phoneNumber: Scalars['PhoneNumber']['input'];
    preferredCommunication: GqlSUserPreferredCommunication;
    timeZone?: InputMaybe<Scalars['TimeZone']['input']>;
};

export type GqlSAdminUserCriterion = {
    isApprovedByAdmin?: InputMaybe<Scalars['Boolean']['input']>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    sortDirection?: InputMaybe<GqlSSortDirection>;
    sortField?: InputMaybe<GqlSAdminUserSortField>;
    status?: InputMaybe<GqlSUserStatus>;
    take?: Scalars['Int']['input'];
    types: Array<GqlSAdminUserType>;
    userIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export interface GqlSAdminUserInsights {
    __typename?: 'AdminUserInsights';
    accountCount: Scalars['Int']['output'];
    averageAge?: Maybe<Scalars['Float']['output']>;
    birthDateSampleSize: Scalars['Int']['output'];
    locales: Array<GqlSAdminUserLocaleStat>;
    medianAge?: Maybe<Scalars['Float']['output']>;
    preferredCommunication: Array<GqlSAdminUserPreferredCommunicationStat>;
    timeZones: Array<GqlSAdminUserTimeZoneStat>;
}

export interface GqlSAdminUserLocaleStat {
    __typename?: 'AdminUserLocaleStat';
    count: Scalars['Int']['output'];
    locale: GqlSLocale;
}

export interface GqlSAdminUserPreferredCommunicationStat {
    __typename?: 'AdminUserPreferredCommunicationStat';
    count: Scalars['Int']['output'];
    preferredCommunication?: Maybe<GqlSUserPreferredCommunication>;
}

export type GqlSAdminUserSortField = 'createdAt' | 'emailAddress' | 'firstName' | 'lastName';

export interface GqlSAdminUserTimeZoneStat {
    __typename?: 'AdminUserTimeZoneStat';
    count: Scalars['Int']['output'];
    timeZone: Scalars['TimeZone']['output'];
}

export type GqlSAdminUserType = 'admin' | 'cook' | 'customer';

export interface GqlSAdminUserUpcomingBirthday {
    __typename?: 'AdminUserUpcomingBirthday';
    birthDate: Scalars['Date']['output'];
    firstName: Scalars['String']['output'];
    lastName: Scalars['String']['output'];
    nextBirthday: Scalars['Date']['output'];
    types: Array<GqlSAdminUserType>;
    userId: Scalars['ID']['output'];
}

export interface GqlSAdminWebPage {
    __typename?: 'AdminWebPage';
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    persisted: Scalars['Boolean']['output'];
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
    updatedAt?: Maybe<Scalars['DateTime']['output']>;
    webPageKey: GqlSWebPageKey;
}

export type GqlSAdminWebPageUpdate = {
    descriptionDe: Scalars['String']['input'];
    descriptionEn: Scalars['String']['input'];
    titleDe: Scalars['String']['input'];
    titleEn: Scalars['String']['input'];
};

export interface GqlSAdminWhatsAppConversation {
    __typename?: 'AdminWhatsAppConversation';
    adminUnreadCount: Scalars['Int']['output'];
    createdAt: Scalars['DateTime']['output'];
    customer?: Maybe<GqlSAdminUser>;
    customerServiceWindowExpiresAt?: Maybe<Scalars['DateTime']['output']>;
    displayName?: Maybe<Scalars['String']['output']>;
    lastMessageAt: Scalars['DateTime']['output'];
    lastMessagePreview: Scalars['String']['output'];
    messages: Array<GqlSHumanChatMessage>;
    phoneNumber: Scalars['PhoneNumber']['output'];
    userId?: Maybe<Scalars['ID']['output']>;
    whatsAppConversationId: Scalars['ID']['output'];
}

export type GqlSAdminWhatsAppConversationCriterion = {
    hasAdminUnread?: InputMaybe<Scalars['Boolean']['input']>;
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    take?: Scalars['Int']['input'];
    userId?: InputMaybe<Scalars['ID']['input']>;
};

export interface GqlSAuthEmailOtp {
    __typename?: 'AuthEmailOtp';
    authEmailOtpId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    emailAddress: Scalars['EmailAddress']['output'];
    expiresAt: Scalars['DateTime']['output'];
    verifiedAt?: Maybe<Scalars['DateTime']['output']>;
}

export interface GqlSAuthPasskey {
    __typename?: 'AuthPasskey';
    authPasskeyId: Scalars['ID']['output'];
    backedUp: Scalars['Boolean']['output'];
    createdAt: Scalars['DateTime']['output'];
    deviceType?: Maybe<Scalars['String']['output']>;
}

export interface GqlSAuthTimeBasedOneTimePassword {
    __typename?: 'AuthTimeBasedOneTimePassword';
    authTimeBasedOneTimePasswordId: Scalars['ID']['output'];
    confirmedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    recoveryCodesRemaining: Scalars['Int']['output'];
}

export interface GqlSAuthTotpChallenge {
    __typename?: 'AuthTotpChallenge';
    expiresAt: Scalars['DateTime']['output'];
}

export interface GqlSAuthTotpEnrollConfirmResult {
    __typename?: 'AuthTotpEnrollConfirmResult';
    recoveryCodes: Array<Scalars['String']['output']>;
}

export interface GqlSAuthTotpEnrollStartResult {
    __typename?: 'AuthTotpEnrollStartResult';
    otpauthUrl: Scalars['String']['output'];
    secret: Scalars['String']['output'];
}

export type GqlSBlogPostUpsert = {
    blogPostId?: InputMaybe<Scalars['ID']['input']>;
    descriptionDe: Scalars['String']['input'];
    descriptionEn: Scalars['String']['input'];
    headlineDe: Scalars['String']['input'];
    headlineEn: Scalars['String']['input'];
    heroImageFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    pathName: Scalars['String']['input'];
    publishedAt?: InputMaybe<Scalars['DateTime']['input']>;
    sections: Array<GqlSContentSectionInput>;
    subHeadlineDe: Scalars['String']['input'];
    subHeadlineEn: Scalars['String']['input'];
    titleDe: Scalars['String']['input'];
    titleEn: Scalars['String']['input'];
};

export interface GqlSBookingRequestCookMenuEvaluation {
    __typename?: 'BookingRequestCookMenuEvaluation';
    evaluationSummary: Scalars['String']['output'];
    generatedMenu?: Maybe<GqlSBookingRequestCookMenuEvaluationGeneratedMenu>;
    menus: Array<GqlSBookingRequestCookMenuEvaluationMenu>;
}

export interface GqlSBookingRequestCookMenuEvaluationGeneratedCourse {
    __typename?: 'BookingRequestCookMenuEvaluationGeneratedCourse';
    mealOptions: Array<GqlSBookingRequestCookMenuEvaluationGeneratedMealOption>;
    title: Scalars['String']['output'];
}

export interface GqlSBookingRequestCookMenuEvaluationGeneratedMealOption {
    __typename?: 'BookingRequestCookMenuEvaluationGeneratedMealOption';
    description?: Maybe<Scalars['String']['output']>;
    mealId?: Maybe<Scalars['ID']['output']>;
    title?: Maybe<Scalars['String']['output']>;
    type: GqlSCookMenuSuggestionMealOptionType;
}

export interface GqlSBookingRequestCookMenuEvaluationGeneratedMenu {
    __typename?: 'BookingRequestCookMenuEvaluationGeneratedMenu';
    courses: Array<GqlSBookingRequestCookMenuEvaluationGeneratedCourse>;
    description: Scalars['String']['output'];
    title: Scalars['String']['output'];
}

export interface GqlSBookingRequestCookMenuEvaluationMenu {
    __typename?: 'BookingRequestCookMenuEvaluationMenu';
    evaluationSummary: Scalars['String']['output'];
    isSuitable: Scalars['Boolean']['output'];
    menuId: Scalars['ID']['output'];
}

export interface GqlSBookingRequestCookPoolDetails {
    __typename?: 'BookingRequestCookPoolDetails';
    declinationReason?: Maybe<Scalars['String']['output']>;
    declinedAt?: Maybe<Scalars['DateTime']['output']>;
    firstOpenedAt?: Maybe<Scalars['DateTime']['output']>;
    menuEvaluation?: Maybe<GqlSBookingRequestCookMenuEvaluation>;
    menuEvaluationLoading: Scalars['Boolean']['output'];
    notifiedAt?: Maybe<Scalars['DateTime']['output']>;
}

export interface GqlSBookingRequestOfferCallRecording {
    __typename?: 'BookingRequestOfferCallRecording';
    audioUrl?: Maybe<Scalars['String']['output']>;
    bookingRequestOfferCallRecordingId: Scalars['ID']['output'];
    bookingRequestOfferCallRoomId: Scalars['ID']['output'];
    byteSize?: Maybe<Scalars['Int']['output']>;
    completedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    errorMessage?: Maybe<Scalars['String']['output']>;
    mediaType?: Maybe<Scalars['String']['output']>;
    status: GqlSBookingRequestOfferCallRecordingStatus;
    summaryText?: Maybe<Scalars['String']['output']>;
    transcriptSegments?: Maybe<Array<GqlSBookingRequestOfferCallTranscriptSegment>>;
    transcriptText?: Maybe<Scalars['String']['output']>;
}

export type GqlSBookingRequestOfferCallRecordingStatus = 'COMPLETED' | 'EGRESS_COMPLETE' | 'FAILED' | 'PENDING' | 'TRANSCRIBING';

export interface GqlSBookingRequestOfferCallRoom {
    __typename?: 'BookingRequestOfferCallRoom';
    bookingRequestOfferCallRoomId: Scalars['ID']['output'];
    bookingRequestOfferId: Scalars['ID']['output'];
    createdByUserId: Scalars['ID']['output'];
    endedAt?: Maybe<Scalars['DateTime']['output']>;
    livekitRoomName: Scalars['String']['output'];
    startedAt: Scalars['DateTime']['output'];
    status: GqlSBookingRequestOfferCallRoomStatus;
}

export type GqlSBookingRequestOfferCallRoomStatus = 'ACTIVE' | 'ENDED';

export interface GqlSBookingRequestOfferCallTokenResult {
    __typename?: 'BookingRequestOfferCallTokenResult';
    bookingRequestOfferCallRoomParticipantId: Scalars['ID']['output'];
    token: Scalars['String']['output'];
    url: Scalars['String']['output'];
}

export interface GqlSBookingRequestOfferCallTranscriptSegment {
    __typename?: 'BookingRequestOfferCallTranscriptSegment';
    endedAtMs: Scalars['Int']['output'];
    speakerLabel?: Maybe<Scalars['String']['output']>;
    startedAtMs: Scalars['Int']['output'];
    text: Scalars['String']['output'];
}

export interface GqlSBookingRequestOfferConfiguredMenu {
    __typename?: 'BookingRequestOfferConfiguredMenu';
    courses: Array<GqlSBookingRequestOfferConfiguredMenuCourse>;
    description: Scalars['String']['output'];
    menuId?: Maybe<Scalars['ID']['output']>;
    title: Scalars['String']['output'];
}

export interface GqlSBookingRequestOfferConfiguredMenuCourse {
    __typename?: 'BookingRequestOfferConfiguredMenuCourse';
    meals: Array<GqlSBookingRequestOfferConfiguredMenuMeal>;
    title: Scalars['String']['output'];
}

export type GqlSBookingRequestOfferConfiguredMenuCourseInput = {
    meals: Array<GqlSBookingRequestOfferConfiguredMenuMealInput>;
    title: Scalars['String']['input'];
};

export type GqlSBookingRequestOfferConfiguredMenuCourseSelectionInput = {
    courseId: Scalars['ID']['input'];
    mealIds: Array<Scalars['ID']['input']>;
};

export type GqlSBookingRequestOfferConfiguredMenuInput = {
    courses: Array<GqlSBookingRequestOfferConfiguredMenuCourseInput>;
    description: Scalars['String']['input'];
    title: Scalars['String']['input'];
};

export interface GqlSBookingRequestOfferConfiguredMenuMeal {
    __typename?: 'BookingRequestOfferConfiguredMenuMeal';
    mealDescription: Scalars['String']['output'];
    mealImageUrl?: Maybe<Scalars['String']['output']>;
    mealTitle: Scalars['String']['output'];
}

export type GqlSBookingRequestOfferConfiguredMenuMealInput = {
    mealDescription: Scalars['String']['input'];
    mealImageUrl?: InputMaybe<Scalars['String']['input']>;
    mealTitle: Scalars['String']['input'];
};

export type GqlSBookingRequestOfferCreate = {
    bookingRequestId: Scalars['ID']['input'];
    menuPriceCents: Scalars['Int']['input'];
    message?: InputMaybe<Scalars['String']['input']>;
    suggestedMenuIds: Array<Scalars['ID']['input']>;
};

export interface GqlSBookingRequestOfferParticipantAmendment {
    __typename?: 'BookingRequestOfferParticipantAmendment';
    menuPriceCentsAfter: Scalars['Int']['output'];
    menuPriceCentsBefore: Scalars['Int']['output'];
    participants: Array<GqlSBookingRequestOfferParticipantAmendmentParticipant>;
    payoutCentsCookAfter: Scalars['Int']['output'];
    payoutCentsCookBefore: Scalars['Int']['output'];
    requestedAt: Scalars['DateTime']['output'];
    totalCentsCustomerAfter: Scalars['Int']['output'];
    totalCentsCustomerBefore: Scalars['Int']['output'];
}

export interface GqlSBookingRequestOfferParticipantAmendmentParticipant {
    __typename?: 'BookingRequestOfferParticipantAmendmentParticipant';
    name: Scalars['String']['output'];
    restrictions: Array<Scalars['String']['output']>;
    type: GqlSBookingRequestParticipantType;
}

export interface GqlSBookingRequestOfferPayment {
    __typename?: 'BookingRequestOfferPayment';
    clientSecret: Scalars['String']['output'];
    publishableKey: Scalars['String']['output'];
    type: GqlSBookingRequestOfferPaymentDataType;
}

export type GqlSBookingRequestOfferPaymentDataType = 'PAYMENT_INTENT' | 'SETUP_INTENT';

export type GqlSBookingRequestOfferPaymentStatus = 'EMPTY' | 'FAILED' | 'PAYED' | 'PAYED_OUT_OF_SYSTEM' | 'SETUP' | 'TRANSFERRED';

export type GqlSBookingRequestOfferPriceAutoAdjustReason = 'PARTICIPANTS' | 'PARTICIPANTS_AND_TRAVEL' | 'TRAVEL' | 'UNKNOWN';

export type GqlSBookingRequestOfferPriceUpdate = {
    bookingRequestOfferId: Scalars['ID']['input'];
    menuPriceCents: Scalars['Int']['input'];
};

export type GqlSBookingRequestOfferStatus =
    | 'CANCELED'
    | 'COMPLETED'
    | 'COOK_DECLINED'
    | 'COOK_NEEDS_TO_ACCEPT'
    | 'EVENT_PENDING'
    | 'EXPIRED'
    | 'PAYMENT_PULL_PENDING'
    | 'USER_CHOOSE_DIFFERENT_OFFER'
    | 'USER_DECLINED'
    | 'USER_NEEDS_DEPOSIT_PAYMENT'
    | 'USER_NEEDS_TO_ACCEPT'
    | 'USER_REQUESTED_MENU_CHANGES';

export type GqlSBookingRequestOfferSuggestedMenusUpdate = {
    bookingRequestOfferId: Scalars['ID']['input'];
    suggestedMenuIds: Array<Scalars['ID']['input']>;
};

export interface GqlSBookingRequestParticipant {
    __typename?: 'BookingRequestParticipant';
    bookingRequestParticipantId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    name: Scalars['String']['output'];
    restrictions: Array<Scalars['String']['output']>;
    type: GqlSBookingRequestParticipantType;
}

export type GqlSBookingRequestParticipantType = 'ADULT' | 'DISCOUNTED';

export type GqlSBookingRequestPriceClassType = 'HIGH' | 'LOW' | 'MEDIUM';

export type GqlSBookingRequestPublicationStatus =
    'PUBLICATION_APPROVED_BY_ADMIN' | 'PUBLICATION_AUTO_APPROVED' | 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW';

export type GqlSBookingRequestStatus =
    | 'CANCELED'
    | 'COMPLETED'
    | 'DEPOSIT_PAYMENT_PENDING'
    | 'EVENT_PENDING'
    | 'EXPIRED'
    | 'OFFERS_WAITING_FOR_REVIEW'
    | 'PAYMENT_PULL_PENDING'
    | 'WAITING_FOR_OFFERS';

export interface GqlSChat {
    __typename?: 'Chat';
    chatId: Scalars['ID']['output'];
    lastModifiedAt: Scalars['DateTime']['output'];
    surface?: Maybe<GqlSChatSurface>;
    title: Scalars['String']['output'];
    turns: Array<GqlSChatTurn>;
    userId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSChatAssistantOptions = {
    requireToolCallApprovals: Scalars['Boolean']['input'];
};

export interface GqlSChatMessage {
    __typename?: 'ChatMessage';
    attachments: Array<GqlSFileUpload>;
    chatMessageId: Scalars['ID']['output'];
    chatTurnId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    lastModifiedAt: Scalars['DateTime']['output'];
    parts: Array<GqlSChatMessagePart>;
    revision: Scalars['Int']['output'];
    role: GqlSChatMessageRole;
    status: GqlSChatMessageStatus;
}

export interface GqlSChatMessageBookingRequestOfferEvent {
    __typename?: 'ChatMessageBookingRequestOfferEvent';
    chatMessageId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    payload: Scalars['JSON']['output'];
    type: GqlSChatMessageBookingRequestOfferEventType;
}

export type GqlSChatMessageBookingRequestOfferEventType =
    | 'ADMIN_HANDED_OVER_CLOSED'
    | 'ADMIN_HANDED_OVER_TO_COOK'
    | 'ADMIN_PREPARATIONS_CLEARED'
    | 'COOK_ACCEPTED'
    | 'COOK_CALL_SLOT_CANCELLED'
    | 'COOK_CALL_SLOT_CONFIRMED'
    | 'COOK_CALL_SLOT_DECLINED'
    | 'COOK_CALL_SLOT_REQUESTED'
    | 'COOK_CHANGED_PRICE'
    | 'COOK_CREATED'
    | 'COOK_DECLINED'
    | 'COOK_PARTICIPANT_AMENDMENT_ACCEPTED'
    | 'COOK_PARTICIPANT_AMENDMENT_DECLINED'
    | 'COOK_PREPARATIONS_COMPLETED'
    | 'COOK_UPDATED_SUGGESTED_MENU'
    | 'SYSTEM_CHANGED_PRICE'
    | 'USER_ACCEPTED'
    | 'USER_CALL_SLOT_CANCELLED'
    | 'USER_CALL_SLOT_CONFIRMED'
    | 'USER_CALL_SLOT_DECLINED'
    | 'USER_CALL_SLOT_REQUESTED'
    | 'USER_CANCELLED'
    | 'USER_CONFIGURED_MENU'
    | 'USER_DATE_UPDATED'
    | 'USER_DECLINED'
    | 'USER_LOCATION_UPDATED'
    | 'USER_PARTICIPANTS_UPDATED'
    | 'USER_PARTICIPANT_AMENDMENT_REQUESTED'
    | 'USER_PREFERENCES_UPDATED'
    | 'USER_REQUESTED_MENU_CHANGES'
    | 'USER_RESTRICTIONS_UPDATED'
    | 'USER_TIME_UPDATED';

export interface GqlSChatMessageCreateResult {
    __typename?: 'ChatMessageCreateResult';
    chatId: Scalars['ID']['output'];
    chatTurnId: Scalars['ID']['output'];
}

export interface GqlSChatMessageDataPart {
    __typename?: 'ChatMessageDataPart';
    data: Scalars['JSON']['output'];
    dataType: Scalars['String']['output'];
    partId: Scalars['ID']['output'];
}

export type GqlSChatMessageDeliveryStatus = 'DELIVERED' | 'FAILED' | 'READ' | 'SENT';

export interface GqlSChatMessageFilePart {
    __typename?: 'ChatMessageFilePart';
    filename?: Maybe<Scalars['String']['output']>;
    mediaType: Scalars['String']['output'];
    partId: Scalars['ID']['output'];
    url: Scalars['String']['output'];
}

export type GqlSChatMessagePart =
    | GqlSChatMessageDataPart
    | GqlSChatMessageFilePart
    | GqlSChatMessageReasoningPart
    | GqlSChatMessageSourceDocumentPart
    | GqlSChatMessageSourceUrlPart
    | GqlSChatMessageTextPart
    | GqlSChatMessageToolPart;

export type GqlSChatMessagePartState = 'DONE' | 'STREAMING';

export interface GqlSChatMessageReaction {
    __typename?: 'ChatMessageReaction';
    emoji: Scalars['String']['output'];
    isOwn: Scalars['Boolean']['output'];
}

export interface GqlSChatMessageReasoningPart {
    __typename?: 'ChatMessageReasoningPart';
    partId: Scalars['ID']['output'];
    state: GqlSChatMessagePartState;
    text: Scalars['String']['output'];
}

export type GqlSChatMessageRole = 'ASSISTANT' | 'USER';

export interface GqlSChatMessageSourceDocumentPart {
    __typename?: 'ChatMessageSourceDocumentPart';
    filename?: Maybe<Scalars['String']['output']>;
    mediaType: Scalars['String']['output'];
    partId: Scalars['ID']['output'];
    sourceId: Scalars['ID']['output'];
    title: Scalars['String']['output'];
}

export interface GqlSChatMessageSourceUrlPart {
    __typename?: 'ChatMessageSourceUrlPart';
    partId: Scalars['ID']['output'];
    sourceId: Scalars['ID']['output'];
    title?: Maybe<Scalars['String']['output']>;
    url: Scalars['String']['output'];
}

export type GqlSChatMessageStatus = 'CANCELLED' | 'COMPLETE' | 'FAILED' | 'PENDING' | 'STREAMING';

export interface GqlSChatMessageTextPart {
    __typename?: 'ChatMessageTextPart';
    partId: Scalars['ID']['output'];
    state: GqlSChatMessagePartState;
    text: Scalars['String']['output'];
}

export interface GqlSChatMessageToolPart {
    __typename?: 'ChatMessageToolPart';
    approval?: Maybe<GqlSChatToolApproval>;
    debug?: Maybe<GqlSChatToolDebug>;
    partId: Scalars['ID']['output'];
    preliminary: Scalars['Boolean']['output'];
    providerExecuted: Scalars['Boolean']['output'];
    state: GqlSChatToolState;
    title?: Maybe<Scalars['String']['output']>;
    toolCallId: Scalars['ID']['output'];
    toolName: Scalars['String']['output'];
}

export interface GqlSChatMessageUser {
    __typename?: 'ChatMessageUser';
    attachments: Array<GqlSFileUpload>;
    author: GqlSPublicUser;
    body: Scalars['String']['output'];
    canHardDelete: Scalars['Boolean']['output'];
    chatMessageId: Scalars['ID']['output'];
    collapseLongBody: Scalars['Boolean']['output'];
    createdAt: Scalars['DateTime']['output'];
    deliveryStatus?: Maybe<GqlSChatMessageDeliveryStatus>;
    hiddenByAdmin: Scalars['Boolean']['output'];
    isOwn: Scalars['Boolean']['output'];
    reactions: Array<GqlSChatMessageReaction>;
    showCopyButton: Scalars['Boolean']['output'];
}

export type GqlSChatSurface = 'admin' | 'cook' | 'customer';

export interface GqlSChatToolApproval {
    __typename?: 'ChatToolApproval';
    approvalId: Scalars['ID']['output'];
    descriptor?: Maybe<Scalars['JSON']['output']>;
    reason?: Maybe<Scalars['String']['output']>;
    status: GqlSChatToolApprovalStatus;
}

export type GqlSChatToolApprovalStatus = 'APPROVED' | 'DENIED' | 'REQUESTED';

export interface GqlSChatToolDebug {
    __typename?: 'ChatToolDebug';
    errorText?: Maybe<Scalars['String']['output']>;
    input?: Maybe<Scalars['JSON']['output']>;
    output?: Maybe<Scalars['JSON']['output']>;
}

export type GqlSChatToolState =
    | 'APPROVAL_REQUESTED'
    | 'APPROVAL_RESPONDED'
    | 'INPUT_AVAILABLE'
    | 'INPUT_STREAMING'
    | 'OUTPUT_AVAILABLE'
    | 'OUTPUT_DENIED'
    | 'OUTPUT_ERROR';

export interface GqlSChatTurn {
    __typename?: 'ChatTurn';
    assistantMessage: GqlSChatMessage;
    chatTurnId: Scalars['ID']['output'];
    completedAt?: Maybe<Scalars['DateTime']['output']>;
    createdAt: Scalars['DateTime']['output'];
    debug?: Maybe<GqlSChatTurnDebug>;
    failure?: Maybe<GqlSChatTurnFailure>;
    lastModifiedAt: Scalars['DateTime']['output'];
    locale?: Maybe<GqlSLocale>;
    revision: Scalars['Int']['output'];
    sequence: Scalars['Int']['output'];
    startedAt?: Maybe<Scalars['DateTime']['output']>;
    status: GqlSChatTurnStatus;
    userMessage: GqlSChatMessage;
}

export interface GqlSChatTurnDebug {
    __typename?: 'ChatTurnDebug';
    agentName?: Maybe<Scalars['String']['output']>;
    finishReason?: Maybe<Scalars['String']['output']>;
    modelId?: Maybe<Scalars['String']['output']>;
    usage?: Maybe<GqlSChatTurnUsage>;
}

export interface GqlSChatTurnFailure {
    __typename?: 'ChatTurnFailure';
    code: Scalars['String']['output'];
}

export interface GqlSChatTurnSnapshot {
    __typename?: 'ChatTurnSnapshot';
    turns: Array<GqlSChatTurn>;
}

export type GqlSChatTurnStatus = 'AWAITING_INPUT' | 'CANCELLED' | 'COMPLETE' | 'FAILED' | 'QUEUED' | 'RUNNING';

export type GqlSChatTurnUpdate = GqlSChatTurnSnapshot | GqlSChatTurnUpserted;

export interface GqlSChatTurnUpserted {
    __typename?: 'ChatTurnUpserted';
    turn: GqlSChatTurn;
}

export interface GqlSChatTurnUsage {
    __typename?: 'ChatTurnUsage';
    cachedInputTokens?: Maybe<Scalars['Int']['output']>;
    inputTokens?: Maybe<Scalars['Int']['output']>;
    outputTokens?: Maybe<Scalars['Int']['output']>;
    reasoningTokens?: Maybe<Scalars['Int']['output']>;
    totalTokens?: Maybe<Scalars['Int']['output']>;
}

export interface GqlSCityTestimonial {
    __typename?: 'CityTestimonial';
    index: Scalars['Int']['output'];
    testimonial: GqlSTestimonial;
}

export type GqlSCityUpsert = {
    cityId?: InputMaybe<Scalars['ID']['input']>;
    descriptionDe: Scalars['String']['input'];
    descriptionEn: Scalars['String']['input'];
    firstSectionBodyDe: Scalars['String']['input'];
    firstSectionBodyEn: Scalars['String']['input'];
    firstSectionHeadlineDe: Scalars['String']['input'];
    firstSectionHeadlineEn: Scalars['String']['input'];
    firstSectionImageFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    headlineDe: Scalars['String']['input'];
    headlineEn: Scalars['String']['input'];
    heroImageFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    latitude: Scalars['Latitude']['input'];
    longitude: Scalars['Longitude']['input'];
    nameDe: Scalars['String']['input'];
    nameEn: Scalars['String']['input'];
    pathName: Scalars['String']['input'];
    publishedAt?: InputMaybe<Scalars['DateTime']['input']>;
    sections: Array<GqlSContentSectionInput>;
    subHeadlineDe: Scalars['String']['input'];
    subHeadlineEn: Scalars['String']['input'];
    titleDe: Scalars['String']['input'];
    titleEn: Scalars['String']['input'];
};

export type GqlSClientObservabilityKind = 'GRAPHQL_ERROR' | 'ROUTE_ERROR' | 'WEB_VITAL';

export type GqlSClientObservabilityReportInput = {
    kind: GqlSClientObservabilityKind;
    message?: InputMaybe<Scalars['String']['input']>;
    operationName?: InputMaybe<Scalars['String']['input']>;
    path?: InputMaybe<Scalars['String']['input']>;
    routeId?: InputMaybe<Scalars['String']['input']>;
    value?: InputMaybe<Scalars['Float']['input']>;
    vitalName?: InputMaybe<GqlSClientWebVitalName>;
};

export type GqlSClientWebVitalName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';

export type GqlSContentListStyle = 'BULLET' | 'NUMBERED';

export type GqlSContentSection =
    | GqlSContentSectionContent
    | GqlSContentSectionCta
    | GqlSContentSectionImage
    | GqlSContentSectionList
    | GqlSContentSectionQa
    | GqlSContentSectionQuote;

export interface GqlSContentSectionContent {
    __typename?: 'ContentSectionContent';
    bodyDe: Scalars['String']['output'];
    bodyEn: Scalars['String']['output'];
    imageFileUploadId?: Maybe<Scalars['ID']['output']>;
    imageFirst?: Maybe<Scalars['Boolean']['output']>;
    imageUrl?: Maybe<Scalars['String']['output']>;
    sectionId: Scalars['ID']['output'];
    subtitleDe?: Maybe<Scalars['String']['output']>;
    subtitleEn?: Maybe<Scalars['String']['output']>;
    titleDe?: Maybe<Scalars['String']['output']>;
    titleEn?: Maybe<Scalars['String']['output']>;
}

export interface GqlSContentSectionCta {
    __typename?: 'ContentSectionCta';
    bodyDe?: Maybe<Scalars['String']['output']>;
    bodyEn?: Maybe<Scalars['String']['output']>;
    buttonLabelDe: Scalars['String']['output'];
    buttonLabelEn: Scalars['String']['output'];
    headlineDe: Scalars['String']['output'];
    headlineEn: Scalars['String']['output'];
    href: Scalars['String']['output'];
    sectionId: Scalars['ID']['output'];
}

export interface GqlSContentSectionImage {
    __typename?: 'ContentSectionImage';
    imageFileUploadId: Scalars['ID']['output'];
    imageUrl: Scalars['String']['output'];
    sectionId: Scalars['ID']['output'];
}

export type GqlSContentSectionInput = {
    attributionDe?: InputMaybe<Scalars['String']['input']>;
    attributionEn?: InputMaybe<Scalars['String']['input']>;
    bodyDe?: InputMaybe<Scalars['String']['input']>;
    bodyEn?: InputMaybe<Scalars['String']['input']>;
    buttonLabelDe?: InputMaybe<Scalars['String']['input']>;
    buttonLabelEn?: InputMaybe<Scalars['String']['input']>;
    entries?: InputMaybe<Array<GqlSContentSectionQaEntryInput>>;
    headlineDe?: InputMaybe<Scalars['String']['input']>;
    headlineEn?: InputMaybe<Scalars['String']['input']>;
    href?: InputMaybe<Scalars['String']['input']>;
    imageFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    imageFirst?: InputMaybe<Scalars['Boolean']['input']>;
    itemsDe?: InputMaybe<Array<Scalars['String']['input']>>;
    itemsEn?: InputMaybe<Array<Scalars['String']['input']>>;
    kind: GqlSContentSectionKind;
    quoteDe?: InputMaybe<Scalars['String']['input']>;
    quoteEn?: InputMaybe<Scalars['String']['input']>;
    sectionId: Scalars['ID']['input'];
    style?: InputMaybe<GqlSContentListStyle>;
    subtitleDe?: InputMaybe<Scalars['String']['input']>;
    subtitleEn?: InputMaybe<Scalars['String']['input']>;
    titleDe?: InputMaybe<Scalars['String']['input']>;
    titleEn?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSContentSectionKind = 'content' | 'cta' | 'image' | 'list' | 'qa' | 'quote';

export interface GqlSContentSectionList {
    __typename?: 'ContentSectionList';
    itemsDe: Array<Scalars['String']['output']>;
    itemsEn: Array<Scalars['String']['output']>;
    sectionId: Scalars['ID']['output'];
    style: GqlSContentListStyle;
    titleDe?: Maybe<Scalars['String']['output']>;
    titleEn?: Maybe<Scalars['String']['output']>;
}

export interface GqlSContentSectionQa {
    __typename?: 'ContentSectionQa';
    entries: Array<GqlSContentSectionQaEntry>;
    sectionId: Scalars['ID']['output'];
    titleDe?: Maybe<Scalars['String']['output']>;
    titleEn?: Maybe<Scalars['String']['output']>;
}

export interface GqlSContentSectionQaEntry {
    __typename?: 'ContentSectionQaEntry';
    answerDe: Scalars['String']['output'];
    answerEn: Scalars['String']['output'];
    entryId: Scalars['ID']['output'];
    questionDe: Scalars['String']['output'];
    questionEn: Scalars['String']['output'];
}

export type GqlSContentSectionQaEntryInput = {
    answerDe: Scalars['String']['input'];
    answerEn?: InputMaybe<Scalars['String']['input']>;
    entryId: Scalars['ID']['input'];
    questionDe: Scalars['String']['input'];
    questionEn?: InputMaybe<Scalars['String']['input']>;
};

export interface GqlSContentSectionQuote {
    __typename?: 'ContentSectionQuote';
    attributionDe?: Maybe<Scalars['String']['output']>;
    attributionEn?: Maybe<Scalars['String']['output']>;
    quoteDe: Scalars['String']['output'];
    quoteEn: Scalars['String']['output'];
    sectionId: Scalars['ID']['output'];
}

export interface GqlSCook {
    __typename?: 'Cook';
    biography: Scalars['String']['output'];
    biographySummary: Scalars['String']['output'];
    biographySummaryGenerating: Scalars['Boolean']['output'];
    bookingRequest?: Maybe<GqlSCookBookingRequest>;
    bookingRequestLookup: GqlSCookBookingRequestLookupResult;
    bookingRequestOffer?: Maybe<GqlSCookBookingRequestOffer>;
    bookingRequestOffers: Array<GqlSCookBookingRequestOffer>;
    bookingRequests: Array<GqlSCookBookingRequest>;
    callAvailabilityExceptions: Array<GqlSCookCallAvailabilityException>;
    callAvailabilityRules: Array<GqlSCookCallAvailabilityRule>;
    callDurationMinutes: Scalars['Int']['output'];
    callSchedulingEnabled: Scalars['Boolean']['output'];
    callSlotBookings: Array<GqlSCookCallSlotBooking>;
    callSlots: Array<GqlSCookCallSlot>;
    canCreateOffers: Scalars['Boolean']['output'];
    cookId: Scalars['ID']['output'];
    cookingPhilosophy?: Maybe<Scalars['String']['output']>;
    cuisineStyle?: Maybe<Scalars['String']['output']>;
    exactTravelOriginAddress?: Maybe<GqlSCookTravelOriginAddress>;
    isApprovedByAdmin: Scalars['Boolean']['output'];
    isVisible: Scalars['Boolean']['output'];
    lastModifiedAt: Scalars['DateTime']['output'];
    logo?: Maybe<GqlSFileUpload>;
    maximumParticipants?: Maybe<Scalars['Int']['output']>;
    maximumPriceAmount?: Maybe<Scalars['Int']['output']>;
    maximumTravelDistance?: Maybe<Scalars['Int']['output']>;
    meal?: Maybe<GqlSCookMeal>;
    meals: Array<GqlSCookMeal>;
    mealsCounts: Array<Scalars['Int']['output']>;
    menu?: Maybe<GqlSCookMenu>;
    menus: Array<GqlSCookMenu>;
    menusCounts: Array<Scalars['Int']['output']>;
    minimumParticipants?: Maybe<Scalars['Int']['output']>;
    minimumPriceAmount?: Maybe<Scalars['Int']['output']>;
    offerMenus: Array<GqlSCookMenu>;
    rating: GqlSPublicCookRating;
    stageName?: Maybe<Scalars['String']['output']>;
    stripeAccountDetails?: Maybe<GqlSCookStripeAccountDetails>;
    stripeStatus: GqlSCookStripeStatus;
    stripeWallet?: Maybe<GqlSCookStripeWallet>;
    travelExpensesAmount: Scalars['Int']['output'];
}

export type GqlSCookBookingRequestArgs = {
    bookingRequestId: Scalars['ID']['input'];
};

export type GqlSCookBookingRequestLookupArgs = {
    bookingRequestId: Scalars['ID']['input'];
};

export type GqlSCookBookingRequestOfferArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSCookBookingRequestOffersArgs = {
    criterion?: InputMaybe<GqlSCookBookingRequestOfferFindManyCriterion>;
};

export type GqlSCookBookingRequestsArgs = {
    criterion?: InputMaybe<GqlSCookBookingRequestFindManyCriterion>;
};

export type GqlSCookCallAvailabilityExceptionsArgs = {
    from: Scalars['Date']['input'];
    to: Scalars['Date']['input'];
};

export type GqlSCookCallSlotBookingsArgs = {
    criterion?: InputMaybe<GqlSCookCallSlotBookingCriterion>;
};

export type GqlSCookCallSlotsArgs = {
    from: Scalars['DateTime']['input'];
    to: Scalars['DateTime']['input'];
};

export type GqlSCookMealArgs = {
    mealId: Scalars['ID']['input'];
};

export type GqlSCookMealsCountsArgs = {
    criteria: Array<GqlSCookMealCriterion>;
};

export type GqlSCookMenuArgs = {
    menuId: Scalars['ID']['input'];
};

export type GqlSCookMenusCountsArgs = {
    criteria: Array<GqlSCookMenuCriterion>;
};

export interface GqlSCookBookingRequest {
    __typename?: 'CookBookingRequest';
    bookingRequestId: Scalars['ID']['output'];
    canceledAt?: Maybe<Scalars['DateTime']['output']>;
    cancellationReason?: Maybe<Scalars['String']['output']>;
    cookPoolDetails?: Maybe<GqlSBookingRequestCookPoolDetails>;
    createdAt: Scalars['DateTime']['output'];
    dateTime: Scalars['DateTime']['output'];
    estimatedCookPayoutCents: Scalars['Int']['output'];
    estimatedTravelDistanceKm?: Maybe<Scalars['Float']['output']>;
    estimatedTravelExpensesCents?: Maybe<Scalars['Int']['output']>;
    exactEventAddress: GqlSCookTravelOriginAddress;
    expiresAt?: Maybe<Scalars['DateTime']['output']>;
    invoiceAddress?: Maybe<GqlSInvoiceAddress>;
    maxOfferAmountCents?: Maybe<Scalars['Int']['output']>;
    message: Scalars['String']['output'];
    minOfferAmountCents?: Maybe<Scalars['Int']['output']>;
    minOfferAmountHardCents?: Maybe<Scalars['Int']['output']>;
    occasion: Scalars['String']['output'];
    offers: Array<GqlSCookBookingRequestOffer>;
    participants: Array<GqlSBookingRequestParticipant>;
    preferences: Array<Scalars['String']['output']>;
    priceClassType?: Maybe<GqlSBookingRequestPriceClassType>;
    status: GqlSBookingRequestStatus;
    suggestedOfferAmountCents: Scalars['Int']['output'];
    user: GqlSPublicUser;
    userId: Scalars['ID']['output'];
}

export interface GqlSCookBookingRequestAvailable {
    __typename?: 'CookBookingRequestAvailable';
    bookingRequest: GqlSCookBookingRequest;
}

export interface GqlSCookBookingRequestCanceled {
    __typename?: 'CookBookingRequestCanceled';
    _?: Maybe<Scalars['Boolean']['output']>;
}

export interface GqlSCookBookingRequestExpired {
    __typename?: 'CookBookingRequestExpired';
    _?: Maybe<Scalars['Boolean']['output']>;
}

export type GqlSCookBookingRequestFindManyCriterion = {
    onlyDeclined?: InputMaybe<Scalars['Boolean']['input']>;
};

export type GqlSCookBookingRequestLookupResult =
    | GqlSCookBookingRequestAvailable
    | GqlSCookBookingRequestCanceled
    | GqlSCookBookingRequestExpired
    | GqlSCookBookingRequestNotFound
    | GqlSCookBookingRequestOfferAlreadyExists
    | GqlSCookBookingRequestTaken;

export interface GqlSCookBookingRequestNotFound {
    __typename?: 'CookBookingRequestNotFound';
    _?: Maybe<Scalars['Boolean']['output']>;
}

export interface GqlSCookBookingRequestOffer {
    __typename?: 'CookBookingRequestOffer';
    activeCallRoom?: Maybe<GqlSBookingRequestOfferCallRoom>;
    bookingRequest: GqlSCookBookingRequestOfferContext;
    bookingRequestId: Scalars['ID']['output'];
    bookingRequestOfferId: Scalars['ID']['output'];
    callBookings: Array<GqlSCookCallSlotBooking>;
    canCompletePreparations: Scalars['Boolean']['output'];
    configuredMenu?: Maybe<GqlSBookingRequestOfferConfiguredMenu>;
    cookAccepted?: Maybe<Scalars['Boolean']['output']>;
    cookDeclinationReason?: Maybe<Scalars['String']['output']>;
    cookId: Scalars['ID']['output'];
    cookTestimonial?: Maybe<GqlSCookTestimonial>;
    cookUnreadNotificationCount: Scalars['Int']['output'];
    costBreakdown: GqlSCostBreakdown;
    createdAt: Scalars['DateTime']['output'];
    menuPriceCents: Scalars['Int']['output'];
    messages: Array<GqlSHumanChatMessage>;
    participantAmendment?: Maybe<GqlSBookingRequestOfferParticipantAmendment>;
    payment?: Maybe<GqlSBookingRequestOfferPayment>;
    paymentDateTime?: Maybe<Scalars['DateTime']['output']>;
    paymentProviderFeeCents: Scalars['Int']['output'];
    paymentStatus: GqlSBookingRequestOfferPaymentStatus;
    payoutCentsCook: Scalars['Int']['output'];
    payoutDateTime?: Maybe<Scalars['DateTime']['output']>;
    plannedPaymentPullDateTime?: Maybe<Scalars['DateTime']['output']>;
    plannedPayoutDateTime?: Maybe<Scalars['DateTime']['output']>;
    platformFeeCentsCook: Scalars['Int']['output'];
    platformFeeCentsCustomer: Scalars['Int']['output'];
    platformFeePercentCook: Scalars['Int']['output'];
    platformFeePercentCustomer: Scalars['Int']['output'];
    preparationsCompletedAt?: Maybe<Scalars['DateTime']['output']>;
    priceAutoAdjustReason?: Maybe<GqlSBookingRequestOfferPriceAutoAdjustReason>;
    status: GqlSBookingRequestOfferStatus;
    suggestedMenus: Array<GqlSCookMenu>;
    testimonialMissing: Scalars['Boolean']['output'];
    totalCentsCustomer?: Maybe<Scalars['Int']['output']>;
    totalWithoutDiscountsCentsCustomer: Scalars['Int']['output'];
    travelDistanceKm?: Maybe<Scalars['Float']['output']>;
    travelExpensesCents: Scalars['Int']['output'];
    userAccepted?: Maybe<Scalars['Boolean']['output']>;
    userDeclinationReason?: Maybe<Scalars['String']['output']>;
    userRequestedMenuAdjustments?: Maybe<Scalars['Boolean']['output']>;
}

export interface GqlSCookBookingRequestOfferAlreadyExists {
    __typename?: 'CookBookingRequestOfferAlreadyExists';
    bookingRequestOfferId: Scalars['ID']['output'];
}

export interface GqlSCookBookingRequestOfferContext {
    __typename?: 'CookBookingRequestOfferContext';
    bookingRequestId: Scalars['ID']['output'];
    canceledAt?: Maybe<Scalars['DateTime']['output']>;
    dateTime: Scalars['DateTime']['output'];
    exactEventAddress: GqlSCookTravelOriginAddress;
    expiresAt?: Maybe<Scalars['DateTime']['output']>;
    invoiceAddress?: Maybe<GqlSInvoiceAddress>;
    maxOfferAmountCents?: Maybe<Scalars['Int']['output']>;
    message: Scalars['String']['output'];
    minOfferAmountCents?: Maybe<Scalars['Int']['output']>;
    minOfferAmountHardCents?: Maybe<Scalars['Int']['output']>;
    occasion: Scalars['String']['output'];
    participants: Array<GqlSBookingRequestParticipant>;
    preferences: Array<Scalars['String']['output']>;
    priceClassType?: Maybe<GqlSBookingRequestPriceClassType>;
    status: GqlSBookingRequestStatus;
    suggestedOfferAmountCents: Scalars['Int']['output'];
    user: GqlSPublicUser;
}

export type GqlSCookBookingRequestOfferFindManyCriterion = {
    bucket?: InputMaybe<GqlSCookBookingRequestOfferListBucket>;
};

export type GqlSCookBookingRequestOfferListBucket = 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';

export type GqlSCookBookingRequestOfferTestimonialCreate = {
    authorName?: InputMaybe<Scalars['String']['input']>;
    body?: InputMaybe<Scalars['String']['input']>;
    bookingRequestOfferId: Scalars['ID']['input'];
    imageFileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    location?: InputMaybe<Scalars['String']['input']>;
    lowRatingAnswers?: InputMaybe<GqlSCookTestimonialLowRatingAnswersInput>;
    occasion?: InputMaybe<Scalars['String']['input']>;
    rating?: InputMaybe<Scalars['Int']['input']>;
};

export interface GqlSCookBookingRequestTaken {
    __typename?: 'CookBookingRequestTaken';
    _?: Maybe<Scalars['Boolean']['output']>;
}

export interface GqlSCookCallAvailabilityException {
    __typename?: 'CookCallAvailabilityException';
    cookCallAvailabilityExceptionId: Scalars['ID']['output'];
    date: Scalars['Date']['output'];
    endMinuteOfDay?: Maybe<Scalars['Int']['output']>;
    startMinuteOfDay?: Maybe<Scalars['Int']['output']>;
    type: GqlSCookCallAvailabilityExceptionType;
}

export type GqlSCookCallAvailabilityExceptionCreate = {
    date: Scalars['Date']['input'];
    endMinuteOfDay?: InputMaybe<Scalars['Int']['input']>;
    startMinuteOfDay?: InputMaybe<Scalars['Int']['input']>;
    type: GqlSCookCallAvailabilityExceptionType;
};

export type GqlSCookCallAvailabilityExceptionType = 'BLOCK' | 'OPEN';

export interface GqlSCookCallAvailabilityRule {
    __typename?: 'CookCallAvailabilityRule';
    cookCallAvailabilityRuleId: Scalars['ID']['output'];
    dayOfWeek: Scalars['Int']['output'];
    endMinuteOfDay: Scalars['Int']['output'];
    startMinuteOfDay: Scalars['Int']['output'];
}

export type GqlSCookCallAvailabilityRuleCreate = {
    dayOfWeek: Scalars['Int']['input'];
    endMinuteOfDay: Scalars['Int']['input'];
    startMinuteOfDay: Scalars['Int']['input'];
};

export interface GqlSCookCallSlot {
    __typename?: 'CookCallSlot';
    endAt: Scalars['DateTime']['output'];
    startAt: Scalars['DateTime']['output'];
}

export interface GqlSCookCallSlotBooking {
    __typename?: 'CookCallSlotBooking';
    bookingRequestOfferId: Scalars['ID']['output'];
    canceledBy?: Maybe<GqlSCookCallSlotBookingActor>;
    canceledReason?: Maybe<Scalars['String']['output']>;
    cookCallSlotBookingId: Scalars['ID']['output'];
    cookId: Scalars['ID']['output'];
    cookMessage?: Maybe<Scalars['String']['output']>;
    createdAt: Scalars['DateTime']['output'];
    customer: GqlSCookCallSlotBookingCustomer;
    customerMessage?: Maybe<Scalars['String']['output']>;
    declineReason?: Maybe<Scalars['String']['output']>;
    endAt: Scalars['DateTime']['output'];
    initiator: GqlSCookCallSlotBookingActor;
    lastModifiedAt: Scalars['DateTime']['output'];
    startAt: Scalars['DateTime']['output'];
    status: GqlSCookCallSlotBookingStatus;
    userId: Scalars['ID']['output'];
    videoCallRoomId?: Maybe<Scalars['ID']['output']>;
}

export type GqlSCookCallSlotBookingActor = 'COOK' | 'CUSTOMER';

export type GqlSCookCallSlotBookingCriterion = {
    from?: InputMaybe<Scalars['DateTime']['input']>;
    statuses?: InputMaybe<Array<GqlSCookCallSlotBookingStatus>>;
    to?: InputMaybe<Scalars['DateTime']['input']>;
};

export interface GqlSCookCallSlotBookingCustomer {
    __typename?: 'CookCallSlotBookingCustomer';
    display: Scalars['String']['output'];
}

export type GqlSCookCallSlotBookingStatus = 'CANCELED' | 'COMPLETED' | 'CONFIRMED' | 'DECLINED' | 'PENDING';

export type GqlSCookCreate = {
    biography?: InputMaybe<Scalars['String']['input']>;
    cookingPhilosophy?: InputMaybe<Scalars['String']['input']>;
    cuisineStyle?: InputMaybe<Scalars['String']['input']>;
    exactTravelOriginAddress: Scalars['String']['input'];
    maximumTravelDistance: Scalars['Int']['input'];
    travelExpensesAmount: Scalars['Int']['input'];
};

export interface GqlSCookMeal {
    __typename?: 'CookMeal';
    createdAt: Scalars['DateTime']['output'];
    description: Scalars['String']['output'];
    imageFileUploadId?: Maybe<Scalars['ID']['output']>;
    imageUrl?: Maybe<Scalars['String']['output']>;
    mealId: Scalars['ID']['output'];
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    relationships: GqlSCookMealRelationships;
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export type GqlSCookMealCreate = {
    description?: InputMaybe<Scalars['String']['input']>;
    title: Scalars['String']['input'];
};

export type GqlSCookMealCriterion = {
    searchText?: InputMaybe<Scalars['String']['input']>;
};

export interface GqlSCookMealRelationshipBookingRequestOffer {
    __typename?: 'CookMealRelationshipBookingRequestOffer';
    blocksDeletion: Scalars['Boolean']['output'];
    bookingRequestDateTime: Scalars['DateTime']['output'];
    bookingRequestOfferId: Scalars['ID']['output'];
    bookingRequestUserName: Scalars['String']['output'];
    courseTitle: Scalars['String']['output'];
    menuTitle: Scalars['String']['output'];
}

export interface GqlSCookMealRelationshipMenu {
    __typename?: 'CookMealRelationshipMenu';
    blocksDeletion: Scalars['Boolean']['output'];
    courseTitle: Scalars['String']['output'];
    menuId: Scalars['ID']['output'];
    menuTitle: Scalars['String']['output'];
}

export interface GqlSCookMealRelationships {
    __typename?: 'CookMealRelationships';
    deletionBlockedByRelationships: Scalars['Boolean']['output'];
    menus: Array<GqlSCookMealRelationshipMenu>;
    offers: Array<GqlSCookMealRelationshipBookingRequestOffer>;
}

export type GqlSCookMealUpdate = {
    description?: InputMaybe<Scalars['String']['input']>;
    imageFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    publishedAt?: InputMaybe<Scalars['DateTime']['input']>;
    title?: InputMaybe<Scalars['String']['input']>;
};

export interface GqlSCookMenu {
    __typename?: 'CookMenu';
    bookingRequestOfferId?: Maybe<Scalars['ID']['output']>;
    copyOfMenuId?: Maybe<Scalars['ID']['output']>;
    courseMealOptionImages: Array<Scalars['String']['output']>;
    courses: Array<GqlSCookMenuCourse>;
    createdAt: Scalars['DateTime']['output'];
    description: Scalars['String']['output'];
    menuId: Scalars['ID']['output'];
    offerContext?: Maybe<GqlSCookMenuOfferContext>;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    templateMenu?: Maybe<GqlSCookMenu>;
    title: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSCookMenuCourse {
    __typename?: 'CookMenuCourse';
    courseId: Scalars['ID']['output'];
    mealOptions: Array<GqlSCookMeal>;
    mealSelectionLimit?: Maybe<Scalars['Int']['output']>;
    title: Scalars['String']['output'];
}

export type GqlSCookMenuCourseInput = {
    mealIds: Array<Scalars['ID']['input']>;
    mealSelectionLimit?: InputMaybe<Scalars['Int']['input']>;
    title: Scalars['String']['input'];
};

export interface GqlSCookMenuCourseSuggestion {
    __typename?: 'CookMenuCourseSuggestion';
    mealIds: Array<Scalars['ID']['output']>;
    title: Scalars['String']['output'];
}

export type GqlSCookMenuCriterion = {
    searchText?: InputMaybe<Scalars['String']['input']>;
};

export interface GqlSCookMenuOfferContext {
    __typename?: 'CookMenuOfferContext';
    bookingRequestDateTime: Scalars['DateTime']['output'];
    bookingRequestOfferId: Scalars['ID']['output'];
    customerFirstName: Scalars['String']['output'];
    status: GqlSBookingRequestOfferStatus;
}

export interface GqlSCookMenuSuggestion {
    __typename?: 'CookMenuSuggestion';
    courses: Array<GqlSCookMenuCourseSuggestion>;
    description: Scalars['String']['output'];
    title: Scalars['String']['output'];
}

export type GqlSCookMenuSuggestionMealOptionType = 'EXISTING_MEAL' | 'NEW_MEAL';

export type GqlSCookMenuUpdate = {
    courses?: InputMaybe<Array<GqlSCookMenuCourseInput>>;
    description?: InputMaybe<Scalars['String']['input']>;
    publishedAt?: InputMaybe<Scalars['DateTime']['input']>;
    title?: InputMaybe<Scalars['String']['input']>;
};

export interface GqlSCookMutation {
    __typename?: 'CookMutation';
    biographySuggest: Scalars['String']['output'];
    bookingRequestDecline: GqlSMutationResult;
    bookingRequestGeneratedMenuApply: GqlSMutationResult;
    bookingRequestMenuEvaluationRefresh: GqlSMutationResult;
    bookingRequestOfferAccept: GqlSMutationResult;
    bookingRequestOfferCallCreate: GqlSBookingRequestOfferCallTokenResult;
    bookingRequestOfferCallJoin: GqlSBookingRequestOfferCallTokenResult;
    bookingRequestOfferCallLeave: GqlSMutationResult;
    bookingRequestOfferCallSlotCancel: GqlSMutationResult;
    bookingRequestOfferCallSlotConfirm: GqlSMutationResult;
    bookingRequestOfferCallSlotDecline: GqlSMutationResult;
    bookingRequestOfferCallSlotRequest: GqlSMutationResult;
    bookingRequestOfferChatMessageCreate: GqlSMutationResult;
    bookingRequestOfferChatMessageReactionUpsert: GqlSMutationResult;
    bookingRequestOfferCreate: GqlSMutationResult;
    bookingRequestOfferDecline: GqlSMutationResult;
    bookingRequestOfferParticipantAmendmentAccept: GqlSMutationResult;
    bookingRequestOfferParticipantAmendmentDecline: GqlSMutationResult;
    bookingRequestOfferPreparationsComplete: GqlSMutationResult;
    bookingRequestOfferPriceUpdate: GqlSMutationResult;
    bookingRequestOfferSuggestedMenusUpdate: GqlSMutationResult;
    bookingRequestOfferTestimonialCreate: GqlSMutationResult;
    bookingRequestOfferUnreadNotificationCountReset: GqlSMutationResult;
    bookingRequestOpen: GqlSMutationResult;
    callAvailabilityExceptionCreate: GqlSMutationResult;
    callAvailabilityExceptionDelete: GqlSMutationResult;
    callAvailabilityRuleCreate: GqlSMutationResult;
    callAvailabilityRuleDelete: GqlSMutationResult;
    mealCreate: GqlSMutationResult;
    mealDelete: GqlSMutationResult;
    mealUpdate: GqlSMutationResult;
    menuCopy: GqlSMutationResult;
    menuCreate: GqlSMutationResult;
    menuDelete: GqlSMutationResult;
    menuSuggestionFromInventory: GqlSCookMenuSuggestion;
    menuSuggestionFromText: GqlSCookMenuSuggestion;
    menuSyncToTemplate: GqlSMutationResult;
    menuTitleDescriptionSuggest: GqlSCookMenuSuggestion;
    menuUpdate: GqlSMutationResult;
    stripeDashboardUrlCreate: GqlSCookStripeDashboardResult;
    stripeOnboardingStart: GqlSCookStripeOnboardingResult;
    stripeStatusSync: GqlSMutationResult;
    update: GqlSMutationResult;
}

export type GqlSCookMutationBiographySuggestArgs = {
    currentBiography: Scalars['String']['input'];
};

export type GqlSCookMutationBookingRequestDeclineArgs = {
    bookingRequestId: Scalars['ID']['input'];
    reason: Scalars['String']['input'];
};

export type GqlSCookMutationBookingRequestGeneratedMenuApplyArgs = {
    bookingRequestId: Scalars['ID']['input'];
};

export type GqlSCookMutationBookingRequestMenuEvaluationRefreshArgs = {
    bookingRequestId: Scalars['ID']['input'];
};

export type GqlSCookMutationBookingRequestOfferAcceptArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSCookMutationBookingRequestOfferCallCreateArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSCookMutationBookingRequestOfferCallJoinArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSCookMutationBookingRequestOfferCallLeaveArgs = {
    bookingRequestOfferCallRoomParticipantId: Scalars['ID']['input'];
};

export type GqlSCookMutationBookingRequestOfferCallSlotCancelArgs = {
    cookCallSlotBookingId: Scalars['ID']['input'];
    reason?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSCookMutationBookingRequestOfferCallSlotConfirmArgs = {
    cookCallSlotBookingId: Scalars['ID']['input'];
};

export type GqlSCookMutationBookingRequestOfferCallSlotDeclineArgs = {
    cookCallSlotBookingId: Scalars['ID']['input'];
    reason?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSCookMutationBookingRequestOfferCallSlotRequestArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
    cookMessage?: InputMaybe<Scalars['String']['input']>;
    startAt: Scalars['DateTime']['input'];
};

export type GqlSCookMutationBookingRequestOfferChatMessageCreateArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    message: Scalars['String']['input'];
};

export type GqlSCookMutationBookingRequestOfferChatMessageReactionUpsertArgs = {
    bookingRequestOfferEventId: Scalars['ID']['input'];
    emoji: Scalars['String']['input'];
};

export type GqlSCookMutationBookingRequestOfferCreateArgs = {
    input: GqlSBookingRequestOfferCreate;
};

export type GqlSCookMutationBookingRequestOfferDeclineArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
    reason: Scalars['String']['input'];
};

export type GqlSCookMutationBookingRequestOfferParticipantAmendmentAcceptArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSCookMutationBookingRequestOfferParticipantAmendmentDeclineArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSCookMutationBookingRequestOfferPreparationsCompleteArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSCookMutationBookingRequestOfferPriceUpdateArgs = {
    input: GqlSBookingRequestOfferPriceUpdate;
};

export type GqlSCookMutationBookingRequestOfferSuggestedMenusUpdateArgs = {
    input: GqlSBookingRequestOfferSuggestedMenusUpdate;
};

export type GqlSCookMutationBookingRequestOfferTestimonialCreateArgs = {
    input: GqlSCookBookingRequestOfferTestimonialCreate;
};

export type GqlSCookMutationBookingRequestOfferUnreadNotificationCountResetArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSCookMutationBookingRequestOpenArgs = {
    bookingRequestId: Scalars['ID']['input'];
};

export type GqlSCookMutationCallAvailabilityExceptionCreateArgs = {
    exception: GqlSCookCallAvailabilityExceptionCreate;
};

export type GqlSCookMutationCallAvailabilityExceptionDeleteArgs = {
    cookCallAvailabilityExceptionId: Scalars['ID']['input'];
};

export type GqlSCookMutationCallAvailabilityRuleCreateArgs = {
    rule: GqlSCookCallAvailabilityRuleCreate;
};

export type GqlSCookMutationCallAvailabilityRuleDeleteArgs = {
    cookCallAvailabilityRuleId: Scalars['ID']['input'];
};

export type GqlSCookMutationMealCreateArgs = {
    meal?: InputMaybe<GqlSCookMealCreate>;
};

export type GqlSCookMutationMealDeleteArgs = {
    mealId: Scalars['ID']['input'];
};

export type GqlSCookMutationMealUpdateArgs = {
    meal: GqlSCookMealUpdate;
    mealId: Scalars['ID']['input'];
};

export type GqlSCookMutationMenuCopyArgs = {
    menuId: Scalars['ID']['input'];
};

export type GqlSCookMutationMenuDeleteArgs = {
    menuId: Scalars['ID']['input'];
};

export type GqlSCookMutationMenuSuggestionFromInventoryArgs = {
    brief?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSCookMutationMenuSuggestionFromTextArgs = {
    text: Scalars['String']['input'];
};

export type GqlSCookMutationMenuSyncToTemplateArgs = {
    menuId: Scalars['ID']['input'];
};

export type GqlSCookMutationMenuTitleDescriptionSuggestArgs = {
    courses: Array<GqlSCookMenuCourseInput>;
    currentDescription?: InputMaybe<Scalars['String']['input']>;
    currentTitle?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSCookMutationMenuUpdateArgs = {
    menu: GqlSCookMenuUpdate;
    menuId: Scalars['ID']['input'];
};

export type GqlSCookMutationStripeOnboardingStartArgs = {
    refreshUrl: Scalars['String']['input'];
    returnUrl: Scalars['String']['input'];
};

export type GqlSCookMutationUpdateArgs = {
    input: GqlSCookUpdate;
};

export interface GqlSCookStripeAccountDetails {
    __typename?: 'CookStripeAccountDetails';
    chargesEnabled: Scalars['Boolean']['output'];
    currentlyDue: Array<GqlSCookStripeRequirementCategory>;
    detailsSubmitted: Scalars['Boolean']['output'];
    disabledReason?: Maybe<GqlSCookStripeDisabledReason>;
    pastDue: Array<GqlSCookStripeRequirementCategory>;
    payoutsEnabled: Scalars['Boolean']['output'];
    pendingVerification: Array<GqlSCookStripeRequirementCategory>;
}

export interface GqlSCookStripeBalanceTransaction {
    __typename?: 'CookStripeBalanceTransaction';
    availableOn: Scalars['DateTime']['output'];
    balanceTransactionId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    description?: Maybe<Scalars['String']['output']>;
    kind: GqlSCookStripeBalanceTransactionKind;
    netCents: Scalars['Int']['output'];
    status: GqlSCookStripeBalanceTransactionStatus;
}

export type GqlSCookStripeBalanceTransactionKind = 'ADJUSTMENT' | 'FEE' | 'OTHER' | 'PAYMENT' | 'PAYOUT' | 'TRANSFER';

export type GqlSCookStripeBalanceTransactionStatus = 'AVAILABLE' | 'PENDING';

export interface GqlSCookStripeDashboardResult {
    __typename?: 'CookStripeDashboardResult';
    url?: Maybe<Scalars['String']['output']>;
}

export type GqlSCookStripeDisabledReason = 'LISTED' | 'OTHER' | 'PAST_DUE' | 'PENDING_VERIFICATION' | 'REJECTED';

export type GqlSCookStripeOnboardingKind = 'ALREADY_COMPLETE' | 'NOT_APPROVED' | 'ONBOARDING_URL';

export interface GqlSCookStripeOnboardingResult {
    __typename?: 'CookStripeOnboardingResult';
    kind: GqlSCookStripeOnboardingKind;
    url?: Maybe<Scalars['String']['output']>;
}

export type GqlSCookStripeRequirementCategory =
    'BANK_ACCOUNT' | 'BUSINESS_DETAILS' | 'IDENTITY_VERIFICATION' | 'OTHER' | 'PERSONAL_DETAILS' | 'TERMS_OF_SERVICE';

export type GqlSCookStripeStatus = 'ACTIVE_WAS_RESET' | 'COMPLETED' | 'EMPTY' | 'PREPARED';

export interface GqlSCookStripeWallet {
    __typename?: 'CookStripeWallet';
    availableCents: Scalars['Int']['output'];
    pendingCents: Scalars['Int']['output'];
    transactions: Array<GqlSCookStripeBalanceTransaction>;
}

export interface GqlSCookTestimonial {
    __typename?: 'CookTestimonial';
    authorName: Scalars['String']['output'];
    body?: Maybe<Scalars['String']['output']>;
    cookTestimonialId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    imageUrls: Array<Scalars['String']['output']>;
    location?: Maybe<Scalars['String']['output']>;
    occasion?: Maybe<Scalars['String']['output']>;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    rating?: Maybe<Scalars['Int']['output']>;
}

export interface GqlSCookTestimonialLowRatingAnswers {
    __typename?: 'CookTestimonialLowRatingAnswers';
    additionalFeedback?: Maybe<Scalars['String']['output']>;
    whatWentWrong?: Maybe<Scalars['String']['output']>;
    wouldRecommend?: Maybe<Scalars['Boolean']['output']>;
}

export type GqlSCookTestimonialLowRatingAnswersInput = {
    additionalFeedback?: InputMaybe<Scalars['String']['input']>;
    whatWentWrong?: InputMaybe<Scalars['String']['input']>;
    wouldRecommend?: InputMaybe<Scalars['Boolean']['input']>;
};

export interface GqlSCookTravelOriginAddress {
    __typename?: 'CookTravelOriginAddress';
    addressLine1: Scalars['String']['output'];
    addressLine2: Scalars['String']['output'];
    city: Scalars['String']['output'];
    country: Scalars['String']['output'];
    displayText: Scalars['String']['output'];
    latitude: Scalars['Latitude']['output'];
    longitude: Scalars['Longitude']['output'];
    postCode: Scalars['String']['output'];
    state: Scalars['String']['output'];
}

export type GqlSCookUpdate = {
    biography?: InputMaybe<Scalars['String']['input']>;
    biographySummary?: InputMaybe<Scalars['String']['input']>;
    callDurationMinutes?: InputMaybe<Scalars['Int']['input']>;
    callSchedulingEnabled?: InputMaybe<Scalars['Boolean']['input']>;
    cookingPhilosophy?: InputMaybe<Scalars['String']['input']>;
    cuisineStyle?: InputMaybe<Scalars['String']['input']>;
    exactTravelOriginAddress?: InputMaybe<Scalars['String']['input']>;
    isVisible?: InputMaybe<Scalars['Boolean']['input']>;
    logoFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    maximumParticipants?: InputMaybe<Scalars['Int']['input']>;
    maximumPriceAmount?: InputMaybe<Scalars['Int']['input']>;
    maximumTravelDistance?: InputMaybe<Scalars['Int']['input']>;
    minimumParticipants?: InputMaybe<Scalars['Int']['input']>;
    minimumPriceAmount?: InputMaybe<Scalars['Int']['input']>;
    stageName?: InputMaybe<Scalars['String']['input']>;
    travelExpensesAmount?: InputMaybe<Scalars['Int']['input']>;
};

export interface GqlSCostBreakdown {
    __typename?: 'CostBreakdown';
    lineItems: Array<GqlSCostLineItem>;
    total?: Maybe<GqlSCostLineItem>;
    totalBeforeDiscount?: Maybe<GqlSCostLineItem>;
    totalPerPerson?: Maybe<GqlSCostLineItem>;
}

export interface GqlSCostLineItem {
    __typename?: 'CostLineItem';
    amountCents: Scalars['Int']['output'];
    subLineItems?: Maybe<Array<GqlSCostLineItem>>;
    title: Scalars['String']['output'];
}

export interface GqlSCustomerTestimonial {
    __typename?: 'CustomerTestimonial';
    authorName: Scalars['String']['output'];
    body: Scalars['String']['output'];
    createdAt: Scalars['DateTime']['output'];
    customerTestimonialId: Scalars['ID']['output'];
    imageUrls: Array<Scalars['String']['output']>;
    location?: Maybe<Scalars['String']['output']>;
    occasion?: Maybe<Scalars['String']['output']>;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    rating?: Maybe<Scalars['Int']['output']>;
}

export type GqlSDateTimeRange = {
    endDateTime: Scalars['DateTime']['input'];
    startDateTime: Scalars['DateTime']['input'];
};

export type GqlSFeatureToggleKey =
    | 'AI_BOOKING_REQUEST_MESSAGE'
    | 'AI_MENU_EVALUATION'
    | 'ASSISTANT_COOK'
    | 'ASSISTANT_CUSTOMER'
    | 'BOOKING_REQUEST_OFFER_CHAT_REACTIONS'
    | 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT'
    | 'BOOKING_REQUEST_RESTRICTIONS'
    | 'COOK_BIOGRAPHY_AI_WRITE'
    | 'COOK_WALLET_STRIPE_BALANCE'
    | 'PUBLICATION_MEALS'
    | 'PUBLICATION_MENUS'
    | 'WHATSAPP_ENGLISH_TEMPLATES';

export interface GqlSFileUpload {
    __typename?: 'FileUpload';
    fileUploadId: Scalars['ID']['output'];
    filename: Scalars['String']['output'];
    mediaType: Scalars['String']['output'];
    size: Scalars['Int']['output'];
    url: Scalars['String']['output'];
}

export interface GqlSGeoCoordinates {
    __typename?: 'GeoCoordinates';
    latitude: Scalars['Latitude']['output'];
    longitude: Scalars['Longitude']['output'];
}

export type GqlSGeoCoordinatesInput = {
    latitude: Scalars['Latitude']['input'];
    longitude: Scalars['Longitude']['input'];
};

export interface GqlSGiftCard {
    __typename?: 'GiftCard';
    balanceCents: Scalars['Int']['output'];
    buyerEmail: Scalars['EmailAddress']['output'];
    createdAt: Scalars['DateTime']['output'];
    expiresAt: Scalars['DateTime']['output'];
    giftCardId: Scalars['ID']['output'];
    invoiceAddress?: Maybe<GqlSInvoiceAddress>;
    message: Scalars['String']['output'];
    occasion: Scalars['String']['output'];
    originalBalanceCents: Scalars['Int']['output'];
    payment?: Maybe<GqlSGiftCardPayment>;
    paymentStatus: GqlSGiftCardPaymentStatus;
    recipientName: Scalars['String']['output'];
    redeemCode?: Maybe<Scalars['String']['output']>;
}

export type GqlSGiftCardCreate = {
    balanceCents: Scalars['Int']['input'];
    locale: GqlSLocale;
    message: Scalars['String']['input'];
    occasion: Scalars['String']['input'];
    recaptchaToken: Scalars['String']['input'];
    recipientName: Scalars['String']['input'];
};

export type GqlSGiftCardPay = {
    giftCardId: Scalars['ID']['input'];
    invoiceAddress: GqlSInvoiceAddressInput;
};

export interface GqlSGiftCardPayment {
    __typename?: 'GiftCardPayment';
    clientSecret: Scalars['String']['output'];
    publishableKey: Scalars['String']['output'];
}

export type GqlSGiftCardPaymentStatus = 'PAYED' | 'PREPARED';

export interface GqlSGiftCardPurchaseError {
    __typename?: 'GiftCardPurchaseError';
    code: GqlSGiftCardPurchaseErrorCode;
}

export type GqlSGiftCardPurchaseErrorCode = 'RECAPTCHA_FAILED';

export type GqlSHumanChatMessage = GqlSChatMessageBookingRequestOfferEvent | GqlSChatMessageUser;

export interface GqlSInvoiceAddress {
    __typename?: 'InvoiceAddress';
    city: Scalars['String']['output'];
    companyName?: Maybe<Scalars['String']['output']>;
    country: Scalars['String']['output'];
    firstName: Scalars['String']['output'];
    lastName: Scalars['String']['output'];
    line1: Scalars['String']['output'];
    line2: Scalars['String']['output'];
    postalCode: Scalars['String']['output'];
}

export type GqlSInvoiceAddressInput = {
    city: Scalars['String']['input'];
    companyName: Scalars['String']['input'];
    country: Scalars['String']['input'];
    firstName: Scalars['String']['input'];
    lastName: Scalars['String']['input'];
    line1: Scalars['String']['input'];
    line2: Scalars['String']['input'];
    postalCode: Scalars['String']['input'];
};

export type GqlSLocale = 'de' | 'en';

export interface GqlSLocationSuggestion {
    __typename?: 'LocationSuggestion';
    displayText: Scalars['String']['output'];
    latitude: Scalars['Latitude']['output'];
    longitude: Scalars['Longitude']['output'];
    structuredAddress?: Maybe<GqlSCookTravelOriginAddress>;
}

export interface GqlSMutation {
    __typename?: 'Mutation';
    admin: GqlSAdminMutation;
    authEmailOtpDelete: GqlSMutationResult;
    authEmailOtpRequest: GqlSMutationResult;
    authEmailOtpVerify: GqlSMutationResult;
    authPasskeyAuthenticateOptions: Scalars['JSON']['output'];
    authPasskeyAuthenticateVerify: GqlSMutationResult;
    authTotpChallengeDelete: GqlSMutationResult;
    authTotpVerify: GqlSMutationResult;
    clientObservabilityReport: GqlSMutationResult;
    sessionCookieSettingAcceptAll: GqlSMutationResult;
    sessionCookieSettingAcceptMandatory: GqlSMutationResult;
    sessionNewsletterSubscriptionCreate: GqlSMutationResult;
    sessionWebPageInteractionCreate: GqlSMutationResult;
    sessionWebPageVisitCreate: GqlSMutationResult;
    user: GqlSUserMutation;
    userCreate: GqlSMutationResult;
}

export type GqlSMutationAuthEmailOtpDeleteArgs = {
    authEmailOtpId: Scalars['ID']['input'];
};

export type GqlSMutationAuthEmailOtpRequestArgs = {
    email: Scalars['EmailAddress']['input'];
    locale: GqlSLocale;
};

export type GqlSMutationAuthEmailOtpVerifyArgs = {
    code: Scalars['String']['input'];
    email: Scalars['EmailAddress']['input'];
};

export type GqlSMutationAuthPasskeyAuthenticateVerifyArgs = {
    response: Scalars['JSON']['input'];
};

export type GqlSMutationAuthTotpVerifyArgs = {
    code: Scalars['String']['input'];
};

export type GqlSMutationClientObservabilityReportArgs = {
    input: GqlSClientObservabilityReportInput;
};

export type GqlSMutationSessionNewsletterSubscriptionCreateArgs = {
    emailAddress: Scalars['EmailAddress']['input'];
    locale: GqlSLocale;
};

export type GqlSMutationSessionWebPageInteractionCreateArgs = {
    input: GqlSSessionWebPageInteractionCreateInput;
};

export type GqlSMutationSessionWebPageVisitCreateArgs = {
    input: GqlSSessionWebPageVisitCreateInput;
};

export type GqlSMutationUserCreateArgs = {
    input: GqlSUserCreate;
};

export interface GqlSMutationResult {
    __typename?: 'MutationResult';
    referenceId?: Maybe<Scalars['ID']['output']>;
    success: Scalars['Boolean']['output'];
}

export interface GqlSOccasionFormatsCard {
    __typename?: 'OccasionFormatsCard';
    bodyDe: Scalars['String']['output'];
    bodyEn: Scalars['String']['output'];
    fact1De: Scalars['String']['output'];
    fact1En: Scalars['String']['output'];
    fact2De: Scalars['String']['output'];
    fact2En: Scalars['String']['output'];
    fact3De: Scalars['String']['output'];
    fact3En: Scalars['String']['output'];
    imageFileUploadId?: Maybe<Scalars['ID']['output']>;
    imageUrl?: Maybe<Scalars['String']['output']>;
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
}

export type GqlSOccasionFormatsCardInput = {
    bodyDe: Scalars['String']['input'];
    bodyEn: Scalars['String']['input'];
    fact1De: Scalars['String']['input'];
    fact1En: Scalars['String']['input'];
    fact2De: Scalars['String']['input'];
    fact2En: Scalars['String']['input'];
    fact3De: Scalars['String']['input'];
    fact3En: Scalars['String']['input'];
    imageFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    titleDe: Scalars['String']['input'];
    titleEn: Scalars['String']['input'];
};

export interface GqlSOccasionFormatsSection {
    __typename?: 'OccasionFormatsSection';
    cards: Array<GqlSOccasionFormatsCard>;
    subtitleDe: Scalars['String']['output'];
    subtitleEn: Scalars['String']['output'];
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
}

export type GqlSOccasionFormatsSectionInput = {
    cards: Array<GqlSOccasionFormatsCardInput>;
    subtitleDe: Scalars['String']['input'];
    subtitleEn: Scalars['String']['input'];
    titleDe: Scalars['String']['input'];
    titleEn: Scalars['String']['input'];
};

export interface GqlSOccasionPromo {
    __typename?: 'OccasionPromo';
    amountCents: Scalars['Int']['output'];
    redeemCode: Scalars['String']['output'];
}

export interface GqlSOccasionTestimonial {
    __typename?: 'OccasionTestimonial';
    index: Scalars['Int']['output'];
    testimonial: GqlSTestimonial;
}

export type GqlSOccasionUpsert = {
    descriptionDe: Scalars['String']['input'];
    descriptionEn: Scalars['String']['input'];
    firstSectionBodyDe: Scalars['String']['input'];
    firstSectionBodyEn: Scalars['String']['input'];
    firstSectionHeadlineDe: Scalars['String']['input'];
    firstSectionHeadlineEn: Scalars['String']['input'];
    firstSectionImageFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    formatsSection: GqlSOccasionFormatsSectionInput;
    headlineDe: Scalars['String']['input'];
    headlineEn: Scalars['String']['input'];
    heroImageFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    name: Scalars['String']['input'];
    occasionId?: InputMaybe<Scalars['ID']['input']>;
    pathName: Scalars['String']['input'];
    promoCodeId?: InputMaybe<Scalars['ID']['input']>;
    publishedAt?: InputMaybe<Scalars['DateTime']['input']>;
    sections: Array<GqlSContentSectionInput>;
    subHeadlineDe: Scalars['String']['input'];
    subHeadlineEn: Scalars['String']['input'];
    titleDe: Scalars['String']['input'];
    titleEn: Scalars['String']['input'];
};

export interface GqlSPartnerPromo {
    __typename?: 'PartnerPromo';
    amountCents: Scalars['Int']['output'];
    redeemCode: Scalars['String']['output'];
}

export interface GqlSPartnerTestimonial {
    __typename?: 'PartnerTestimonial';
    index: Scalars['Int']['output'];
    testimonial: GqlSTestimonial;
}

export type GqlSPartnerUpsert = {
    descriptionDe: Scalars['String']['input'];
    descriptionEn: Scalars['String']['input'];
    firstSectionBodyDe: Scalars['String']['input'];
    firstSectionBodyEn: Scalars['String']['input'];
    firstSectionCtaUrl?: InputMaybe<Scalars['String']['input']>;
    firstSectionHeadlineDe: Scalars['String']['input'];
    firstSectionHeadlineEn: Scalars['String']['input'];
    firstSectionImageFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    firstSectionImageOverlay: Scalars['Boolean']['input'];
    headlineDe: Scalars['String']['input'];
    headlineEn: Scalars['String']['input'];
    heroImageFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    heroImageOverlay: Scalars['Boolean']['input'];
    howItWorksAlternativeMedia: Scalars['Boolean']['input'];
    name: Scalars['String']['input'];
    partnerId?: InputMaybe<Scalars['ID']['input']>;
    pathName: Scalars['String']['input'];
    promoCodeId?: InputMaybe<Scalars['ID']['input']>;
    publishedAt?: InputMaybe<Scalars['DateTime']['input']>;
    sections: Array<GqlSContentSectionInput>;
    subHeadlineDe: Scalars['String']['input'];
    subHeadlineEn: Scalars['String']['input'];
    titleDe: Scalars['String']['input'];
    titleEn: Scalars['String']['input'];
};

export interface GqlSPublicBlogPost {
    __typename?: 'PublicBlogPost';
    blogPostId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    headlineDe: Scalars['String']['output'];
    headlineEn: Scalars['String']['output'];
    heroImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    heroImageUrl?: Maybe<Scalars['String']['output']>;
    pathName: Scalars['String']['output'];
    previousPathNames: Array<Scalars['String']['output']>;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    sections: Array<GqlSContentSection>;
    subHeadlineDe: Scalars['String']['output'];
    subHeadlineEn: Scalars['String']['output'];
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSPublicBlogPostQuery {
    __typename?: 'PublicBlogPostQuery';
    findMany: Array<GqlSPublicBlogPost>;
    findOneByPathName?: Maybe<GqlSPublicBlogPost>;
}

export type GqlSPublicBlogPostQueryFindOneByPathNameArgs = {
    pathName: Scalars['String']['input'];
};

export interface GqlSPublicCity {
    __typename?: 'PublicCity';
    cityId: Scalars['ID']['output'];
    createdAt: Scalars['DateTime']['output'];
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    featuredCooks: Array<GqlSPublicCook>;
    firstSectionBodyDe: Scalars['String']['output'];
    firstSectionBodyEn: Scalars['String']['output'];
    firstSectionHeadlineDe: Scalars['String']['output'];
    firstSectionHeadlineEn: Scalars['String']['output'];
    firstSectionImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    firstSectionImageUrl?: Maybe<Scalars['String']['output']>;
    headlineDe: Scalars['String']['output'];
    headlineEn: Scalars['String']['output'];
    heroImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    heroImageUrl?: Maybe<Scalars['String']['output']>;
    latitude: Scalars['Latitude']['output'];
    longitude: Scalars['Longitude']['output'];
    nameDe: Scalars['String']['output'];
    nameEn: Scalars['String']['output'];
    pathName: Scalars['String']['output'];
    previousPathNames: Array<Scalars['String']['output']>;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    sections: Array<GqlSContentSection>;
    subHeadlineDe: Scalars['String']['output'];
    subHeadlineEn: Scalars['String']['output'];
    testimonials: Array<GqlSCityTestimonial>;
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSPublicCityQuery {
    __typename?: 'PublicCityQuery';
    findMany: Array<GqlSPublicCity>;
    findOneByPathName?: Maybe<GqlSPublicCity>;
}

export type GqlSPublicCityQueryFindOneByPathNameArgs = {
    pathName: Scalars['String']['input'];
};

export interface GqlSPublicCook {
    __typename?: 'PublicCook';
    biography: Scalars['String']['output'];
    biographySummary: Scalars['String']['output'];
    callDurationMinutes: Scalars['Int']['output'];
    callSchedulingEnabled: Scalars['Boolean']['output'];
    callSlots: Array<GqlSCookCallSlot>;
    city?: Maybe<Scalars['String']['output']>;
    cookId: Scalars['ID']['output'];
    cookingPhilosophy?: Maybe<Scalars['String']['output']>;
    cuisineStyle?: Maybe<Scalars['String']['output']>;
    hasPublicProfile: Scalars['Boolean']['output'];
    logo?: Maybe<GqlSFileUpload>;
    maximumParticipants?: Maybe<Scalars['Int']['output']>;
    maximumPriceAmount?: Maybe<Scalars['Int']['output']>;
    meals: Array<GqlSPublicCookMeal>;
    minimumParticipants?: Maybe<Scalars['Int']['output']>;
    minimumPriceAmount?: Maybe<Scalars['Int']['output']>;
    rating: GqlSPublicCookRating;
    stageName?: Maybe<Scalars['String']['output']>;
    testimonials: Array<GqlSCustomerTestimonial>;
    user: GqlSPublicUser;
}

export type GqlSPublicCookCallSlotsArgs = {
    from: Scalars['DateTime']['input'];
    to: Scalars['DateTime']['input'];
};

export type GqlSPublicCookFindManyCriterion = {
    geoCoordinates?: InputMaybe<GqlSGeoCoordinatesInput>;
    searchText?: InputMaybe<Scalars['String']['input']>;
};

export interface GqlSPublicCookMeal {
    __typename?: 'PublicCookMeal';
    description: Scalars['String']['output'];
    imageUrl?: Maybe<Scalars['String']['output']>;
    mealId: Scalars['ID']['output'];
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    title: Scalars['String']['output'];
}

export interface GqlSPublicCookMenu {
    __typename?: 'PublicCookMenu';
    courseMealOptionImages: Array<Scalars['String']['output']>;
    courses: Array<GqlSPublicCookMenuCourse>;
    description: Scalars['String']['output'];
    menuId: Scalars['ID']['output'];
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    title: Scalars['String']['output'];
}

export interface GqlSPublicCookMenuCourse {
    __typename?: 'PublicCookMenuCourse';
    courseId: Scalars['ID']['output'];
    mealOptions: Array<GqlSPublicCookMeal>;
    mealSelectionLimit?: Maybe<Scalars['Int']['output']>;
    title: Scalars['String']['output'];
}

export interface GqlSPublicCookQuery {
    __typename?: 'PublicCookQuery';
    findMany: Array<GqlSPublicCook>;
    findOne?: Maybe<GqlSPublicCook>;
}

export type GqlSPublicCookQueryFindManyArgs = {
    criterion?: InputMaybe<GqlSPublicCookFindManyCriterion>;
};

export type GqlSPublicCookQueryFindOneArgs = {
    cookId: Scalars['ID']['input'];
};

export interface GqlSPublicCookRating {
    __typename?: 'PublicCookRating';
    averageRating?: Maybe<Scalars['Float']['output']>;
    reviewCount: Scalars['Int']['output'];
}

export interface GqlSPublicLegal {
    __typename?: 'PublicLegal';
    imprint?: Maybe<GqlSPublicLegalImprint>;
    privacyPolicy?: Maybe<GqlSPublicLegalPrivacyPolicy>;
    termsAndConditions?: Maybe<GqlSPublicLegalTermsAndConditions>;
}

export interface GqlSPublicLegalImprint {
    __typename?: 'PublicLegalImprint';
    bodyDe: Scalars['String']['output'];
    changeSummaryDe: Scalars['String']['output'];
    imprintId: Scalars['ID']['output'];
    publishedAt: Scalars['DateTime']['output'];
}

export interface GqlSPublicLegalPrivacyPolicy {
    __typename?: 'PublicLegalPrivacyPolicy';
    bodyDe: Scalars['String']['output'];
    changeSummaryDe: Scalars['String']['output'];
    privacyPolicyId: Scalars['ID']['output'];
    publishedAt: Scalars['DateTime']['output'];
}

export interface GqlSPublicLegalTermsAndConditions {
    __typename?: 'PublicLegalTermsAndConditions';
    bodyDe: Scalars['String']['output'];
    changeSummaryDe: Scalars['String']['output'];
    publishedAt: Scalars['DateTime']['output'];
    termsAndConditionsId: Scalars['ID']['output'];
}

export interface GqlSPublicOccasion {
    __typename?: 'PublicOccasion';
    createdAt: Scalars['DateTime']['output'];
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    featuredCooks: Array<GqlSPublicCook>;
    firstSectionBodyDe: Scalars['String']['output'];
    firstSectionBodyEn: Scalars['String']['output'];
    firstSectionHeadlineDe: Scalars['String']['output'];
    firstSectionHeadlineEn: Scalars['String']['output'];
    firstSectionImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    firstSectionImageUrl?: Maybe<Scalars['String']['output']>;
    formatsSection: GqlSOccasionFormatsSection;
    headlineDe: Scalars['String']['output'];
    headlineEn: Scalars['String']['output'];
    heroImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    heroImageUrl?: Maybe<Scalars['String']['output']>;
    name: Scalars['String']['output'];
    occasionId: Scalars['ID']['output'];
    pathName: Scalars['String']['output'];
    previousPathNames: Array<Scalars['String']['output']>;
    promo?: Maybe<GqlSOccasionPromo>;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    sections: Array<GqlSContentSection>;
    subHeadlineDe: Scalars['String']['output'];
    subHeadlineEn: Scalars['String']['output'];
    testimonials: Array<GqlSOccasionTestimonial>;
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSPublicOccasionQuery {
    __typename?: 'PublicOccasionQuery';
    findMany: Array<GqlSPublicOccasion>;
    findOneByPathName?: Maybe<GqlSPublicOccasion>;
}

export type GqlSPublicOccasionQueryFindOneByPathNameArgs = {
    pathName: Scalars['String']['input'];
};

export interface GqlSPublicPartner {
    __typename?: 'PublicPartner';
    createdAt: Scalars['DateTime']['output'];
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    featuredCooks: Array<GqlSPublicCook>;
    firstSectionBodyDe: Scalars['String']['output'];
    firstSectionBodyEn: Scalars['String']['output'];
    firstSectionCtaUrl?: Maybe<Scalars['String']['output']>;
    firstSectionHeadlineDe: Scalars['String']['output'];
    firstSectionHeadlineEn: Scalars['String']['output'];
    firstSectionImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    firstSectionImageOverlay: Scalars['Boolean']['output'];
    firstSectionImageUrl?: Maybe<Scalars['String']['output']>;
    headlineDe: Scalars['String']['output'];
    headlineEn: Scalars['String']['output'];
    heroImageFileUploadId?: Maybe<Scalars['ID']['output']>;
    heroImageOverlay: Scalars['Boolean']['output'];
    heroImageUrl?: Maybe<Scalars['String']['output']>;
    howItWorksAlternativeMedia: Scalars['Boolean']['output'];
    name: Scalars['String']['output'];
    partnerId: Scalars['ID']['output'];
    pathName: Scalars['String']['output'];
    previousPathNames: Array<Scalars['String']['output']>;
    promo?: Maybe<GqlSPartnerPromo>;
    publishedAt?: Maybe<Scalars['DateTime']['output']>;
    sections: Array<GqlSContentSection>;
    subHeadlineDe: Scalars['String']['output'];
    subHeadlineEn: Scalars['String']['output'];
    testimonials: Array<GqlSPartnerTestimonial>;
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
    updatedAt: Scalars['DateTime']['output'];
}

export interface GqlSPublicPartnerQuery {
    __typename?: 'PublicPartnerQuery';
    findMany: Array<GqlSPublicPartner>;
    findOneByPathName?: Maybe<GqlSPublicPartner>;
}

export type GqlSPublicPartnerQueryFindOneByPathNameArgs = {
    pathName: Scalars['String']['input'];
};

export interface GqlSPublicUser {
    __typename?: 'PublicUser';
    createdAt: Scalars['DateTime']['output'];
    display: Scalars['String']['output'];
    profilePicture?: Maybe<GqlSFileUpload>;
}

export interface GqlSPublicWebPage {
    __typename?: 'PublicWebPage';
    descriptionDe: Scalars['String']['output'];
    descriptionEn: Scalars['String']['output'];
    titleDe: Scalars['String']['output'];
    titleEn: Scalars['String']['output'];
    webPageKey: GqlSWebPageKey;
}

export interface GqlSPublicWebPageQuery {
    __typename?: 'PublicWebPageQuery';
    findOne: GqlSPublicWebPage;
}

export type GqlSPublicWebPageQueryFindOneArgs = {
    webPageKey: GqlSWebPageKey;
};

export interface GqlSQuery {
    __typename?: 'Query';
    currentSession: GqlSSession;
    publicBlogPost: GqlSPublicBlogPostQuery;
    publicCity: GqlSPublicCityQuery;
    publicCook: GqlSPublicCookQuery;
    publicLegal: GqlSPublicLegal;
    publicOccasion: GqlSPublicOccasionQuery;
    publicPartner: GqlSPublicPartnerQuery;
    publicWebPage: GqlSPublicWebPageQuery;
}

export interface GqlSSession {
    __typename?: 'Session';
    activeFeatureToggleKeys: Array<GqlSFeatureToggleKey>;
    authEmailOtp?: Maybe<GqlSAuthEmailOtp>;
    authTotpChallenge?: Maybe<GqlSAuthTotpChallenge>;
    cookieSetting?: Maybe<GqlSSessionCookieSetting>;
    discount?: Maybe<GqlSSessionDiscount>;
    giftCard?: Maybe<GqlSGiftCard>;
    giftCardPurchaseError?: Maybe<GqlSGiftCardPurchaseError>;
    locationSuggestions: Array<GqlSLocationSuggestion>;
    sessionId: Scalars['ID']['output'];
    user?: Maybe<GqlSUser>;
}

export type GqlSSessionDiscountArgs = {
    redeemCode: Scalars['String']['input'];
};

export type GqlSSessionLocationSuggestionsArgs = {
    onlyFullAddresses?: Scalars['Boolean']['input'];
    searchText: Scalars['String']['input'];
};

export interface GqlSSessionCookieSetting {
    __typename?: 'SessionCookieSetting';
    clarity: Scalars['Boolean']['output'];
    googleAnalytics: Scalars['Boolean']['output'];
}

export interface GqlSSessionDiscount {
    __typename?: 'SessionDiscount';
    amountCents: Scalars['Int']['output'];
    name: Scalars['String']['output'];
    redeemCode: Scalars['String']['output'];
}

export type GqlSSessionWebPageInteractionCreateInput = {
    area: Scalars['String']['input'];
    bookingRequestId?: InputMaybe<Scalars['ID']['input']>;
    interaction: Scalars['JSON']['input'];
    webPageKey: GqlSWebPageKey;
};

export type GqlSSessionWebPageVisitCreateInput = {
    blogPostId?: InputMaybe<Scalars['ID']['input']>;
    bookingRequestId?: InputMaybe<Scalars['ID']['input']>;
    cityId?: InputMaybe<Scalars['ID']['input']>;
    cookId?: InputMaybe<Scalars['ID']['input']>;
    occasionId?: InputMaybe<Scalars['ID']['input']>;
    partnerId?: InputMaybe<Scalars['ID']['input']>;
    path?: InputMaybe<Scalars['String']['input']>;
    webPageKey: GqlSWebPageKey;
};

export type GqlSSortDirection = 'ASC' | 'DESC';

export interface GqlSSubscription {
    __typename?: 'Subscription';
    adminUpdates: GqlSAdmin;
    chatTurnUpdates: GqlSChatTurnUpdate;
    sessionUpdates: GqlSSession;
    userUpdates: GqlSUser;
}

export type GqlSSubscriptionChatTurnUpdatesArgs = {
    chatId: Scalars['ID']['input'];
};

export interface GqlSSupportRequestBookingRequestSummary {
    __typename?: 'SupportRequestBookingRequestSummary';
    bookingRequestId: Scalars['ID']['output'];
    dateTime: Scalars['DateTime']['output'];
    occasion: Scalars['String']['output'];
}

export type GqlSSupportRequestStatus = 'OPEN' | 'RESOLVED';

export type GqlSTestimonial = GqlSCookTestimonial | GqlSCustomerTestimonial;

export type GqlSTestimonialJunctionEntryInput = {
    testimonialId: Scalars['ID']['input'];
    testimonialType: GqlSTestimonialType;
};

export type GqlSTestimonialPublicationStatus = 'PENDING_REVIEW' | 'PUBLISHED';

export type GqlSTestimonialType = 'COOK' | 'CUSTOMER';

export interface GqlSUser {
    __typename?: 'User';
    admin?: Maybe<GqlSAdmin>;
    assistantChat?: Maybe<GqlSChat>;
    assistantChats?: Maybe<Array<GqlSChat>>;
    birthDate?: Maybe<Scalars['Date']['output']>;
    bookingRequest?: Maybe<GqlSUserBookingRequest>;
    bookingRequests?: Maybe<Array<GqlSUserBookingRequest>>;
    cook?: Maybe<GqlSCook>;
    emailAddress?: Maybe<Scalars['EmailAddress']['output']>;
    firstName: Scalars['String']['output'];
    giftCards?: Maybe<Array<GqlSUserGiftCard>>;
    lastAcceptedPrivacyPolicy?: Maybe<Scalars['DateTime']['output']>;
    lastAcceptedTerms?: Maybe<Scalars['DateTime']['output']>;
    lastName: Scalars['String']['output'];
    legalAcceptance?: Maybe<GqlSUserLegalAcceptance>;
    locale: GqlSLocale;
    passkeys?: Maybe<Array<GqlSAuthPasskey>>;
    phoneNumber?: Maybe<Scalars['PhoneNumber']['output']>;
    preferredCommunication?: Maybe<GqlSUserPreferredCommunication>;
    previousEventAddresses?: Maybe<Array<GqlSCookTravelOriginAddress>>;
    profilePicture?: Maybe<GqlSFileUpload>;
    sessions?: Maybe<Array<GqlSUserSession>>;
    status: GqlSUserStatus;
    supportRequest?: Maybe<GqlSUserSupportRequest>;
    supportRequests?: Maybe<Array<GqlSUserSupportRequest>>;
    timeBasedOneTimePassword?: Maybe<GqlSAuthTimeBasedOneTimePassword>;
    timeZone: Scalars['TimeZone']['output'];
    userId: Scalars['ID']['output'];
}

export type GqlSUserAssistantChatArgs = {
    chatId: Scalars['ID']['input'];
};

export type GqlSUserAssistantChatsArgs = {
    criterion: GqlSUserAssistantChatCriterion;
};

export type GqlSUserBookingRequestArgs = {
    bookingRequestId: Scalars['ID']['input'];
};

export type GqlSUserSupportRequestArgs = {
    supportRequestId: Scalars['ID']['input'];
};

export type GqlSUserAssistantChatCriterion = {
    searchText?: InputMaybe<Scalars['String']['input']>;
    skip?: Scalars['Int']['input'];
    surface?: InputMaybe<GqlSChatSurface>;
    take?: Scalars['Int']['input'];
};

export interface GqlSUserBookingRequest {
    __typename?: 'UserBookingRequest';
    adjustedMessage?: Maybe<Scalars['String']['output']>;
    bookingRequestId: Scalars['ID']['output'];
    canceledAt?: Maybe<Scalars['DateTime']['output']>;
    cancellationReason?: Maybe<Scalars['String']['output']>;
    createdAt: Scalars['DateTime']['output'];
    dateTime: Scalars['DateTime']['output'];
    exactEventAddress: GqlSCookTravelOriginAddress;
    expiresAt?: Maybe<Scalars['DateTime']['output']>;
    giftCard?: Maybe<GqlSUserBookingRequestGiftCard>;
    invoiceAddress?: Maybe<GqlSInvoiceAddress>;
    occasion: Scalars['String']['output'];
    offers: Array<GqlSUserBookingRequestOffer>;
    originalMessage: Scalars['String']['output'];
    participants: Array<GqlSBookingRequestParticipant>;
    preferences: Array<Scalars['String']['output']>;
    priceClassType?: Maybe<GqlSBookingRequestPriceClassType>;
    priceImpact: Array<GqlSUserBookingRequestOfferPriceImpact>;
    promoCode?: Maybe<GqlSUserBookingRequestPromoCode>;
    status: GqlSBookingRequestStatus;
    supportRequest?: Maybe<GqlSUserSupportRequest>;
    travelImpact: Array<GqlSUserBookingRequestOfferTravelImpact>;
    userId: Scalars['ID']['output'];
}

export type GqlSUserBookingRequestPriceImpactArgs = {
    participantsAdult: Scalars['Int']['input'];
    participantsDiscounted: Scalars['Int']['input'];
};

export type GqlSUserBookingRequestTravelImpactArgs = {
    exactEventAddress: GqlSUserBookingRequestExactEventAddressInput;
};

export type GqlSUserBookingRequestCreate = {
    dateTime: Scalars['DateTime']['input'];
    exactEventAddress: GqlSUserBookingRequestExactEventAddressInput;
    occasion: Scalars['String']['input'];
    originalMessage: Scalars['String']['input'];
    participants: Array<GqlSUserBookingRequestParticipantCreate>;
    preferences: Array<Scalars['String']['input']>;
    priceClassType: GqlSBookingRequestPriceClassType;
    redeemCode?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSUserBookingRequestExactEventAddressInput = {
    addressLine1: Scalars['String']['input'];
    addressLine2: Scalars['String']['input'];
    city: Scalars['String']['input'];
    country: Scalars['String']['input'];
    displayText: Scalars['String']['input'];
    latitude: Scalars['Latitude']['input'];
    longitude: Scalars['Longitude']['input'];
    postCode: Scalars['String']['input'];
    state: Scalars['String']['input'];
};

export interface GqlSUserBookingRequestGiftCard {
    __typename?: 'UserBookingRequestGiftCard';
    balanceCents: Scalars['Int']['output'];
    giftCardId: Scalars['ID']['output'];
    redeemCode: Scalars['String']['output'];
}

export interface GqlSUserBookingRequestOffer {
    __typename?: 'UserBookingRequestOffer';
    activeCallRoom?: Maybe<GqlSBookingRequestOfferCallRoom>;
    bookingRequestId: Scalars['ID']['output'];
    bookingRequestOfferId: Scalars['ID']['output'];
    callBookings: Array<GqlSCookCallSlotBooking>;
    canRequestParticipantAmendment: Scalars['Boolean']['output'];
    configuredMenu?: Maybe<GqlSBookingRequestOfferConfiguredMenu>;
    cook: GqlSPublicCook;
    cookAccepted?: Maybe<Scalars['Boolean']['output']>;
    cookDeclinationReason?: Maybe<Scalars['String']['output']>;
    cookId: Scalars['ID']['output'];
    costBreakdown: GqlSCostBreakdown;
    createdAt: Scalars['DateTime']['output'];
    customerTestimonial?: Maybe<GqlSCustomerTestimonial>;
    menuPriceCents: Scalars['Int']['output'];
    messages: Array<GqlSHumanChatMessage>;
    participantAmendment?: Maybe<GqlSBookingRequestOfferParticipantAmendment>;
    payment?: Maybe<GqlSBookingRequestOfferPayment>;
    paymentDateTime?: Maybe<Scalars['DateTime']['output']>;
    paymentProviderFeeCents: Scalars['Int']['output'];
    paymentStatus: GqlSBookingRequestOfferPaymentStatus;
    payoutCentsCook: Scalars['Int']['output'];
    payoutDateTime?: Maybe<Scalars['DateTime']['output']>;
    plannedPaymentPullDateTime?: Maybe<Scalars['DateTime']['output']>;
    plannedPayoutDateTime?: Maybe<Scalars['DateTime']['output']>;
    platformFeeCentsCook: Scalars['Int']['output'];
    platformFeeCentsCustomer: Scalars['Int']['output'];
    platformFeePercentCook: Scalars['Int']['output'];
    platformFeePercentCustomer: Scalars['Int']['output'];
    preparationsCompletedAt?: Maybe<Scalars['DateTime']['output']>;
    priceAutoAdjustReason?: Maybe<GqlSBookingRequestOfferPriceAutoAdjustReason>;
    status: GqlSBookingRequestOfferStatus;
    suggestedMenus: Array<GqlSPublicCookMenu>;
    testimonialMissing: Scalars['Boolean']['output'];
    totalCentsCustomer?: Maybe<Scalars['Int']['output']>;
    totalWithoutDiscountsCentsCustomer: Scalars['Int']['output'];
    travelDistanceKm?: Maybe<Scalars['Float']['output']>;
    travelExpensesCents: Scalars['Int']['output'];
    userAccepted?: Maybe<Scalars['Boolean']['output']>;
    userDeclinationReason?: Maybe<Scalars['String']['output']>;
    userRequestedMenuAdjustments?: Maybe<Scalars['Boolean']['output']>;
    userUnreadNotificationCount: Scalars['Int']['output'];
}

export interface GqlSUserBookingRequestOfferPriceImpact {
    __typename?: 'UserBookingRequestOfferPriceImpact';
    bookingRequestOfferId: Scalars['ID']['output'];
    cookDisplay: Scalars['String']['output'];
    menuPriceCentsAfter: Scalars['Int']['output'];
    menuPriceCentsBefore: Scalars['Int']['output'];
    payoutCentsCookAfter: Scalars['Int']['output'];
    payoutCentsCookBefore: Scalars['Int']['output'];
    totalWithoutDiscountsCentsCustomerAfter: Scalars['Int']['output'];
    totalWithoutDiscountsCentsCustomerBefore: Scalars['Int']['output'];
}

export type GqlSUserBookingRequestOfferTestimonialCreate = {
    authorName?: InputMaybe<Scalars['String']['input']>;
    body: Scalars['String']['input'];
    bookingRequestOfferId: Scalars['ID']['input'];
    imageFileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    location?: InputMaybe<Scalars['String']['input']>;
    occasion?: InputMaybe<Scalars['String']['input']>;
    rating?: InputMaybe<Scalars['Int']['input']>;
};

export interface GqlSUserBookingRequestOfferTravelImpact {
    __typename?: 'UserBookingRequestOfferTravelImpact';
    bookingRequestOfferId: Scalars['ID']['output'];
    cookDisplay: Scalars['String']['output'];
    travelDistanceKmAfter: Scalars['Float']['output'];
    travelDistanceKmBefore: Scalars['Float']['output'];
    travelExpensesCentsAfter: Scalars['Int']['output'];
    travelExpensesCentsBefore: Scalars['Int']['output'];
}

export type GqlSUserBookingRequestParticipantCreate = {
    name: Scalars['String']['input'];
    restrictions: Array<Scalars['String']['input']>;
    type: GqlSBookingRequestParticipantType;
};

export interface GqlSUserBookingRequestPromoCode {
    __typename?: 'UserBookingRequestPromoCode';
    amountCents: Scalars['Int']['output'];
    promoCodeId: Scalars['ID']['output'];
    redeemCode: Scalars['String']['output'];
}

export type GqlSUserCreate = {
    birthDate?: InputMaybe<Scalars['Date']['input']>;
    cook?: InputMaybe<GqlSCookCreate>;
    firstName: Scalars['String']['input'];
    lastName: Scalars['String']['input'];
    locale: GqlSLocale;
    phoneNumber?: InputMaybe<Scalars['PhoneNumber']['input']>;
    preferredCommunication?: InputMaybe<GqlSUserPreferredCommunication>;
    timeZone: Scalars['TimeZone']['input'];
};

export interface GqlSUserGiftCard {
    __typename?: 'UserGiftCard';
    balanceCents: Scalars['Int']['output'];
    buyerEmail: Scalars['EmailAddress']['output'];
    createdAt: Scalars['DateTime']['output'];
    expiresAt: Scalars['DateTime']['output'];
    giftCardId: Scalars['ID']['output'];
    invoiceAddress?: Maybe<GqlSInvoiceAddress>;
    invoiceFileUpload?: Maybe<GqlSFileUpload>;
    invoiceFileUploadId?: Maybe<Scalars['ID']['output']>;
    message: Scalars['String']['output'];
    occasion: Scalars['String']['output'];
    originalBalanceCents: Scalars['Int']['output'];
    paymentStatus: GqlSGiftCardPaymentStatus;
    recipientName: Scalars['String']['output'];
    redeemCode?: Maybe<Scalars['String']['output']>;
    voucherFileUpload?: Maybe<GqlSFileUpload>;
    voucherFileUploadId?: Maybe<Scalars['ID']['output']>;
}

export interface GqlSUserLegalAcceptance {
    __typename?: 'UserLegalAcceptance';
    pendingPrivacyPolicy?: Maybe<GqlSPublicLegalPrivacyPolicy>;
    pendingTermsAndConditions?: Maybe<GqlSPublicLegalTermsAndConditions>;
    required: Scalars['Boolean']['output'];
}

export interface GqlSUserMutation {
    __typename?: 'UserMutation';
    authPasskeyDelete: GqlSMutationResult;
    authPasskeyRegisterOptions: Scalars['JSON']['output'];
    authPasskeyRegisterVerify: GqlSMutationResult;
    authTotpDisable: GqlSMutationResult;
    authTotpEnrollCancel: GqlSMutationResult;
    authTotpEnrollConfirm: GqlSAuthTotpEnrollConfirmResult;
    authTotpEnrollStart: GqlSAuthTotpEnrollStartResult;
    bookingRequestCancel: GqlSMutationResult;
    bookingRequestChurnPromoCodeCreate: GqlSMutationResult;
    bookingRequestCreate: GqlSMutationResult;
    bookingRequestDiscountUpdate: GqlSMutationResult;
    bookingRequestOfferAccept: GqlSMutationResult;
    bookingRequestOfferCallCreate: GqlSBookingRequestOfferCallTokenResult;
    bookingRequestOfferCallJoin: GqlSBookingRequestOfferCallTokenResult;
    bookingRequestOfferCallLeave: GqlSMutationResult;
    bookingRequestOfferCallSlotCancel: GqlSMutationResult;
    bookingRequestOfferCallSlotConfirm: GqlSMutationResult;
    bookingRequestOfferCallSlotDecline: GqlSMutationResult;
    bookingRequestOfferCallSlotRequest: GqlSMutationResult;
    bookingRequestOfferChatMessageCreate: GqlSMutationResult;
    bookingRequestOfferChatMessageReactionUpsert: GqlSMutationResult;
    bookingRequestOfferConfiguredMenuCreate: GqlSMutationResult;
    bookingRequestOfferDecline: GqlSMutationResult;
    bookingRequestOfferParticipantAmendmentCreate: GqlSMutationResult;
    bookingRequestOfferPaymentStatusUpdate: GqlSMutationResult;
    bookingRequestOfferTestimonialCreate: GqlSMutationResult;
    bookingRequestOfferUnreadNotificationCountReset: GqlSMutationResult;
    bookingRequestRequestRecall: GqlSMutationResult;
    bookingRequestUpdate: GqlSMutationResult;
    chatDelete: GqlSMutationResult;
    chatInputCollectionRespond?: Maybe<GqlSChatMessageCreateResult>;
    chatMessageCreate?: Maybe<GqlSChatMessageCreateResult>;
    chatTitleUpdate: GqlSMutationResult;
    chatToolApprovalRespond?: Maybe<GqlSChatMessageCreateResult>;
    cook: GqlSCookMutation;
    cookCreate: GqlSMutationResult;
    emailAddressUpdateOtpRequest: GqlSMutationResult;
    emailAddressUpdateOtpVerify: GqlSMutationResult;
    giftCardCreate: GqlSMutationResult;
    giftCardPay: GqlSMutationResult;
    giftCardPdfsRegenerate: GqlSMutationResult;
    supportRequestCreate: GqlSMutationResult;
    supportRequestMessageCreate: GqlSMutationResult;
    supportRequestUnreadNotificationCountReset: GqlSMutationResult;
    terminateSessions: GqlSMutationResult;
    userAnonymize: GqlSMutationResult;
    userLegalAccept: GqlSMutationResult;
    userUpdate: GqlSMutationResult;
}

export type GqlSUserMutationAuthPasskeyDeleteArgs = {
    authPasskeyId: Scalars['ID']['input'];
};

export type GqlSUserMutationAuthPasskeyRegisterVerifyArgs = {
    response: Scalars['JSON']['input'];
};

export type GqlSUserMutationAuthTotpDisableArgs = {
    code: Scalars['String']['input'];
};

export type GqlSUserMutationAuthTotpEnrollConfirmArgs = {
    code: Scalars['String']['input'];
};

export type GqlSUserMutationBookingRequestCancelArgs = {
    bookingRequestId: Scalars['ID']['input'];
    reason: Scalars['String']['input'];
};

export type GqlSUserMutationBookingRequestChurnPromoCodeCreateArgs = {
    bookingRequestId: Scalars['ID']['input'];
};

export type GqlSUserMutationBookingRequestCreateArgs = {
    input: GqlSUserBookingRequestCreate;
};

export type GqlSUserMutationBookingRequestDiscountUpdateArgs = {
    bookingRequestId: Scalars['ID']['input'];
    redeemCode?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSUserMutationBookingRequestOfferAcceptArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSUserMutationBookingRequestOfferCallCreateArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSUserMutationBookingRequestOfferCallJoinArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSUserMutationBookingRequestOfferCallLeaveArgs = {
    bookingRequestOfferCallRoomParticipantId: Scalars['ID']['input'];
};

export type GqlSUserMutationBookingRequestOfferCallSlotCancelArgs = {
    cookCallSlotBookingId: Scalars['ID']['input'];
    reason?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSUserMutationBookingRequestOfferCallSlotConfirmArgs = {
    cookCallSlotBookingId: Scalars['ID']['input'];
};

export type GqlSUserMutationBookingRequestOfferCallSlotDeclineArgs = {
    cookCallSlotBookingId: Scalars['ID']['input'];
    reason?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSUserMutationBookingRequestOfferCallSlotRequestArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
    customerMessage?: InputMaybe<Scalars['String']['input']>;
    startAt: Scalars['DateTime']['input'];
};

export type GqlSUserMutationBookingRequestOfferChatMessageCreateArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    message: Scalars['String']['input'];
};

export type GqlSUserMutationBookingRequestOfferChatMessageReactionUpsertArgs = {
    bookingRequestOfferEventId: Scalars['ID']['input'];
    emoji: Scalars['String']['input'];
};

export type GqlSUserMutationBookingRequestOfferConfiguredMenuCreateArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
    courseSelections: Array<GqlSBookingRequestOfferConfiguredMenuCourseSelectionInput>;
    menuId: Scalars['ID']['input'];
};

export type GqlSUserMutationBookingRequestOfferDeclineArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
    reason: Scalars['String']['input'];
};

export type GqlSUserMutationBookingRequestOfferParticipantAmendmentCreateArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
    participants: Array<GqlSUserBookingRequestParticipantCreate>;
};

export type GqlSUserMutationBookingRequestOfferPaymentStatusUpdateArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
    invoiceAddress: GqlSInvoiceAddressInput;
};

export type GqlSUserMutationBookingRequestOfferTestimonialCreateArgs = {
    input: GqlSUserBookingRequestOfferTestimonialCreate;
};

export type GqlSUserMutationBookingRequestOfferUnreadNotificationCountResetArgs = {
    bookingRequestOfferId: Scalars['ID']['input'];
};

export type GqlSUserMutationBookingRequestRequestRecallArgs = {
    bookingRequestId: Scalars['ID']['input'];
};

export type GqlSUserMutationBookingRequestUpdateArgs = {
    bookingRequestId: Scalars['ID']['input'];
    dateTime?: InputMaybe<Scalars['DateTime']['input']>;
    exactEventAddress?: InputMaybe<GqlSUserBookingRequestExactEventAddressInput>;
    occasion?: InputMaybe<Scalars['String']['input']>;
    participants: Array<GqlSUserBookingRequestParticipantCreate>;
    preferences?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type GqlSUserMutationChatDeleteArgs = {
    chatId: Scalars['ID']['input'];
};

export type GqlSUserMutationChatInputCollectionRespondArgs = {
    answers: Scalars['JSON']['input'];
    assistantOptions: GqlSChatAssistantOptions;
    chatTurnId: Scalars['ID']['input'];
    clientRequestId: Scalars['ID']['input'];
    toolCallId: Scalars['ID']['input'];
};

export type GqlSUserMutationChatMessageCreateArgs = {
    assistantOptions: GqlSChatAssistantOptions;
    chatId?: InputMaybe<Scalars['ID']['input']>;
    clientRequestId: Scalars['ID']['input'];
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    message: Scalars['String']['input'];
    surface: GqlSChatSurface;
};

export type GqlSUserMutationChatTitleUpdateArgs = {
    chatId: Scalars['ID']['input'];
    title: Scalars['String']['input'];
};

export type GqlSUserMutationChatToolApprovalRespondArgs = {
    approvalId: Scalars['String']['input'];
    approved: Scalars['Boolean']['input'];
    assistantOptions: GqlSChatAssistantOptions;
    chatTurnId: Scalars['ID']['input'];
    clientRequestId: Scalars['ID']['input'];
    reason?: InputMaybe<Scalars['String']['input']>;
};

export type GqlSUserMutationCookCreateArgs = {
    input: GqlSCookCreate;
};

export type GqlSUserMutationEmailAddressUpdateOtpRequestArgs = {
    emailAddress: Scalars['EmailAddress']['input'];
    locale: GqlSLocale;
};

export type GqlSUserMutationEmailAddressUpdateOtpVerifyArgs = {
    code: Scalars['String']['input'];
};

export type GqlSUserMutationGiftCardCreateArgs = {
    input: GqlSGiftCardCreate;
};

export type GqlSUserMutationGiftCardPayArgs = {
    input: GqlSGiftCardPay;
};

export type GqlSUserMutationGiftCardPdfsRegenerateArgs = {
    giftCardId: Scalars['ID']['input'];
};

export type GqlSUserMutationSupportRequestCreateArgs = {
    bookingRequestId?: InputMaybe<Scalars['ID']['input']>;
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    messageBody: Scalars['String']['input'];
    subject: Scalars['String']['input'];
};

export type GqlSUserMutationSupportRequestMessageCreateArgs = {
    fileUploadIds?: InputMaybe<Array<Scalars['ID']['input']>>;
    message: Scalars['String']['input'];
    supportRequestId: Scalars['ID']['input'];
};

export type GqlSUserMutationSupportRequestUnreadNotificationCountResetArgs = {
    supportRequestId: Scalars['ID']['input'];
};

export type GqlSUserMutationTerminateSessionsArgs = {
    sessionIds: Array<Scalars['ID']['input']>;
};

export type GqlSUserMutationUserUpdateArgs = {
    user: GqlSUserUpdate;
};

export type GqlSUserPreferredCommunication = 'CALL' | 'E_MAIL' | 'SMS' | 'WHATS_APP';

export interface GqlSUserSession {
    __typename?: 'UserSession';
    createdAt: Scalars['DateTime']['output'];
    isCurrent: Scalars['Boolean']['output'];
    lastInteractionAt: Scalars['DateTime']['output'];
    sessionId: Scalars['ID']['output'];
    userAgent?: Maybe<Scalars['String']['output']>;
}

export type GqlSUserStatus = 'ACTIVE' | 'ANONYMIZED' | 'BANNED';

export interface GqlSUserSupportRequest {
    __typename?: 'UserSupportRequest';
    bookingRequest?: Maybe<GqlSSupportRequestBookingRequestSummary>;
    createdAt: Scalars['DateTime']['output'];
    messages: Array<GqlSHumanChatMessage>;
    resolvedAt?: Maybe<Scalars['DateTime']['output']>;
    status: GqlSSupportRequestStatus;
    subject: Scalars['String']['output'];
    supportRequestId: Scalars['ID']['output'];
    userUnreadNotificationCount: Scalars['Int']['output'];
}

export type GqlSUserUpdate = {
    birthDate?: InputMaybe<Scalars['Date']['input']>;
    firstName?: InputMaybe<Scalars['String']['input']>;
    lastName?: InputMaybe<Scalars['String']['input']>;
    locale?: InputMaybe<GqlSLocale>;
    phoneNumber?: InputMaybe<Scalars['PhoneNumber']['input']>;
    preferredCommunication?: InputMaybe<GqlSUserPreferredCommunication>;
    profilePictureFileUploadId?: InputMaybe<Scalars['ID']['input']>;
    timeZone?: InputMaybe<Scalars['TimeZone']['input']>;
};

export type GqlSWebPageKey =
    | 'ABOUT_US'
    | 'ADMINISTRATION'
    | 'BLOG_POSTS'
    | 'BOOKING_REQUEST'
    | 'BOOKING_REQUEST_CHAT'
    | 'BOOKING_REQUEST_FORM'
    | 'CHEFS'
    | 'CHEF_SIGN_UP'
    | 'CITIES'
    | 'GIFT_CARD'
    | 'HOW_TO_BECOME_A_CHEF'
    | 'IMPRINT'
    | 'LANDING'
    | 'OCCASIONS'
    | 'PARTNERS'
    | 'PRIVACY_POLICY'
    | 'PROFILE'
    | 'SIGN_IN'
    | 'TERMS_AND_CONDITIONS';

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
    resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<
    TResult,
    TParent = Record<PropertyKey, never>,
    TContext = Record<PropertyKey, never>,
    TArgs = Record<PropertyKey, never>,
> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
    subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
    resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
    subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
    resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
    SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs> | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
    TResult,
    TKey extends string,
    TParent = Record<PropertyKey, never>,
    TContext = Record<PropertyKey, never>,
    TArgs = Record<PropertyKey, never>,
> =
    | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
    | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
    parent: TParent,
    context: TContext,
    info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
    obj: T,
    context: TContext,
    info: GraphQLResolveInfo,
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<
    TResult = Record<PropertyKey, never>,
    TParent = Record<PropertyKey, never>,
    TContext = Record<PropertyKey, never>,
    TArgs = Record<PropertyKey, never>,
> = (
    next: NextResolverFn<TResult>,
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

/** Mapping of union types */
export type GqlSResolversUnionTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
    AdminTestimonial: GqlSAdminCookTestimonial | GqlSAdminCustomerTestimonial;
    ChatMessagePart:
        | GqlSChatMessageDataPart
        | GqlSChatMessageFilePart
        | GqlSChatMessageReasoningPart
        | GqlSChatMessageSourceDocumentPart
        | GqlSChatMessageSourceUrlPart
        | GqlSChatMessageTextPart
        | GqlSChatMessageToolPart;
    ChatTurnUpdate:
        | (Omit<GqlSChatTurnSnapshot, 'turns'> & { turns: Array<_RefType['ChatTurn']> })
        | (Omit<GqlSChatTurnUpserted, 'turn'> & { turn: _RefType['ChatTurn'] });
    ContentSection:
        | GqlSContentSectionContent
        | GqlSContentSectionCta
        | GqlSContentSectionImage
        | GqlSContentSectionList
        | GqlSContentSectionQa
        | GqlSContentSectionQuote;
    CookBookingRequestLookupResult:
        | (Omit<GqlSCookBookingRequestAvailable, 'bookingRequest'> & { bookingRequest: _RefType['CookBookingRequest'] })
        | GqlSCookBookingRequestCanceled
        | GqlSCookBookingRequestExpired
        | GqlSCookBookingRequestNotFound
        | GqlSCookBookingRequestOfferAlreadyExists
        | GqlSCookBookingRequestTaken;
    HumanChatMessage: GqlSChatMessageBookingRequestOfferEvent | GqlSChatMessageUser;
    Testimonial: GqlSCookTestimonial | GqlSCustomerTestimonial;
}>;

/** Mapping between all available schema types and the resolvers types */
export type GqlSResolversTypes = ResolversObject<{
    Admin: ResolverTypeWrapper<
        Omit<
            GqlSAdmin,
            | 'assistantChat'
            | 'assistantChats'
            | 'blogPost'
            | 'blogPosts'
            | 'bookingRequest'
            | 'bookingRequestOffer'
            | 'bookingRequestOffers'
            | 'bookingRequests'
            | 'callTraffic'
            | 'calls'
            | 'cities'
            | 'city'
            | 'occasion'
            | 'occasions'
            | 'partner'
            | 'partners'
            | 'promoCode'
            | 'promoCodes'
            | 'supportRequest'
            | 'supportRequests'
            | 'whatsAppConversation'
            | 'whatsAppConversations'
        > & {
            assistantChat?: Maybe<GqlSResolversTypes['AdminAssistantChat']>;
            assistantChats: Array<GqlSResolversTypes['AdminAssistantChat']>;
            blogPost?: Maybe<GqlSResolversTypes['AdminBlogPost']>;
            blogPosts: Array<GqlSResolversTypes['AdminBlogPost']>;
            bookingRequest?: Maybe<GqlSResolversTypes['AdminBookingRequest']>;
            bookingRequestOffer?: Maybe<GqlSResolversTypes['AdminBookingRequestOffer']>;
            bookingRequestOffers: Array<GqlSResolversTypes['AdminBookingRequestOffer']>;
            bookingRequests: Array<GqlSResolversTypes['AdminBookingRequest']>;
            callTraffic: Array<GqlSResolversTypes['AdminCallListItem']>;
            calls: Array<GqlSResolversTypes['AdminCallListItem']>;
            cities: Array<GqlSResolversTypes['AdminCity']>;
            city?: Maybe<GqlSResolversTypes['AdminCity']>;
            occasion?: Maybe<GqlSResolversTypes['AdminOccasion']>;
            occasions: Array<GqlSResolversTypes['AdminOccasion']>;
            partner?: Maybe<GqlSResolversTypes['AdminPartner']>;
            partners: Array<GqlSResolversTypes['AdminPartner']>;
            promoCode?: Maybe<GqlSResolversTypes['AdminPromoCode']>;
            promoCodes: Array<GqlSResolversTypes['AdminPromoCode']>;
            supportRequest?: Maybe<GqlSResolversTypes['AdminSupportRequest']>;
            supportRequests: Array<GqlSResolversTypes['AdminSupportRequest']>;
            whatsAppConversation?: Maybe<GqlSResolversTypes['AdminWhatsAppConversation']>;
            whatsAppConversations: Array<GqlSResolversTypes['AdminWhatsAppConversation']>;
        }
    >;
    AdminAiGeneration: ResolverTypeWrapper<GqlSAdminAiGeneration>;
    AdminAiGenerationCriterion: GqlSAdminAiGenerationCriterion;
    AdminAiGenerationKind: GqlSAdminAiGenerationKind;
    AdminAiGenerationSortField: GqlSAdminAiGenerationSortField;
    AdminAnalyticsBookingRequestFormFlow: ResolverTypeWrapper<GqlSAdminAnalyticsBookingRequestFormFlow>;
    AdminAnalyticsCookBookingRequestOfferFlow: ResolverTypeWrapper<GqlSAdminAnalyticsCookBookingRequestOfferFlow>;
    AdminAnalyticsFunnelStepStats: ResolverTypeWrapper<GqlSAdminAnalyticsFunnelStepStats>;
    AdminAnalyticsSankeyLink: ResolverTypeWrapper<GqlSAdminAnalyticsSankeyLink>;
    AdminAnalyticsSankeyNode: ResolverTypeWrapper<GqlSAdminAnalyticsSankeyNode>;
    AdminAnalyticsSessionFunnelFlow: ResolverTypeWrapper<GqlSAdminAnalyticsSessionFunnelFlow>;
    AdminAssistantChat: ResolverTypeWrapper<Omit<GqlSAdminAssistantChat, 'turns'> & { turns: Array<GqlSResolversTypes['ChatTurn']> }>;
    AdminAssistantChatCriterion: GqlSAdminAssistantChatCriterion;
    AdminBlogPost: ResolverTypeWrapper<Omit<GqlSAdminBlogPost, 'sections'> & { sections: Array<GqlSResolversTypes['ContentSection']> }>;
    AdminBookingRequest: ResolverTypeWrapper<
        Omit<GqlSAdminBookingRequest, 'cooksInTravelRadius' | 'offers'> & {
            cooksInTravelRadius: Array<GqlSResolversTypes['AdminBookingRequestCookInTravelRadius']>;
            offers: Array<GqlSResolversTypes['AdminBookingRequestOffer']>;
        }
    >;
    AdminBookingRequestCookInTravelRadius: ResolverTypeWrapper<GqlSAdminBookingRequestCookInTravelRadius>;
    AdminBookingRequestCookOfferStat: ResolverTypeWrapper<GqlSAdminBookingRequestCookOfferStat>;
    AdminBookingRequestCookOfferStatSortField: GqlSAdminBookingRequestCookOfferStatSortField;
    AdminBookingRequestCreate: GqlSAdminBookingRequestCreate;
    AdminBookingRequestCreationMonthStat: ResolverTypeWrapper<GqlSAdminBookingRequestCreationMonthStat>;
    AdminBookingRequestCriterion: GqlSAdminBookingRequestCriterion;
    AdminBookingRequestExactEventAddressInput: GqlSAdminBookingRequestExactEventAddressInput;
    AdminBookingRequestOccasionStat: ResolverTypeWrapper<GqlSAdminBookingRequestOccasionStat>;
    AdminBookingRequestOffer: ResolverTypeWrapper<
        Omit<GqlSAdminBookingRequestOffer, 'activeCallRoom' | 'bookingRequest' | 'messages'> & {
            activeCallRoom?: Maybe<GqlSResolversTypes['BookingRequestOfferCallRoom']>;
            bookingRequest: GqlSResolversTypes['AdminBookingRequest'];
            messages: Array<GqlSResolversTypes['HumanChatMessage']>;
        }
    >;
    AdminBookingRequestOfferChatReviewAcknowledgeResult: ResolverTypeWrapper<GqlSAdminBookingRequestOfferChatReviewAcknowledgeResult>;
    AdminBookingRequestOfferCreate: GqlSAdminBookingRequestOfferCreate;
    AdminBookingRequestOfferCriterion: GqlSAdminBookingRequestOfferCriterion;
    AdminBookingRequestOfferEconomics: ResolverTypeWrapper<GqlSAdminBookingRequestOfferEconomics>;
    AdminBookingRequestOfferHandover: GqlSAdminBookingRequestOfferHandover;
    AdminBookingRequestOfferUpdate: GqlSAdminBookingRequestOfferUpdate;
    AdminBookingRequestSortField: GqlSAdminBookingRequestSortField;
    AdminBookingRequestUpdate: GqlSAdminBookingRequestUpdate;
    AdminCall: ResolverTypeWrapper<GqlSAdminCall>;
    AdminCallCookStat: ResolverTypeWrapper<GqlSAdminCallCookStat>;
    AdminCallCookStatSortField: GqlSAdminCallCookStatSortField;
    AdminCallListItem: ResolverTypeWrapper<
        Omit<GqlSAdminCallListItem, 'callRoom'> & { callRoom?: Maybe<GqlSResolversTypes['BookingRequestOfferCallRoom']> }
    >;
    AdminCallListItemKind: GqlSAdminCallListItemKind;
    AdminCallParty: ResolverTypeWrapper<GqlSAdminCallParty>;
    AdminCallTrafficCriterion: GqlSAdminCallTrafficCriterion;
    AdminCallTrafficSortField: GqlSAdminCallTrafficSortField;
    AdminCity: ResolverTypeWrapper<
        Omit<GqlSAdminCity, 'cooks' | 'sections' | 'testimonials'> & {
            cooks: Array<GqlSResolversTypes['AdminCityCook']>;
            sections: Array<GqlSResolversTypes['ContentSection']>;
            testimonials: Array<GqlSResolversTypes['AdminCityTestimonial']>;
        }
    >;
    AdminCityCook: ResolverTypeWrapper<GqlSAdminCityCook>;
    AdminCityTestimonial: ResolverTypeWrapper<
        Omit<GqlSAdminCityTestimonial, 'testimonial'> & { testimonial: GqlSResolversTypes['AdminTestimonial'] }
    >;
    AdminCook: ResolverTypeWrapper<GqlSAdminCook>;
    AdminCookFeaturedLanding: ResolverTypeWrapper<GqlSAdminCookFeaturedLanding>;
    AdminCookFeaturedLandingKind: GqlSAdminCookFeaturedLandingKind;
    AdminCookInTravelRadiusPreview: ResolverTypeWrapper<GqlSAdminCookInTravelRadiusPreview>;
    AdminCookInventoryStatus: GqlSAdminCookInventoryStatus;
    AdminCookMeal: ResolverTypeWrapper<GqlSAdminCookMeal>;
    AdminCookMealCriterion: GqlSAdminCookMealCriterion;
    AdminCookMealImageFilter: GqlSAdminCookMealImageFilter;
    AdminCookMealSortField: GqlSAdminCookMealSortField;
    AdminCookMenu: ResolverTypeWrapper<GqlSAdminCookMenu>;
    AdminCookMenuCourse: ResolverTypeWrapper<GqlSAdminCookMenuCourse>;
    AdminCookMenuCriterion: GqlSAdminCookMenuCriterion;
    AdminCookMenuSortField: GqlSAdminCookMenuSortField;
    AdminCookPayoutBlockedReason: GqlSAdminCookPayoutBlockedReason;
    AdminCookTestimonial: ResolverTypeWrapper<GqlSAdminCookTestimonial>;
    AdminCookTestimonialCreate: GqlSAdminCookTestimonialCreate;
    AdminCookTestimonialCriterion: GqlSAdminCookTestimonialCriterion;
    AdminCookTestimonialUpdate: GqlSAdminCookTestimonialUpdate;
    AdminCustomerTestimonial: ResolverTypeWrapper<GqlSAdminCustomerTestimonial>;
    AdminCustomerTestimonialCreate: GqlSAdminCustomerTestimonialCreate;
    AdminCustomerTestimonialCriterion: GqlSAdminCustomerTestimonialCriterion;
    AdminCustomerTestimonialUpdate: GqlSAdminCustomerTestimonialUpdate;
    AdminDatabaseSlowStatement: ResolverTypeWrapper<GqlSAdminDatabaseSlowStatement>;
    AdminFeatureToggle: ResolverTypeWrapper<GqlSAdminFeatureToggle>;
    AdminFeatureToggleUserOverride: ResolverTypeWrapper<GqlSAdminFeatureToggleUserOverride>;
    AdminGiftCard: ResolverTypeWrapper<GqlSAdminGiftCard>;
    AdminGiftCardCriterion: GqlSAdminGiftCardCriterion;
    AdminGiftCardOccasionStat: ResolverTypeWrapper<GqlSAdminGiftCardOccasionStat>;
    AdminGiftCardSalesMonthStat: ResolverTypeWrapper<GqlSAdminGiftCardSalesMonthStat>;
    AdminGiftCardSortField: GqlSAdminGiftCardSortField;
    AdminLegalDocumentDraftInput: GqlSAdminLegalDocumentDraftInput;
    AdminLegalImprint: ResolverTypeWrapper<GqlSAdminLegalImprint>;
    AdminLegalPrivacyPolicy: ResolverTypeWrapper<GqlSAdminLegalPrivacyPolicy>;
    AdminLegalTermsAndConditions: ResolverTypeWrapper<GqlSAdminLegalTermsAndConditions>;
    AdminLog: ResolverTypeWrapper<GqlSAdminLog>;
    AdminLogCriterion: GqlSAdminLogCriterion;
    AdminLogLevel: GqlSAdminLogLevel;
    AdminLogSortField: GqlSAdminLogSortField;
    AdminMutation: ResolverTypeWrapper<GqlSAdminMutation>;
    AdminObjectStorageObject: ResolverTypeWrapper<GqlSAdminObjectStorageObject>;
    AdminObjectStorageObjectCriterion: GqlSAdminObjectStorageObjectCriterion;
    AdminObjectStorageObjectPage: ResolverTypeWrapper<GqlSAdminObjectStorageObjectPage>;
    AdminOccasion: ResolverTypeWrapper<
        Omit<GqlSAdminOccasion, 'cooks' | 'sections' | 'testimonials'> & {
            cooks: Array<GqlSResolversTypes['AdminOccasionCook']>;
            sections: Array<GqlSResolversTypes['ContentSection']>;
            testimonials: Array<GqlSResolversTypes['AdminOccasionTestimonial']>;
        }
    >;
    AdminOccasionCook: ResolverTypeWrapper<GqlSAdminOccasionCook>;
    AdminOccasionTestimonial: ResolverTypeWrapper<
        Omit<GqlSAdminOccasionTestimonial, 'testimonial'> & { testimonial: GqlSResolversTypes['AdminTestimonial'] }
    >;
    AdminOutboundEmail: ResolverTypeWrapper<GqlSAdminOutboundEmail>;
    AdminOutboundEmailCriterion: GqlSAdminOutboundEmailCriterion;
    AdminOutboundEmailLifecycleStatus: GqlSAdminOutboundEmailLifecycleStatus;
    AdminOutboundEmailProvider: GqlSAdminOutboundEmailProvider;
    AdminOutboundEmailPurpose: GqlSAdminOutboundEmailPurpose;
    AdminOutboundEmailPurposeStat: ResolverTypeWrapper<GqlSAdminOutboundEmailPurposeStat>;
    AdminOutboundEmailRecipientStat: ResolverTypeWrapper<GqlSAdminOutboundEmailRecipientStat>;
    AdminOutboundEmailRelatedEntityType: GqlSAdminOutboundEmailRelatedEntityType;
    AdminOutboundEmailSortField: GqlSAdminOutboundEmailSortField;
    AdminPartner: ResolverTypeWrapper<
        Omit<GqlSAdminPartner, 'cooks' | 'sections' | 'testimonials'> & {
            cooks: Array<GqlSResolversTypes['AdminPartnerCook']>;
            sections: Array<GqlSResolversTypes['ContentSection']>;
            testimonials: Array<GqlSResolversTypes['AdminPartnerTestimonial']>;
        }
    >;
    AdminPartnerCook: ResolverTypeWrapper<GqlSAdminPartnerCook>;
    AdminPartnerTestimonial: ResolverTypeWrapper<
        Omit<GqlSAdminPartnerTestimonial, 'testimonial'> & { testimonial: GqlSResolversTypes['AdminTestimonial'] }
    >;
    AdminPromoCode: ResolverTypeWrapper<
        Omit<GqlSAdminPromoCode, 'bookingRequests'> & { bookingRequests: Array<GqlSResolversTypes['AdminBookingRequest']> }
    >;
    AdminPromoCodeCreate: GqlSAdminPromoCodeCreate;
    AdminPromoCodeCriterion: GqlSAdminPromoCodeCriterion;
    AdminPromoCodeSortField: GqlSAdminPromoCodeSortField;
    AdminPromoCodeUpdate: GqlSAdminPromoCodeUpdate;
    AdminQueuedJob: ResolverTypeWrapper<GqlSAdminQueuedJob>;
    AdminQueuedJobState: GqlSAdminQueuedJobState;
    AdminResendEmailQuota: ResolverTypeWrapper<GqlSAdminResendEmailQuota>;
    AdminResendUsage: ResolverTypeWrapper<GqlSAdminResendUsage>;
    AdminSession: ResolverTypeWrapper<GqlSAdminSession>;
    AdminSessionCriterion: GqlSAdminSessionCriterion;
    AdminSessionEvent: ResolverTypeWrapper<GqlSAdminSessionEvent>;
    AdminSessionEventCriterion: GqlSAdminSessionEventCriterion;
    AdminSessionKind: GqlSAdminSessionKind;
    AdminSessionSortField: GqlSAdminSessionSortField;
    AdminSupportRequest: ResolverTypeWrapper<
        Omit<GqlSAdminSupportRequest, 'bookingRequest' | 'messages'> & {
            bookingRequest?: Maybe<GqlSResolversTypes['SupportRequestBookingRequestSummary']>;
            messages: Array<GqlSResolversTypes['HumanChatMessage']>;
        }
    >;
    AdminSupportRequestCriterion: GqlSAdminSupportRequestCriterion;
    AdminSupportRequestSortField: GqlSAdminSupportRequestSortField;
    AdminTestimonial: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['AdminTestimonial']>;
    AdminTimeBucket: ResolverTypeWrapper<GqlSAdminTimeBucket>;
    AdminTimeBucketGranularity: GqlSAdminTimeBucketGranularity;
    AdminUser: ResolverTypeWrapper<GqlSAdminUser>;
    AdminUserCreate: GqlSAdminUserCreate;
    AdminUserCriterion: GqlSAdminUserCriterion;
    AdminUserInsights: ResolverTypeWrapper<GqlSAdminUserInsights>;
    AdminUserLocaleStat: ResolverTypeWrapper<GqlSAdminUserLocaleStat>;
    AdminUserPreferredCommunicationStat: ResolverTypeWrapper<GqlSAdminUserPreferredCommunicationStat>;
    AdminUserSortField: GqlSAdminUserSortField;
    AdminUserTimeZoneStat: ResolverTypeWrapper<GqlSAdminUserTimeZoneStat>;
    AdminUserType: GqlSAdminUserType;
    AdminUserUpcomingBirthday: ResolverTypeWrapper<GqlSAdminUserUpcomingBirthday>;
    AdminWebPage: ResolverTypeWrapper<GqlSAdminWebPage>;
    AdminWebPageUpdate: GqlSAdminWebPageUpdate;
    AdminWhatsAppConversation: ResolverTypeWrapper<
        Omit<GqlSAdminWhatsAppConversation, 'messages'> & { messages: Array<GqlSResolversTypes['HumanChatMessage']> }
    >;
    AdminWhatsAppConversationCriterion: GqlSAdminWhatsAppConversationCriterion;
    AuthEmailOtp: ResolverTypeWrapper<GqlSAuthEmailOtp>;
    AuthPasskey: ResolverTypeWrapper<GqlSAuthPasskey>;
    AuthTimeBasedOneTimePassword: ResolverTypeWrapper<GqlSAuthTimeBasedOneTimePassword>;
    AuthTotpChallenge: ResolverTypeWrapper<GqlSAuthTotpChallenge>;
    AuthTotpEnrollConfirmResult: ResolverTypeWrapper<GqlSAuthTotpEnrollConfirmResult>;
    AuthTotpEnrollStartResult: ResolverTypeWrapper<GqlSAuthTotpEnrollStartResult>;
    BlogPostUpsert: GqlSBlogPostUpsert;
    BookingRequestCookMenuEvaluation: ResolverTypeWrapper<GqlSBookingRequestCookMenuEvaluation>;
    BookingRequestCookMenuEvaluationGeneratedCourse: ResolverTypeWrapper<GqlSBookingRequestCookMenuEvaluationGeneratedCourse>;
    BookingRequestCookMenuEvaluationGeneratedMealOption: ResolverTypeWrapper<GqlSBookingRequestCookMenuEvaluationGeneratedMealOption>;
    BookingRequestCookMenuEvaluationGeneratedMenu: ResolverTypeWrapper<GqlSBookingRequestCookMenuEvaluationGeneratedMenu>;
    BookingRequestCookMenuEvaluationMenu: ResolverTypeWrapper<GqlSBookingRequestCookMenuEvaluationMenu>;
    BookingRequestCookPoolDetails: ResolverTypeWrapper<GqlSBookingRequestCookPoolDetails>;
    BookingRequestOfferCallRecording: ResolverTypeWrapper<GqlSBookingRequestOfferCallRecording>;
    BookingRequestOfferCallRecordingStatus: GqlSBookingRequestOfferCallRecordingStatus;
    BookingRequestOfferCallRoom: ResolverTypeWrapper<GqlSBookingRequestOfferCallRoom>;
    BookingRequestOfferCallRoomStatus: GqlSBookingRequestOfferCallRoomStatus;
    BookingRequestOfferCallTokenResult: ResolverTypeWrapper<GqlSBookingRequestOfferCallTokenResult>;
    BookingRequestOfferCallTranscriptSegment: ResolverTypeWrapper<GqlSBookingRequestOfferCallTranscriptSegment>;
    BookingRequestOfferConfiguredMenu: ResolverTypeWrapper<GqlSBookingRequestOfferConfiguredMenu>;
    BookingRequestOfferConfiguredMenuCourse: ResolverTypeWrapper<GqlSBookingRequestOfferConfiguredMenuCourse>;
    BookingRequestOfferConfiguredMenuCourseInput: GqlSBookingRequestOfferConfiguredMenuCourseInput;
    BookingRequestOfferConfiguredMenuCourseSelectionInput: GqlSBookingRequestOfferConfiguredMenuCourseSelectionInput;
    BookingRequestOfferConfiguredMenuInput: GqlSBookingRequestOfferConfiguredMenuInput;
    BookingRequestOfferConfiguredMenuMeal: ResolverTypeWrapper<GqlSBookingRequestOfferConfiguredMenuMeal>;
    BookingRequestOfferConfiguredMenuMealInput: GqlSBookingRequestOfferConfiguredMenuMealInput;
    BookingRequestOfferCreate: GqlSBookingRequestOfferCreate;
    BookingRequestOfferParticipantAmendment: ResolverTypeWrapper<GqlSBookingRequestOfferParticipantAmendment>;
    BookingRequestOfferParticipantAmendmentParticipant: ResolverTypeWrapper<GqlSBookingRequestOfferParticipantAmendmentParticipant>;
    BookingRequestOfferPayment: ResolverTypeWrapper<GqlSBookingRequestOfferPayment>;
    BookingRequestOfferPaymentDataType: GqlSBookingRequestOfferPaymentDataType;
    BookingRequestOfferPaymentStatus: GqlSBookingRequestOfferPaymentStatus;
    BookingRequestOfferPriceAutoAdjustReason: GqlSBookingRequestOfferPriceAutoAdjustReason;
    BookingRequestOfferPriceUpdate: GqlSBookingRequestOfferPriceUpdate;
    BookingRequestOfferStatus: GqlSBookingRequestOfferStatus;
    BookingRequestOfferSuggestedMenusUpdate: GqlSBookingRequestOfferSuggestedMenusUpdate;
    BookingRequestParticipant: ResolverTypeWrapper<GqlSBookingRequestParticipant>;
    BookingRequestParticipantType: GqlSBookingRequestParticipantType;
    BookingRequestPriceClassType: GqlSBookingRequestPriceClassType;
    BookingRequestPublicationStatus: GqlSBookingRequestPublicationStatus;
    BookingRequestStatus: GqlSBookingRequestStatus;
    Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
    Chat: ResolverTypeWrapper<Omit<GqlSChat, 'turns'> & { turns: Array<GqlSResolversTypes['ChatTurn']> }>;
    ChatAssistantOptions: GqlSChatAssistantOptions;
    ChatMessage: ResolverTypeWrapper<Omit<GqlSChatMessage, 'parts'> & { parts: Array<GqlSResolversTypes['ChatMessagePart']> }>;
    ChatMessageBookingRequestOfferEvent: ResolverTypeWrapper<GqlSChatMessageBookingRequestOfferEvent>;
    ChatMessageBookingRequestOfferEventType: GqlSChatMessageBookingRequestOfferEventType;
    ChatMessageCreateResult: ResolverTypeWrapper<GqlSChatMessageCreateResult>;
    ChatMessageDataPart: ResolverTypeWrapper<GqlSChatMessageDataPart>;
    ChatMessageDeliveryStatus: GqlSChatMessageDeliveryStatus;
    ChatMessageFilePart: ResolverTypeWrapper<GqlSChatMessageFilePart>;
    ChatMessagePart: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['ChatMessagePart']>;
    ChatMessagePartState: GqlSChatMessagePartState;
    ChatMessageReaction: ResolverTypeWrapper<GqlSChatMessageReaction>;
    ChatMessageReasoningPart: ResolverTypeWrapper<GqlSChatMessageReasoningPart>;
    ChatMessageRole: GqlSChatMessageRole;
    ChatMessageSourceDocumentPart: ResolverTypeWrapper<GqlSChatMessageSourceDocumentPart>;
    ChatMessageSourceUrlPart: ResolverTypeWrapper<GqlSChatMessageSourceUrlPart>;
    ChatMessageStatus: GqlSChatMessageStatus;
    ChatMessageTextPart: ResolverTypeWrapper<GqlSChatMessageTextPart>;
    ChatMessageToolPart: ResolverTypeWrapper<GqlSChatMessageToolPart>;
    ChatMessageUser: ResolverTypeWrapper<GqlSChatMessageUser>;
    ChatSurface: GqlSChatSurface;
    ChatToolApproval: ResolverTypeWrapper<GqlSChatToolApproval>;
    ChatToolApprovalStatus: GqlSChatToolApprovalStatus;
    ChatToolDebug: ResolverTypeWrapper<GqlSChatToolDebug>;
    ChatToolState: GqlSChatToolState;
    ChatTurn: ResolverTypeWrapper<
        Omit<GqlSChatTurn, 'assistantMessage' | 'userMessage'> & {
            assistantMessage: GqlSResolversTypes['ChatMessage'];
            userMessage: GqlSResolversTypes['ChatMessage'];
        }
    >;
    ChatTurnDebug: ResolverTypeWrapper<GqlSChatTurnDebug>;
    ChatTurnFailure: ResolverTypeWrapper<GqlSChatTurnFailure>;
    ChatTurnSnapshot: ResolverTypeWrapper<Omit<GqlSChatTurnSnapshot, 'turns'> & { turns: Array<GqlSResolversTypes['ChatTurn']> }>;
    ChatTurnStatus: GqlSChatTurnStatus;
    ChatTurnUpdate: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['ChatTurnUpdate']>;
    ChatTurnUpserted: ResolverTypeWrapper<Omit<GqlSChatTurnUpserted, 'turn'> & { turn: GqlSResolversTypes['ChatTurn'] }>;
    ChatTurnUsage: ResolverTypeWrapper<GqlSChatTurnUsage>;
    CityTestimonial: ResolverTypeWrapper<Omit<GqlSCityTestimonial, 'testimonial'> & { testimonial: GqlSResolversTypes['Testimonial'] }>;
    CityUpsert: GqlSCityUpsert;
    ClientObservabilityKind: GqlSClientObservabilityKind;
    ClientObservabilityReportInput: GqlSClientObservabilityReportInput;
    ClientWebVitalName: GqlSClientWebVitalName;
    ContentListStyle: GqlSContentListStyle;
    ContentSection: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['ContentSection']>;
    ContentSectionContent: ResolverTypeWrapper<GqlSContentSectionContent>;
    ContentSectionCta: ResolverTypeWrapper<GqlSContentSectionCta>;
    ContentSectionImage: ResolverTypeWrapper<GqlSContentSectionImage>;
    ContentSectionInput: GqlSContentSectionInput;
    ContentSectionKind: GqlSContentSectionKind;
    ContentSectionList: ResolverTypeWrapper<GqlSContentSectionList>;
    ContentSectionQa: ResolverTypeWrapper<GqlSContentSectionQa>;
    ContentSectionQaEntry: ResolverTypeWrapper<GqlSContentSectionQaEntry>;
    ContentSectionQaEntryInput: GqlSContentSectionQaEntryInput;
    ContentSectionQuote: ResolverTypeWrapper<GqlSContentSectionQuote>;
    Cook: ResolverTypeWrapper<
        Omit<GqlSCook, 'bookingRequest' | 'bookingRequestLookup' | 'bookingRequestOffer' | 'bookingRequestOffers' | 'bookingRequests'> & {
            bookingRequest?: Maybe<GqlSResolversTypes['CookBookingRequest']>;
            bookingRequestLookup: GqlSResolversTypes['CookBookingRequestLookupResult'];
            bookingRequestOffer?: Maybe<GqlSResolversTypes['CookBookingRequestOffer']>;
            bookingRequestOffers: Array<GqlSResolversTypes['CookBookingRequestOffer']>;
            bookingRequests: Array<GqlSResolversTypes['CookBookingRequest']>;
        }
    >;
    CookBookingRequest: ResolverTypeWrapper<
        Omit<GqlSCookBookingRequest, 'cookPoolDetails' | 'offers'> & {
            cookPoolDetails?: Maybe<GqlSResolversTypes['BookingRequestCookPoolDetails']>;
            offers: Array<GqlSResolversTypes['CookBookingRequestOffer']>;
        }
    >;
    CookBookingRequestAvailable: ResolverTypeWrapper<
        Omit<GqlSCookBookingRequestAvailable, 'bookingRequest'> & { bookingRequest: GqlSResolversTypes['CookBookingRequest'] }
    >;
    CookBookingRequestCanceled: ResolverTypeWrapper<GqlSCookBookingRequestCanceled>;
    CookBookingRequestExpired: ResolverTypeWrapper<GqlSCookBookingRequestExpired>;
    CookBookingRequestFindManyCriterion: GqlSCookBookingRequestFindManyCriterion;
    CookBookingRequestLookupResult: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['CookBookingRequestLookupResult']>;
    CookBookingRequestNotFound: ResolverTypeWrapper<GqlSCookBookingRequestNotFound>;
    CookBookingRequestOffer: ResolverTypeWrapper<
        Omit<GqlSCookBookingRequestOffer, 'activeCallRoom' | 'messages'> & {
            activeCallRoom?: Maybe<GqlSResolversTypes['BookingRequestOfferCallRoom']>;
            messages: Array<GqlSResolversTypes['HumanChatMessage']>;
        }
    >;
    CookBookingRequestOfferAlreadyExists: ResolverTypeWrapper<GqlSCookBookingRequestOfferAlreadyExists>;
    CookBookingRequestOfferContext: ResolverTypeWrapper<GqlSCookBookingRequestOfferContext>;
    CookBookingRequestOfferFindManyCriterion: GqlSCookBookingRequestOfferFindManyCriterion;
    CookBookingRequestOfferListBucket: GqlSCookBookingRequestOfferListBucket;
    CookBookingRequestOfferTestimonialCreate: GqlSCookBookingRequestOfferTestimonialCreate;
    CookBookingRequestTaken: ResolverTypeWrapper<GqlSCookBookingRequestTaken>;
    CookCallAvailabilityException: ResolverTypeWrapper<GqlSCookCallAvailabilityException>;
    CookCallAvailabilityExceptionCreate: GqlSCookCallAvailabilityExceptionCreate;
    CookCallAvailabilityExceptionType: GqlSCookCallAvailabilityExceptionType;
    CookCallAvailabilityRule: ResolverTypeWrapper<GqlSCookCallAvailabilityRule>;
    CookCallAvailabilityRuleCreate: GqlSCookCallAvailabilityRuleCreate;
    CookCallSlot: ResolverTypeWrapper<GqlSCookCallSlot>;
    CookCallSlotBooking: ResolverTypeWrapper<GqlSCookCallSlotBooking>;
    CookCallSlotBookingActor: GqlSCookCallSlotBookingActor;
    CookCallSlotBookingCriterion: GqlSCookCallSlotBookingCriterion;
    CookCallSlotBookingCustomer: ResolverTypeWrapper<GqlSCookCallSlotBookingCustomer>;
    CookCallSlotBookingStatus: GqlSCookCallSlotBookingStatus;
    CookCreate: GqlSCookCreate;
    CookMeal: ResolverTypeWrapper<GqlSCookMeal>;
    CookMealCreate: GqlSCookMealCreate;
    CookMealCriterion: GqlSCookMealCriterion;
    CookMealRelationshipBookingRequestOffer: ResolverTypeWrapper<GqlSCookMealRelationshipBookingRequestOffer>;
    CookMealRelationshipMenu: ResolverTypeWrapper<GqlSCookMealRelationshipMenu>;
    CookMealRelationships: ResolverTypeWrapper<GqlSCookMealRelationships>;
    CookMealUpdate: GqlSCookMealUpdate;
    CookMenu: ResolverTypeWrapper<GqlSCookMenu>;
    CookMenuCourse: ResolverTypeWrapper<GqlSCookMenuCourse>;
    CookMenuCourseInput: GqlSCookMenuCourseInput;
    CookMenuCourseSuggestion: ResolverTypeWrapper<GqlSCookMenuCourseSuggestion>;
    CookMenuCriterion: GqlSCookMenuCriterion;
    CookMenuOfferContext: ResolverTypeWrapper<GqlSCookMenuOfferContext>;
    CookMenuSuggestion: ResolverTypeWrapper<GqlSCookMenuSuggestion>;
    CookMenuSuggestionMealOptionType: GqlSCookMenuSuggestionMealOptionType;
    CookMenuUpdate: GqlSCookMenuUpdate;
    CookMutation: ResolverTypeWrapper<GqlSCookMutation>;
    CookStripeAccountDetails: ResolverTypeWrapper<GqlSCookStripeAccountDetails>;
    CookStripeBalanceTransaction: ResolverTypeWrapper<GqlSCookStripeBalanceTransaction>;
    CookStripeBalanceTransactionKind: GqlSCookStripeBalanceTransactionKind;
    CookStripeBalanceTransactionStatus: GqlSCookStripeBalanceTransactionStatus;
    CookStripeDashboardResult: ResolverTypeWrapper<GqlSCookStripeDashboardResult>;
    CookStripeDisabledReason: GqlSCookStripeDisabledReason;
    CookStripeOnboardingKind: GqlSCookStripeOnboardingKind;
    CookStripeOnboardingResult: ResolverTypeWrapper<GqlSCookStripeOnboardingResult>;
    CookStripeRequirementCategory: GqlSCookStripeRequirementCategory;
    CookStripeStatus: GqlSCookStripeStatus;
    CookStripeWallet: ResolverTypeWrapper<GqlSCookStripeWallet>;
    CookTestimonial: ResolverTypeWrapper<GqlSCookTestimonial>;
    CookTestimonialLowRatingAnswers: ResolverTypeWrapper<GqlSCookTestimonialLowRatingAnswers>;
    CookTestimonialLowRatingAnswersInput: GqlSCookTestimonialLowRatingAnswersInput;
    CookTravelOriginAddress: ResolverTypeWrapper<GqlSCookTravelOriginAddress>;
    CookUpdate: GqlSCookUpdate;
    CostBreakdown: ResolverTypeWrapper<GqlSCostBreakdown>;
    CostLineItem: ResolverTypeWrapper<GqlSCostLineItem>;
    CustomerTestimonial: ResolverTypeWrapper<GqlSCustomerTestimonial>;
    Date: ResolverTypeWrapper<Scalars['Date']['output']>;
    DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
    DateTimeRange: GqlSDateTimeRange;
    EmailAddress: ResolverTypeWrapper<Scalars['EmailAddress']['output']>;
    FeatureToggleKey: GqlSFeatureToggleKey;
    FileUpload: ResolverTypeWrapper<GqlSFileUpload>;
    Float: ResolverTypeWrapper<Scalars['Float']['output']>;
    GeoCoordinates: ResolverTypeWrapper<GqlSGeoCoordinates>;
    GeoCoordinatesInput: GqlSGeoCoordinatesInput;
    GiftCard: ResolverTypeWrapper<GqlSGiftCard>;
    GiftCardCreate: GqlSGiftCardCreate;
    GiftCardPay: GqlSGiftCardPay;
    GiftCardPayment: ResolverTypeWrapper<GqlSGiftCardPayment>;
    GiftCardPaymentStatus: GqlSGiftCardPaymentStatus;
    GiftCardPurchaseError: ResolverTypeWrapper<GqlSGiftCardPurchaseError>;
    GiftCardPurchaseErrorCode: GqlSGiftCardPurchaseErrorCode;
    HumanChatMessage: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['HumanChatMessage']>;
    ID: ResolverTypeWrapper<Scalars['ID']['output']>;
    Int: ResolverTypeWrapper<Scalars['Int']['output']>;
    InvoiceAddress: ResolverTypeWrapper<GqlSInvoiceAddress>;
    InvoiceAddressInput: GqlSInvoiceAddressInput;
    JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
    Latitude: ResolverTypeWrapper<Scalars['Latitude']['output']>;
    Locale: GqlSLocale;
    LocationSuggestion: ResolverTypeWrapper<GqlSLocationSuggestion>;
    Longitude: ResolverTypeWrapper<Scalars['Longitude']['output']>;
    Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
    MutationResult: ResolverTypeWrapper<GqlSMutationResult>;
    OccasionFormatsCard: ResolverTypeWrapper<GqlSOccasionFormatsCard>;
    OccasionFormatsCardInput: GqlSOccasionFormatsCardInput;
    OccasionFormatsSection: ResolverTypeWrapper<GqlSOccasionFormatsSection>;
    OccasionFormatsSectionInput: GqlSOccasionFormatsSectionInput;
    OccasionPromo: ResolverTypeWrapper<GqlSOccasionPromo>;
    OccasionTestimonial: ResolverTypeWrapper<
        Omit<GqlSOccasionTestimonial, 'testimonial'> & { testimonial: GqlSResolversTypes['Testimonial'] }
    >;
    OccasionUpsert: GqlSOccasionUpsert;
    PartnerPromo: ResolverTypeWrapper<GqlSPartnerPromo>;
    PartnerTestimonial: ResolverTypeWrapper<
        Omit<GqlSPartnerTestimonial, 'testimonial'> & { testimonial: GqlSResolversTypes['Testimonial'] }
    >;
    PartnerUpsert: GqlSPartnerUpsert;
    PhoneNumber: ResolverTypeWrapper<Scalars['PhoneNumber']['output']>;
    PublicBlogPost: ResolverTypeWrapper<Omit<GqlSPublicBlogPost, 'sections'> & { sections: Array<GqlSResolversTypes['ContentSection']> }>;
    PublicBlogPostQuery: ResolverTypeWrapper<
        Omit<GqlSPublicBlogPostQuery, 'findMany' | 'findOneByPathName'> & {
            findMany: Array<GqlSResolversTypes['PublicBlogPost']>;
            findOneByPathName?: Maybe<GqlSResolversTypes['PublicBlogPost']>;
        }
    >;
    PublicCity: ResolverTypeWrapper<
        Omit<GqlSPublicCity, 'sections' | 'testimonials'> & {
            sections: Array<GqlSResolversTypes['ContentSection']>;
            testimonials: Array<GqlSResolversTypes['CityTestimonial']>;
        }
    >;
    PublicCityQuery: ResolverTypeWrapper<
        Omit<GqlSPublicCityQuery, 'findMany' | 'findOneByPathName'> & {
            findMany: Array<GqlSResolversTypes['PublicCity']>;
            findOneByPathName?: Maybe<GqlSResolversTypes['PublicCity']>;
        }
    >;
    PublicCook: ResolverTypeWrapper<GqlSPublicCook>;
    PublicCookFindManyCriterion: GqlSPublicCookFindManyCriterion;
    PublicCookMeal: ResolverTypeWrapper<GqlSPublicCookMeal>;
    PublicCookMenu: ResolverTypeWrapper<GqlSPublicCookMenu>;
    PublicCookMenuCourse: ResolverTypeWrapper<GqlSPublicCookMenuCourse>;
    PublicCookQuery: ResolverTypeWrapper<GqlSPublicCookQuery>;
    PublicCookRating: ResolverTypeWrapper<GqlSPublicCookRating>;
    PublicLegal: ResolverTypeWrapper<GqlSPublicLegal>;
    PublicLegalImprint: ResolverTypeWrapper<GqlSPublicLegalImprint>;
    PublicLegalPrivacyPolicy: ResolverTypeWrapper<GqlSPublicLegalPrivacyPolicy>;
    PublicLegalTermsAndConditions: ResolverTypeWrapper<GqlSPublicLegalTermsAndConditions>;
    PublicOccasion: ResolverTypeWrapper<
        Omit<GqlSPublicOccasion, 'sections' | 'testimonials'> & {
            sections: Array<GqlSResolversTypes['ContentSection']>;
            testimonials: Array<GqlSResolversTypes['OccasionTestimonial']>;
        }
    >;
    PublicOccasionQuery: ResolverTypeWrapper<
        Omit<GqlSPublicOccasionQuery, 'findMany' | 'findOneByPathName'> & {
            findMany: Array<GqlSResolversTypes['PublicOccasion']>;
            findOneByPathName?: Maybe<GqlSResolversTypes['PublicOccasion']>;
        }
    >;
    PublicPartner: ResolverTypeWrapper<
        Omit<GqlSPublicPartner, 'sections' | 'testimonials'> & {
            sections: Array<GqlSResolversTypes['ContentSection']>;
            testimonials: Array<GqlSResolversTypes['PartnerTestimonial']>;
        }
    >;
    PublicPartnerQuery: ResolverTypeWrapper<
        Omit<GqlSPublicPartnerQuery, 'findMany' | 'findOneByPathName'> & {
            findMany: Array<GqlSResolversTypes['PublicPartner']>;
            findOneByPathName?: Maybe<GqlSResolversTypes['PublicPartner']>;
        }
    >;
    PublicUser: ResolverTypeWrapper<GqlSPublicUser>;
    PublicWebPage: ResolverTypeWrapper<GqlSPublicWebPage>;
    PublicWebPageQuery: ResolverTypeWrapper<GqlSPublicWebPageQuery>;
    Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
    Session: ResolverTypeWrapper<Omit<GqlSSession, 'user'> & { user?: Maybe<GqlSResolversTypes['User']> }>;
    SessionCookieSetting: ResolverTypeWrapper<GqlSSessionCookieSetting>;
    SessionDiscount: ResolverTypeWrapper<GqlSSessionDiscount>;
    SessionWebPageInteractionCreateInput: GqlSSessionWebPageInteractionCreateInput;
    SessionWebPageVisitCreateInput: GqlSSessionWebPageVisitCreateInput;
    SortDirection: GqlSSortDirection;
    String: ResolverTypeWrapper<Scalars['String']['output']>;
    Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
    SupportRequestBookingRequestSummary: ResolverTypeWrapper<GqlSSupportRequestBookingRequestSummary>;
    SupportRequestStatus: GqlSSupportRequestStatus;
    Testimonial: ResolverTypeWrapper<GqlSResolversUnionTypes<GqlSResolversTypes>['Testimonial']>;
    TestimonialJunctionEntryInput: GqlSTestimonialJunctionEntryInput;
    TestimonialPublicationStatus: GqlSTestimonialPublicationStatus;
    TestimonialType: GqlSTestimonialType;
    TimeZone: ResolverTypeWrapper<Scalars['TimeZone']['output']>;
    User: ResolverTypeWrapper<
        Omit<
            GqlSUser,
            | 'admin'
            | 'assistantChat'
            | 'assistantChats'
            | 'bookingRequest'
            | 'bookingRequests'
            | 'cook'
            | 'supportRequest'
            | 'supportRequests'
        > & {
            admin?: Maybe<GqlSResolversTypes['Admin']>;
            assistantChat?: Maybe<GqlSResolversTypes['Chat']>;
            assistantChats?: Maybe<Array<GqlSResolversTypes['Chat']>>;
            bookingRequest?: Maybe<GqlSResolversTypes['UserBookingRequest']>;
            bookingRequests?: Maybe<Array<GqlSResolversTypes['UserBookingRequest']>>;
            cook?: Maybe<GqlSResolversTypes['Cook']>;
            supportRequest?: Maybe<GqlSResolversTypes['UserSupportRequest']>;
            supportRequests?: Maybe<Array<GqlSResolversTypes['UserSupportRequest']>>;
        }
    >;
    UserAssistantChatCriterion: GqlSUserAssistantChatCriterion;
    UserBookingRequest: ResolverTypeWrapper<
        Omit<GqlSUserBookingRequest, 'offers' | 'supportRequest'> & {
            offers: Array<GqlSResolversTypes['UserBookingRequestOffer']>;
            supportRequest?: Maybe<GqlSResolversTypes['UserSupportRequest']>;
        }
    >;
    UserBookingRequestCreate: GqlSUserBookingRequestCreate;
    UserBookingRequestExactEventAddressInput: GqlSUserBookingRequestExactEventAddressInput;
    UserBookingRequestGiftCard: ResolverTypeWrapper<GqlSUserBookingRequestGiftCard>;
    UserBookingRequestOffer: ResolverTypeWrapper<
        Omit<GqlSUserBookingRequestOffer, 'activeCallRoom' | 'messages'> & {
            activeCallRoom?: Maybe<GqlSResolversTypes['BookingRequestOfferCallRoom']>;
            messages: Array<GqlSResolversTypes['HumanChatMessage']>;
        }
    >;
    UserBookingRequestOfferPriceImpact: ResolverTypeWrapper<GqlSUserBookingRequestOfferPriceImpact>;
    UserBookingRequestOfferTestimonialCreate: GqlSUserBookingRequestOfferTestimonialCreate;
    UserBookingRequestOfferTravelImpact: ResolverTypeWrapper<GqlSUserBookingRequestOfferTravelImpact>;
    UserBookingRequestParticipantCreate: GqlSUserBookingRequestParticipantCreate;
    UserBookingRequestPromoCode: ResolverTypeWrapper<GqlSUserBookingRequestPromoCode>;
    UserCreate: GqlSUserCreate;
    UserGiftCard: ResolverTypeWrapper<GqlSUserGiftCard>;
    UserLegalAcceptance: ResolverTypeWrapper<GqlSUserLegalAcceptance>;
    UserMutation: ResolverTypeWrapper<GqlSUserMutation>;
    UserPreferredCommunication: GqlSUserPreferredCommunication;
    UserSession: ResolverTypeWrapper<GqlSUserSession>;
    UserStatus: GqlSUserStatus;
    UserSupportRequest: ResolverTypeWrapper<
        Omit<GqlSUserSupportRequest, 'bookingRequest' | 'messages'> & {
            bookingRequest?: Maybe<GqlSResolversTypes['SupportRequestBookingRequestSummary']>;
            messages: Array<GqlSResolversTypes['HumanChatMessage']>;
        }
    >;
    UserUpdate: GqlSUserUpdate;
    WebPageKey: GqlSWebPageKey;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type GqlSResolversParentTypes = ResolversObject<{
    Admin: Omit<
        GqlSAdmin,
        | 'assistantChat'
        | 'assistantChats'
        | 'blogPost'
        | 'blogPosts'
        | 'bookingRequest'
        | 'bookingRequestOffer'
        | 'bookingRequestOffers'
        | 'bookingRequests'
        | 'callTraffic'
        | 'calls'
        | 'cities'
        | 'city'
        | 'occasion'
        | 'occasions'
        | 'partner'
        | 'partners'
        | 'promoCode'
        | 'promoCodes'
        | 'supportRequest'
        | 'supportRequests'
        | 'whatsAppConversation'
        | 'whatsAppConversations'
    > & {
        assistantChat?: Maybe<GqlSResolversParentTypes['AdminAssistantChat']>;
        assistantChats: Array<GqlSResolversParentTypes['AdminAssistantChat']>;
        blogPost?: Maybe<GqlSResolversParentTypes['AdminBlogPost']>;
        blogPosts: Array<GqlSResolversParentTypes['AdminBlogPost']>;
        bookingRequest?: Maybe<GqlSResolversParentTypes['AdminBookingRequest']>;
        bookingRequestOffer?: Maybe<GqlSResolversParentTypes['AdminBookingRequestOffer']>;
        bookingRequestOffers: Array<GqlSResolversParentTypes['AdminBookingRequestOffer']>;
        bookingRequests: Array<GqlSResolversParentTypes['AdminBookingRequest']>;
        callTraffic: Array<GqlSResolversParentTypes['AdminCallListItem']>;
        calls: Array<GqlSResolversParentTypes['AdminCallListItem']>;
        cities: Array<GqlSResolversParentTypes['AdminCity']>;
        city?: Maybe<GqlSResolversParentTypes['AdminCity']>;
        occasion?: Maybe<GqlSResolversParentTypes['AdminOccasion']>;
        occasions: Array<GqlSResolversParentTypes['AdminOccasion']>;
        partner?: Maybe<GqlSResolversParentTypes['AdminPartner']>;
        partners: Array<GqlSResolversParentTypes['AdminPartner']>;
        promoCode?: Maybe<GqlSResolversParentTypes['AdminPromoCode']>;
        promoCodes: Array<GqlSResolversParentTypes['AdminPromoCode']>;
        supportRequest?: Maybe<GqlSResolversParentTypes['AdminSupportRequest']>;
        supportRequests: Array<GqlSResolversParentTypes['AdminSupportRequest']>;
        whatsAppConversation?: Maybe<GqlSResolversParentTypes['AdminWhatsAppConversation']>;
        whatsAppConversations: Array<GqlSResolversParentTypes['AdminWhatsAppConversation']>;
    };
    AdminAiGeneration: GqlSAdminAiGeneration;
    AdminAiGenerationCriterion: GqlSAdminAiGenerationCriterion;
    AdminAnalyticsBookingRequestFormFlow: GqlSAdminAnalyticsBookingRequestFormFlow;
    AdminAnalyticsCookBookingRequestOfferFlow: GqlSAdminAnalyticsCookBookingRequestOfferFlow;
    AdminAnalyticsFunnelStepStats: GqlSAdminAnalyticsFunnelStepStats;
    AdminAnalyticsSankeyLink: GqlSAdminAnalyticsSankeyLink;
    AdminAnalyticsSankeyNode: GqlSAdminAnalyticsSankeyNode;
    AdminAnalyticsSessionFunnelFlow: GqlSAdminAnalyticsSessionFunnelFlow;
    AdminAssistantChat: Omit<GqlSAdminAssistantChat, 'turns'> & { turns: Array<GqlSResolversParentTypes['ChatTurn']> };
    AdminAssistantChatCriterion: GqlSAdminAssistantChatCriterion;
    AdminBlogPost: Omit<GqlSAdminBlogPost, 'sections'> & { sections: Array<GqlSResolversParentTypes['ContentSection']> };
    AdminBookingRequest: Omit<GqlSAdminBookingRequest, 'cooksInTravelRadius' | 'offers'> & {
        cooksInTravelRadius: Array<GqlSResolversParentTypes['AdminBookingRequestCookInTravelRadius']>;
        offers: Array<GqlSResolversParentTypes['AdminBookingRequestOffer']>;
    };
    AdminBookingRequestCookInTravelRadius: GqlSAdminBookingRequestCookInTravelRadius;
    AdminBookingRequestCookOfferStat: GqlSAdminBookingRequestCookOfferStat;
    AdminBookingRequestCreate: GqlSAdminBookingRequestCreate;
    AdminBookingRequestCreationMonthStat: GqlSAdminBookingRequestCreationMonthStat;
    AdminBookingRequestCriterion: GqlSAdminBookingRequestCriterion;
    AdminBookingRequestExactEventAddressInput: GqlSAdminBookingRequestExactEventAddressInput;
    AdminBookingRequestOccasionStat: GqlSAdminBookingRequestOccasionStat;
    AdminBookingRequestOffer: Omit<GqlSAdminBookingRequestOffer, 'activeCallRoom' | 'bookingRequest' | 'messages'> & {
        activeCallRoom?: Maybe<GqlSResolversParentTypes['BookingRequestOfferCallRoom']>;
        bookingRequest: GqlSResolversParentTypes['AdminBookingRequest'];
        messages: Array<GqlSResolversParentTypes['HumanChatMessage']>;
    };
    AdminBookingRequestOfferChatReviewAcknowledgeResult: GqlSAdminBookingRequestOfferChatReviewAcknowledgeResult;
    AdminBookingRequestOfferCreate: GqlSAdminBookingRequestOfferCreate;
    AdminBookingRequestOfferCriterion: GqlSAdminBookingRequestOfferCriterion;
    AdminBookingRequestOfferEconomics: GqlSAdminBookingRequestOfferEconomics;
    AdminBookingRequestOfferHandover: GqlSAdminBookingRequestOfferHandover;
    AdminBookingRequestOfferUpdate: GqlSAdminBookingRequestOfferUpdate;
    AdminBookingRequestUpdate: GqlSAdminBookingRequestUpdate;
    AdminCall: GqlSAdminCall;
    AdminCallCookStat: GqlSAdminCallCookStat;
    AdminCallListItem: Omit<GqlSAdminCallListItem, 'callRoom'> & {
        callRoom?: Maybe<GqlSResolversParentTypes['BookingRequestOfferCallRoom']>;
    };
    AdminCallParty: GqlSAdminCallParty;
    AdminCallTrafficCriterion: GqlSAdminCallTrafficCriterion;
    AdminCity: Omit<GqlSAdminCity, 'cooks' | 'sections' | 'testimonials'> & {
        cooks: Array<GqlSResolversParentTypes['AdminCityCook']>;
        sections: Array<GqlSResolversParentTypes['ContentSection']>;
        testimonials: Array<GqlSResolversParentTypes['AdminCityTestimonial']>;
    };
    AdminCityCook: GqlSAdminCityCook;
    AdminCityTestimonial: Omit<GqlSAdminCityTestimonial, 'testimonial'> & { testimonial: GqlSResolversParentTypes['AdminTestimonial'] };
    AdminCook: GqlSAdminCook;
    AdminCookFeaturedLanding: GqlSAdminCookFeaturedLanding;
    AdminCookInTravelRadiusPreview: GqlSAdminCookInTravelRadiusPreview;
    AdminCookMeal: GqlSAdminCookMeal;
    AdminCookMealCriterion: GqlSAdminCookMealCriterion;
    AdminCookMenu: GqlSAdminCookMenu;
    AdminCookMenuCourse: GqlSAdminCookMenuCourse;
    AdminCookMenuCriterion: GqlSAdminCookMenuCriterion;
    AdminCookTestimonial: GqlSAdminCookTestimonial;
    AdminCookTestimonialCreate: GqlSAdminCookTestimonialCreate;
    AdminCookTestimonialCriterion: GqlSAdminCookTestimonialCriterion;
    AdminCookTestimonialUpdate: GqlSAdminCookTestimonialUpdate;
    AdminCustomerTestimonial: GqlSAdminCustomerTestimonial;
    AdminCustomerTestimonialCreate: GqlSAdminCustomerTestimonialCreate;
    AdminCustomerTestimonialCriterion: GqlSAdminCustomerTestimonialCriterion;
    AdminCustomerTestimonialUpdate: GqlSAdminCustomerTestimonialUpdate;
    AdminDatabaseSlowStatement: GqlSAdminDatabaseSlowStatement;
    AdminFeatureToggle: GqlSAdminFeatureToggle;
    AdminFeatureToggleUserOverride: GqlSAdminFeatureToggleUserOverride;
    AdminGiftCard: GqlSAdminGiftCard;
    AdminGiftCardCriterion: GqlSAdminGiftCardCriterion;
    AdminGiftCardOccasionStat: GqlSAdminGiftCardOccasionStat;
    AdminGiftCardSalesMonthStat: GqlSAdminGiftCardSalesMonthStat;
    AdminLegalDocumentDraftInput: GqlSAdminLegalDocumentDraftInput;
    AdminLegalImprint: GqlSAdminLegalImprint;
    AdminLegalPrivacyPolicy: GqlSAdminLegalPrivacyPolicy;
    AdminLegalTermsAndConditions: GqlSAdminLegalTermsAndConditions;
    AdminLog: GqlSAdminLog;
    AdminLogCriterion: GqlSAdminLogCriterion;
    AdminMutation: GqlSAdminMutation;
    AdminObjectStorageObject: GqlSAdminObjectStorageObject;
    AdminObjectStorageObjectCriterion: GqlSAdminObjectStorageObjectCriterion;
    AdminObjectStorageObjectPage: GqlSAdminObjectStorageObjectPage;
    AdminOccasion: Omit<GqlSAdminOccasion, 'cooks' | 'sections' | 'testimonials'> & {
        cooks: Array<GqlSResolversParentTypes['AdminOccasionCook']>;
        sections: Array<GqlSResolversParentTypes['ContentSection']>;
        testimonials: Array<GqlSResolversParentTypes['AdminOccasionTestimonial']>;
    };
    AdminOccasionCook: GqlSAdminOccasionCook;
    AdminOccasionTestimonial: Omit<GqlSAdminOccasionTestimonial, 'testimonial'> & {
        testimonial: GqlSResolversParentTypes['AdminTestimonial'];
    };
    AdminOutboundEmail: GqlSAdminOutboundEmail;
    AdminOutboundEmailCriterion: GqlSAdminOutboundEmailCriterion;
    AdminOutboundEmailPurposeStat: GqlSAdminOutboundEmailPurposeStat;
    AdminOutboundEmailRecipientStat: GqlSAdminOutboundEmailRecipientStat;
    AdminPartner: Omit<GqlSAdminPartner, 'cooks' | 'sections' | 'testimonials'> & {
        cooks: Array<GqlSResolversParentTypes['AdminPartnerCook']>;
        sections: Array<GqlSResolversParentTypes['ContentSection']>;
        testimonials: Array<GqlSResolversParentTypes['AdminPartnerTestimonial']>;
    };
    AdminPartnerCook: GqlSAdminPartnerCook;
    AdminPartnerTestimonial: Omit<GqlSAdminPartnerTestimonial, 'testimonial'> & {
        testimonial: GqlSResolversParentTypes['AdminTestimonial'];
    };
    AdminPromoCode: Omit<GqlSAdminPromoCode, 'bookingRequests'> & {
        bookingRequests: Array<GqlSResolversParentTypes['AdminBookingRequest']>;
    };
    AdminPromoCodeCreate: GqlSAdminPromoCodeCreate;
    AdminPromoCodeCriterion: GqlSAdminPromoCodeCriterion;
    AdminPromoCodeUpdate: GqlSAdminPromoCodeUpdate;
    AdminQueuedJob: GqlSAdminQueuedJob;
    AdminResendEmailQuota: GqlSAdminResendEmailQuota;
    AdminResendUsage: GqlSAdminResendUsage;
    AdminSession: GqlSAdminSession;
    AdminSessionCriterion: GqlSAdminSessionCriterion;
    AdminSessionEvent: GqlSAdminSessionEvent;
    AdminSessionEventCriterion: GqlSAdminSessionEventCriterion;
    AdminSupportRequest: Omit<GqlSAdminSupportRequest, 'bookingRequest' | 'messages'> & {
        bookingRequest?: Maybe<GqlSResolversParentTypes['SupportRequestBookingRequestSummary']>;
        messages: Array<GqlSResolversParentTypes['HumanChatMessage']>;
    };
    AdminSupportRequestCriterion: GqlSAdminSupportRequestCriterion;
    AdminTestimonial: GqlSResolversUnionTypes<GqlSResolversParentTypes>['AdminTestimonial'];
    AdminTimeBucket: GqlSAdminTimeBucket;
    AdminUser: GqlSAdminUser;
    AdminUserCreate: GqlSAdminUserCreate;
    AdminUserCriterion: GqlSAdminUserCriterion;
    AdminUserInsights: GqlSAdminUserInsights;
    AdminUserLocaleStat: GqlSAdminUserLocaleStat;
    AdminUserPreferredCommunicationStat: GqlSAdminUserPreferredCommunicationStat;
    AdminUserTimeZoneStat: GqlSAdminUserTimeZoneStat;
    AdminUserUpcomingBirthday: GqlSAdminUserUpcomingBirthday;
    AdminWebPage: GqlSAdminWebPage;
    AdminWebPageUpdate: GqlSAdminWebPageUpdate;
    AdminWhatsAppConversation: Omit<GqlSAdminWhatsAppConversation, 'messages'> & {
        messages: Array<GqlSResolversParentTypes['HumanChatMessage']>;
    };
    AdminWhatsAppConversationCriterion: GqlSAdminWhatsAppConversationCriterion;
    AuthEmailOtp: GqlSAuthEmailOtp;
    AuthPasskey: GqlSAuthPasskey;
    AuthTimeBasedOneTimePassword: GqlSAuthTimeBasedOneTimePassword;
    AuthTotpChallenge: GqlSAuthTotpChallenge;
    AuthTotpEnrollConfirmResult: GqlSAuthTotpEnrollConfirmResult;
    AuthTotpEnrollStartResult: GqlSAuthTotpEnrollStartResult;
    BlogPostUpsert: GqlSBlogPostUpsert;
    BookingRequestCookMenuEvaluation: GqlSBookingRequestCookMenuEvaluation;
    BookingRequestCookMenuEvaluationGeneratedCourse: GqlSBookingRequestCookMenuEvaluationGeneratedCourse;
    BookingRequestCookMenuEvaluationGeneratedMealOption: GqlSBookingRequestCookMenuEvaluationGeneratedMealOption;
    BookingRequestCookMenuEvaluationGeneratedMenu: GqlSBookingRequestCookMenuEvaluationGeneratedMenu;
    BookingRequestCookMenuEvaluationMenu: GqlSBookingRequestCookMenuEvaluationMenu;
    BookingRequestCookPoolDetails: GqlSBookingRequestCookPoolDetails;
    BookingRequestOfferCallRecording: GqlSBookingRequestOfferCallRecording;
    BookingRequestOfferCallRoom: GqlSBookingRequestOfferCallRoom;
    BookingRequestOfferCallTokenResult: GqlSBookingRequestOfferCallTokenResult;
    BookingRequestOfferCallTranscriptSegment: GqlSBookingRequestOfferCallTranscriptSegment;
    BookingRequestOfferConfiguredMenu: GqlSBookingRequestOfferConfiguredMenu;
    BookingRequestOfferConfiguredMenuCourse: GqlSBookingRequestOfferConfiguredMenuCourse;
    BookingRequestOfferConfiguredMenuCourseInput: GqlSBookingRequestOfferConfiguredMenuCourseInput;
    BookingRequestOfferConfiguredMenuCourseSelectionInput: GqlSBookingRequestOfferConfiguredMenuCourseSelectionInput;
    BookingRequestOfferConfiguredMenuInput: GqlSBookingRequestOfferConfiguredMenuInput;
    BookingRequestOfferConfiguredMenuMeal: GqlSBookingRequestOfferConfiguredMenuMeal;
    BookingRequestOfferConfiguredMenuMealInput: GqlSBookingRequestOfferConfiguredMenuMealInput;
    BookingRequestOfferCreate: GqlSBookingRequestOfferCreate;
    BookingRequestOfferParticipantAmendment: GqlSBookingRequestOfferParticipantAmendment;
    BookingRequestOfferParticipantAmendmentParticipant: GqlSBookingRequestOfferParticipantAmendmentParticipant;
    BookingRequestOfferPayment: GqlSBookingRequestOfferPayment;
    BookingRequestOfferPriceUpdate: GqlSBookingRequestOfferPriceUpdate;
    BookingRequestOfferSuggestedMenusUpdate: GqlSBookingRequestOfferSuggestedMenusUpdate;
    BookingRequestParticipant: GqlSBookingRequestParticipant;
    Boolean: Scalars['Boolean']['output'];
    Chat: Omit<GqlSChat, 'turns'> & { turns: Array<GqlSResolversParentTypes['ChatTurn']> };
    ChatAssistantOptions: GqlSChatAssistantOptions;
    ChatMessage: Omit<GqlSChatMessage, 'parts'> & { parts: Array<GqlSResolversParentTypes['ChatMessagePart']> };
    ChatMessageBookingRequestOfferEvent: GqlSChatMessageBookingRequestOfferEvent;
    ChatMessageCreateResult: GqlSChatMessageCreateResult;
    ChatMessageDataPart: GqlSChatMessageDataPart;
    ChatMessageFilePart: GqlSChatMessageFilePart;
    ChatMessagePart: GqlSResolversUnionTypes<GqlSResolversParentTypes>['ChatMessagePart'];
    ChatMessageReaction: GqlSChatMessageReaction;
    ChatMessageReasoningPart: GqlSChatMessageReasoningPart;
    ChatMessageSourceDocumentPart: GqlSChatMessageSourceDocumentPart;
    ChatMessageSourceUrlPart: GqlSChatMessageSourceUrlPart;
    ChatMessageTextPart: GqlSChatMessageTextPart;
    ChatMessageToolPart: GqlSChatMessageToolPart;
    ChatMessageUser: GqlSChatMessageUser;
    ChatToolApproval: GqlSChatToolApproval;
    ChatToolDebug: GqlSChatToolDebug;
    ChatTurn: Omit<GqlSChatTurn, 'assistantMessage' | 'userMessage'> & {
        assistantMessage: GqlSResolversParentTypes['ChatMessage'];
        userMessage: GqlSResolversParentTypes['ChatMessage'];
    };
    ChatTurnDebug: GqlSChatTurnDebug;
    ChatTurnFailure: GqlSChatTurnFailure;
    ChatTurnSnapshot: Omit<GqlSChatTurnSnapshot, 'turns'> & { turns: Array<GqlSResolversParentTypes['ChatTurn']> };
    ChatTurnUpdate: GqlSResolversUnionTypes<GqlSResolversParentTypes>['ChatTurnUpdate'];
    ChatTurnUpserted: Omit<GqlSChatTurnUpserted, 'turn'> & { turn: GqlSResolversParentTypes['ChatTurn'] };
    ChatTurnUsage: GqlSChatTurnUsage;
    CityTestimonial: Omit<GqlSCityTestimonial, 'testimonial'> & { testimonial: GqlSResolversParentTypes['Testimonial'] };
    CityUpsert: GqlSCityUpsert;
    ClientObservabilityReportInput: GqlSClientObservabilityReportInput;
    ContentSection: GqlSResolversUnionTypes<GqlSResolversParentTypes>['ContentSection'];
    ContentSectionContent: GqlSContentSectionContent;
    ContentSectionCta: GqlSContentSectionCta;
    ContentSectionImage: GqlSContentSectionImage;
    ContentSectionInput: GqlSContentSectionInput;
    ContentSectionList: GqlSContentSectionList;
    ContentSectionQa: GqlSContentSectionQa;
    ContentSectionQaEntry: GqlSContentSectionQaEntry;
    ContentSectionQaEntryInput: GqlSContentSectionQaEntryInput;
    ContentSectionQuote: GqlSContentSectionQuote;
    Cook: Omit<GqlSCook, 'bookingRequest' | 'bookingRequestLookup' | 'bookingRequestOffer' | 'bookingRequestOffers' | 'bookingRequests'> & {
        bookingRequest?: Maybe<GqlSResolversParentTypes['CookBookingRequest']>;
        bookingRequestLookup: GqlSResolversParentTypes['CookBookingRequestLookupResult'];
        bookingRequestOffer?: Maybe<GqlSResolversParentTypes['CookBookingRequestOffer']>;
        bookingRequestOffers: Array<GqlSResolversParentTypes['CookBookingRequestOffer']>;
        bookingRequests: Array<GqlSResolversParentTypes['CookBookingRequest']>;
    };
    CookBookingRequest: Omit<GqlSCookBookingRequest, 'cookPoolDetails' | 'offers'> & {
        cookPoolDetails?: Maybe<GqlSResolversParentTypes['BookingRequestCookPoolDetails']>;
        offers: Array<GqlSResolversParentTypes['CookBookingRequestOffer']>;
    };
    CookBookingRequestAvailable: Omit<GqlSCookBookingRequestAvailable, 'bookingRequest'> & {
        bookingRequest: GqlSResolversParentTypes['CookBookingRequest'];
    };
    CookBookingRequestCanceled: GqlSCookBookingRequestCanceled;
    CookBookingRequestExpired: GqlSCookBookingRequestExpired;
    CookBookingRequestFindManyCriterion: GqlSCookBookingRequestFindManyCriterion;
    CookBookingRequestLookupResult: GqlSResolversUnionTypes<GqlSResolversParentTypes>['CookBookingRequestLookupResult'];
    CookBookingRequestNotFound: GqlSCookBookingRequestNotFound;
    CookBookingRequestOffer: Omit<GqlSCookBookingRequestOffer, 'activeCallRoom' | 'messages'> & {
        activeCallRoom?: Maybe<GqlSResolversParentTypes['BookingRequestOfferCallRoom']>;
        messages: Array<GqlSResolversParentTypes['HumanChatMessage']>;
    };
    CookBookingRequestOfferAlreadyExists: GqlSCookBookingRequestOfferAlreadyExists;
    CookBookingRequestOfferContext: GqlSCookBookingRequestOfferContext;
    CookBookingRequestOfferFindManyCriterion: GqlSCookBookingRequestOfferFindManyCriterion;
    CookBookingRequestOfferTestimonialCreate: GqlSCookBookingRequestOfferTestimonialCreate;
    CookBookingRequestTaken: GqlSCookBookingRequestTaken;
    CookCallAvailabilityException: GqlSCookCallAvailabilityException;
    CookCallAvailabilityExceptionCreate: GqlSCookCallAvailabilityExceptionCreate;
    CookCallAvailabilityRule: GqlSCookCallAvailabilityRule;
    CookCallAvailabilityRuleCreate: GqlSCookCallAvailabilityRuleCreate;
    CookCallSlot: GqlSCookCallSlot;
    CookCallSlotBooking: GqlSCookCallSlotBooking;
    CookCallSlotBookingCriterion: GqlSCookCallSlotBookingCriterion;
    CookCallSlotBookingCustomer: GqlSCookCallSlotBookingCustomer;
    CookCreate: GqlSCookCreate;
    CookMeal: GqlSCookMeal;
    CookMealCreate: GqlSCookMealCreate;
    CookMealCriterion: GqlSCookMealCriterion;
    CookMealRelationshipBookingRequestOffer: GqlSCookMealRelationshipBookingRequestOffer;
    CookMealRelationshipMenu: GqlSCookMealRelationshipMenu;
    CookMealRelationships: GqlSCookMealRelationships;
    CookMealUpdate: GqlSCookMealUpdate;
    CookMenu: GqlSCookMenu;
    CookMenuCourse: GqlSCookMenuCourse;
    CookMenuCourseInput: GqlSCookMenuCourseInput;
    CookMenuCourseSuggestion: GqlSCookMenuCourseSuggestion;
    CookMenuCriterion: GqlSCookMenuCriterion;
    CookMenuOfferContext: GqlSCookMenuOfferContext;
    CookMenuSuggestion: GqlSCookMenuSuggestion;
    CookMenuUpdate: GqlSCookMenuUpdate;
    CookMutation: GqlSCookMutation;
    CookStripeAccountDetails: GqlSCookStripeAccountDetails;
    CookStripeBalanceTransaction: GqlSCookStripeBalanceTransaction;
    CookStripeDashboardResult: GqlSCookStripeDashboardResult;
    CookStripeOnboardingResult: GqlSCookStripeOnboardingResult;
    CookStripeWallet: GqlSCookStripeWallet;
    CookTestimonial: GqlSCookTestimonial;
    CookTestimonialLowRatingAnswers: GqlSCookTestimonialLowRatingAnswers;
    CookTestimonialLowRatingAnswersInput: GqlSCookTestimonialLowRatingAnswersInput;
    CookTravelOriginAddress: GqlSCookTravelOriginAddress;
    CookUpdate: GqlSCookUpdate;
    CostBreakdown: GqlSCostBreakdown;
    CostLineItem: GqlSCostLineItem;
    CustomerTestimonial: GqlSCustomerTestimonial;
    Date: Scalars['Date']['output'];
    DateTime: Scalars['DateTime']['output'];
    DateTimeRange: GqlSDateTimeRange;
    EmailAddress: Scalars['EmailAddress']['output'];
    FileUpload: GqlSFileUpload;
    Float: Scalars['Float']['output'];
    GeoCoordinates: GqlSGeoCoordinates;
    GeoCoordinatesInput: GqlSGeoCoordinatesInput;
    GiftCard: GqlSGiftCard;
    GiftCardCreate: GqlSGiftCardCreate;
    GiftCardPay: GqlSGiftCardPay;
    GiftCardPayment: GqlSGiftCardPayment;
    GiftCardPurchaseError: GqlSGiftCardPurchaseError;
    HumanChatMessage: GqlSResolversUnionTypes<GqlSResolversParentTypes>['HumanChatMessage'];
    ID: Scalars['ID']['output'];
    Int: Scalars['Int']['output'];
    InvoiceAddress: GqlSInvoiceAddress;
    InvoiceAddressInput: GqlSInvoiceAddressInput;
    JSON: Scalars['JSON']['output'];
    Latitude: Scalars['Latitude']['output'];
    LocationSuggestion: GqlSLocationSuggestion;
    Longitude: Scalars['Longitude']['output'];
    Mutation: Record<PropertyKey, never>;
    MutationResult: GqlSMutationResult;
    OccasionFormatsCard: GqlSOccasionFormatsCard;
    OccasionFormatsCardInput: GqlSOccasionFormatsCardInput;
    OccasionFormatsSection: GqlSOccasionFormatsSection;
    OccasionFormatsSectionInput: GqlSOccasionFormatsSectionInput;
    OccasionPromo: GqlSOccasionPromo;
    OccasionTestimonial: Omit<GqlSOccasionTestimonial, 'testimonial'> & { testimonial: GqlSResolversParentTypes['Testimonial'] };
    OccasionUpsert: GqlSOccasionUpsert;
    PartnerPromo: GqlSPartnerPromo;
    PartnerTestimonial: Omit<GqlSPartnerTestimonial, 'testimonial'> & { testimonial: GqlSResolversParentTypes['Testimonial'] };
    PartnerUpsert: GqlSPartnerUpsert;
    PhoneNumber: Scalars['PhoneNumber']['output'];
    PublicBlogPost: Omit<GqlSPublicBlogPost, 'sections'> & { sections: Array<GqlSResolversParentTypes['ContentSection']> };
    PublicBlogPostQuery: Omit<GqlSPublicBlogPostQuery, 'findMany' | 'findOneByPathName'> & {
        findMany: Array<GqlSResolversParentTypes['PublicBlogPost']>;
        findOneByPathName?: Maybe<GqlSResolversParentTypes['PublicBlogPost']>;
    };
    PublicCity: Omit<GqlSPublicCity, 'sections' | 'testimonials'> & {
        sections: Array<GqlSResolversParentTypes['ContentSection']>;
        testimonials: Array<GqlSResolversParentTypes['CityTestimonial']>;
    };
    PublicCityQuery: Omit<GqlSPublicCityQuery, 'findMany' | 'findOneByPathName'> & {
        findMany: Array<GqlSResolversParentTypes['PublicCity']>;
        findOneByPathName?: Maybe<GqlSResolversParentTypes['PublicCity']>;
    };
    PublicCook: GqlSPublicCook;
    PublicCookFindManyCriterion: GqlSPublicCookFindManyCriterion;
    PublicCookMeal: GqlSPublicCookMeal;
    PublicCookMenu: GqlSPublicCookMenu;
    PublicCookMenuCourse: GqlSPublicCookMenuCourse;
    PublicCookQuery: GqlSPublicCookQuery;
    PublicCookRating: GqlSPublicCookRating;
    PublicLegal: GqlSPublicLegal;
    PublicLegalImprint: GqlSPublicLegalImprint;
    PublicLegalPrivacyPolicy: GqlSPublicLegalPrivacyPolicy;
    PublicLegalTermsAndConditions: GqlSPublicLegalTermsAndConditions;
    PublicOccasion: Omit<GqlSPublicOccasion, 'sections' | 'testimonials'> & {
        sections: Array<GqlSResolversParentTypes['ContentSection']>;
        testimonials: Array<GqlSResolversParentTypes['OccasionTestimonial']>;
    };
    PublicOccasionQuery: Omit<GqlSPublicOccasionQuery, 'findMany' | 'findOneByPathName'> & {
        findMany: Array<GqlSResolversParentTypes['PublicOccasion']>;
        findOneByPathName?: Maybe<GqlSResolversParentTypes['PublicOccasion']>;
    };
    PublicPartner: Omit<GqlSPublicPartner, 'sections' | 'testimonials'> & {
        sections: Array<GqlSResolversParentTypes['ContentSection']>;
        testimonials: Array<GqlSResolversParentTypes['PartnerTestimonial']>;
    };
    PublicPartnerQuery: Omit<GqlSPublicPartnerQuery, 'findMany' | 'findOneByPathName'> & {
        findMany: Array<GqlSResolversParentTypes['PublicPartner']>;
        findOneByPathName?: Maybe<GqlSResolversParentTypes['PublicPartner']>;
    };
    PublicUser: GqlSPublicUser;
    PublicWebPage: GqlSPublicWebPage;
    PublicWebPageQuery: GqlSPublicWebPageQuery;
    Query: Record<PropertyKey, never>;
    Session: Omit<GqlSSession, 'user'> & { user?: Maybe<GqlSResolversParentTypes['User']> };
    SessionCookieSetting: GqlSSessionCookieSetting;
    SessionDiscount: GqlSSessionDiscount;
    SessionWebPageInteractionCreateInput: GqlSSessionWebPageInteractionCreateInput;
    SessionWebPageVisitCreateInput: GqlSSessionWebPageVisitCreateInput;
    String: Scalars['String']['output'];
    Subscription: Record<PropertyKey, never>;
    SupportRequestBookingRequestSummary: GqlSSupportRequestBookingRequestSummary;
    Testimonial: GqlSResolversUnionTypes<GqlSResolversParentTypes>['Testimonial'];
    TestimonialJunctionEntryInput: GqlSTestimonialJunctionEntryInput;
    TimeZone: Scalars['TimeZone']['output'];
    User: Omit<
        GqlSUser,
        'admin' | 'assistantChat' | 'assistantChats' | 'bookingRequest' | 'bookingRequests' | 'cook' | 'supportRequest' | 'supportRequests'
    > & {
        admin?: Maybe<GqlSResolversParentTypes['Admin']>;
        assistantChat?: Maybe<GqlSResolversParentTypes['Chat']>;
        assistantChats?: Maybe<Array<GqlSResolversParentTypes['Chat']>>;
        bookingRequest?: Maybe<GqlSResolversParentTypes['UserBookingRequest']>;
        bookingRequests?: Maybe<Array<GqlSResolversParentTypes['UserBookingRequest']>>;
        cook?: Maybe<GqlSResolversParentTypes['Cook']>;
        supportRequest?: Maybe<GqlSResolversParentTypes['UserSupportRequest']>;
        supportRequests?: Maybe<Array<GqlSResolversParentTypes['UserSupportRequest']>>;
    };
    UserAssistantChatCriterion: GqlSUserAssistantChatCriterion;
    UserBookingRequest: Omit<GqlSUserBookingRequest, 'offers' | 'supportRequest'> & {
        offers: Array<GqlSResolversParentTypes['UserBookingRequestOffer']>;
        supportRequest?: Maybe<GqlSResolversParentTypes['UserSupportRequest']>;
    };
    UserBookingRequestCreate: GqlSUserBookingRequestCreate;
    UserBookingRequestExactEventAddressInput: GqlSUserBookingRequestExactEventAddressInput;
    UserBookingRequestGiftCard: GqlSUserBookingRequestGiftCard;
    UserBookingRequestOffer: Omit<GqlSUserBookingRequestOffer, 'activeCallRoom' | 'messages'> & {
        activeCallRoom?: Maybe<GqlSResolversParentTypes['BookingRequestOfferCallRoom']>;
        messages: Array<GqlSResolversParentTypes['HumanChatMessage']>;
    };
    UserBookingRequestOfferPriceImpact: GqlSUserBookingRequestOfferPriceImpact;
    UserBookingRequestOfferTestimonialCreate: GqlSUserBookingRequestOfferTestimonialCreate;
    UserBookingRequestOfferTravelImpact: GqlSUserBookingRequestOfferTravelImpact;
    UserBookingRequestParticipantCreate: GqlSUserBookingRequestParticipantCreate;
    UserBookingRequestPromoCode: GqlSUserBookingRequestPromoCode;
    UserCreate: GqlSUserCreate;
    UserGiftCard: GqlSUserGiftCard;
    UserLegalAcceptance: GqlSUserLegalAcceptance;
    UserMutation: GqlSUserMutation;
    UserSession: GqlSUserSession;
    UserSupportRequest: Omit<GqlSUserSupportRequest, 'bookingRequest' | 'messages'> & {
        bookingRequest?: Maybe<GqlSResolversParentTypes['SupportRequestBookingRequestSummary']>;
        messages: Array<GqlSResolversParentTypes['HumanChatMessage']>;
    };
    UserUpdate: GqlSUserUpdate;
}>;

export type GqlSAdminResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Admin'] = GqlSResolversParentTypes['Admin'],
> = ResolversObject<{
    adminId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    aiGeneration?: Resolver<
        Maybe<GqlSResolversTypes['AdminAiGeneration']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminAiGenerationArgs, 'aiGenerationId'>
    >;
    aiGenerationCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminAiGenerationCountsArgs, 'criteria'>
    >;
    aiGenerationCreations?: Resolver<
        Array<GqlSResolversTypes['AdminTimeBucket']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminAiGenerationCreationsArgs, 'granularity' | 'range'>
    >;
    aiGenerations?: Resolver<
        Array<GqlSResolversTypes['AdminAiGeneration']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminAiGenerationsArgs, 'criterion'>
    >;
    assistantChat?: Resolver<
        Maybe<GqlSResolversTypes['AdminAssistantChat']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminAssistantChatArgs, 'chatId'>
    >;
    assistantChatCreations?: Resolver<
        Array<GqlSResolversTypes['AdminTimeBucket']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminAssistantChatCreationsArgs, 'granularity' | 'range'>
    >;
    assistantChats?: Resolver<
        Array<GqlSResolversTypes['AdminAssistantChat']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminAssistantChatsArgs, 'criterion'>
    >;
    assistantChatsCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminAssistantChatsCountsArgs, 'criteria'>
    >;
    blogPost?: Resolver<
        Maybe<GqlSResolversTypes['AdminBlogPost']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBlogPostArgs, 'blogPostId'>
    >;
    blogPosts?: Resolver<Array<GqlSResolversTypes['AdminBlogPost']>, ParentType, ContextType>;
    bookingRequest?: Resolver<
        Maybe<GqlSResolversTypes['AdminBookingRequest']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBookingRequestArgs, 'bookingRequestId'>
    >;
    bookingRequestAverageParticipants?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    bookingRequestCheckoutFlow?: Resolver<
        GqlSResolversTypes['AdminAnalyticsSessionFunnelFlow'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBookingRequestCheckoutFlowArgs, 'range'>
    >;
    bookingRequestCookOfferStats?: Resolver<
        Array<GqlSResolversTypes['AdminBookingRequestCookOfferStat']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBookingRequestCookOfferStatsArgs, 'sortBy' | 'take'>
    >;
    bookingRequestCreationMonthStats?: Resolver<
        Array<GqlSResolversTypes['AdminBookingRequestCreationMonthStat']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBookingRequestCreationMonthStatsArgs, 'take'>
    >;
    bookingRequestCreations?: Resolver<
        Array<GqlSResolversTypes['AdminTimeBucket']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBookingRequestCreationsArgs, 'granularity' | 'range'>
    >;
    bookingRequestFormFlow?: Resolver<
        GqlSResolversTypes['AdminAnalyticsBookingRequestFormFlow'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBookingRequestFormFlowArgs, 'range'>
    >;
    bookingRequestOccasionStats?: Resolver<
        Array<GqlSResolversTypes['AdminBookingRequestOccasionStat']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBookingRequestOccasionStatsArgs, 'take'>
    >;
    bookingRequestOffer?: Resolver<
        Maybe<GqlSResolversTypes['AdminBookingRequestOffer']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBookingRequestOfferArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferEconomics?: Resolver<
        GqlSResolversTypes['AdminBookingRequestOfferEconomics'],
        ParentType,
        ContextType,
        Partial<GqlSAdminBookingRequestOfferEconomicsArgs>
    >;
    bookingRequestOffers?: Resolver<
        Array<GqlSResolversTypes['AdminBookingRequestOffer']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBookingRequestOffersArgs, 'criterion'>
    >;
    bookingRequestOffersCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBookingRequestOffersCountsArgs, 'criteria'>
    >;
    bookingRequests?: Resolver<
        Array<GqlSResolversTypes['AdminBookingRequest']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBookingRequestsArgs, 'criterion'>
    >;
    bookingRequestsCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminBookingRequestsCountsArgs, 'criteria'>
    >;
    call?: Resolver<
        Maybe<GqlSResolversTypes['AdminCall']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCallArgs, 'bookingRequestOfferCallRoomId'>
    >;
    callCookStats?: Resolver<
        Array<GqlSResolversTypes['AdminCallCookStat']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCallCookStatsArgs, 'range' | 'sortBy' | 'take'>
    >;
    callRoomCreations?: Resolver<
        Array<GqlSResolversTypes['AdminTimeBucket']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCallRoomCreationsArgs, 'granularity' | 'range'>
    >;
    callSlotCreations?: Resolver<
        Array<GqlSResolversTypes['AdminTimeBucket']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCallSlotCreationsArgs, 'granularity' | 'range'>
    >;
    callTraffic?: Resolver<
        Array<GqlSResolversTypes['AdminCallListItem']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCallTrafficArgs, 'criterion'>
    >;
    callTrafficCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCallTrafficCountsArgs, 'criteria'>
    >;
    calls?: Resolver<Array<GqlSResolversTypes['AdminCallListItem']>, ParentType, ContextType>;
    chefSignUpFlow?: Resolver<
        GqlSResolversTypes['AdminAnalyticsSessionFunnelFlow'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminChefSignUpFlowArgs, 'range'>
    >;
    cities?: Resolver<Array<GqlSResolversTypes['AdminCity']>, ParentType, ContextType>;
    city?: Resolver<Maybe<GqlSResolversTypes['AdminCity']>, ParentType, ContextType, RequireFields<GqlSAdminCityArgs, 'cityId'>>;
    cookBookingRequestOfferFlow?: Resolver<
        GqlSResolversTypes['AdminAnalyticsCookBookingRequestOfferFlow'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCookBookingRequestOfferFlowArgs, 'range'>
    >;
    cookMeal?: Resolver<
        Maybe<GqlSResolversTypes['AdminCookMeal']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCookMealArgs, 'mealId'>
    >;
    cookMeals?: Resolver<
        Array<GqlSResolversTypes['AdminCookMeal']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCookMealsArgs, 'criterion'>
    >;
    cookMealsCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCookMealsCountsArgs, 'criteria'>
    >;
    cookMenu?: Resolver<
        Maybe<GqlSResolversTypes['AdminCookMenu']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCookMenuArgs, 'menuId'>
    >;
    cookMenus?: Resolver<
        Array<GqlSResolversTypes['AdminCookMenu']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCookMenusArgs, 'criterion'>
    >;
    cookMenusCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCookMenusCountsArgs, 'criteria'>
    >;
    cookTestimonial?: Resolver<
        Maybe<GqlSResolversTypes['AdminCookTestimonial']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCookTestimonialArgs, 'cookTestimonialId'>
    >;
    cookTestimonials?: Resolver<
        Array<GqlSResolversTypes['AdminCookTestimonial']>,
        ParentType,
        ContextType,
        Partial<GqlSAdminCookTestimonialsArgs>
    >;
    cooksInTravelRadius?: Resolver<
        Array<GqlSResolversTypes['AdminCookInTravelRadiusPreview']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCooksInTravelRadiusArgs, 'latitude' | 'longitude'>
    >;
    customerTestimonial?: Resolver<
        Maybe<GqlSResolversTypes['AdminCustomerTestimonial']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminCustomerTestimonialArgs, 'customerTestimonialId'>
    >;
    customerTestimonials?: Resolver<
        Array<GqlSResolversTypes['AdminCustomerTestimonial']>,
        ParentType,
        ContextType,
        Partial<GqlSAdminCustomerTestimonialsArgs>
    >;
    databaseSlowStatements?: Resolver<
        Array<GqlSResolversTypes['AdminDatabaseSlowStatement']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminDatabaseSlowStatementsArgs, 'limit'>
    >;
    featureToggles?: Resolver<Array<GqlSResolversTypes['AdminFeatureToggle']>, ParentType, ContextType>;
    giftCard?: Resolver<
        Maybe<GqlSResolversTypes['AdminGiftCard']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminGiftCardArgs, 'giftCardId'>
    >;
    giftCardCreations?: Resolver<
        Array<GqlSResolversTypes['AdminTimeBucket']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminGiftCardCreationsArgs, 'granularity' | 'range'>
    >;
    giftCardFlow?: Resolver<
        GqlSResolversTypes['AdminAnalyticsSessionFunnelFlow'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminGiftCardFlowArgs, 'range'>
    >;
    giftCardOccasionStats?: Resolver<
        Array<GqlSResolversTypes['AdminGiftCardOccasionStat']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminGiftCardOccasionStatsArgs, 'take'>
    >;
    giftCardPaidPurchaseAverageCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    giftCardSalesMonthStats?: Resolver<
        Array<GqlSResolversTypes['AdminGiftCardSalesMonthStat']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminGiftCardSalesMonthStatsArgs, 'take'>
    >;
    giftCards?: Resolver<
        Array<GqlSResolversTypes['AdminGiftCard']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminGiftCardsArgs, 'criterion'>
    >;
    giftCardsCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminGiftCardsCountsArgs, 'criteria'>
    >;
    legalImprints?: Resolver<Array<GqlSResolversTypes['AdminLegalImprint']>, ParentType, ContextType>;
    legalPrivacyPolicies?: Resolver<Array<GqlSResolversTypes['AdminLegalPrivacyPolicy']>, ParentType, ContextType>;
    legalTermsAndConditions?: Resolver<Array<GqlSResolversTypes['AdminLegalTermsAndConditions']>, ParentType, ContextType>;
    log?: Resolver<Maybe<GqlSResolversTypes['AdminLog']>, ParentType, ContextType, RequireFields<GqlSAdminLogArgs, 'logId'>>;
    logCounts?: Resolver<Array<GqlSResolversTypes['Int']>, ParentType, ContextType, RequireFields<GqlSAdminLogCountsArgs, 'criteria'>>;
    logCreations?: Resolver<
        Array<GqlSResolversTypes['AdminTimeBucket']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminLogCreationsArgs, 'granularity' | 'range'>
    >;
    logs?: Resolver<Array<GqlSResolversTypes['AdminLog']>, ParentType, ContextType, RequireFields<GqlSAdminLogsArgs, 'criterion'>>;
    objectStorageObjects?: Resolver<
        GqlSResolversTypes['AdminObjectStorageObjectPage'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminObjectStorageObjectsArgs, 'criterion'>
    >;
    occasion?: Resolver<
        Maybe<GqlSResolversTypes['AdminOccasion']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminOccasionArgs, 'occasionId'>
    >;
    occasions?: Resolver<Array<GqlSResolversTypes['AdminOccasion']>, ParentType, ContextType>;
    outboundEmail?: Resolver<
        Maybe<GqlSResolversTypes['AdminOutboundEmail']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminOutboundEmailArgs, 'outboundEmailId'>
    >;
    outboundEmailCreations?: Resolver<
        Array<GqlSResolversTypes['AdminTimeBucket']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminOutboundEmailCreationsArgs, 'granularity' | 'range'>
    >;
    outboundEmailPurposeStats?: Resolver<
        Array<GqlSResolversTypes['AdminOutboundEmailPurposeStat']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminOutboundEmailPurposeStatsArgs, 'take'>
    >;
    outboundEmailRecipientStats?: Resolver<
        Array<GqlSResolversTypes['AdminOutboundEmailRecipientStat']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminOutboundEmailRecipientStatsArgs, 'take'>
    >;
    outboundEmails?: Resolver<
        Array<GqlSResolversTypes['AdminOutboundEmail']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminOutboundEmailsArgs, 'criterion'>
    >;
    outboundEmailsCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminOutboundEmailsCountsArgs, 'criteria'>
    >;
    partner?: Resolver<
        Maybe<GqlSResolversTypes['AdminPartner']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminPartnerArgs, 'partnerId'>
    >;
    partners?: Resolver<Array<GqlSResolversTypes['AdminPartner']>, ParentType, ContextType>;
    promoCode?: Resolver<
        Maybe<GqlSResolversTypes['AdminPromoCode']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminPromoCodeArgs, 'promoCodeId'>
    >;
    promoCodes?: Resolver<
        Array<GqlSResolversTypes['AdminPromoCode']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminPromoCodesArgs, 'criterion'>
    >;
    promoCodesCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminPromoCodesCountsArgs, 'criteria'>
    >;
    queuedJobs?: Resolver<Array<GqlSResolversTypes['AdminQueuedJob']>, ParentType, ContextType>;
    resendUsage?: Resolver<Maybe<GqlSResolversTypes['AdminResendUsage']>, ParentType, ContextType>;
    session?: Resolver<
        Maybe<GqlSResolversTypes['AdminSession']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminSessionArgs, 'sessionId'>
    >;
    sessionCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminSessionCountsArgs, 'criteria'>
    >;
    sessionCreations?: Resolver<
        Array<GqlSResolversTypes['AdminTimeBucket']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminSessionCreationsArgs, 'granularity' | 'range'>
    >;
    sessionEventWebPageVisitCreations?: Resolver<
        Array<GqlSResolversTypes['AdminTimeBucket']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminSessionEventWebPageVisitCreationsArgs, 'granularity' | 'range' | 'webPageKey'>
    >;
    sessionEvents?: Resolver<
        Array<GqlSResolversTypes['AdminSessionEvent']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminSessionEventsArgs, 'criterion'>
    >;
    sessionEventsCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminSessionEventsCountsArgs, 'criteria'>
    >;
    sessions?: Resolver<
        Array<GqlSResolversTypes['AdminSession']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminSessionsArgs, 'criterion'>
    >;
    supportRequest?: Resolver<
        Maybe<GqlSResolversTypes['AdminSupportRequest']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminSupportRequestArgs, 'supportRequestId'>
    >;
    supportRequests?: Resolver<
        Array<GqlSResolversTypes['AdminSupportRequest']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminSupportRequestsArgs, 'criterion'>
    >;
    supportRequestsCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminSupportRequestsCountsArgs, 'criteria'>
    >;
    upcomingBirthdays?: Resolver<
        Array<GqlSResolversTypes['AdminUserUpcomingBirthday']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminUpcomingBirthdaysArgs, 'take'>
    >;
    user?: Resolver<Maybe<GqlSResolversTypes['AdminUser']>, ParentType, ContextType, RequireFields<GqlSAdminUserArgs, 'userId'>>;
    userCounts?: Resolver<Array<GqlSResolversTypes['Int']>, ParentType, ContextType, RequireFields<GqlSAdminUserCountsArgs, 'criteria'>>;
    userInsights?: Resolver<GqlSResolversTypes['AdminUserInsights'], ParentType, ContextType>;
    userRegistrations?: Resolver<
        Array<GqlSResolversTypes['AdminTimeBucket']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminUserRegistrationsArgs, 'granularity' | 'range'>
    >;
    users?: Resolver<Array<GqlSResolversTypes['AdminUser']>, ParentType, ContextType, RequireFields<GqlSAdminUsersArgs, 'criterion'>>;
    webPage?: Resolver<GqlSResolversTypes['AdminWebPage'], ParentType, ContextType, RequireFields<GqlSAdminWebPageArgs, 'webPageKey'>>;
    webPages?: Resolver<Array<GqlSResolversTypes['AdminWebPage']>, ParentType, ContextType>;
    whatsAppConversation?: Resolver<
        Maybe<GqlSResolversTypes['AdminWhatsAppConversation']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminWhatsAppConversationArgs, 'whatsAppConversationId'>
    >;
    whatsAppConversations?: Resolver<
        Array<GqlSResolversTypes['AdminWhatsAppConversation']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminWhatsAppConversationsArgs, 'criterion'>
    >;
    whatsAppConversationsAdminUnreadCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    whatsAppConversationsCounts?: Resolver<
        Array<GqlSResolversTypes['Int']>,
        ParentType,
        ContextType,
        RequireFields<GqlSAdminWhatsAppConversationsCountsArgs, 'criteria'>
    >;
}>;

export type GqlSAdminAiGenerationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminAiGeneration'] = GqlSResolversParentTypes['AdminAiGeneration'],
> = ResolversObject<{
    aiGenerationId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cachedInputTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    inputTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['AdminAiGenerationKind'], ParentType, ContextType>;
    modelId?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    output?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    outputTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    prompt?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    reasoningTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    session?: Resolver<Maybe<GqlSResolversTypes['AdminSession']>, ParentType, ContextType>;
    sessionId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    system?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    totalTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    user?: Resolver<Maybe<GqlSResolversTypes['AdminUser']>, ParentType, ContextType>;
    userId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSAdminAnalyticsBookingRequestFormFlowResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminAnalyticsBookingRequestFormFlow'] =
        GqlSResolversParentTypes['AdminAnalyticsBookingRequestFormFlow'],
> = ResolversObject<{
    bookingRequestsCreated?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    links?: Resolver<Array<GqlSResolversTypes['AdminAnalyticsSankeyLink']>, ParentType, ContextType>;
    nodes?: Resolver<Array<GqlSResolversTypes['AdminAnalyticsSankeyNode']>, ParentType, ContextType>;
    sessionsWithCompletion?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    steps?: Resolver<Array<GqlSResolversTypes['AdminAnalyticsFunnelStepStats']>, ParentType, ContextType>;
}>;

export type GqlSAdminAnalyticsCookBookingRequestOfferFlowResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminAnalyticsCookBookingRequestOfferFlow'] =
        GqlSResolversParentTypes['AdminAnalyticsCookBookingRequestOfferFlow'],
> = ResolversObject<{
    declinedCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    links?: Resolver<Array<GqlSResolversTypes['AdminAnalyticsSankeyLink']>, ParentType, ContextType>;
    nodes?: Resolver<Array<GqlSResolversTypes['AdminAnalyticsSankeyNode']>, ParentType, ContextType>;
    notifiedCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    offersCreatedCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    openedCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    steps?: Resolver<Array<GqlSResolversTypes['AdminAnalyticsFunnelStepStats']>, ParentType, ContextType>;
}>;

export type GqlSAdminAnalyticsFunnelStepStatsResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminAnalyticsFunnelStepStats'] =
        GqlSResolversParentTypes['AdminAnalyticsFunnelStepStats'],
> = ResolversObject<{
    completedCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    enteredCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    id?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    labelDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    labelEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSAdminAnalyticsSankeyLinkResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminAnalyticsSankeyLink'] = GqlSResolversParentTypes['AdminAnalyticsSankeyLink'],
> = ResolversObject<{
    source?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    target?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    value?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminAnalyticsSankeyNodeResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminAnalyticsSankeyNode'] = GqlSResolversParentTypes['AdminAnalyticsSankeyNode'],
> = ResolversObject<{
    id?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    labelDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    labelEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSAdminAnalyticsSessionFunnelFlowResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminAnalyticsSessionFunnelFlow'] =
        GqlSResolversParentTypes['AdminAnalyticsSessionFunnelFlow'],
> = ResolversObject<{
    links?: Resolver<Array<GqlSResolversTypes['AdminAnalyticsSankeyLink']>, ParentType, ContextType>;
    nodes?: Resolver<Array<GqlSResolversTypes['AdminAnalyticsSankeyNode']>, ParentType, ContextType>;
    sessionsWithCompletion?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    steps?: Resolver<Array<GqlSResolversTypes['AdminAnalyticsFunnelStepStats']>, ParentType, ContextType>;
    terminalCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminAssistantChatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminAssistantChat'] = GqlSResolversParentTypes['AdminAssistantChat'],
> = ResolversObject<{
    chatId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    deletedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    lastModifiedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    surface?: Resolver<GqlSResolversTypes['ChatSurface'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    turns?: Resolver<Array<GqlSResolversTypes['ChatTurn']>, ParentType, ContextType>;
    user?: Resolver<GqlSResolversTypes['AdminUser'], ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSAdminBlogPostResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminBlogPost'] = GqlSResolversParentTypes['AdminBlogPost'],
> = ResolversObject<{
    blogPostId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    headlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    headlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    heroImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    heroImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    pathName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    previousPathNames?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    sections?: Resolver<Array<GqlSResolversTypes['ContentSection']>, ParentType, ContextType>;
    subHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    subHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminBookingRequestResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminBookingRequest'] = GqlSResolversParentTypes['AdminBookingRequest'],
> = ResolversObject<{
    adjustedMessage?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    bookingRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    canceledAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    cancellationReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    cook?: Resolver<Maybe<GqlSResolversTypes['AdminCook']>, ParentType, ContextType>;
    cooksInTravelRadius?: Resolver<Array<GqlSResolversTypes['AdminBookingRequestCookInTravelRadius']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    customer?: Resolver<GqlSResolversTypes['AdminUser'], ParentType, ContextType>;
    dateTime?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    exactEventAddress?: Resolver<GqlSResolversTypes['CookTravelOriginAddress'], ParentType, ContextType>;
    expiresAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    giftCard?: Resolver<Maybe<GqlSResolversTypes['UserBookingRequestGiftCard']>, ParentType, ContextType>;
    invoiceAddress?: Resolver<Maybe<GqlSResolversTypes['InvoiceAddress']>, ParentType, ContextType>;
    maxOfferAmountCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    minOfferAmountCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    minOfferAmountHardCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    occasion?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    offers?: Resolver<Array<GqlSResolversTypes['AdminBookingRequestOffer']>, ParentType, ContextType>;
    originalMessage?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    participants?: Resolver<Array<GqlSResolversTypes['BookingRequestParticipant']>, ParentType, ContextType>;
    preferences?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    priceClassType?: Resolver<Maybe<GqlSResolversTypes['BookingRequestPriceClassType']>, ParentType, ContextType>;
    promoCode?: Resolver<Maybe<GqlSResolversTypes['UserBookingRequestPromoCode']>, ParentType, ContextType>;
    publicationStatus?: Resolver<GqlSResolversTypes['BookingRequestPublicationStatus'], ParentType, ContextType>;
    queuedJobs?: Resolver<Array<GqlSResolversTypes['AdminQueuedJob']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['BookingRequestStatus'], ParentType, ContextType>;
    suggestedOfferAmountCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSAdminBookingRequestCookInTravelRadiusResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminBookingRequestCookInTravelRadius'] =
        GqlSResolversParentTypes['AdminBookingRequestCookInTravelRadius'],
> = ResolversObject<{
    cook?: Resolver<GqlSResolversTypes['AdminCook'], ParentType, ContextType>;
    estimatedTravelDistanceKm?: Resolver<GqlSResolversTypes['Float'], ParentType, ContextType>;
    estimatedTravelExpensesCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    notifiedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    suggestedMenuPriceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminBookingRequestCookOfferStatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminBookingRequestCookOfferStat'] =
        GqlSResolversParentTypes['AdminBookingRequestCookOfferStat'],
> = ResolversObject<{
    conversionCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    displayName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    offerCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminBookingRequestCreationMonthStatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminBookingRequestCreationMonthStat'] =
        GqlSResolversParentTypes['AdminBookingRequestCreationMonthStat'],
> = ResolversObject<{
    count?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    monthStart?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    totalParticipants?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminBookingRequestOccasionStatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminBookingRequestOccasionStat'] =
        GqlSResolversParentTypes['AdminBookingRequestOccasionStat'],
> = ResolversObject<{
    count?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    occasion?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    totalParticipants?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminBookingRequestOfferResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminBookingRequestOffer'] = GqlSResolversParentTypes['AdminBookingRequestOffer'],
> = ResolversObject<{
    activeCallRoom?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferCallRoom']>, ParentType, ContextType>;
    adminChatReviewPendingCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    adminChatReviewedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    bookingRequest?: Resolver<GqlSResolversTypes['AdminBookingRequest'], ParentType, ContextType>;
    bookingRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    bookingRequestOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    callBookings?: Resolver<Array<GqlSResolversTypes['CookCallSlotBooking']>, ParentType, ContextType>;
    callRecordings?: Resolver<Array<GqlSResolversTypes['BookingRequestOfferCallRecording']>, ParentType, ContextType>;
    canCompletePreparations?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    canRequestParticipantAmendment?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    configuredMenu?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferConfiguredMenu']>, ParentType, ContextType>;
    cook?: Resolver<GqlSResolversTypes['AdminCook'], ParentType, ContextType>;
    cookAccepted?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    cookDeclinationReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cookPayoutBlockedReason?: Resolver<Maybe<GqlSResolversTypes['AdminCookPayoutBlockedReason']>, ParentType, ContextType>;
    cookPayoutReady?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    cookTestimonial?: Resolver<Maybe<GqlSResolversTypes['AdminCookTestimonial']>, ParentType, ContextType>;
    cookUnreadNotificationCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    costBreakdown?: Resolver<GqlSResolversTypes['CostBreakdown'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    customerTestimonial?: Resolver<Maybe<GqlSResolversTypes['AdminCustomerTestimonial']>, ParentType, ContextType>;
    menuPriceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    messages?: Resolver<Array<GqlSResolversTypes['HumanChatMessage']>, ParentType, ContextType>;
    participantAmendment?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferParticipantAmendment']>, ParentType, ContextType>;
    payment?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferPayment']>, ParentType, ContextType>;
    paymentDateTime?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    paymentProviderFeeCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    paymentStatus?: Resolver<GqlSResolversTypes['BookingRequestOfferPaymentStatus'], ParentType, ContextType>;
    payoutCentsCook?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    payoutDateTime?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    plannedPaymentPullDateTime?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    plannedPayoutDateTime?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    platformFeeCentsCook?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    platformFeeCentsCustomer?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    platformFeePercentCook?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    platformFeePercentCustomer?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    preparationsCompletedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    priceAutoAdjustReason?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferPriceAutoAdjustReason']>, ParentType, ContextType>;
    queuedJobs?: Resolver<Array<GqlSResolversTypes['AdminQueuedJob']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['BookingRequestOfferStatus'], ParentType, ContextType>;
    stripePaymentIntentUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    stripeSetupIntentUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    suggestedMenus?: Resolver<Array<GqlSResolversTypes['CookMenu']>, ParentType, ContextType>;
    totalCentsCustomer?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    totalWithoutDiscountsCentsCustomer?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    travelDistanceKm?: Resolver<Maybe<GqlSResolversTypes['Float']>, ParentType, ContextType>;
    travelExpensesCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    userAccepted?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    userDeclinationReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    userRequestedMenuAdjustments?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    userUnreadNotificationCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminBookingRequestOfferChatReviewAcknowledgeResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminBookingRequestOfferChatReviewAcknowledgeResult'] =
        GqlSResolversParentTypes['AdminBookingRequestOfferChatReviewAcknowledgeResult'],
> = ResolversObject<{
    acknowledgedOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    nextOfferId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSAdminBookingRequestOfferEconomicsResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminBookingRequestOfferEconomics'] =
        GqlSResolversParentTypes['AdminBookingRequestOfferEconomics'],
> = ResolversObject<{
    averageMenuPriceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    averageOffersPerRequest?: Resolver<GqlSResolversTypes['Float'], ParentType, ContextType>;
    averagePaidCustomerTotalCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    averagePaidPlatformRevenueCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    rangeTotalPaidCustomerTotalCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    rangeTotalPaidPlatformRevenueCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    totalPaidCustomerTotalCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    totalPaidPlatformRevenueCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminCallResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCall'] = GqlSResolversParentTypes['AdminCall'],
> = ResolversObject<{
    bookingRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    bookingRequestOfferCallRoomId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    bookingRequestOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cook?: Resolver<GqlSResolversTypes['AdminCallParty'], ParentType, ContextType>;
    cookDisplayName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    customer?: Resolver<GqlSResolversTypes['AdminCallParty'], ParentType, ContextType>;
    customerDisplayName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    customerUserId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    endedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    livekitRoomName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    occasion?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    recording?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferCallRecording']>, ParentType, ContextType>;
    startedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['BookingRequestOfferCallRoomStatus'], ParentType, ContextType>;
}>;

export type GqlSAdminCallCookStatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCallCookStat'] = GqlSResolversParentTypes['AdminCallCookStat'],
> = ResolversObject<{
    canceledCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    completedSlotCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    declinedCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    displayName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    pendingAwaitingCookCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    roomCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminCallListItemResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCallListItem'] = GqlSResolversParentTypes['AdminCallListItem'],
> = ResolversObject<{
    bookingRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    bookingRequestOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    callRoom?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferCallRoom']>, ParentType, ContextType>;
    callSlotBooking?: Resolver<Maybe<GqlSResolversTypes['CookCallSlotBooking']>, ParentType, ContextType>;
    cookDisplayName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    customerDisplayName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    customerUserId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['AdminCallListItemKind'], ParentType, ContextType>;
    occasion?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSAdminCallPartyResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCallParty'] = GqlSResolversParentTypes['AdminCallParty'],
> = ResolversObject<{
    displayName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    emailAddress?: Resolver<Maybe<GqlSResolversTypes['EmailAddress']>, ParentType, ContextType>;
    profilePicture?: Resolver<Maybe<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSAdminCityResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCity'] = GqlSResolversParentTypes['AdminCity'],
> = ResolversObject<{
    cityId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cooks?: Resolver<Array<GqlSResolversTypes['AdminCityCook']>, ParentType, ContextType>;
    cooksInTravelRadius?: Resolver<Array<GqlSResolversTypes['AdminCook']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionBodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionBodyEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    firstSectionImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    headlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    headlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    heroImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    heroImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    latitude?: Resolver<GqlSResolversTypes['Latitude'], ParentType, ContextType>;
    longitude?: Resolver<GqlSResolversTypes['Longitude'], ParentType, ContextType>;
    nameDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    nameEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    pathName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    previousPathNames?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    sections?: Resolver<Array<GqlSResolversTypes['ContentSection']>, ParentType, ContextType>;
    subHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    subHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    testimonials?: Resolver<Array<GqlSResolversTypes['AdminCityTestimonial']>, ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminCityCookResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCityCook'] = GqlSResolversParentTypes['AdminCityCook'],
> = ResolversObject<{
    cook?: Resolver<GqlSResolversTypes['AdminCook'], ParentType, ContextType>;
    isPubliclyListed?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminCityTestimonialResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCityTestimonial'] = GqlSResolversParentTypes['AdminCityTestimonial'],
> = ResolversObject<{
    index?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    testimonial?: Resolver<GqlSResolversTypes['AdminTestimonial'], ParentType, ContextType>;
}>;

export type GqlSAdminCookResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCook'] = GqlSResolversParentTypes['AdminCook'],
> = ResolversObject<{
    biography?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    biographySummary?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    biographySummaryGenerating?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    callAvailabilityRules?: Resolver<Array<GqlSResolversTypes['CookCallAvailabilityRule']>, ParentType, ContextType>;
    callDurationMinutes?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    callSchedulingEnabled?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    canCreateOffers?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cookingPhilosophy?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    cuisineStyle?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    exactTravelOriginAddress?: Resolver<Maybe<GqlSResolversTypes['CookTravelOriginAddress']>, ParentType, ContextType>;
    featuredOn?: Resolver<Array<GqlSResolversTypes['AdminCookFeaturedLanding']>, ParentType, ContextType>;
    isApprovedByAdmin?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    isVisible?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    lastModifiedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    logo?: Resolver<Maybe<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    maximumParticipants?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    maximumPriceAmount?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    maximumTravelDistance?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    minimumParticipants?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    minimumPriceAmount?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    rating?: Resolver<GqlSResolversTypes['PublicCookRating'], ParentType, ContextType>;
    stageName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    stripeAccountActive?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    stripeAccountActiveWasReset?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    stripeAccountDetails?: Resolver<Maybe<GqlSResolversTypes['CookStripeAccountDetails']>, ParentType, ContextType>;
    stripeAccountId?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    stripeAccountUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    stripeStatus?: Resolver<GqlSResolversTypes['CookStripeStatus'], ParentType, ContextType>;
    stripeWallet?: Resolver<Maybe<GqlSResolversTypes['CookStripeWallet']>, ParentType, ContextType>;
    travelExpensesAmount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    user?: Resolver<GqlSResolversTypes['AdminUser'], ParentType, ContextType>;
}>;

export type GqlSAdminCookFeaturedLandingResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCookFeaturedLanding'] = GqlSResolversParentTypes['AdminCookFeaturedLanding'],
> = ResolversObject<{
    id?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['AdminCookFeaturedLandingKind'], ParentType, ContextType>;
    pathName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSAdminCookInTravelRadiusPreviewResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCookInTravelRadiusPreview'] =
        GqlSResolversParentTypes['AdminCookInTravelRadiusPreview'],
> = ResolversObject<{
    cook?: Resolver<GqlSResolversTypes['AdminCook'], ParentType, ContextType>;
    estimatedTravelDistanceKm?: Resolver<GqlSResolversTypes['Float'], ParentType, ContextType>;
}>;

export type GqlSAdminCookMealResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCookMeal'] = GqlSResolversParentTypes['AdminCookMeal'],
> = ResolversObject<{
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cookName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    deletedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    imageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    imageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    mealId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    relationships?: Resolver<GqlSResolversTypes['CookMealRelationships'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminCookMenuResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCookMenu'] = GqlSResolversParentTypes['AdminCookMenu'],
> = ResolversObject<{
    bookingRequestOfferId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cookName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    copyOfMenuId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    courseCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    courseMealOptionImages?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    courses?: Resolver<Array<GqlSResolversTypes['AdminCookMenuCourse']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    deletedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    menuId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminCookMenuCourseResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCookMenuCourse'] = GqlSResolversParentTypes['AdminCookMenuCourse'],
> = ResolversObject<{
    courseId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    mealOptions?: Resolver<Array<GqlSResolversTypes['AdminCookMeal']>, ParentType, ContextType>;
    mealSelectionLimit?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSAdminCookTestimonialResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCookTestimonial'] = GqlSResolversParentTypes['AdminCookTestimonial'],
> = ResolversObject<{
    authorName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    body?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    bookingRequestOfferId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    cook?: Resolver<GqlSResolversTypes['AdminCook'], ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cookTestimonialId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    displayAuthorName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    displayLocation?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    displayOccasion?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    imageUrls?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    location?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    lowRatingAnswers?: Resolver<Maybe<GqlSResolversTypes['CookTestimonialLowRatingAnswers']>, ParentType, ContextType>;
    occasion?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    publicationStatus?: Resolver<GqlSResolversTypes['TestimonialPublicationStatus'], ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    rating?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSAdminCustomerTestimonialResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminCustomerTestimonial'] = GqlSResolversParentTypes['AdminCustomerTestimonial'],
> = ResolversObject<{
    authorName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    body?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    bookingRequestOfferId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    customerTestimonialId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    displayAuthorName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    displayLocation?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    displayOccasion?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    imageUrls?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    location?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    occasion?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    publicationStatus?: Resolver<GqlSResolversTypes['TestimonialPublicationStatus'], ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    rating?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    user?: Resolver<GqlSResolversTypes['AdminUser'], ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSAdminDatabaseSlowStatementResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminDatabaseSlowStatement'] = GqlSResolversParentTypes['AdminDatabaseSlowStatement'],
> = ResolversObject<{
    calls?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    meanExecTimeMs?: Resolver<GqlSResolversTypes['Float'], ParentType, ContextType>;
    query?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    rows?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    totalExecTimeMs?: Resolver<GqlSResolversTypes['Float'], ParentType, ContextType>;
}>;

export type GqlSAdminFeatureToggleResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminFeatureToggle'] = GqlSResolversParentTypes['AdminFeatureToggle'],
> = ResolversObject<{
    enabled?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    featureToggleKey?: Resolver<GqlSResolversTypes['FeatureToggleKey'], ParentType, ContextType>;
    persisted?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    updatedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    userOverrides?: Resolver<Array<GqlSResolversTypes['AdminFeatureToggleUserOverride']>, ParentType, ContextType>;
}>;

export type GqlSAdminFeatureToggleUserOverrideResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminFeatureToggleUserOverride'] =
        GqlSResolversParentTypes['AdminFeatureToggleUserOverride'],
> = ResolversObject<{
    enabled?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    featureToggleKey?: Resolver<GqlSResolversTypes['FeatureToggleKey'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    user?: Resolver<GqlSResolversTypes['AdminUser'], ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSAdminGiftCardResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminGiftCard'] = GqlSResolversParentTypes['AdminGiftCard'],
> = ResolversObject<{
    balanceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    buyerEmail?: Resolver<GqlSResolversTypes['EmailAddress'], ParentType, ContextType>;
    buyerUserId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    expiresAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    giftCardId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    invoiceAddress?: Resolver<Maybe<GqlSResolversTypes['InvoiceAddress']>, ParentType, ContextType>;
    invoiceFileUpload?: Resolver<Maybe<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    invoiceFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    message?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    occasion?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    originalBalanceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    paymentStatus?: Resolver<GqlSResolversTypes['GiftCardPaymentStatus'], ParentType, ContextType>;
    recipientName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    redeemCode?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    voucherFileUpload?: Resolver<Maybe<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    voucherFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSAdminGiftCardOccasionStatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminGiftCardOccasionStat'] = GqlSResolversParentTypes['AdminGiftCardOccasionStat'],
> = ResolversObject<{
    count?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    occasion?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    totalOriginalBalanceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminGiftCardSalesMonthStatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminGiftCardSalesMonthStat'] = GqlSResolversParentTypes['AdminGiftCardSalesMonthStat'],
> = ResolversObject<{
    count?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    monthStart?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    totalOriginalBalanceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminLegalImprintResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminLegalImprint'] = GqlSResolversParentTypes['AdminLegalImprint'],
> = ResolversObject<{
    bodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    changeSummaryDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    imprintId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminLegalPrivacyPolicyResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminLegalPrivacyPolicy'] = GqlSResolversParentTypes['AdminLegalPrivacyPolicy'],
> = ResolversObject<{
    bodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    changeSummaryDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    privacyPolicyId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminLegalTermsAndConditionsResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminLegalTermsAndConditions'] = GqlSResolversParentTypes['AdminLegalTermsAndConditions'],
> = ResolversObject<{
    bodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    changeSummaryDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    termsAndConditionsId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminLogResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminLog'] = GqlSResolversParentTypes['AdminLog'],
> = ResolversObject<{
    context?: Resolver<Maybe<GqlSResolversTypes['JSON']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    level?: Resolver<GqlSResolversTypes['AdminLogLevel'], ParentType, ContextType>;
    logId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    message?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    session?: Resolver<Maybe<GqlSResolversTypes['AdminSession']>, ParentType, ContextType>;
    sessionId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSAdminMutationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminMutation'] = GqlSResolversParentTypes['AdminMutation'],
> = ResolversObject<{
    blogPostDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBlogPostDeleteArgs, 'blogPostId'>
    >;
    blogPostUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBlogPostUpsertArgs, 'input'>
    >;
    bookingRequestCancel?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestCancelArgs, 'bookingRequestId' | 'reason'>
    >;
    bookingRequestCooksNotify?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestCooksNotifyArgs, 'bookingRequestId' | 'cookIds'>
    >;
    bookingRequestCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestCreateArgs, 'input'>
    >;
    bookingRequestDiscountUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestDiscountUpdateArgs, 'bookingRequestId'>
    >;
    bookingRequestOfferCallCreate?: Resolver<
        GqlSResolversTypes['BookingRequestOfferCallTokenResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferCallCreateArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferCallJoin?: Resolver<
        GqlSResolversTypes['BookingRequestOfferCallTokenResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferCallJoinArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferCallLeave?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferCallLeaveArgs, 'bookingRequestOfferCallRoomParticipantId'>
    >;
    bookingRequestOfferCallRecordingDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferCallRecordingDeleteArgs, 'bookingRequestOfferCallRecordingId'>
    >;
    bookingRequestOfferCallRecordingSummaryGenerate?: Resolver<
        GqlSResolversTypes['String'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferCallRecordingSummaryGenerateArgs, 'bookingRequestOfferCallRecordingId'>
    >;
    bookingRequestOfferCallSlotDecline?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferCallSlotDeclineArgs, 'cookCallSlotBookingId' | 'onBehalfOf'>
    >;
    bookingRequestOfferChatMessageCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferChatMessageCreateArgs, 'bookingRequestOfferId' | 'message'>
    >;
    bookingRequestOfferChatMessageDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferChatMessageDeleteArgs, 'bookingRequestOfferEventId'>
    >;
    bookingRequestOfferChatMessageReactionUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferChatMessageReactionUpsertArgs, 'bookingRequestOfferEventId' | 'emoji'>
    >;
    bookingRequestOfferChatMessageUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferChatMessageUpdateArgs, 'bookingRequestOfferEventId' | 'message'>
    >;
    bookingRequestOfferChatMessageVisibilityUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferChatMessageVisibilityUpdateArgs, 'bookingRequestOfferEventId' | 'hiddenByAdmin'>
    >;
    bookingRequestOfferChatReviewAcknowledge?: Resolver<
        GqlSResolversTypes['AdminBookingRequestOfferChatReviewAcknowledgeResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferChatReviewAcknowledgeArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferConfiguredMenuUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferConfiguredMenuUpdateArgs, 'bookingRequestOfferId' | 'configuredMenu'>
    >;
    bookingRequestOfferCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferCreateArgs, 'input'>
    >;
    bookingRequestOfferHandover?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferHandoverArgs, 'input'>
    >;
    bookingRequestOfferPayoutAlreadyTookPlaceCheck?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferPayoutAlreadyTookPlaceCheckArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferPayoutMarkOutOfSystem?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferPayoutMarkOutOfSystemArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferPayoutRelease?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferPayoutReleaseArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferPreparationsClear?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferPreparationsClearArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestOfferUpdateArgs, 'bookingRequestOfferId' | 'input'>
    >;
    bookingRequestPublicationApprove?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestPublicationApproveArgs, 'bookingRequestId'>
    >;
    bookingRequestUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationBookingRequestUpdateArgs, 'bookingRequestId' | 'input'>
    >;
    cityCooksUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCityCooksUpdateArgs, 'cityId' | 'cookIds'>
    >;
    cityDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCityDeleteArgs, 'cityId'>
    >;
    cityTestimonialsUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCityTestimonialsUpdateArgs, 'cityId' | 'entries'>
    >;
    cityUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCityUpsertArgs, 'input'>
    >;
    cookApprovalUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookApprovalUpdateArgs, 'cookId' | 'isApprovedByAdmin'>
    >;
    cookBiographySuggest?: Resolver<
        GqlSResolversTypes['String'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookBiographySuggestArgs, 'cookId' | 'currentBiography'>
    >;
    cookBiographySummarySuggest?: Resolver<
        GqlSResolversTypes['String'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookBiographySummarySuggestArgs, 'biography' | 'cookId'>
    >;
    cookMealCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookMealCreateArgs, 'cookId'>
    >;
    cookMealDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookMealDeleteArgs, 'mealId'>
    >;
    cookMealUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookMealUpdateArgs, 'meal' | 'mealId'>
    >;
    cookMenuCopy?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookMenuCopyArgs, 'menuId'>
    >;
    cookMenuCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookMenuCreateArgs, 'cookId'>
    >;
    cookMenuDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookMenuDeleteArgs, 'menuId'>
    >;
    cookMenuUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookMenuUpdateArgs, 'menu' | 'menuId'>
    >;
    cookTestimonialCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookTestimonialCreateArgs, 'input'>
    >;
    cookTestimonialDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookTestimonialDeleteArgs, 'cookTestimonialId'>
    >;
    cookTestimonialImageUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookTestimonialImageUpdateArgs, 'cookTestimonialId' | 'imageFileUploadIds'>
    >;
    cookTestimonialPublish?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookTestimonialPublishArgs, 'cookTestimonialId' | 'publicationStatus'>
    >;
    cookTestimonialUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookTestimonialUpdateArgs, 'cookTestimonialId' | 'input'>
    >;
    cookUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCookUpdateArgs, 'cookId' | 'input'>
    >;
    customerTestimonialCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCustomerTestimonialCreateArgs, 'input'>
    >;
    customerTestimonialDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCustomerTestimonialDeleteArgs, 'customerTestimonialId'>
    >;
    customerTestimonialImageUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCustomerTestimonialImageUpdateArgs, 'customerTestimonialId' | 'imageFileUploadIds'>
    >;
    customerTestimonialPublish?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCustomerTestimonialPublishArgs, 'customerTestimonialId' | 'publicationStatus'>
    >;
    customerTestimonialUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationCustomerTestimonialUpdateArgs, 'customerTestimonialId' | 'input'>
    >;
    featureToggleUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationFeatureToggleUpdateArgs, 'enabled' | 'featureToggleKey'>
    >;
    featureToggleUserOverrideDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationFeatureToggleUserOverrideDeleteArgs, 'featureToggleKey' | 'userId'>
    >;
    featureToggleUserOverrideUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationFeatureToggleUserOverrideUpsertArgs, 'enabled' | 'featureToggleKey' | 'userId'>
    >;
    giftCardPdfsRegenerate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationGiftCardPdfsRegenerateArgs, 'giftCardId'>
    >;
    legalImprintDraftCreate?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    legalImprintDraftUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationLegalImprintDraftUpdateArgs, 'input'>
    >;
    legalImprintPublish?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationLegalImprintPublishArgs, 'imprintId'>
    >;
    legalPrivacyPolicyDraftCreate?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    legalPrivacyPolicyDraftUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationLegalPrivacyPolicyDraftUpdateArgs, 'input'>
    >;
    legalPrivacyPolicyPublish?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationLegalPrivacyPolicyPublishArgs, 'privacyPolicyId'>
    >;
    legalTermsAndConditionsDraftCreate?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    legalTermsAndConditionsDraftUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationLegalTermsAndConditionsDraftUpdateArgs, 'input'>
    >;
    legalTermsAndConditionsPublish?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationLegalTermsAndConditionsPublishArgs, 'termsAndConditionsId'>
    >;
    occasionCooksUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationOccasionCooksUpdateArgs, 'cookIds' | 'occasionId'>
    >;
    occasionDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationOccasionDeleteArgs, 'occasionId'>
    >;
    occasionTestimonialsUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationOccasionTestimonialsUpdateArgs, 'entries' | 'occasionId'>
    >;
    occasionUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationOccasionUpsertArgs, 'input'>
    >;
    partnerCooksUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationPartnerCooksUpdateArgs, 'cookIds' | 'partnerId'>
    >;
    partnerDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationPartnerDeleteArgs, 'partnerId'>
    >;
    partnerTestimonialsUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationPartnerTestimonialsUpdateArgs, 'entries' | 'partnerId'>
    >;
    partnerUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationPartnerUpsertArgs, 'input'>
    >;
    promoCodeCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationPromoCodeCreateArgs, 'input'>
    >;
    promoCodeUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationPromoCodeUpdateArgs, 'input'>
    >;
    queuedJobCancel?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationQueuedJobCancelArgs, 'jobId' | 'name'>
    >;
    sessionUserBind?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationSessionUserBindArgs, 'userId'>
    >;
    supportRequestMessageCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationSupportRequestMessageCreateArgs, 'message' | 'supportRequestId'>
    >;
    supportRequestResolve?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationSupportRequestResolveArgs, 'notifyCustomer' | 'supportRequestId'>
    >;
    supportRequestUnreadNotificationCountReset?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationSupportRequestUnreadNotificationCountResetArgs, 'supportRequestId'>
    >;
    terminateSessions?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationTerminateSessionsArgs, 'sessionIds'>
    >;
    userAdminNoteUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationUserAdminNoteUpdateArgs, 'adminNote' | 'userId'>
    >;
    userAnonymize?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationUserAnonymizeArgs, 'userId'>
    >;
    userCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationUserCreateArgs, 'input'>
    >;
    userEmailAddressUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationUserEmailAddressUpdateArgs, 'emailAddress' | 'userId'>
    >;
    userStatusUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationUserStatusUpdateArgs, 'status' | 'userId'>
    >;
    userUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationUserUpdateArgs, 'user' | 'userId'>
    >;
    webPageUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationWebPageUpdateArgs, 'input' | 'webPageKey'>
    >;
    whatsAppConversationUnreadCountReset?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationWhatsAppConversationUnreadCountResetArgs, 'whatsAppConversationId'>
    >;
    whatsAppMessageCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationWhatsAppMessageCreateArgs, 'message' | 'whatsAppConversationId'>
    >;
    whatsAppMessageReactionUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSAdminMutationWhatsAppMessageReactionUpsertArgs, 'emoji' | 'whatsAppMessageId'>
    >;
}>;

export type GqlSAdminObjectStorageObjectResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminObjectStorageObject'] = GqlSResolversParentTypes['AdminObjectStorageObject'],
> = ResolversObject<{
    etag?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    key?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    lastModified?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    size?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminObjectStorageObjectPageResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminObjectStorageObjectPage'] = GqlSResolversParentTypes['AdminObjectStorageObjectPage'],
> = ResolversObject<{
    bucket?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    configured?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    isTruncated?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    nextContinuationToken?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    objects?: Resolver<Array<GqlSResolversTypes['AdminObjectStorageObject']>, ParentType, ContextType>;
}>;

export type GqlSAdminOccasionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminOccasion'] = GqlSResolversParentTypes['AdminOccasion'],
> = ResolversObject<{
    cooks?: Resolver<Array<GqlSResolversTypes['AdminOccasionCook']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionBodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionBodyEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    firstSectionImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    formatsSection?: Resolver<GqlSResolversTypes['OccasionFormatsSection'], ParentType, ContextType>;
    headlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    headlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    heroImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    heroImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    occasionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    pathName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    previousPathNames?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    promo?: Resolver<Maybe<GqlSResolversTypes['OccasionPromo']>, ParentType, ContextType>;
    promoCodeId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    sections?: Resolver<Array<GqlSResolversTypes['ContentSection']>, ParentType, ContextType>;
    subHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    subHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    testimonials?: Resolver<Array<GqlSResolversTypes['AdminOccasionTestimonial']>, ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminOccasionCookResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminOccasionCook'] = GqlSResolversParentTypes['AdminOccasionCook'],
> = ResolversObject<{
    cook?: Resolver<GqlSResolversTypes['AdminCook'], ParentType, ContextType>;
    isPubliclyListed?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminOccasionTestimonialResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminOccasionTestimonial'] = GqlSResolversParentTypes['AdminOccasionTestimonial'],
> = ResolversObject<{
    index?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    testimonial?: Resolver<GqlSResolversTypes['AdminTestimonial'], ParentType, ContextType>;
}>;

export type GqlSAdminOutboundEmailResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminOutboundEmail'] = GqlSResolversParentTypes['AdminOutboundEmail'],
> = ResolversObject<{
    attachments?: Resolver<Array<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    bouncedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    clickedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    complainedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    deliveredAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    deliveryDelayedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    failedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    failureReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    fromEmail?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    locale?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    openedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    outboundEmailId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    provider?: Resolver<GqlSResolversTypes['AdminOutboundEmailProvider'], ParentType, ContextType>;
    providerMessageId?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    purpose?: Resolver<GqlSResolversTypes['AdminOutboundEmailPurpose'], ParentType, ContextType>;
    relatedEntityId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    relatedEntityType?: Resolver<Maybe<GqlSResolversTypes['AdminOutboundEmailRelatedEntityType']>, ParentType, ContextType>;
    sentAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    subject?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    toEmail?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    user?: Resolver<Maybe<GqlSResolversTypes['AdminUser']>, ParentType, ContextType>;
    userId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSAdminOutboundEmailPurposeStatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminOutboundEmailPurposeStat'] =
        GqlSResolversParentTypes['AdminOutboundEmailPurposeStat'],
> = ResolversObject<{
    count?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    purpose?: Resolver<GqlSResolversTypes['AdminOutboundEmailPurpose'], ParentType, ContextType>;
}>;

export type GqlSAdminOutboundEmailRecipientStatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminOutboundEmailRecipientStat'] =
        GqlSResolversParentTypes['AdminOutboundEmailRecipientStat'],
> = ResolversObject<{
    count?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    displayName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    toEmail?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    userId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSAdminPartnerResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminPartner'] = GqlSResolversParentTypes['AdminPartner'],
> = ResolversObject<{
    cooks?: Resolver<Array<GqlSResolversTypes['AdminPartnerCook']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionBodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionBodyEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionCtaUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    firstSectionHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    firstSectionImageOverlay?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    firstSectionImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    headlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    headlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    heroImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    heroImageOverlay?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    heroImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    howItWorksAlternativeMedia?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    partnerId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    pathName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    previousPathNames?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    promo?: Resolver<Maybe<GqlSResolversTypes['PartnerPromo']>, ParentType, ContextType>;
    promoCodeId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    sections?: Resolver<Array<GqlSResolversTypes['ContentSection']>, ParentType, ContextType>;
    subHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    subHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    testimonials?: Resolver<Array<GqlSResolversTypes['AdminPartnerTestimonial']>, ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAdminPartnerCookResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminPartnerCook'] = GqlSResolversParentTypes['AdminPartnerCook'],
> = ResolversObject<{
    cook?: Resolver<GqlSResolversTypes['AdminCook'], ParentType, ContextType>;
    isPubliclyListed?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    position?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminPartnerTestimonialResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminPartnerTestimonial'] = GqlSResolversParentTypes['AdminPartnerTestimonial'],
> = ResolversObject<{
    index?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    testimonial?: Resolver<GqlSResolversTypes['AdminTestimonial'], ParentType, ContextType>;
}>;

export type GqlSAdminPromoCodeResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminPromoCode'] = GqlSResolversParentTypes['AdminPromoCode'],
> = ResolversObject<{
    amountCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    bookingRequests?: Resolver<Array<GqlSResolversTypes['AdminBookingRequest']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    expiresAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    minimumTotalAmountCustomerCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    promoCodeId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    redeemCode?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    scopedBookingRequestId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSAdminQueuedJobResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminQueuedJob'] = GqlSResolversParentTypes['AdminQueuedJob'],
> = ResolversObject<{
    bookingRequestId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    bookingRequestOfferId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    chatId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    cookId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    createdOn?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    data?: Resolver<GqlSResolversTypes['JSON'], ParentType, ContextType>;
    giftCardId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    jobId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    startAfter?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    state?: Resolver<GqlSResolversTypes['AdminQueuedJobState'], ParentType, ContextType>;
    supportRequestId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    userId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSAdminResendEmailQuotaResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminResendEmailQuota'] = GqlSResolversParentTypes['AdminResendEmailQuota'],
> = ResolversObject<{
    limit?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    received?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    resetsAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    sent?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    used?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminResendUsageResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminResendUsage'] = GqlSResolversParentTypes['AdminResendUsage'],
> = ResolversObject<{
    daily?: Resolver<GqlSResolversTypes['AdminResendEmailQuota'], ParentType, ContextType>;
    monthly?: Resolver<GqlSResolversTypes['AdminResendEmailQuota'], ParentType, ContextType>;
}>;

export type GqlSAdminSessionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminSession'] = GqlSResolversParentTypes['AdminSession'],
> = ResolversObject<{
    connectionActive?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    ipHash?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    isBot?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    landingPath?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    lastInteractionAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    referrer?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    sessionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    user?: Resolver<Maybe<GqlSResolversTypes['AdminUser']>, ParentType, ContextType>;
    userAgent?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    userId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    wasTerminatedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type GqlSAdminSessionEventResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminSessionEvent'] = GqlSResolversParentTypes['AdminSessionEvent'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    link?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    sessionEventId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    sessionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    type?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSAdminSupportRequestResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminSupportRequest'] = GqlSResolversParentTypes['AdminSupportRequest'],
> = ResolversObject<{
    adminUnreadNotificationCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    bookingRequest?: Resolver<Maybe<GqlSResolversTypes['SupportRequestBookingRequestSummary']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    customer?: Resolver<GqlSResolversTypes['AdminUser'], ParentType, ContextType>;
    messages?: Resolver<Array<GqlSResolversTypes['HumanChatMessage']>, ParentType, ContextType>;
    resolvedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['SupportRequestStatus'], ParentType, ContextType>;
    subject?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    supportRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSAdminTestimonialResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTestimonial'] = GqlSResolversParentTypes['AdminTestimonial'],
> = ResolversObject<{
    __resolveType: TypeResolveFn<'AdminCookTestimonial' | 'AdminCustomerTestimonial', ParentType, ContextType>;
}>;

export type GqlSAdminTimeBucketResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminTimeBucket'] = GqlSResolversParentTypes['AdminTimeBucket'],
> = ResolversObject<{
    bucketStart?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    count?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAdminUserResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminUser'] = GqlSResolversParentTypes['AdminUser'],
> = ResolversObject<{
    adminNote?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    birthDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    cook?: Resolver<Maybe<GqlSResolversTypes['AdminCook']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    emailAddress?: Resolver<Maybe<GqlSResolversTypes['EmailAddress']>, ParentType, ContextType>;
    featureToggleOverrides?: Resolver<Array<GqlSResolversTypes['AdminFeatureToggleUserOverride']>, ParentType, ContextType>;
    firstName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    lastName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    locale?: Resolver<GqlSResolversTypes['Locale'], ParentType, ContextType>;
    phoneNumber?: Resolver<Maybe<GqlSResolversTypes['PhoneNumber']>, ParentType, ContextType>;
    preferredCommunication?: Resolver<Maybe<GqlSResolversTypes['UserPreferredCommunication']>, ParentType, ContextType>;
    previousEmailAddresses?: Resolver<Array<GqlSResolversTypes['EmailAddress']>, ParentType, ContextType>;
    profilePicture?: Resolver<Maybe<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['UserStatus'], ParentType, ContextType>;
    timeZone?: Resolver<GqlSResolversTypes['TimeZone'], ParentType, ContextType>;
    types?: Resolver<Array<GqlSResolversTypes['AdminUserType']>, ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSAdminUserInsightsResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminUserInsights'] = GqlSResolversParentTypes['AdminUserInsights'],
> = ResolversObject<{
    accountCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    averageAge?: Resolver<Maybe<GqlSResolversTypes['Float']>, ParentType, ContextType>;
    birthDateSampleSize?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    locales?: Resolver<Array<GqlSResolversTypes['AdminUserLocaleStat']>, ParentType, ContextType>;
    medianAge?: Resolver<Maybe<GqlSResolversTypes['Float']>, ParentType, ContextType>;
    preferredCommunication?: Resolver<Array<GqlSResolversTypes['AdminUserPreferredCommunicationStat']>, ParentType, ContextType>;
    timeZones?: Resolver<Array<GqlSResolversTypes['AdminUserTimeZoneStat']>, ParentType, ContextType>;
}>;

export type GqlSAdminUserLocaleStatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminUserLocaleStat'] = GqlSResolversParentTypes['AdminUserLocaleStat'],
> = ResolversObject<{
    count?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    locale?: Resolver<GqlSResolversTypes['Locale'], ParentType, ContextType>;
}>;

export type GqlSAdminUserPreferredCommunicationStatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminUserPreferredCommunicationStat'] =
        GqlSResolversParentTypes['AdminUserPreferredCommunicationStat'],
> = ResolversObject<{
    count?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    preferredCommunication?: Resolver<Maybe<GqlSResolversTypes['UserPreferredCommunication']>, ParentType, ContextType>;
}>;

export type GqlSAdminUserTimeZoneStatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminUserTimeZoneStat'] = GqlSResolversParentTypes['AdminUserTimeZoneStat'],
> = ResolversObject<{
    count?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    timeZone?: Resolver<GqlSResolversTypes['TimeZone'], ParentType, ContextType>;
}>;

export type GqlSAdminUserUpcomingBirthdayResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminUserUpcomingBirthday'] = GqlSResolversParentTypes['AdminUserUpcomingBirthday'],
> = ResolversObject<{
    birthDate?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    firstName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    lastName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    nextBirthday?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    types?: Resolver<Array<GqlSResolversTypes['AdminUserType']>, ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSAdminWebPageResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminWebPage'] = GqlSResolversParentTypes['AdminWebPage'],
> = ResolversObject<{
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    persisted?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    webPageKey?: Resolver<GqlSResolversTypes['WebPageKey'], ParentType, ContextType>;
}>;

export type GqlSAdminWhatsAppConversationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AdminWhatsAppConversation'] = GqlSResolversParentTypes['AdminWhatsAppConversation'],
> = ResolversObject<{
    adminUnreadCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    customer?: Resolver<Maybe<GqlSResolversTypes['AdminUser']>, ParentType, ContextType>;
    customerServiceWindowExpiresAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    displayName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    lastMessageAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    lastMessagePreview?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    messages?: Resolver<Array<GqlSResolversTypes['HumanChatMessage']>, ParentType, ContextType>;
    phoneNumber?: Resolver<GqlSResolversTypes['PhoneNumber'], ParentType, ContextType>;
    userId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    whatsAppConversationId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSAuthEmailOtpResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AuthEmailOtp'] = GqlSResolversParentTypes['AuthEmailOtp'],
> = ResolversObject<{
    authEmailOtpId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    emailAddress?: Resolver<GqlSResolversTypes['EmailAddress'], ParentType, ContextType>;
    expiresAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    verifiedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type GqlSAuthPasskeyResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AuthPasskey'] = GqlSResolversParentTypes['AuthPasskey'],
> = ResolversObject<{
    authPasskeyId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    backedUp?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    deviceType?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSAuthTimeBasedOneTimePasswordResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AuthTimeBasedOneTimePassword'] = GqlSResolversParentTypes['AuthTimeBasedOneTimePassword'],
> = ResolversObject<{
    authTimeBasedOneTimePasswordId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    confirmedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    recoveryCodesRemaining?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSAuthTotpChallengeResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AuthTotpChallenge'] = GqlSResolversParentTypes['AuthTotpChallenge'],
> = ResolversObject<{
    expiresAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSAuthTotpEnrollConfirmResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AuthTotpEnrollConfirmResult'] = GqlSResolversParentTypes['AuthTotpEnrollConfirmResult'],
> = ResolversObject<{
    recoveryCodes?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSAuthTotpEnrollStartResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['AuthTotpEnrollStartResult'] = GqlSResolversParentTypes['AuthTotpEnrollStartResult'],
> = ResolversObject<{
    otpauthUrl?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    secret?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestCookMenuEvaluationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestCookMenuEvaluation'] =
        GqlSResolversParentTypes['BookingRequestCookMenuEvaluation'],
> = ResolversObject<{
    evaluationSummary?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    generatedMenu?: Resolver<Maybe<GqlSResolversTypes['BookingRequestCookMenuEvaluationGeneratedMenu']>, ParentType, ContextType>;
    menus?: Resolver<Array<GqlSResolversTypes['BookingRequestCookMenuEvaluationMenu']>, ParentType, ContextType>;
}>;

export type GqlSBookingRequestCookMenuEvaluationGeneratedCourseResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestCookMenuEvaluationGeneratedCourse'] =
        GqlSResolversParentTypes['BookingRequestCookMenuEvaluationGeneratedCourse'],
> = ResolversObject<{
    mealOptions?: Resolver<Array<GqlSResolversTypes['BookingRequestCookMenuEvaluationGeneratedMealOption']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestCookMenuEvaluationGeneratedMealOptionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestCookMenuEvaluationGeneratedMealOption'] =
        GqlSResolversParentTypes['BookingRequestCookMenuEvaluationGeneratedMealOption'],
> = ResolversObject<{
    description?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    mealId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    title?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    type?: Resolver<GqlSResolversTypes['CookMenuSuggestionMealOptionType'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestCookMenuEvaluationGeneratedMenuResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestCookMenuEvaluationGeneratedMenu'] =
        GqlSResolversParentTypes['BookingRequestCookMenuEvaluationGeneratedMenu'],
> = ResolversObject<{
    courses?: Resolver<Array<GqlSResolversTypes['BookingRequestCookMenuEvaluationGeneratedCourse']>, ParentType, ContextType>;
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestCookMenuEvaluationMenuResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestCookMenuEvaluationMenu'] =
        GqlSResolversParentTypes['BookingRequestCookMenuEvaluationMenu'],
> = ResolversObject<{
    evaluationSummary?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    isSuitable?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    menuId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestCookPoolDetailsResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestCookPoolDetails'] =
        GqlSResolversParentTypes['BookingRequestCookPoolDetails'],
> = ResolversObject<{
    declinationReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    declinedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    firstOpenedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    menuEvaluation?: Resolver<Maybe<GqlSResolversTypes['BookingRequestCookMenuEvaluation']>, ParentType, ContextType>;
    menuEvaluationLoading?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    notifiedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
}>;

export type GqlSBookingRequestOfferCallRecordingResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestOfferCallRecording'] =
        GqlSResolversParentTypes['BookingRequestOfferCallRecording'],
> = ResolversObject<{
    audioUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    bookingRequestOfferCallRecordingId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    bookingRequestOfferCallRoomId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    byteSize?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    completedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    errorMessage?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    mediaType?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['BookingRequestOfferCallRecordingStatus'], ParentType, ContextType>;
    summaryText?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    transcriptSegments?: Resolver<Maybe<Array<GqlSResolversTypes['BookingRequestOfferCallTranscriptSegment']>>, ParentType, ContextType>;
    transcriptText?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSBookingRequestOfferCallRoomResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestOfferCallRoom'] = GqlSResolversParentTypes['BookingRequestOfferCallRoom'],
> = ResolversObject<{
    bookingRequestOfferCallRoomId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    bookingRequestOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdByUserId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    endedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    livekitRoomName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    startedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['BookingRequestOfferCallRoomStatus'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestOfferCallTokenResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestOfferCallTokenResult'] =
        GqlSResolversParentTypes['BookingRequestOfferCallTokenResult'],
> = ResolversObject<{
    bookingRequestOfferCallRoomParticipantId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    token?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    url?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestOfferCallTranscriptSegmentResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestOfferCallTranscriptSegment'] =
        GqlSResolversParentTypes['BookingRequestOfferCallTranscriptSegment'],
> = ResolversObject<{
    endedAtMs?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    speakerLabel?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    startedAtMs?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    text?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestOfferConfiguredMenuResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestOfferConfiguredMenu'] =
        GqlSResolversParentTypes['BookingRequestOfferConfiguredMenu'],
> = ResolversObject<{
    courses?: Resolver<Array<GqlSResolversTypes['BookingRequestOfferConfiguredMenuCourse']>, ParentType, ContextType>;
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    menuId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestOfferConfiguredMenuCourseResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestOfferConfiguredMenuCourse'] =
        GqlSResolversParentTypes['BookingRequestOfferConfiguredMenuCourse'],
> = ResolversObject<{
    meals?: Resolver<Array<GqlSResolversTypes['BookingRequestOfferConfiguredMenuMeal']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestOfferConfiguredMenuMealResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestOfferConfiguredMenuMeal'] =
        GqlSResolversParentTypes['BookingRequestOfferConfiguredMenuMeal'],
> = ResolversObject<{
    mealDescription?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    mealImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    mealTitle?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestOfferParticipantAmendmentResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestOfferParticipantAmendment'] =
        GqlSResolversParentTypes['BookingRequestOfferParticipantAmendment'],
> = ResolversObject<{
    menuPriceCentsAfter?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    menuPriceCentsBefore?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    participants?: Resolver<Array<GqlSResolversTypes['BookingRequestOfferParticipantAmendmentParticipant']>, ParentType, ContextType>;
    payoutCentsCookAfter?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    payoutCentsCookBefore?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    requestedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    totalCentsCustomerAfter?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    totalCentsCustomerBefore?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestOfferParticipantAmendmentParticipantResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestOfferParticipantAmendmentParticipant'] =
        GqlSResolversParentTypes['BookingRequestOfferParticipantAmendmentParticipant'],
> = ResolversObject<{
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    restrictions?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    type?: Resolver<GqlSResolversTypes['BookingRequestParticipantType'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestOfferPaymentResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestOfferPayment'] = GqlSResolversParentTypes['BookingRequestOfferPayment'],
> = ResolversObject<{
    clientSecret?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    publishableKey?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    type?: Resolver<GqlSResolversTypes['BookingRequestOfferPaymentDataType'], ParentType, ContextType>;
}>;

export type GqlSBookingRequestParticipantResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['BookingRequestParticipant'] = GqlSResolversParentTypes['BookingRequestParticipant'],
> = ResolversObject<{
    bookingRequestParticipantId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    restrictions?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    type?: Resolver<GqlSResolversTypes['BookingRequestParticipantType'], ParentType, ContextType>;
}>;

export type GqlSChatResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Chat'] = GqlSResolversParentTypes['Chat'],
> = ResolversObject<{
    chatId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    lastModifiedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    surface?: Resolver<Maybe<GqlSResolversTypes['ChatSurface']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    turns?: Resolver<Array<GqlSResolversTypes['ChatTurn']>, ParentType, ContextType>;
    userId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSChatMessageResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessage'] = GqlSResolversParentTypes['ChatMessage'],
> = ResolversObject<{
    attachments?: Resolver<Array<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    chatTurnId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    lastModifiedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    parts?: Resolver<Array<GqlSResolversTypes['ChatMessagePart']>, ParentType, ContextType>;
    revision?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    role?: Resolver<GqlSResolversTypes['ChatMessageRole'], ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['ChatMessageStatus'], ParentType, ContextType>;
}>;

export type GqlSChatMessageBookingRequestOfferEventResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageBookingRequestOfferEvent'] =
        GqlSResolversParentTypes['ChatMessageBookingRequestOfferEvent'],
> = ResolversObject<{
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    payload?: Resolver<GqlSResolversTypes['JSON'], ParentType, ContextType>;
    type?: Resolver<GqlSResolversTypes['ChatMessageBookingRequestOfferEventType'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageCreateResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageCreateResult'] = GqlSResolversParentTypes['ChatMessageCreateResult'],
> = ResolversObject<{
    chatId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    chatTurnId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSChatMessageDataPartResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageDataPart'] = GqlSResolversParentTypes['ChatMessageDataPart'],
> = ResolversObject<{
    data?: Resolver<GqlSResolversTypes['JSON'], ParentType, ContextType>;
    dataType?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    partId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageFilePartResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageFilePart'] = GqlSResolversParentTypes['ChatMessageFilePart'],
> = ResolversObject<{
    filename?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    mediaType?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    partId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    url?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessagePartResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessagePart'] = GqlSResolversParentTypes['ChatMessagePart'],
> = ResolversObject<{
    __resolveType: TypeResolveFn<
        | 'ChatMessageDataPart'
        | 'ChatMessageFilePart'
        | 'ChatMessageReasoningPart'
        | 'ChatMessageSourceDocumentPart'
        | 'ChatMessageSourceUrlPart'
        | 'ChatMessageTextPart'
        | 'ChatMessageToolPart',
        ParentType,
        ContextType
    >;
}>;

export type GqlSChatMessageReactionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageReaction'] = GqlSResolversParentTypes['ChatMessageReaction'],
> = ResolversObject<{
    emoji?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    isOwn?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type GqlSChatMessageReasoningPartResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageReasoningPart'] = GqlSResolversParentTypes['ChatMessageReasoningPart'],
> = ResolversObject<{
    partId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    state?: Resolver<GqlSResolversTypes['ChatMessagePartState'], ParentType, ContextType>;
    text?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageSourceDocumentPartResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageSourceDocumentPart'] =
        GqlSResolversParentTypes['ChatMessageSourceDocumentPart'],
> = ResolversObject<{
    filename?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    mediaType?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    partId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    sourceId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageSourceUrlPartResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageSourceUrlPart'] = GqlSResolversParentTypes['ChatMessageSourceUrlPart'],
> = ResolversObject<{
    partId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    sourceId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    title?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    url?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageTextPartResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageTextPart'] = GqlSResolversParentTypes['ChatMessageTextPart'],
> = ResolversObject<{
    partId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    state?: Resolver<GqlSResolversTypes['ChatMessagePartState'], ParentType, ContextType>;
    text?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageToolPartResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageToolPart'] = GqlSResolversParentTypes['ChatMessageToolPart'],
> = ResolversObject<{
    approval?: Resolver<Maybe<GqlSResolversTypes['ChatToolApproval']>, ParentType, ContextType>;
    debug?: Resolver<Maybe<GqlSResolversTypes['ChatToolDebug']>, ParentType, ContextType>;
    partId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    preliminary?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    providerExecuted?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    state?: Resolver<GqlSResolversTypes['ChatToolState'], ParentType, ContextType>;
    title?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    toolCallId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    toolName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatMessageUserResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatMessageUser'] = GqlSResolversParentTypes['ChatMessageUser'],
> = ResolversObject<{
    attachments?: Resolver<Array<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    author?: Resolver<GqlSResolversTypes['PublicUser'], ParentType, ContextType>;
    body?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    canHardDelete?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    chatMessageId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    collapseLongBody?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    deliveryStatus?: Resolver<Maybe<GqlSResolversTypes['ChatMessageDeliveryStatus']>, ParentType, ContextType>;
    hiddenByAdmin?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    isOwn?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    reactions?: Resolver<Array<GqlSResolversTypes['ChatMessageReaction']>, ParentType, ContextType>;
    showCopyButton?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatToolApprovalResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatToolApproval'] = GqlSResolversParentTypes['ChatToolApproval'],
> = ResolversObject<{
    approvalId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    descriptor?: Resolver<Maybe<GqlSResolversTypes['JSON']>, ParentType, ContextType>;
    reason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['ChatToolApprovalStatus'], ParentType, ContextType>;
}>;

export type GqlSChatToolDebugResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatToolDebug'] = GqlSResolversParentTypes['ChatToolDebug'],
> = ResolversObject<{
    errorText?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    input?: Resolver<Maybe<GqlSResolversTypes['JSON']>, ParentType, ContextType>;
    output?: Resolver<Maybe<GqlSResolversTypes['JSON']>, ParentType, ContextType>;
}>;

export type GqlSChatTurnResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatTurn'] = GqlSResolversParentTypes['ChatTurn'],
> = ResolversObject<{
    assistantMessage?: Resolver<GqlSResolversTypes['ChatMessage'], ParentType, ContextType>;
    chatTurnId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    completedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    debug?: Resolver<Maybe<GqlSResolversTypes['ChatTurnDebug']>, ParentType, ContextType>;
    failure?: Resolver<Maybe<GqlSResolversTypes['ChatTurnFailure']>, ParentType, ContextType>;
    lastModifiedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    locale?: Resolver<Maybe<GqlSResolversTypes['Locale']>, ParentType, ContextType>;
    revision?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    sequence?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    startedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['ChatTurnStatus'], ParentType, ContextType>;
    userMessage?: Resolver<GqlSResolversTypes['ChatMessage'], ParentType, ContextType>;
}>;

export type GqlSChatTurnDebugResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatTurnDebug'] = GqlSResolversParentTypes['ChatTurnDebug'],
> = ResolversObject<{
    agentName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    finishReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    modelId?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    usage?: Resolver<Maybe<GqlSResolversTypes['ChatTurnUsage']>, ParentType, ContextType>;
}>;

export type GqlSChatTurnFailureResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatTurnFailure'] = GqlSResolversParentTypes['ChatTurnFailure'],
> = ResolversObject<{
    code?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSChatTurnSnapshotResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatTurnSnapshot'] = GqlSResolversParentTypes['ChatTurnSnapshot'],
> = ResolversObject<{
    turns?: Resolver<Array<GqlSResolversTypes['ChatTurn']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatTurnUpdateResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatTurnUpdate'] = GqlSResolversParentTypes['ChatTurnUpdate'],
> = ResolversObject<{
    __resolveType: TypeResolveFn<'ChatTurnSnapshot' | 'ChatTurnUpserted', ParentType, ContextType>;
}>;

export type GqlSChatTurnUpsertedResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatTurnUpserted'] = GqlSResolversParentTypes['ChatTurnUpserted'],
> = ResolversObject<{
    turn?: Resolver<GqlSResolversTypes['ChatTurn'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSChatTurnUsageResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ChatTurnUsage'] = GqlSResolversParentTypes['ChatTurnUsage'],
> = ResolversObject<{
    cachedInputTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    inputTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    outputTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    reasoningTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    totalTokens?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
}>;

export type GqlSCityTestimonialResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CityTestimonial'] = GqlSResolversParentTypes['CityTestimonial'],
> = ResolversObject<{
    index?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    testimonial?: Resolver<GqlSResolversTypes['Testimonial'], ParentType, ContextType>;
}>;

export type GqlSContentSectionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ContentSection'] = GqlSResolversParentTypes['ContentSection'],
> = ResolversObject<{
    __resolveType: TypeResolveFn<
        | 'ContentSectionContent'
        | 'ContentSectionCta'
        | 'ContentSectionImage'
        | 'ContentSectionList'
        | 'ContentSectionQa'
        | 'ContentSectionQuote',
        ParentType,
        ContextType
    >;
}>;

export type GqlSContentSectionContentResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ContentSectionContent'] = GqlSResolversParentTypes['ContentSectionContent'],
> = ResolversObject<{
    bodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    bodyEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    imageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    imageFirst?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    imageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    sectionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    subtitleDe?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    subtitleEn?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    titleDe?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    titleEn?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSContentSectionCtaResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ContentSectionCta'] = GqlSResolversParentTypes['ContentSectionCta'],
> = ResolversObject<{
    bodyDe?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    bodyEn?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    buttonLabelDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    buttonLabelEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    headlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    headlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    href?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    sectionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSContentSectionImageResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ContentSectionImage'] = GqlSResolversParentTypes['ContentSectionImage'],
> = ResolversObject<{
    imageFileUploadId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    imageUrl?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    sectionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSContentSectionListResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ContentSectionList'] = GqlSResolversParentTypes['ContentSectionList'],
> = ResolversObject<{
    itemsDe?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    itemsEn?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    sectionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    style?: Resolver<GqlSResolversTypes['ContentListStyle'], ParentType, ContextType>;
    titleDe?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    titleEn?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSContentSectionQaResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ContentSectionQa'] = GqlSResolversParentTypes['ContentSectionQa'],
> = ResolversObject<{
    entries?: Resolver<Array<GqlSResolversTypes['ContentSectionQaEntry']>, ParentType, ContextType>;
    sectionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    titleDe?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    titleEn?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSContentSectionQaEntryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ContentSectionQaEntry'] = GqlSResolversParentTypes['ContentSectionQaEntry'],
> = ResolversObject<{
    answerDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    answerEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    entryId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    questionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    questionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSContentSectionQuoteResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['ContentSectionQuote'] = GqlSResolversParentTypes['ContentSectionQuote'],
> = ResolversObject<{
    attributionDe?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    attributionEn?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    quoteDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    quoteEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    sectionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSCookResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Cook'] = GqlSResolversParentTypes['Cook'],
> = ResolversObject<{
    biography?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    biographySummary?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    biographySummaryGenerating?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    bookingRequest?: Resolver<
        Maybe<GqlSResolversTypes['CookBookingRequest']>,
        ParentType,
        ContextType,
        RequireFields<GqlSCookBookingRequestArgs, 'bookingRequestId'>
    >;
    bookingRequestLookup?: Resolver<
        GqlSResolversTypes['CookBookingRequestLookupResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookBookingRequestLookupArgs, 'bookingRequestId'>
    >;
    bookingRequestOffer?: Resolver<
        Maybe<GqlSResolversTypes['CookBookingRequestOffer']>,
        ParentType,
        ContextType,
        RequireFields<GqlSCookBookingRequestOfferArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOffers?: Resolver<
        Array<GqlSResolversTypes['CookBookingRequestOffer']>,
        ParentType,
        ContextType,
        Partial<GqlSCookBookingRequestOffersArgs>
    >;
    bookingRequests?: Resolver<
        Array<GqlSResolversTypes['CookBookingRequest']>,
        ParentType,
        ContextType,
        Partial<GqlSCookBookingRequestsArgs>
    >;
    callAvailabilityExceptions?: Resolver<
        Array<GqlSResolversTypes['CookCallAvailabilityException']>,
        ParentType,
        ContextType,
        RequireFields<GqlSCookCallAvailabilityExceptionsArgs, 'from' | 'to'>
    >;
    callAvailabilityRules?: Resolver<Array<GqlSResolversTypes['CookCallAvailabilityRule']>, ParentType, ContextType>;
    callDurationMinutes?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    callSchedulingEnabled?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    callSlotBookings?: Resolver<
        Array<GqlSResolversTypes['CookCallSlotBooking']>,
        ParentType,
        ContextType,
        Partial<GqlSCookCallSlotBookingsArgs>
    >;
    callSlots?: Resolver<
        Array<GqlSResolversTypes['CookCallSlot']>,
        ParentType,
        ContextType,
        RequireFields<GqlSCookCallSlotsArgs, 'from' | 'to'>
    >;
    canCreateOffers?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cookingPhilosophy?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    cuisineStyle?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    exactTravelOriginAddress?: Resolver<Maybe<GqlSResolversTypes['CookTravelOriginAddress']>, ParentType, ContextType>;
    isApprovedByAdmin?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    isVisible?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    lastModifiedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    logo?: Resolver<Maybe<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    maximumParticipants?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    maximumPriceAmount?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    maximumTravelDistance?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    meal?: Resolver<Maybe<GqlSResolversTypes['CookMeal']>, ParentType, ContextType, RequireFields<GqlSCookMealArgs, 'mealId'>>;
    meals?: Resolver<Array<GqlSResolversTypes['CookMeal']>, ParentType, ContextType>;
    mealsCounts?: Resolver<Array<GqlSResolversTypes['Int']>, ParentType, ContextType, RequireFields<GqlSCookMealsCountsArgs, 'criteria'>>;
    menu?: Resolver<Maybe<GqlSResolversTypes['CookMenu']>, ParentType, ContextType, RequireFields<GqlSCookMenuArgs, 'menuId'>>;
    menus?: Resolver<Array<GqlSResolversTypes['CookMenu']>, ParentType, ContextType>;
    menusCounts?: Resolver<Array<GqlSResolversTypes['Int']>, ParentType, ContextType, RequireFields<GqlSCookMenusCountsArgs, 'criteria'>>;
    minimumParticipants?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    minimumPriceAmount?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    offerMenus?: Resolver<Array<GqlSResolversTypes['CookMenu']>, ParentType, ContextType>;
    rating?: Resolver<GqlSResolversTypes['PublicCookRating'], ParentType, ContextType>;
    stageName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    stripeAccountDetails?: Resolver<Maybe<GqlSResolversTypes['CookStripeAccountDetails']>, ParentType, ContextType>;
    stripeStatus?: Resolver<GqlSResolversTypes['CookStripeStatus'], ParentType, ContextType>;
    stripeWallet?: Resolver<Maybe<GqlSResolversTypes['CookStripeWallet']>, ParentType, ContextType>;
    travelExpensesAmount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSCookBookingRequestResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookBookingRequest'] = GqlSResolversParentTypes['CookBookingRequest'],
> = ResolversObject<{
    bookingRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    canceledAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    cancellationReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    cookPoolDetails?: Resolver<Maybe<GqlSResolversTypes['BookingRequestCookPoolDetails']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    dateTime?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    estimatedCookPayoutCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    estimatedTravelDistanceKm?: Resolver<Maybe<GqlSResolversTypes['Float']>, ParentType, ContextType>;
    estimatedTravelExpensesCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    exactEventAddress?: Resolver<GqlSResolversTypes['CookTravelOriginAddress'], ParentType, ContextType>;
    expiresAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    invoiceAddress?: Resolver<Maybe<GqlSResolversTypes['InvoiceAddress']>, ParentType, ContextType>;
    maxOfferAmountCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    message?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    minOfferAmountCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    minOfferAmountHardCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    occasion?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    offers?: Resolver<Array<GqlSResolversTypes['CookBookingRequestOffer']>, ParentType, ContextType>;
    participants?: Resolver<Array<GqlSResolversTypes['BookingRequestParticipant']>, ParentType, ContextType>;
    preferences?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    priceClassType?: Resolver<Maybe<GqlSResolversTypes['BookingRequestPriceClassType']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['BookingRequestStatus'], ParentType, ContextType>;
    suggestedOfferAmountCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    user?: Resolver<GqlSResolversTypes['PublicUser'], ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSCookBookingRequestAvailableResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookBookingRequestAvailable'] = GqlSResolversParentTypes['CookBookingRequestAvailable'],
> = ResolversObject<{
    bookingRequest?: Resolver<GqlSResolversTypes['CookBookingRequest'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSCookBookingRequestCanceledResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookBookingRequestCanceled'] = GqlSResolversParentTypes['CookBookingRequestCanceled'],
> = ResolversObject<{
    _?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSCookBookingRequestExpiredResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookBookingRequestExpired'] = GqlSResolversParentTypes['CookBookingRequestExpired'],
> = ResolversObject<{
    _?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSCookBookingRequestLookupResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookBookingRequestLookupResult'] =
        GqlSResolversParentTypes['CookBookingRequestLookupResult'],
> = ResolversObject<{
    __resolveType: TypeResolveFn<
        | 'CookBookingRequestAvailable'
        | 'CookBookingRequestCanceled'
        | 'CookBookingRequestExpired'
        | 'CookBookingRequestNotFound'
        | 'CookBookingRequestOfferAlreadyExists'
        | 'CookBookingRequestTaken',
        ParentType,
        ContextType
    >;
}>;

export type GqlSCookBookingRequestNotFoundResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookBookingRequestNotFound'] = GqlSResolversParentTypes['CookBookingRequestNotFound'],
> = ResolversObject<{
    _?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSCookBookingRequestOfferResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookBookingRequestOffer'] = GqlSResolversParentTypes['CookBookingRequestOffer'],
> = ResolversObject<{
    activeCallRoom?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferCallRoom']>, ParentType, ContextType>;
    bookingRequest?: Resolver<GqlSResolversTypes['CookBookingRequestOfferContext'], ParentType, ContextType>;
    bookingRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    bookingRequestOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    callBookings?: Resolver<Array<GqlSResolversTypes['CookCallSlotBooking']>, ParentType, ContextType>;
    canCompletePreparations?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    configuredMenu?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferConfiguredMenu']>, ParentType, ContextType>;
    cookAccepted?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    cookDeclinationReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cookTestimonial?: Resolver<Maybe<GqlSResolversTypes['CookTestimonial']>, ParentType, ContextType>;
    cookUnreadNotificationCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    costBreakdown?: Resolver<GqlSResolversTypes['CostBreakdown'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    menuPriceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    messages?: Resolver<Array<GqlSResolversTypes['HumanChatMessage']>, ParentType, ContextType>;
    participantAmendment?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferParticipantAmendment']>, ParentType, ContextType>;
    payment?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferPayment']>, ParentType, ContextType>;
    paymentDateTime?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    paymentProviderFeeCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    paymentStatus?: Resolver<GqlSResolversTypes['BookingRequestOfferPaymentStatus'], ParentType, ContextType>;
    payoutCentsCook?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    payoutDateTime?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    plannedPaymentPullDateTime?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    plannedPayoutDateTime?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    platformFeeCentsCook?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    platformFeeCentsCustomer?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    platformFeePercentCook?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    platformFeePercentCustomer?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    preparationsCompletedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    priceAutoAdjustReason?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferPriceAutoAdjustReason']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['BookingRequestOfferStatus'], ParentType, ContextType>;
    suggestedMenus?: Resolver<Array<GqlSResolversTypes['CookMenu']>, ParentType, ContextType>;
    testimonialMissing?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    totalCentsCustomer?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    totalWithoutDiscountsCentsCustomer?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    travelDistanceKm?: Resolver<Maybe<GqlSResolversTypes['Float']>, ParentType, ContextType>;
    travelExpensesCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    userAccepted?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    userDeclinationReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    userRequestedMenuAdjustments?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
}>;

export type GqlSCookBookingRequestOfferAlreadyExistsResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookBookingRequestOfferAlreadyExists'] =
        GqlSResolversParentTypes['CookBookingRequestOfferAlreadyExists'],
> = ResolversObject<{
    bookingRequestOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSCookBookingRequestOfferContextResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookBookingRequestOfferContext'] =
        GqlSResolversParentTypes['CookBookingRequestOfferContext'],
> = ResolversObject<{
    bookingRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    canceledAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    dateTime?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    exactEventAddress?: Resolver<GqlSResolversTypes['CookTravelOriginAddress'], ParentType, ContextType>;
    expiresAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    invoiceAddress?: Resolver<Maybe<GqlSResolversTypes['InvoiceAddress']>, ParentType, ContextType>;
    maxOfferAmountCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    message?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    minOfferAmountCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    minOfferAmountHardCents?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    occasion?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    participants?: Resolver<Array<GqlSResolversTypes['BookingRequestParticipant']>, ParentType, ContextType>;
    preferences?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    priceClassType?: Resolver<Maybe<GqlSResolversTypes['BookingRequestPriceClassType']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['BookingRequestStatus'], ParentType, ContextType>;
    suggestedOfferAmountCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    user?: Resolver<GqlSResolversTypes['PublicUser'], ParentType, ContextType>;
}>;

export type GqlSCookBookingRequestTakenResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookBookingRequestTaken'] = GqlSResolversParentTypes['CookBookingRequestTaken'],
> = ResolversObject<{
    _?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSCookCallAvailabilityExceptionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookCallAvailabilityException'] =
        GqlSResolversParentTypes['CookCallAvailabilityException'],
> = ResolversObject<{
    cookCallAvailabilityExceptionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    date?: Resolver<GqlSResolversTypes['Date'], ParentType, ContextType>;
    endMinuteOfDay?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    startMinuteOfDay?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    type?: Resolver<GqlSResolversTypes['CookCallAvailabilityExceptionType'], ParentType, ContextType>;
}>;

export type GqlSCookCallAvailabilityRuleResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookCallAvailabilityRule'] = GqlSResolversParentTypes['CookCallAvailabilityRule'],
> = ResolversObject<{
    cookCallAvailabilityRuleId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    dayOfWeek?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    endMinuteOfDay?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    startMinuteOfDay?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSCookCallSlotResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookCallSlot'] = GqlSResolversParentTypes['CookCallSlot'],
> = ResolversObject<{
    endAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    startAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSCookCallSlotBookingResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookCallSlotBooking'] = GqlSResolversParentTypes['CookCallSlotBooking'],
> = ResolversObject<{
    bookingRequestOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    canceledBy?: Resolver<Maybe<GqlSResolversTypes['CookCallSlotBookingActor']>, ParentType, ContextType>;
    canceledReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    cookCallSlotBookingId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cookMessage?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    customer?: Resolver<GqlSResolversTypes['CookCallSlotBookingCustomer'], ParentType, ContextType>;
    customerMessage?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    declineReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    endAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    initiator?: Resolver<GqlSResolversTypes['CookCallSlotBookingActor'], ParentType, ContextType>;
    lastModifiedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    startAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['CookCallSlotBookingStatus'], ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    videoCallRoomId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSCookCallSlotBookingCustomerResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookCallSlotBookingCustomer'] = GqlSResolversParentTypes['CookCallSlotBookingCustomer'],
> = ResolversObject<{
    display?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSCookMealResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookMeal'] = GqlSResolversParentTypes['CookMeal'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    imageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    imageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    mealId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    relationships?: Resolver<GqlSResolversTypes['CookMealRelationships'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSCookMealRelationshipBookingRequestOfferResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookMealRelationshipBookingRequestOffer'] =
        GqlSResolversParentTypes['CookMealRelationshipBookingRequestOffer'],
> = ResolversObject<{
    blocksDeletion?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    bookingRequestDateTime?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    bookingRequestOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    bookingRequestUserName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    courseTitle?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    menuTitle?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSCookMealRelationshipMenuResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookMealRelationshipMenu'] = GqlSResolversParentTypes['CookMealRelationshipMenu'],
> = ResolversObject<{
    blocksDeletion?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    courseTitle?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    menuId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    menuTitle?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSCookMealRelationshipsResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookMealRelationships'] = GqlSResolversParentTypes['CookMealRelationships'],
> = ResolversObject<{
    deletionBlockedByRelationships?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    menus?: Resolver<Array<GqlSResolversTypes['CookMealRelationshipMenu']>, ParentType, ContextType>;
    offers?: Resolver<Array<GqlSResolversTypes['CookMealRelationshipBookingRequestOffer']>, ParentType, ContextType>;
}>;

export type GqlSCookMenuResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookMenu'] = GqlSResolversParentTypes['CookMenu'],
> = ResolversObject<{
    bookingRequestOfferId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    copyOfMenuId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    courseMealOptionImages?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    courses?: Resolver<Array<GqlSResolversTypes['CookMenuCourse']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    menuId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    offerContext?: Resolver<Maybe<GqlSResolversTypes['CookMenuOfferContext']>, ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    templateMenu?: Resolver<Maybe<GqlSResolversTypes['CookMenu']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSCookMenuCourseResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookMenuCourse'] = GqlSResolversParentTypes['CookMenuCourse'],
> = ResolversObject<{
    courseId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    mealOptions?: Resolver<Array<GqlSResolversTypes['CookMeal']>, ParentType, ContextType>;
    mealSelectionLimit?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSCookMenuCourseSuggestionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookMenuCourseSuggestion'] = GqlSResolversParentTypes['CookMenuCourseSuggestion'],
> = ResolversObject<{
    mealIds?: Resolver<Array<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSCookMenuOfferContextResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookMenuOfferContext'] = GqlSResolversParentTypes['CookMenuOfferContext'],
> = ResolversObject<{
    bookingRequestDateTime?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    bookingRequestOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    customerFirstName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['BookingRequestOfferStatus'], ParentType, ContextType>;
}>;

export type GqlSCookMenuSuggestionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookMenuSuggestion'] = GqlSResolversParentTypes['CookMenuSuggestion'],
> = ResolversObject<{
    courses?: Resolver<Array<GqlSResolversTypes['CookMenuCourseSuggestion']>, ParentType, ContextType>;
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSCookMutationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookMutation'] = GqlSResolversParentTypes['CookMutation'],
> = ResolversObject<{
    biographySuggest?: Resolver<
        GqlSResolversTypes['String'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBiographySuggestArgs, 'currentBiography'>
    >;
    bookingRequestDecline?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestDeclineArgs, 'bookingRequestId' | 'reason'>
    >;
    bookingRequestGeneratedMenuApply?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestGeneratedMenuApplyArgs, 'bookingRequestId'>
    >;
    bookingRequestMenuEvaluationRefresh?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestMenuEvaluationRefreshArgs, 'bookingRequestId'>
    >;
    bookingRequestOfferAccept?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferAcceptArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferCallCreate?: Resolver<
        GqlSResolversTypes['BookingRequestOfferCallTokenResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferCallCreateArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferCallJoin?: Resolver<
        GqlSResolversTypes['BookingRequestOfferCallTokenResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferCallJoinArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferCallLeave?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferCallLeaveArgs, 'bookingRequestOfferCallRoomParticipantId'>
    >;
    bookingRequestOfferCallSlotCancel?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferCallSlotCancelArgs, 'cookCallSlotBookingId'>
    >;
    bookingRequestOfferCallSlotConfirm?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferCallSlotConfirmArgs, 'cookCallSlotBookingId'>
    >;
    bookingRequestOfferCallSlotDecline?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferCallSlotDeclineArgs, 'cookCallSlotBookingId'>
    >;
    bookingRequestOfferCallSlotRequest?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferCallSlotRequestArgs, 'bookingRequestOfferId' | 'startAt'>
    >;
    bookingRequestOfferChatMessageCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferChatMessageCreateArgs, 'bookingRequestOfferId' | 'message'>
    >;
    bookingRequestOfferChatMessageReactionUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferChatMessageReactionUpsertArgs, 'bookingRequestOfferEventId' | 'emoji'>
    >;
    bookingRequestOfferCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferCreateArgs, 'input'>
    >;
    bookingRequestOfferDecline?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferDeclineArgs, 'bookingRequestOfferId' | 'reason'>
    >;
    bookingRequestOfferParticipantAmendmentAccept?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferParticipantAmendmentAcceptArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferParticipantAmendmentDecline?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferParticipantAmendmentDeclineArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferPreparationsComplete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferPreparationsCompleteArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferPriceUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferPriceUpdateArgs, 'input'>
    >;
    bookingRequestOfferSuggestedMenusUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferSuggestedMenusUpdateArgs, 'input'>
    >;
    bookingRequestOfferTestimonialCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferTestimonialCreateArgs, 'input'>
    >;
    bookingRequestOfferUnreadNotificationCountReset?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOfferUnreadNotificationCountResetArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOpen?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationBookingRequestOpenArgs, 'bookingRequestId'>
    >;
    callAvailabilityExceptionCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationCallAvailabilityExceptionCreateArgs, 'exception'>
    >;
    callAvailabilityExceptionDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationCallAvailabilityExceptionDeleteArgs, 'cookCallAvailabilityExceptionId'>
    >;
    callAvailabilityRuleCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationCallAvailabilityRuleCreateArgs, 'rule'>
    >;
    callAvailabilityRuleDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationCallAvailabilityRuleDeleteArgs, 'cookCallAvailabilityRuleId'>
    >;
    mealCreate?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType, Partial<GqlSCookMutationMealCreateArgs>>;
    mealDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationMealDeleteArgs, 'mealId'>
    >;
    mealUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationMealUpdateArgs, 'meal' | 'mealId'>
    >;
    menuCopy?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationMenuCopyArgs, 'menuId'>
    >;
    menuCreate?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    menuDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationMenuDeleteArgs, 'menuId'>
    >;
    menuSuggestionFromInventory?: Resolver<
        GqlSResolversTypes['CookMenuSuggestion'],
        ParentType,
        ContextType,
        Partial<GqlSCookMutationMenuSuggestionFromInventoryArgs>
    >;
    menuSuggestionFromText?: Resolver<
        GqlSResolversTypes['CookMenuSuggestion'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationMenuSuggestionFromTextArgs, 'text'>
    >;
    menuSyncToTemplate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationMenuSyncToTemplateArgs, 'menuId'>
    >;
    menuTitleDescriptionSuggest?: Resolver<
        GqlSResolversTypes['CookMenuSuggestion'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationMenuTitleDescriptionSuggestArgs, 'courses'>
    >;
    menuUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationMenuUpdateArgs, 'menu' | 'menuId'>
    >;
    stripeDashboardUrlCreate?: Resolver<GqlSResolversTypes['CookStripeDashboardResult'], ParentType, ContextType>;
    stripeOnboardingStart?: Resolver<
        GqlSResolversTypes['CookStripeOnboardingResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSCookMutationStripeOnboardingStartArgs, 'refreshUrl' | 'returnUrl'>
    >;
    stripeStatusSync?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    update?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType, RequireFields<GqlSCookMutationUpdateArgs, 'input'>>;
}>;

export type GqlSCookStripeAccountDetailsResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookStripeAccountDetails'] = GqlSResolversParentTypes['CookStripeAccountDetails'],
> = ResolversObject<{
    chargesEnabled?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    currentlyDue?: Resolver<Array<GqlSResolversTypes['CookStripeRequirementCategory']>, ParentType, ContextType>;
    detailsSubmitted?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    disabledReason?: Resolver<Maybe<GqlSResolversTypes['CookStripeDisabledReason']>, ParentType, ContextType>;
    pastDue?: Resolver<Array<GqlSResolversTypes['CookStripeRequirementCategory']>, ParentType, ContextType>;
    payoutsEnabled?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    pendingVerification?: Resolver<Array<GqlSResolversTypes['CookStripeRequirementCategory']>, ParentType, ContextType>;
}>;

export type GqlSCookStripeBalanceTransactionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookStripeBalanceTransaction'] = GqlSResolversParentTypes['CookStripeBalanceTransaction'],
> = ResolversObject<{
    availableOn?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    balanceTransactionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    description?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    kind?: Resolver<GqlSResolversTypes['CookStripeBalanceTransactionKind'], ParentType, ContextType>;
    netCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['CookStripeBalanceTransactionStatus'], ParentType, ContextType>;
}>;

export type GqlSCookStripeDashboardResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookStripeDashboardResult'] = GqlSResolversParentTypes['CookStripeDashboardResult'],
> = ResolversObject<{
    url?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSCookStripeOnboardingResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookStripeOnboardingResult'] = GqlSResolversParentTypes['CookStripeOnboardingResult'],
> = ResolversObject<{
    kind?: Resolver<GqlSResolversTypes['CookStripeOnboardingKind'], ParentType, ContextType>;
    url?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSCookStripeWalletResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookStripeWallet'] = GqlSResolversParentTypes['CookStripeWallet'],
> = ResolversObject<{
    availableCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    pendingCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    transactions?: Resolver<Array<GqlSResolversTypes['CookStripeBalanceTransaction']>, ParentType, ContextType>;
}>;

export type GqlSCookTestimonialResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookTestimonial'] = GqlSResolversParentTypes['CookTestimonial'],
> = ResolversObject<{
    authorName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    body?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    cookTestimonialId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    imageUrls?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    location?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    occasion?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    rating?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GqlSCookTestimonialLowRatingAnswersResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookTestimonialLowRatingAnswers'] =
        GqlSResolversParentTypes['CookTestimonialLowRatingAnswers'],
> = ResolversObject<{
    additionalFeedback?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    whatWentWrong?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    wouldRecommend?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
}>;

export type GqlSCookTravelOriginAddressResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CookTravelOriginAddress'] = GqlSResolversParentTypes['CookTravelOriginAddress'],
> = ResolversObject<{
    addressLine1?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    addressLine2?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    city?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    country?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    displayText?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    latitude?: Resolver<GqlSResolversTypes['Latitude'], ParentType, ContextType>;
    longitude?: Resolver<GqlSResolversTypes['Longitude'], ParentType, ContextType>;
    postCode?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    state?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSCostBreakdownResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CostBreakdown'] = GqlSResolversParentTypes['CostBreakdown'],
> = ResolversObject<{
    lineItems?: Resolver<Array<GqlSResolversTypes['CostLineItem']>, ParentType, ContextType>;
    total?: Resolver<Maybe<GqlSResolversTypes['CostLineItem']>, ParentType, ContextType>;
    totalBeforeDiscount?: Resolver<Maybe<GqlSResolversTypes['CostLineItem']>, ParentType, ContextType>;
    totalPerPerson?: Resolver<Maybe<GqlSResolversTypes['CostLineItem']>, ParentType, ContextType>;
}>;

export type GqlSCostLineItemResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CostLineItem'] = GqlSResolversParentTypes['CostLineItem'],
> = ResolversObject<{
    amountCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    subLineItems?: Resolver<Maybe<Array<GqlSResolversTypes['CostLineItem']>>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSCustomerTestimonialResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['CustomerTestimonial'] = GqlSResolversParentTypes['CustomerTestimonial'],
> = ResolversObject<{
    authorName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    body?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    customerTestimonialId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    imageUrls?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    location?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    occasion?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    rating?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface GqlSDateScalarConfig extends GraphQLScalarTypeConfig<GqlSResolversTypes['Date'], any> {
    name: 'Date';
}

export interface GqlSDateTimeScalarConfig extends GraphQLScalarTypeConfig<GqlSResolversTypes['DateTime'], any> {
    name: 'DateTime';
}

export interface GqlSEmailAddressScalarConfig extends GraphQLScalarTypeConfig<GqlSResolversTypes['EmailAddress'], any> {
    name: 'EmailAddress';
}

export type GqlSFileUploadResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['FileUpload'] = GqlSResolversParentTypes['FileUpload'],
> = ResolversObject<{
    fileUploadId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    filename?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    mediaType?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    size?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    url?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSGeoCoordinatesResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['GeoCoordinates'] = GqlSResolversParentTypes['GeoCoordinates'],
> = ResolversObject<{
    latitude?: Resolver<GqlSResolversTypes['Latitude'], ParentType, ContextType>;
    longitude?: Resolver<GqlSResolversTypes['Longitude'], ParentType, ContextType>;
}>;

export type GqlSGiftCardResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['GiftCard'] = GqlSResolversParentTypes['GiftCard'],
> = ResolversObject<{
    balanceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    buyerEmail?: Resolver<GqlSResolversTypes['EmailAddress'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    expiresAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    giftCardId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    invoiceAddress?: Resolver<Maybe<GqlSResolversTypes['InvoiceAddress']>, ParentType, ContextType>;
    message?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    occasion?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    originalBalanceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    payment?: Resolver<Maybe<GqlSResolversTypes['GiftCardPayment']>, ParentType, ContextType>;
    paymentStatus?: Resolver<GqlSResolversTypes['GiftCardPaymentStatus'], ParentType, ContextType>;
    recipientName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    redeemCode?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSGiftCardPaymentResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['GiftCardPayment'] = GqlSResolversParentTypes['GiftCardPayment'],
> = ResolversObject<{
    clientSecret?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    publishableKey?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSGiftCardPurchaseErrorResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['GiftCardPurchaseError'] = GqlSResolversParentTypes['GiftCardPurchaseError'],
> = ResolversObject<{
    code?: Resolver<GqlSResolversTypes['GiftCardPurchaseErrorCode'], ParentType, ContextType>;
}>;

export type GqlSHumanChatMessageResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['HumanChatMessage'] = GqlSResolversParentTypes['HumanChatMessage'],
> = ResolversObject<{
    __resolveType: TypeResolveFn<'ChatMessageBookingRequestOfferEvent' | 'ChatMessageUser', ParentType, ContextType>;
}>;

export type GqlSInvoiceAddressResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['InvoiceAddress'] = GqlSResolversParentTypes['InvoiceAddress'],
> = ResolversObject<{
    city?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    companyName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    country?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    lastName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    line1?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    line2?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    postalCode?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export interface GqlSJsonScalarConfig extends GraphQLScalarTypeConfig<GqlSResolversTypes['JSON'], any> {
    name: 'JSON';
}

export interface GqlSLatitudeScalarConfig extends GraphQLScalarTypeConfig<GqlSResolversTypes['Latitude'], any> {
    name: 'Latitude';
}

export type GqlSLocationSuggestionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['LocationSuggestion'] = GqlSResolversParentTypes['LocationSuggestion'],
> = ResolversObject<{
    displayText?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    latitude?: Resolver<GqlSResolversTypes['Latitude'], ParentType, ContextType>;
    longitude?: Resolver<GqlSResolversTypes['Longitude'], ParentType, ContextType>;
    structuredAddress?: Resolver<Maybe<GqlSResolversTypes['CookTravelOriginAddress']>, ParentType, ContextType>;
}>;

export interface GqlSLongitudeScalarConfig extends GraphQLScalarTypeConfig<GqlSResolversTypes['Longitude'], any> {
    name: 'Longitude';
}

export type GqlSMutationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Mutation'] = GqlSResolversParentTypes['Mutation'],
> = ResolversObject<{
    admin?: Resolver<GqlSResolversTypes['AdminMutation'], ParentType, ContextType>;
    authEmailOtpDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSMutationAuthEmailOtpDeleteArgs, 'authEmailOtpId'>
    >;
    authEmailOtpRequest?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSMutationAuthEmailOtpRequestArgs, 'email' | 'locale'>
    >;
    authEmailOtpVerify?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSMutationAuthEmailOtpVerifyArgs, 'code' | 'email'>
    >;
    authPasskeyAuthenticateOptions?: Resolver<GqlSResolversTypes['JSON'], ParentType, ContextType>;
    authPasskeyAuthenticateVerify?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSMutationAuthPasskeyAuthenticateVerifyArgs, 'response'>
    >;
    authTotpChallengeDelete?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    authTotpVerify?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSMutationAuthTotpVerifyArgs, 'code'>
    >;
    clientObservabilityReport?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSMutationClientObservabilityReportArgs, 'input'>
    >;
    sessionCookieSettingAcceptAll?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    sessionCookieSettingAcceptMandatory?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    sessionNewsletterSubscriptionCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSMutationSessionNewsletterSubscriptionCreateArgs, 'emailAddress' | 'locale'>
    >;
    sessionWebPageInteractionCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSMutationSessionWebPageInteractionCreateArgs, 'input'>
    >;
    sessionWebPageVisitCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSMutationSessionWebPageVisitCreateArgs, 'input'>
    >;
    user?: Resolver<GqlSResolversTypes['UserMutation'], ParentType, ContextType>;
    userCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSMutationUserCreateArgs, 'input'>
    >;
}>;

export type GqlSMutationResultResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['MutationResult'] = GqlSResolversParentTypes['MutationResult'],
> = ResolversObject<{
    referenceId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    success?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type GqlSOccasionFormatsCardResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['OccasionFormatsCard'] = GqlSResolversParentTypes['OccasionFormatsCard'],
> = ResolversObject<{
    bodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    bodyEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    fact1De?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    fact1En?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    fact2De?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    fact2En?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    fact3De?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    fact3En?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    imageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    imageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSOccasionFormatsSectionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['OccasionFormatsSection'] = GqlSResolversParentTypes['OccasionFormatsSection'],
> = ResolversObject<{
    cards?: Resolver<Array<GqlSResolversTypes['OccasionFormatsCard']>, ParentType, ContextType>;
    subtitleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    subtitleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSOccasionPromoResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['OccasionPromo'] = GqlSResolversParentTypes['OccasionPromo'],
> = ResolversObject<{
    amountCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    redeemCode?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSOccasionTestimonialResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['OccasionTestimonial'] = GqlSResolversParentTypes['OccasionTestimonial'],
> = ResolversObject<{
    index?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    testimonial?: Resolver<GqlSResolversTypes['Testimonial'], ParentType, ContextType>;
}>;

export type GqlSPartnerPromoResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PartnerPromo'] = GqlSResolversParentTypes['PartnerPromo'],
> = ResolversObject<{
    amountCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    redeemCode?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSPartnerTestimonialResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PartnerTestimonial'] = GqlSResolversParentTypes['PartnerTestimonial'],
> = ResolversObject<{
    index?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    testimonial?: Resolver<GqlSResolversTypes['Testimonial'], ParentType, ContextType>;
}>;

export interface GqlSPhoneNumberScalarConfig extends GraphQLScalarTypeConfig<GqlSResolversTypes['PhoneNumber'], any> {
    name: 'PhoneNumber';
}

export type GqlSPublicBlogPostResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicBlogPost'] = GqlSResolversParentTypes['PublicBlogPost'],
> = ResolversObject<{
    blogPostId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    headlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    headlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    heroImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    heroImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    pathName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    previousPathNames?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    sections?: Resolver<Array<GqlSResolversTypes['ContentSection']>, ParentType, ContextType>;
    subHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    subHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSPublicBlogPostQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicBlogPostQuery'] = GqlSResolversParentTypes['PublicBlogPostQuery'],
> = ResolversObject<{
    findMany?: Resolver<Array<GqlSResolversTypes['PublicBlogPost']>, ParentType, ContextType>;
    findOneByPathName?: Resolver<
        Maybe<GqlSResolversTypes['PublicBlogPost']>,
        ParentType,
        ContextType,
        RequireFields<GqlSPublicBlogPostQueryFindOneByPathNameArgs, 'pathName'>
    >;
}>;

export type GqlSPublicCityResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicCity'] = GqlSResolversParentTypes['PublicCity'],
> = ResolversObject<{
    cityId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    featuredCooks?: Resolver<Array<GqlSResolversTypes['PublicCook']>, ParentType, ContextType>;
    firstSectionBodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionBodyEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    firstSectionImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    headlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    headlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    heroImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    heroImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    latitude?: Resolver<GqlSResolversTypes['Latitude'], ParentType, ContextType>;
    longitude?: Resolver<GqlSResolversTypes['Longitude'], ParentType, ContextType>;
    nameDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    nameEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    pathName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    previousPathNames?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    sections?: Resolver<Array<GqlSResolversTypes['ContentSection']>, ParentType, ContextType>;
    subHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    subHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    testimonials?: Resolver<Array<GqlSResolversTypes['CityTestimonial']>, ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSPublicCityQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicCityQuery'] = GqlSResolversParentTypes['PublicCityQuery'],
> = ResolversObject<{
    findMany?: Resolver<Array<GqlSResolversTypes['PublicCity']>, ParentType, ContextType>;
    findOneByPathName?: Resolver<
        Maybe<GqlSResolversTypes['PublicCity']>,
        ParentType,
        ContextType,
        RequireFields<GqlSPublicCityQueryFindOneByPathNameArgs, 'pathName'>
    >;
}>;

export type GqlSPublicCookResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicCook'] = GqlSResolversParentTypes['PublicCook'],
> = ResolversObject<{
    biography?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    biographySummary?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    callDurationMinutes?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    callSchedulingEnabled?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    callSlots?: Resolver<
        Array<GqlSResolversTypes['CookCallSlot']>,
        ParentType,
        ContextType,
        RequireFields<GqlSPublicCookCallSlotsArgs, 'from' | 'to'>
    >;
    city?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cookingPhilosophy?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    cuisineStyle?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    hasPublicProfile?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    logo?: Resolver<Maybe<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    maximumParticipants?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    maximumPriceAmount?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    meals?: Resolver<Array<GqlSResolversTypes['PublicCookMeal']>, ParentType, ContextType>;
    minimumParticipants?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    minimumPriceAmount?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    rating?: Resolver<GqlSResolversTypes['PublicCookRating'], ParentType, ContextType>;
    stageName?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    testimonials?: Resolver<Array<GqlSResolversTypes['CustomerTestimonial']>, ParentType, ContextType>;
    user?: Resolver<GqlSResolversTypes['PublicUser'], ParentType, ContextType>;
}>;

export type GqlSPublicCookMealResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicCookMeal'] = GqlSResolversParentTypes['PublicCookMeal'],
> = ResolversObject<{
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    imageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    mealId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSPublicCookMenuResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicCookMenu'] = GqlSResolversParentTypes['PublicCookMenu'],
> = ResolversObject<{
    courseMealOptionImages?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    courses?: Resolver<Array<GqlSResolversTypes['PublicCookMenuCourse']>, ParentType, ContextType>;
    description?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    menuId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSPublicCookMenuCourseResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicCookMenuCourse'] = GqlSResolversParentTypes['PublicCookMenuCourse'],
> = ResolversObject<{
    courseId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    mealOptions?: Resolver<Array<GqlSResolversTypes['PublicCookMeal']>, ParentType, ContextType>;
    mealSelectionLimit?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    title?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSPublicCookQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicCookQuery'] = GqlSResolversParentTypes['PublicCookQuery'],
> = ResolversObject<{
    findMany?: Resolver<Array<GqlSResolversTypes['PublicCook']>, ParentType, ContextType, Partial<GqlSPublicCookQueryFindManyArgs>>;
    findOne?: Resolver<
        Maybe<GqlSResolversTypes['PublicCook']>,
        ParentType,
        ContextType,
        RequireFields<GqlSPublicCookQueryFindOneArgs, 'cookId'>
    >;
}>;

export type GqlSPublicCookRatingResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicCookRating'] = GqlSResolversParentTypes['PublicCookRating'],
> = ResolversObject<{
    averageRating?: Resolver<Maybe<GqlSResolversTypes['Float']>, ParentType, ContextType>;
    reviewCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSPublicLegalResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicLegal'] = GqlSResolversParentTypes['PublicLegal'],
> = ResolversObject<{
    imprint?: Resolver<Maybe<GqlSResolversTypes['PublicLegalImprint']>, ParentType, ContextType>;
    privacyPolicy?: Resolver<Maybe<GqlSResolversTypes['PublicLegalPrivacyPolicy']>, ParentType, ContextType>;
    termsAndConditions?: Resolver<Maybe<GqlSResolversTypes['PublicLegalTermsAndConditions']>, ParentType, ContextType>;
}>;

export type GqlSPublicLegalImprintResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicLegalImprint'] = GqlSResolversParentTypes['PublicLegalImprint'],
> = ResolversObject<{
    bodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    changeSummaryDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    imprintId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    publishedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSPublicLegalPrivacyPolicyResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicLegalPrivacyPolicy'] = GqlSResolversParentTypes['PublicLegalPrivacyPolicy'],
> = ResolversObject<{
    bodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    changeSummaryDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    privacyPolicyId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    publishedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSPublicLegalTermsAndConditionsResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicLegalTermsAndConditions'] =
        GqlSResolversParentTypes['PublicLegalTermsAndConditions'],
> = ResolversObject<{
    bodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    changeSummaryDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    publishedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    termsAndConditionsId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSPublicOccasionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicOccasion'] = GqlSResolversParentTypes['PublicOccasion'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    featuredCooks?: Resolver<Array<GqlSResolversTypes['PublicCook']>, ParentType, ContextType>;
    firstSectionBodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionBodyEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    firstSectionImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    formatsSection?: Resolver<GqlSResolversTypes['OccasionFormatsSection'], ParentType, ContextType>;
    headlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    headlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    heroImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    heroImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    occasionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    pathName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    previousPathNames?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    promo?: Resolver<Maybe<GqlSResolversTypes['OccasionPromo']>, ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    sections?: Resolver<Array<GqlSResolversTypes['ContentSection']>, ParentType, ContextType>;
    subHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    subHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    testimonials?: Resolver<Array<GqlSResolversTypes['OccasionTestimonial']>, ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSPublicOccasionQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicOccasionQuery'] = GqlSResolversParentTypes['PublicOccasionQuery'],
> = ResolversObject<{
    findMany?: Resolver<Array<GqlSResolversTypes['PublicOccasion']>, ParentType, ContextType>;
    findOneByPathName?: Resolver<
        Maybe<GqlSResolversTypes['PublicOccasion']>,
        ParentType,
        ContextType,
        RequireFields<GqlSPublicOccasionQueryFindOneByPathNameArgs, 'pathName'>
    >;
}>;

export type GqlSPublicPartnerResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicPartner'] = GqlSResolversParentTypes['PublicPartner'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    featuredCooks?: Resolver<Array<GqlSResolversTypes['PublicCook']>, ParentType, ContextType>;
    firstSectionBodyDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionBodyEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionCtaUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    firstSectionHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    firstSectionImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    firstSectionImageOverlay?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    firstSectionImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    headlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    headlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    heroImageFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    heroImageOverlay?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    heroImageUrl?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    howItWorksAlternativeMedia?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    partnerId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    pathName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    previousPathNames?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    promo?: Resolver<Maybe<GqlSResolversTypes['PartnerPromo']>, ParentType, ContextType>;
    publishedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    sections?: Resolver<Array<GqlSResolversTypes['ContentSection']>, ParentType, ContextType>;
    subHeadlineDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    subHeadlineEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    testimonials?: Resolver<Array<GqlSResolversTypes['PartnerTestimonial']>, ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    updatedAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type GqlSPublicPartnerQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicPartnerQuery'] = GqlSResolversParentTypes['PublicPartnerQuery'],
> = ResolversObject<{
    findMany?: Resolver<Array<GqlSResolversTypes['PublicPartner']>, ParentType, ContextType>;
    findOneByPathName?: Resolver<
        Maybe<GqlSResolversTypes['PublicPartner']>,
        ParentType,
        ContextType,
        RequireFields<GqlSPublicPartnerQueryFindOneByPathNameArgs, 'pathName'>
    >;
}>;

export type GqlSPublicUserResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicUser'] = GqlSResolversParentTypes['PublicUser'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    display?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    profilePicture?: Resolver<Maybe<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
}>;

export type GqlSPublicWebPageResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicWebPage'] = GqlSResolversParentTypes['PublicWebPage'],
> = ResolversObject<{
    descriptionDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    descriptionEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleDe?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    titleEn?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    webPageKey?: Resolver<GqlSResolversTypes['WebPageKey'], ParentType, ContextType>;
}>;

export type GqlSPublicWebPageQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['PublicWebPageQuery'] = GqlSResolversParentTypes['PublicWebPageQuery'],
> = ResolversObject<{
    findOne?: Resolver<
        GqlSResolversTypes['PublicWebPage'],
        ParentType,
        ContextType,
        RequireFields<GqlSPublicWebPageQueryFindOneArgs, 'webPageKey'>
    >;
}>;

export type GqlSQueryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Query'] = GqlSResolversParentTypes['Query'],
> = ResolversObject<{
    currentSession?: Resolver<GqlSResolversTypes['Session'], ParentType, ContextType>;
    publicBlogPost?: Resolver<GqlSResolversTypes['PublicBlogPostQuery'], ParentType, ContextType>;
    publicCity?: Resolver<GqlSResolversTypes['PublicCityQuery'], ParentType, ContextType>;
    publicCook?: Resolver<GqlSResolversTypes['PublicCookQuery'], ParentType, ContextType>;
    publicLegal?: Resolver<GqlSResolversTypes['PublicLegal'], ParentType, ContextType>;
    publicOccasion?: Resolver<GqlSResolversTypes['PublicOccasionQuery'], ParentType, ContextType>;
    publicPartner?: Resolver<GqlSResolversTypes['PublicPartnerQuery'], ParentType, ContextType>;
    publicWebPage?: Resolver<GqlSResolversTypes['PublicWebPageQuery'], ParentType, ContextType>;
}>;

export type GqlSSessionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Session'] = GqlSResolversParentTypes['Session'],
> = ResolversObject<{
    activeFeatureToggleKeys?: Resolver<Array<GqlSResolversTypes['FeatureToggleKey']>, ParentType, ContextType>;
    authEmailOtp?: Resolver<Maybe<GqlSResolversTypes['AuthEmailOtp']>, ParentType, ContextType>;
    authTotpChallenge?: Resolver<Maybe<GqlSResolversTypes['AuthTotpChallenge']>, ParentType, ContextType>;
    cookieSetting?: Resolver<Maybe<GqlSResolversTypes['SessionCookieSetting']>, ParentType, ContextType>;
    discount?: Resolver<
        Maybe<GqlSResolversTypes['SessionDiscount']>,
        ParentType,
        ContextType,
        RequireFields<GqlSSessionDiscountArgs, 'redeemCode'>
    >;
    giftCard?: Resolver<Maybe<GqlSResolversTypes['GiftCard']>, ParentType, ContextType>;
    giftCardPurchaseError?: Resolver<Maybe<GqlSResolversTypes['GiftCardPurchaseError']>, ParentType, ContextType>;
    locationSuggestions?: Resolver<
        Array<GqlSResolversTypes['LocationSuggestion']>,
        ParentType,
        ContextType,
        RequireFields<GqlSSessionLocationSuggestionsArgs, 'onlyFullAddresses' | 'searchText'>
    >;
    sessionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    user?: Resolver<Maybe<GqlSResolversTypes['User']>, ParentType, ContextType>;
}>;

export type GqlSSessionCookieSettingResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['SessionCookieSetting'] = GqlSResolversParentTypes['SessionCookieSetting'],
> = ResolversObject<{
    clarity?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    googleAnalytics?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type GqlSSessionDiscountResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['SessionDiscount'] = GqlSResolversParentTypes['SessionDiscount'],
> = ResolversObject<{
    amountCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    name?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    redeemCode?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSSubscriptionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Subscription'] = GqlSResolversParentTypes['Subscription'],
> = ResolversObject<{
    adminUpdates?: SubscriptionResolver<GqlSResolversTypes['Admin'], 'adminUpdates', ParentType, ContextType>;
    chatTurnUpdates?: SubscriptionResolver<
        GqlSResolversTypes['ChatTurnUpdate'],
        'chatTurnUpdates',
        ParentType,
        ContextType,
        RequireFields<GqlSSubscriptionChatTurnUpdatesArgs, 'chatId'>
    >;
    sessionUpdates?: SubscriptionResolver<GqlSResolversTypes['Session'], 'sessionUpdates', ParentType, ContextType>;
    userUpdates?: SubscriptionResolver<GqlSResolversTypes['User'], 'userUpdates', ParentType, ContextType>;
}>;

export type GqlSSupportRequestBookingRequestSummaryResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['SupportRequestBookingRequestSummary'] =
        GqlSResolversParentTypes['SupportRequestBookingRequestSummary'],
> = ResolversObject<{
    bookingRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    dateTime?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    occasion?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSTestimonialResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['Testimonial'] = GqlSResolversParentTypes['Testimonial'],
> = ResolversObject<{
    __resolveType: TypeResolveFn<'CookTestimonial' | 'CustomerTestimonial', ParentType, ContextType>;
}>;

export interface GqlSTimeZoneScalarConfig extends GraphQLScalarTypeConfig<GqlSResolversTypes['TimeZone'], any> {
    name: 'TimeZone';
}

export type GqlSUserResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['User'] = GqlSResolversParentTypes['User'],
> = ResolversObject<{
    admin?: Resolver<Maybe<GqlSResolversTypes['Admin']>, ParentType, ContextType>;
    assistantChat?: Resolver<
        Maybe<GqlSResolversTypes['Chat']>,
        ParentType,
        ContextType,
        RequireFields<GqlSUserAssistantChatArgs, 'chatId'>
    >;
    assistantChats?: Resolver<
        Maybe<Array<GqlSResolversTypes['Chat']>>,
        ParentType,
        ContextType,
        RequireFields<GqlSUserAssistantChatsArgs, 'criterion'>
    >;
    birthDate?: Resolver<Maybe<GqlSResolversTypes['Date']>, ParentType, ContextType>;
    bookingRequest?: Resolver<
        Maybe<GqlSResolversTypes['UserBookingRequest']>,
        ParentType,
        ContextType,
        RequireFields<GqlSUserBookingRequestArgs, 'bookingRequestId'>
    >;
    bookingRequests?: Resolver<Maybe<Array<GqlSResolversTypes['UserBookingRequest']>>, ParentType, ContextType>;
    cook?: Resolver<Maybe<GqlSResolversTypes['Cook']>, ParentType, ContextType>;
    emailAddress?: Resolver<Maybe<GqlSResolversTypes['EmailAddress']>, ParentType, ContextType>;
    firstName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    giftCards?: Resolver<Maybe<Array<GqlSResolversTypes['UserGiftCard']>>, ParentType, ContextType>;
    lastAcceptedPrivacyPolicy?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    lastAcceptedTerms?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    lastName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    legalAcceptance?: Resolver<Maybe<GqlSResolversTypes['UserLegalAcceptance']>, ParentType, ContextType>;
    locale?: Resolver<GqlSResolversTypes['Locale'], ParentType, ContextType>;
    passkeys?: Resolver<Maybe<Array<GqlSResolversTypes['AuthPasskey']>>, ParentType, ContextType>;
    phoneNumber?: Resolver<Maybe<GqlSResolversTypes['PhoneNumber']>, ParentType, ContextType>;
    preferredCommunication?: Resolver<Maybe<GqlSResolversTypes['UserPreferredCommunication']>, ParentType, ContextType>;
    previousEventAddresses?: Resolver<Maybe<Array<GqlSResolversTypes['CookTravelOriginAddress']>>, ParentType, ContextType>;
    profilePicture?: Resolver<Maybe<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    sessions?: Resolver<Maybe<Array<GqlSResolversTypes['UserSession']>>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['UserStatus'], ParentType, ContextType>;
    supportRequest?: Resolver<
        Maybe<GqlSResolversTypes['UserSupportRequest']>,
        ParentType,
        ContextType,
        RequireFields<GqlSUserSupportRequestArgs, 'supportRequestId'>
    >;
    supportRequests?: Resolver<Maybe<Array<GqlSResolversTypes['UserSupportRequest']>>, ParentType, ContextType>;
    timeBasedOneTimePassword?: Resolver<Maybe<GqlSResolversTypes['AuthTimeBasedOneTimePassword']>, ParentType, ContextType>;
    timeZone?: Resolver<GqlSResolversTypes['TimeZone'], ParentType, ContextType>;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSUserBookingRequestResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['UserBookingRequest'] = GqlSResolversParentTypes['UserBookingRequest'],
> = ResolversObject<{
    adjustedMessage?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    bookingRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    canceledAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    cancellationReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    dateTime?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    exactEventAddress?: Resolver<GqlSResolversTypes['CookTravelOriginAddress'], ParentType, ContextType>;
    expiresAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    giftCard?: Resolver<Maybe<GqlSResolversTypes['UserBookingRequestGiftCard']>, ParentType, ContextType>;
    invoiceAddress?: Resolver<Maybe<GqlSResolversTypes['InvoiceAddress']>, ParentType, ContextType>;
    occasion?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    offers?: Resolver<Array<GqlSResolversTypes['UserBookingRequestOffer']>, ParentType, ContextType>;
    originalMessage?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    participants?: Resolver<Array<GqlSResolversTypes['BookingRequestParticipant']>, ParentType, ContextType>;
    preferences?: Resolver<Array<GqlSResolversTypes['String']>, ParentType, ContextType>;
    priceClassType?: Resolver<Maybe<GqlSResolversTypes['BookingRequestPriceClassType']>, ParentType, ContextType>;
    priceImpact?: Resolver<
        Array<GqlSResolversTypes['UserBookingRequestOfferPriceImpact']>,
        ParentType,
        ContextType,
        RequireFields<GqlSUserBookingRequestPriceImpactArgs, 'participantsAdult' | 'participantsDiscounted'>
    >;
    promoCode?: Resolver<Maybe<GqlSResolversTypes['UserBookingRequestPromoCode']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['BookingRequestStatus'], ParentType, ContextType>;
    supportRequest?: Resolver<Maybe<GqlSResolversTypes['UserSupportRequest']>, ParentType, ContextType>;
    travelImpact?: Resolver<
        Array<GqlSResolversTypes['UserBookingRequestOfferTravelImpact']>,
        ParentType,
        ContextType,
        RequireFields<GqlSUserBookingRequestTravelImpactArgs, 'exactEventAddress'>
    >;
    userId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
}>;

export type GqlSUserBookingRequestGiftCardResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['UserBookingRequestGiftCard'] = GqlSResolversParentTypes['UserBookingRequestGiftCard'],
> = ResolversObject<{
    balanceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    giftCardId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    redeemCode?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSUserBookingRequestOfferResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['UserBookingRequestOffer'] = GqlSResolversParentTypes['UserBookingRequestOffer'],
> = ResolversObject<{
    activeCallRoom?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferCallRoom']>, ParentType, ContextType>;
    bookingRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    bookingRequestOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    callBookings?: Resolver<Array<GqlSResolversTypes['CookCallSlotBooking']>, ParentType, ContextType>;
    canRequestParticipantAmendment?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    configuredMenu?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferConfiguredMenu']>, ParentType, ContextType>;
    cook?: Resolver<GqlSResolversTypes['PublicCook'], ParentType, ContextType>;
    cookAccepted?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    cookDeclinationReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    cookId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    costBreakdown?: Resolver<GqlSResolversTypes['CostBreakdown'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    customerTestimonial?: Resolver<Maybe<GqlSResolversTypes['CustomerTestimonial']>, ParentType, ContextType>;
    menuPriceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    messages?: Resolver<Array<GqlSResolversTypes['HumanChatMessage']>, ParentType, ContextType>;
    participantAmendment?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferParticipantAmendment']>, ParentType, ContextType>;
    payment?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferPayment']>, ParentType, ContextType>;
    paymentDateTime?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    paymentProviderFeeCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    paymentStatus?: Resolver<GqlSResolversTypes['BookingRequestOfferPaymentStatus'], ParentType, ContextType>;
    payoutCentsCook?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    payoutDateTime?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    plannedPaymentPullDateTime?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    plannedPayoutDateTime?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    platformFeeCentsCook?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    platformFeeCentsCustomer?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    platformFeePercentCook?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    platformFeePercentCustomer?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    preparationsCompletedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    priceAutoAdjustReason?: Resolver<Maybe<GqlSResolversTypes['BookingRequestOfferPriceAutoAdjustReason']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['BookingRequestOfferStatus'], ParentType, ContextType>;
    suggestedMenus?: Resolver<Array<GqlSResolversTypes['PublicCookMenu']>, ParentType, ContextType>;
    testimonialMissing?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    totalCentsCustomer?: Resolver<Maybe<GqlSResolversTypes['Int']>, ParentType, ContextType>;
    totalWithoutDiscountsCentsCustomer?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    travelDistanceKm?: Resolver<Maybe<GqlSResolversTypes['Float']>, ParentType, ContextType>;
    travelExpensesCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    userAccepted?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    userDeclinationReason?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    userRequestedMenuAdjustments?: Resolver<Maybe<GqlSResolversTypes['Boolean']>, ParentType, ContextType>;
    userUnreadNotificationCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSUserBookingRequestOfferPriceImpactResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['UserBookingRequestOfferPriceImpact'] =
        GqlSResolversParentTypes['UserBookingRequestOfferPriceImpact'],
> = ResolversObject<{
    bookingRequestOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cookDisplay?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    menuPriceCentsAfter?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    menuPriceCentsBefore?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    payoutCentsCookAfter?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    payoutCentsCookBefore?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    totalWithoutDiscountsCentsCustomerAfter?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    totalWithoutDiscountsCentsCustomerBefore?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSUserBookingRequestOfferTravelImpactResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['UserBookingRequestOfferTravelImpact'] =
        GqlSResolversParentTypes['UserBookingRequestOfferTravelImpact'],
> = ResolversObject<{
    bookingRequestOfferId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    cookDisplay?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    travelDistanceKmAfter?: Resolver<GqlSResolversTypes['Float'], ParentType, ContextType>;
    travelDistanceKmBefore?: Resolver<GqlSResolversTypes['Float'], ParentType, ContextType>;
    travelExpensesCentsAfter?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    travelExpensesCentsBefore?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSUserBookingRequestPromoCodeResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['UserBookingRequestPromoCode'] = GqlSResolversParentTypes['UserBookingRequestPromoCode'],
> = ResolversObject<{
    amountCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    promoCodeId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    redeemCode?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
}>;

export type GqlSUserGiftCardResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['UserGiftCard'] = GqlSResolversParentTypes['UserGiftCard'],
> = ResolversObject<{
    balanceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    buyerEmail?: Resolver<GqlSResolversTypes['EmailAddress'], ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    expiresAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    giftCardId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    invoiceAddress?: Resolver<Maybe<GqlSResolversTypes['InvoiceAddress']>, ParentType, ContextType>;
    invoiceFileUpload?: Resolver<Maybe<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    invoiceFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
    message?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    occasion?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    originalBalanceCents?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
    paymentStatus?: Resolver<GqlSResolversTypes['GiftCardPaymentStatus'], ParentType, ContextType>;
    recipientName?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    redeemCode?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
    voucherFileUpload?: Resolver<Maybe<GqlSResolversTypes['FileUpload']>, ParentType, ContextType>;
    voucherFileUploadId?: Resolver<Maybe<GqlSResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type GqlSUserLegalAcceptanceResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['UserLegalAcceptance'] = GqlSResolversParentTypes['UserLegalAcceptance'],
> = ResolversObject<{
    pendingPrivacyPolicy?: Resolver<Maybe<GqlSResolversTypes['PublicLegalPrivacyPolicy']>, ParentType, ContextType>;
    pendingTermsAndConditions?: Resolver<Maybe<GqlSResolversTypes['PublicLegalTermsAndConditions']>, ParentType, ContextType>;
    required?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type GqlSUserMutationResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['UserMutation'] = GqlSResolversParentTypes['UserMutation'],
> = ResolversObject<{
    authPasskeyDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationAuthPasskeyDeleteArgs, 'authPasskeyId'>
    >;
    authPasskeyRegisterOptions?: Resolver<GqlSResolversTypes['JSON'], ParentType, ContextType>;
    authPasskeyRegisterVerify?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationAuthPasskeyRegisterVerifyArgs, 'response'>
    >;
    authTotpDisable?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationAuthTotpDisableArgs, 'code'>
    >;
    authTotpEnrollCancel?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    authTotpEnrollConfirm?: Resolver<
        GqlSResolversTypes['AuthTotpEnrollConfirmResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationAuthTotpEnrollConfirmArgs, 'code'>
    >;
    authTotpEnrollStart?: Resolver<GqlSResolversTypes['AuthTotpEnrollStartResult'], ParentType, ContextType>;
    bookingRequestCancel?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestCancelArgs, 'bookingRequestId' | 'reason'>
    >;
    bookingRequestChurnPromoCodeCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestChurnPromoCodeCreateArgs, 'bookingRequestId'>
    >;
    bookingRequestCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestCreateArgs, 'input'>
    >;
    bookingRequestDiscountUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestDiscountUpdateArgs, 'bookingRequestId'>
    >;
    bookingRequestOfferAccept?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferAcceptArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferCallCreate?: Resolver<
        GqlSResolversTypes['BookingRequestOfferCallTokenResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferCallCreateArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferCallJoin?: Resolver<
        GqlSResolversTypes['BookingRequestOfferCallTokenResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferCallJoinArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestOfferCallLeave?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferCallLeaveArgs, 'bookingRequestOfferCallRoomParticipantId'>
    >;
    bookingRequestOfferCallSlotCancel?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferCallSlotCancelArgs, 'cookCallSlotBookingId'>
    >;
    bookingRequestOfferCallSlotConfirm?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferCallSlotConfirmArgs, 'cookCallSlotBookingId'>
    >;
    bookingRequestOfferCallSlotDecline?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferCallSlotDeclineArgs, 'cookCallSlotBookingId'>
    >;
    bookingRequestOfferCallSlotRequest?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferCallSlotRequestArgs, 'bookingRequestOfferId' | 'startAt'>
    >;
    bookingRequestOfferChatMessageCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferChatMessageCreateArgs, 'bookingRequestOfferId' | 'message'>
    >;
    bookingRequestOfferChatMessageReactionUpsert?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferChatMessageReactionUpsertArgs, 'bookingRequestOfferEventId' | 'emoji'>
    >;
    bookingRequestOfferConfiguredMenuCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferConfiguredMenuCreateArgs, 'bookingRequestOfferId' | 'courseSelections' | 'menuId'>
    >;
    bookingRequestOfferDecline?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferDeclineArgs, 'bookingRequestOfferId' | 'reason'>
    >;
    bookingRequestOfferParticipantAmendmentCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferParticipantAmendmentCreateArgs, 'bookingRequestOfferId' | 'participants'>
    >;
    bookingRequestOfferPaymentStatusUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferPaymentStatusUpdateArgs, 'bookingRequestOfferId' | 'invoiceAddress'>
    >;
    bookingRequestOfferTestimonialCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferTestimonialCreateArgs, 'input'>
    >;
    bookingRequestOfferUnreadNotificationCountReset?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestOfferUnreadNotificationCountResetArgs, 'bookingRequestOfferId'>
    >;
    bookingRequestRequestRecall?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestRequestRecallArgs, 'bookingRequestId'>
    >;
    bookingRequestUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationBookingRequestUpdateArgs, 'bookingRequestId' | 'participants'>
    >;
    chatDelete?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationChatDeleteArgs, 'chatId'>
    >;
    chatInputCollectionRespond?: Resolver<
        Maybe<GqlSResolversTypes['ChatMessageCreateResult']>,
        ParentType,
        ContextType,
        RequireFields<
            GqlSUserMutationChatInputCollectionRespondArgs,
            'answers' | 'assistantOptions' | 'chatTurnId' | 'clientRequestId' | 'toolCallId'
        >
    >;
    chatMessageCreate?: Resolver<
        Maybe<GqlSResolversTypes['ChatMessageCreateResult']>,
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationChatMessageCreateArgs, 'assistantOptions' | 'clientRequestId' | 'message' | 'surface'>
    >;
    chatTitleUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationChatTitleUpdateArgs, 'chatId' | 'title'>
    >;
    chatToolApprovalRespond?: Resolver<
        Maybe<GqlSResolversTypes['ChatMessageCreateResult']>,
        ParentType,
        ContextType,
        RequireFields<
            GqlSUserMutationChatToolApprovalRespondArgs,
            'approvalId' | 'approved' | 'assistantOptions' | 'chatTurnId' | 'clientRequestId'
        >
    >;
    cook?: Resolver<GqlSResolversTypes['CookMutation'], ParentType, ContextType>;
    cookCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationCookCreateArgs, 'input'>
    >;
    emailAddressUpdateOtpRequest?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationEmailAddressUpdateOtpRequestArgs, 'emailAddress' | 'locale'>
    >;
    emailAddressUpdateOtpVerify?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationEmailAddressUpdateOtpVerifyArgs, 'code'>
    >;
    giftCardCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationGiftCardCreateArgs, 'input'>
    >;
    giftCardPay?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationGiftCardPayArgs, 'input'>
    >;
    giftCardPdfsRegenerate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationGiftCardPdfsRegenerateArgs, 'giftCardId'>
    >;
    supportRequestCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationSupportRequestCreateArgs, 'messageBody' | 'subject'>
    >;
    supportRequestMessageCreate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationSupportRequestMessageCreateArgs, 'message' | 'supportRequestId'>
    >;
    supportRequestUnreadNotificationCountReset?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationSupportRequestUnreadNotificationCountResetArgs, 'supportRequestId'>
    >;
    terminateSessions?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationTerminateSessionsArgs, 'sessionIds'>
    >;
    userAnonymize?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    userLegalAccept?: Resolver<GqlSResolversTypes['MutationResult'], ParentType, ContextType>;
    userUpdate?: Resolver<
        GqlSResolversTypes['MutationResult'],
        ParentType,
        ContextType,
        RequireFields<GqlSUserMutationUserUpdateArgs, 'user'>
    >;
}>;

export type GqlSUserSessionResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['UserSession'] = GqlSResolversParentTypes['UserSession'],
> = ResolversObject<{
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    isCurrent?: Resolver<GqlSResolversTypes['Boolean'], ParentType, ContextType>;
    lastInteractionAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    sessionId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    userAgent?: Resolver<Maybe<GqlSResolversTypes['String']>, ParentType, ContextType>;
}>;

export type GqlSUserSupportRequestResolvers<
    ContextType = any,
    ParentType extends GqlSResolversParentTypes['UserSupportRequest'] = GqlSResolversParentTypes['UserSupportRequest'],
> = ResolversObject<{
    bookingRequest?: Resolver<Maybe<GqlSResolversTypes['SupportRequestBookingRequestSummary']>, ParentType, ContextType>;
    createdAt?: Resolver<GqlSResolversTypes['DateTime'], ParentType, ContextType>;
    messages?: Resolver<Array<GqlSResolversTypes['HumanChatMessage']>, ParentType, ContextType>;
    resolvedAt?: Resolver<Maybe<GqlSResolversTypes['DateTime']>, ParentType, ContextType>;
    status?: Resolver<GqlSResolversTypes['SupportRequestStatus'], ParentType, ContextType>;
    subject?: Resolver<GqlSResolversTypes['String'], ParentType, ContextType>;
    supportRequestId?: Resolver<GqlSResolversTypes['ID'], ParentType, ContextType>;
    userUnreadNotificationCount?: Resolver<GqlSResolversTypes['Int'], ParentType, ContextType>;
}>;

export type GqlSResolvers<ContextType = any> = ResolversObject<{
    Admin?: GqlSAdminResolvers<ContextType>;
    AdminAiGeneration?: GqlSAdminAiGenerationResolvers<ContextType>;
    AdminAnalyticsBookingRequestFormFlow?: GqlSAdminAnalyticsBookingRequestFormFlowResolvers<ContextType>;
    AdminAnalyticsCookBookingRequestOfferFlow?: GqlSAdminAnalyticsCookBookingRequestOfferFlowResolvers<ContextType>;
    AdminAnalyticsFunnelStepStats?: GqlSAdminAnalyticsFunnelStepStatsResolvers<ContextType>;
    AdminAnalyticsSankeyLink?: GqlSAdminAnalyticsSankeyLinkResolvers<ContextType>;
    AdminAnalyticsSankeyNode?: GqlSAdminAnalyticsSankeyNodeResolvers<ContextType>;
    AdminAnalyticsSessionFunnelFlow?: GqlSAdminAnalyticsSessionFunnelFlowResolvers<ContextType>;
    AdminAssistantChat?: GqlSAdminAssistantChatResolvers<ContextType>;
    AdminBlogPost?: GqlSAdminBlogPostResolvers<ContextType>;
    AdminBookingRequest?: GqlSAdminBookingRequestResolvers<ContextType>;
    AdminBookingRequestCookInTravelRadius?: GqlSAdminBookingRequestCookInTravelRadiusResolvers<ContextType>;
    AdminBookingRequestCookOfferStat?: GqlSAdminBookingRequestCookOfferStatResolvers<ContextType>;
    AdminBookingRequestCreationMonthStat?: GqlSAdminBookingRequestCreationMonthStatResolvers<ContextType>;
    AdminBookingRequestOccasionStat?: GqlSAdminBookingRequestOccasionStatResolvers<ContextType>;
    AdminBookingRequestOffer?: GqlSAdminBookingRequestOfferResolvers<ContextType>;
    AdminBookingRequestOfferChatReviewAcknowledgeResult?: GqlSAdminBookingRequestOfferChatReviewAcknowledgeResultResolvers<ContextType>;
    AdminBookingRequestOfferEconomics?: GqlSAdminBookingRequestOfferEconomicsResolvers<ContextType>;
    AdminCall?: GqlSAdminCallResolvers<ContextType>;
    AdminCallCookStat?: GqlSAdminCallCookStatResolvers<ContextType>;
    AdminCallListItem?: GqlSAdminCallListItemResolvers<ContextType>;
    AdminCallParty?: GqlSAdminCallPartyResolvers<ContextType>;
    AdminCity?: GqlSAdminCityResolvers<ContextType>;
    AdminCityCook?: GqlSAdminCityCookResolvers<ContextType>;
    AdminCityTestimonial?: GqlSAdminCityTestimonialResolvers<ContextType>;
    AdminCook?: GqlSAdminCookResolvers<ContextType>;
    AdminCookFeaturedLanding?: GqlSAdminCookFeaturedLandingResolvers<ContextType>;
    AdminCookInTravelRadiusPreview?: GqlSAdminCookInTravelRadiusPreviewResolvers<ContextType>;
    AdminCookMeal?: GqlSAdminCookMealResolvers<ContextType>;
    AdminCookMenu?: GqlSAdminCookMenuResolvers<ContextType>;
    AdminCookMenuCourse?: GqlSAdminCookMenuCourseResolvers<ContextType>;
    AdminCookTestimonial?: GqlSAdminCookTestimonialResolvers<ContextType>;
    AdminCustomerTestimonial?: GqlSAdminCustomerTestimonialResolvers<ContextType>;
    AdminDatabaseSlowStatement?: GqlSAdminDatabaseSlowStatementResolvers<ContextType>;
    AdminFeatureToggle?: GqlSAdminFeatureToggleResolvers<ContextType>;
    AdminFeatureToggleUserOverride?: GqlSAdminFeatureToggleUserOverrideResolvers<ContextType>;
    AdminGiftCard?: GqlSAdminGiftCardResolvers<ContextType>;
    AdminGiftCardOccasionStat?: GqlSAdminGiftCardOccasionStatResolvers<ContextType>;
    AdminGiftCardSalesMonthStat?: GqlSAdminGiftCardSalesMonthStatResolvers<ContextType>;
    AdminLegalImprint?: GqlSAdminLegalImprintResolvers<ContextType>;
    AdminLegalPrivacyPolicy?: GqlSAdminLegalPrivacyPolicyResolvers<ContextType>;
    AdminLegalTermsAndConditions?: GqlSAdminLegalTermsAndConditionsResolvers<ContextType>;
    AdminLog?: GqlSAdminLogResolvers<ContextType>;
    AdminMutation?: GqlSAdminMutationResolvers<ContextType>;
    AdminObjectStorageObject?: GqlSAdminObjectStorageObjectResolvers<ContextType>;
    AdminObjectStorageObjectPage?: GqlSAdminObjectStorageObjectPageResolvers<ContextType>;
    AdminOccasion?: GqlSAdminOccasionResolvers<ContextType>;
    AdminOccasionCook?: GqlSAdminOccasionCookResolvers<ContextType>;
    AdminOccasionTestimonial?: GqlSAdminOccasionTestimonialResolvers<ContextType>;
    AdminOutboundEmail?: GqlSAdminOutboundEmailResolvers<ContextType>;
    AdminOutboundEmailPurposeStat?: GqlSAdminOutboundEmailPurposeStatResolvers<ContextType>;
    AdminOutboundEmailRecipientStat?: GqlSAdminOutboundEmailRecipientStatResolvers<ContextType>;
    AdminPartner?: GqlSAdminPartnerResolvers<ContextType>;
    AdminPartnerCook?: GqlSAdminPartnerCookResolvers<ContextType>;
    AdminPartnerTestimonial?: GqlSAdminPartnerTestimonialResolvers<ContextType>;
    AdminPromoCode?: GqlSAdminPromoCodeResolvers<ContextType>;
    AdminQueuedJob?: GqlSAdminQueuedJobResolvers<ContextType>;
    AdminResendEmailQuota?: GqlSAdminResendEmailQuotaResolvers<ContextType>;
    AdminResendUsage?: GqlSAdminResendUsageResolvers<ContextType>;
    AdminSession?: GqlSAdminSessionResolvers<ContextType>;
    AdminSessionEvent?: GqlSAdminSessionEventResolvers<ContextType>;
    AdminSupportRequest?: GqlSAdminSupportRequestResolvers<ContextType>;
    AdminTestimonial?: GqlSAdminTestimonialResolvers<ContextType>;
    AdminTimeBucket?: GqlSAdminTimeBucketResolvers<ContextType>;
    AdminUser?: GqlSAdminUserResolvers<ContextType>;
    AdminUserInsights?: GqlSAdminUserInsightsResolvers<ContextType>;
    AdminUserLocaleStat?: GqlSAdminUserLocaleStatResolvers<ContextType>;
    AdminUserPreferredCommunicationStat?: GqlSAdminUserPreferredCommunicationStatResolvers<ContextType>;
    AdminUserTimeZoneStat?: GqlSAdminUserTimeZoneStatResolvers<ContextType>;
    AdminUserUpcomingBirthday?: GqlSAdminUserUpcomingBirthdayResolvers<ContextType>;
    AdminWebPage?: GqlSAdminWebPageResolvers<ContextType>;
    AdminWhatsAppConversation?: GqlSAdminWhatsAppConversationResolvers<ContextType>;
    AuthEmailOtp?: GqlSAuthEmailOtpResolvers<ContextType>;
    AuthPasskey?: GqlSAuthPasskeyResolvers<ContextType>;
    AuthTimeBasedOneTimePassword?: GqlSAuthTimeBasedOneTimePasswordResolvers<ContextType>;
    AuthTotpChallenge?: GqlSAuthTotpChallengeResolvers<ContextType>;
    AuthTotpEnrollConfirmResult?: GqlSAuthTotpEnrollConfirmResultResolvers<ContextType>;
    AuthTotpEnrollStartResult?: GqlSAuthTotpEnrollStartResultResolvers<ContextType>;
    BookingRequestCookMenuEvaluation?: GqlSBookingRequestCookMenuEvaluationResolvers<ContextType>;
    BookingRequestCookMenuEvaluationGeneratedCourse?: GqlSBookingRequestCookMenuEvaluationGeneratedCourseResolvers<ContextType>;
    BookingRequestCookMenuEvaluationGeneratedMealOption?: GqlSBookingRequestCookMenuEvaluationGeneratedMealOptionResolvers<ContextType>;
    BookingRequestCookMenuEvaluationGeneratedMenu?: GqlSBookingRequestCookMenuEvaluationGeneratedMenuResolvers<ContextType>;
    BookingRequestCookMenuEvaluationMenu?: GqlSBookingRequestCookMenuEvaluationMenuResolvers<ContextType>;
    BookingRequestCookPoolDetails?: GqlSBookingRequestCookPoolDetailsResolvers<ContextType>;
    BookingRequestOfferCallRecording?: GqlSBookingRequestOfferCallRecordingResolvers<ContextType>;
    BookingRequestOfferCallRoom?: GqlSBookingRequestOfferCallRoomResolvers<ContextType>;
    BookingRequestOfferCallTokenResult?: GqlSBookingRequestOfferCallTokenResultResolvers<ContextType>;
    BookingRequestOfferCallTranscriptSegment?: GqlSBookingRequestOfferCallTranscriptSegmentResolvers<ContextType>;
    BookingRequestOfferConfiguredMenu?: GqlSBookingRequestOfferConfiguredMenuResolvers<ContextType>;
    BookingRequestOfferConfiguredMenuCourse?: GqlSBookingRequestOfferConfiguredMenuCourseResolvers<ContextType>;
    BookingRequestOfferConfiguredMenuMeal?: GqlSBookingRequestOfferConfiguredMenuMealResolvers<ContextType>;
    BookingRequestOfferParticipantAmendment?: GqlSBookingRequestOfferParticipantAmendmentResolvers<ContextType>;
    BookingRequestOfferParticipantAmendmentParticipant?: GqlSBookingRequestOfferParticipantAmendmentParticipantResolvers<ContextType>;
    BookingRequestOfferPayment?: GqlSBookingRequestOfferPaymentResolvers<ContextType>;
    BookingRequestParticipant?: GqlSBookingRequestParticipantResolvers<ContextType>;
    Chat?: GqlSChatResolvers<ContextType>;
    ChatMessage?: GqlSChatMessageResolvers<ContextType>;
    ChatMessageBookingRequestOfferEvent?: GqlSChatMessageBookingRequestOfferEventResolvers<ContextType>;
    ChatMessageCreateResult?: GqlSChatMessageCreateResultResolvers<ContextType>;
    ChatMessageDataPart?: GqlSChatMessageDataPartResolvers<ContextType>;
    ChatMessageFilePart?: GqlSChatMessageFilePartResolvers<ContextType>;
    ChatMessagePart?: GqlSChatMessagePartResolvers<ContextType>;
    ChatMessageReaction?: GqlSChatMessageReactionResolvers<ContextType>;
    ChatMessageReasoningPart?: GqlSChatMessageReasoningPartResolvers<ContextType>;
    ChatMessageSourceDocumentPart?: GqlSChatMessageSourceDocumentPartResolvers<ContextType>;
    ChatMessageSourceUrlPart?: GqlSChatMessageSourceUrlPartResolvers<ContextType>;
    ChatMessageTextPart?: GqlSChatMessageTextPartResolvers<ContextType>;
    ChatMessageToolPart?: GqlSChatMessageToolPartResolvers<ContextType>;
    ChatMessageUser?: GqlSChatMessageUserResolvers<ContextType>;
    ChatToolApproval?: GqlSChatToolApprovalResolvers<ContextType>;
    ChatToolDebug?: GqlSChatToolDebugResolvers<ContextType>;
    ChatTurn?: GqlSChatTurnResolvers<ContextType>;
    ChatTurnDebug?: GqlSChatTurnDebugResolvers<ContextType>;
    ChatTurnFailure?: GqlSChatTurnFailureResolvers<ContextType>;
    ChatTurnSnapshot?: GqlSChatTurnSnapshotResolvers<ContextType>;
    ChatTurnUpdate?: GqlSChatTurnUpdateResolvers<ContextType>;
    ChatTurnUpserted?: GqlSChatTurnUpsertedResolvers<ContextType>;
    ChatTurnUsage?: GqlSChatTurnUsageResolvers<ContextType>;
    CityTestimonial?: GqlSCityTestimonialResolvers<ContextType>;
    ContentSection?: GqlSContentSectionResolvers<ContextType>;
    ContentSectionContent?: GqlSContentSectionContentResolvers<ContextType>;
    ContentSectionCta?: GqlSContentSectionCtaResolvers<ContextType>;
    ContentSectionImage?: GqlSContentSectionImageResolvers<ContextType>;
    ContentSectionList?: GqlSContentSectionListResolvers<ContextType>;
    ContentSectionQa?: GqlSContentSectionQaResolvers<ContextType>;
    ContentSectionQaEntry?: GqlSContentSectionQaEntryResolvers<ContextType>;
    ContentSectionQuote?: GqlSContentSectionQuoteResolvers<ContextType>;
    Cook?: GqlSCookResolvers<ContextType>;
    CookBookingRequest?: GqlSCookBookingRequestResolvers<ContextType>;
    CookBookingRequestAvailable?: GqlSCookBookingRequestAvailableResolvers<ContextType>;
    CookBookingRequestCanceled?: GqlSCookBookingRequestCanceledResolvers<ContextType>;
    CookBookingRequestExpired?: GqlSCookBookingRequestExpiredResolvers<ContextType>;
    CookBookingRequestLookupResult?: GqlSCookBookingRequestLookupResultResolvers<ContextType>;
    CookBookingRequestNotFound?: GqlSCookBookingRequestNotFoundResolvers<ContextType>;
    CookBookingRequestOffer?: GqlSCookBookingRequestOfferResolvers<ContextType>;
    CookBookingRequestOfferAlreadyExists?: GqlSCookBookingRequestOfferAlreadyExistsResolvers<ContextType>;
    CookBookingRequestOfferContext?: GqlSCookBookingRequestOfferContextResolvers<ContextType>;
    CookBookingRequestTaken?: GqlSCookBookingRequestTakenResolvers<ContextType>;
    CookCallAvailabilityException?: GqlSCookCallAvailabilityExceptionResolvers<ContextType>;
    CookCallAvailabilityRule?: GqlSCookCallAvailabilityRuleResolvers<ContextType>;
    CookCallSlot?: GqlSCookCallSlotResolvers<ContextType>;
    CookCallSlotBooking?: GqlSCookCallSlotBookingResolvers<ContextType>;
    CookCallSlotBookingCustomer?: GqlSCookCallSlotBookingCustomerResolvers<ContextType>;
    CookMeal?: GqlSCookMealResolvers<ContextType>;
    CookMealRelationshipBookingRequestOffer?: GqlSCookMealRelationshipBookingRequestOfferResolvers<ContextType>;
    CookMealRelationshipMenu?: GqlSCookMealRelationshipMenuResolvers<ContextType>;
    CookMealRelationships?: GqlSCookMealRelationshipsResolvers<ContextType>;
    CookMenu?: GqlSCookMenuResolvers<ContextType>;
    CookMenuCourse?: GqlSCookMenuCourseResolvers<ContextType>;
    CookMenuCourseSuggestion?: GqlSCookMenuCourseSuggestionResolvers<ContextType>;
    CookMenuOfferContext?: GqlSCookMenuOfferContextResolvers<ContextType>;
    CookMenuSuggestion?: GqlSCookMenuSuggestionResolvers<ContextType>;
    CookMutation?: GqlSCookMutationResolvers<ContextType>;
    CookStripeAccountDetails?: GqlSCookStripeAccountDetailsResolvers<ContextType>;
    CookStripeBalanceTransaction?: GqlSCookStripeBalanceTransactionResolvers<ContextType>;
    CookStripeDashboardResult?: GqlSCookStripeDashboardResultResolvers<ContextType>;
    CookStripeOnboardingResult?: GqlSCookStripeOnboardingResultResolvers<ContextType>;
    CookStripeWallet?: GqlSCookStripeWalletResolvers<ContextType>;
    CookTestimonial?: GqlSCookTestimonialResolvers<ContextType>;
    CookTestimonialLowRatingAnswers?: GqlSCookTestimonialLowRatingAnswersResolvers<ContextType>;
    CookTravelOriginAddress?: GqlSCookTravelOriginAddressResolvers<ContextType>;
    CostBreakdown?: GqlSCostBreakdownResolvers<ContextType>;
    CostLineItem?: GqlSCostLineItemResolvers<ContextType>;
    CustomerTestimonial?: GqlSCustomerTestimonialResolvers<ContextType>;
    Date?: GraphQLScalarType;
    DateTime?: GraphQLScalarType;
    EmailAddress?: GraphQLScalarType;
    FileUpload?: GqlSFileUploadResolvers<ContextType>;
    GeoCoordinates?: GqlSGeoCoordinatesResolvers<ContextType>;
    GiftCard?: GqlSGiftCardResolvers<ContextType>;
    GiftCardPayment?: GqlSGiftCardPaymentResolvers<ContextType>;
    GiftCardPurchaseError?: GqlSGiftCardPurchaseErrorResolvers<ContextType>;
    HumanChatMessage?: GqlSHumanChatMessageResolvers<ContextType>;
    InvoiceAddress?: GqlSInvoiceAddressResolvers<ContextType>;
    JSON?: GraphQLScalarType;
    Latitude?: GraphQLScalarType;
    LocationSuggestion?: GqlSLocationSuggestionResolvers<ContextType>;
    Longitude?: GraphQLScalarType;
    Mutation?: GqlSMutationResolvers<ContextType>;
    MutationResult?: GqlSMutationResultResolvers<ContextType>;
    OccasionFormatsCard?: GqlSOccasionFormatsCardResolvers<ContextType>;
    OccasionFormatsSection?: GqlSOccasionFormatsSectionResolvers<ContextType>;
    OccasionPromo?: GqlSOccasionPromoResolvers<ContextType>;
    OccasionTestimonial?: GqlSOccasionTestimonialResolvers<ContextType>;
    PartnerPromo?: GqlSPartnerPromoResolvers<ContextType>;
    PartnerTestimonial?: GqlSPartnerTestimonialResolvers<ContextType>;
    PhoneNumber?: GraphQLScalarType;
    PublicBlogPost?: GqlSPublicBlogPostResolvers<ContextType>;
    PublicBlogPostQuery?: GqlSPublicBlogPostQueryResolvers<ContextType>;
    PublicCity?: GqlSPublicCityResolvers<ContextType>;
    PublicCityQuery?: GqlSPublicCityQueryResolvers<ContextType>;
    PublicCook?: GqlSPublicCookResolvers<ContextType>;
    PublicCookMeal?: GqlSPublicCookMealResolvers<ContextType>;
    PublicCookMenu?: GqlSPublicCookMenuResolvers<ContextType>;
    PublicCookMenuCourse?: GqlSPublicCookMenuCourseResolvers<ContextType>;
    PublicCookQuery?: GqlSPublicCookQueryResolvers<ContextType>;
    PublicCookRating?: GqlSPublicCookRatingResolvers<ContextType>;
    PublicLegal?: GqlSPublicLegalResolvers<ContextType>;
    PublicLegalImprint?: GqlSPublicLegalImprintResolvers<ContextType>;
    PublicLegalPrivacyPolicy?: GqlSPublicLegalPrivacyPolicyResolvers<ContextType>;
    PublicLegalTermsAndConditions?: GqlSPublicLegalTermsAndConditionsResolvers<ContextType>;
    PublicOccasion?: GqlSPublicOccasionResolvers<ContextType>;
    PublicOccasionQuery?: GqlSPublicOccasionQueryResolvers<ContextType>;
    PublicPartner?: GqlSPublicPartnerResolvers<ContextType>;
    PublicPartnerQuery?: GqlSPublicPartnerQueryResolvers<ContextType>;
    PublicUser?: GqlSPublicUserResolvers<ContextType>;
    PublicWebPage?: GqlSPublicWebPageResolvers<ContextType>;
    PublicWebPageQuery?: GqlSPublicWebPageQueryResolvers<ContextType>;
    Query?: GqlSQueryResolvers<ContextType>;
    Session?: GqlSSessionResolvers<ContextType>;
    SessionCookieSetting?: GqlSSessionCookieSettingResolvers<ContextType>;
    SessionDiscount?: GqlSSessionDiscountResolvers<ContextType>;
    Subscription?: GqlSSubscriptionResolvers<ContextType>;
    SupportRequestBookingRequestSummary?: GqlSSupportRequestBookingRequestSummaryResolvers<ContextType>;
    Testimonial?: GqlSTestimonialResolvers<ContextType>;
    TimeZone?: GraphQLScalarType;
    User?: GqlSUserResolvers<ContextType>;
    UserBookingRequest?: GqlSUserBookingRequestResolvers<ContextType>;
    UserBookingRequestGiftCard?: GqlSUserBookingRequestGiftCardResolvers<ContextType>;
    UserBookingRequestOffer?: GqlSUserBookingRequestOfferResolvers<ContextType>;
    UserBookingRequestOfferPriceImpact?: GqlSUserBookingRequestOfferPriceImpactResolvers<ContextType>;
    UserBookingRequestOfferTravelImpact?: GqlSUserBookingRequestOfferTravelImpactResolvers<ContextType>;
    UserBookingRequestPromoCode?: GqlSUserBookingRequestPromoCodeResolvers<ContextType>;
    UserGiftCard?: GqlSUserGiftCardResolvers<ContextType>;
    UserLegalAcceptance?: GqlSUserLegalAcceptanceResolvers<ContextType>;
    UserMutation?: GqlSUserMutationResolvers<ContextType>;
    UserSession?: GqlSUserSessionResolvers<ContextType>;
    UserSupportRequest?: GqlSUserSupportRequestResolvers<ContextType>;
}>;

type Properties<T> = {
    [K in keyof T]: z.ZodType<T[K], T[K] | undefined>;
};

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const GqlSAdminAiGenerationKindSchema: z.ZodType<
    | 'BOOKING_REQUEST_ADJUSTED_MESSAGE'
    | 'BOOKING_REQUEST_COOK_MENU_EVALUATION'
    | 'BOOKING_REQUEST_OFFER_CALL_RECORDING_SUMMARY'
    | 'BOOKING_REQUEST_OFFER_CALL_RECORDING_TRANSCRIPT'
    | 'CHAT_TITLE'
    | 'COOK_BIOGRAPHY_SUGGESTION'
    | 'COOK_BIOGRAPHY_SUMMARY'
    | 'COOK_MENU_SUGGESTION_FROM_INVENTORY'
    | 'COOK_MENU_SUGGESTION_FROM_TEXT'
    | 'COOK_MENU_TITLE_DESCRIPTION',
    | 'BOOKING_REQUEST_ADJUSTED_MESSAGE'
    | 'BOOKING_REQUEST_COOK_MENU_EVALUATION'
    | 'BOOKING_REQUEST_OFFER_CALL_RECORDING_SUMMARY'
    | 'BOOKING_REQUEST_OFFER_CALL_RECORDING_TRANSCRIPT'
    | 'CHAT_TITLE'
    | 'COOK_BIOGRAPHY_SUGGESTION'
    | 'COOK_BIOGRAPHY_SUMMARY'
    | 'COOK_MENU_SUGGESTION_FROM_INVENTORY'
    | 'COOK_MENU_SUGGESTION_FROM_TEXT'
    | 'COOK_MENU_TITLE_DESCRIPTION'
> = z.enum([
    'BOOKING_REQUEST_ADJUSTED_MESSAGE',
    'BOOKING_REQUEST_COOK_MENU_EVALUATION',
    'BOOKING_REQUEST_OFFER_CALL_RECORDING_SUMMARY',
    'BOOKING_REQUEST_OFFER_CALL_RECORDING_TRANSCRIPT',
    'CHAT_TITLE',
    'COOK_BIOGRAPHY_SUGGESTION',
    'COOK_BIOGRAPHY_SUMMARY',
    'COOK_MENU_SUGGESTION_FROM_INVENTORY',
    'COOK_MENU_SUGGESTION_FROM_TEXT',
    'COOK_MENU_TITLE_DESCRIPTION',
]);

export const GqlSAdminAiGenerationSortFieldSchema: z.ZodType<
    'createdAt' | 'kind' | 'modelId' | 'totalTokens',
    'createdAt' | 'kind' | 'modelId' | 'totalTokens'
> = z.enum(['createdAt', 'kind', 'modelId', 'totalTokens']);

export const GqlSAdminBookingRequestCookOfferStatSortFieldSchema: z.ZodType<
    'conversionCount' | 'offerCount',
    'conversionCount' | 'offerCount'
> = z.enum(['conversionCount', 'offerCount']);

export const GqlSAdminBookingRequestSortFieldSchema: z.ZodType<
    'createdAt' | 'dateTime' | 'occasion',
    'createdAt' | 'dateTime' | 'occasion'
> = z.enum(['createdAt', 'dateTime', 'occasion']);

export const GqlSAdminCallCookStatSortFieldSchema: z.ZodType<
    'completedSlotCount' | 'declinedCount' | 'pendingAwaitingCookCount' | 'roomCount',
    'completedSlotCount' | 'declinedCount' | 'pendingAwaitingCookCount' | 'roomCount'
> = z.enum(['completedSlotCount', 'declinedCount', 'pendingAwaitingCookCount', 'roomCount']);

export const GqlSAdminCallListItemKindSchema: z.ZodType<
    'CANCELED' | 'DECLINED' | 'LIVE' | 'PENDING' | 'RECENT_ROOM' | 'RECENT_SLOT' | 'UPCOMING',
    'CANCELED' | 'DECLINED' | 'LIVE' | 'PENDING' | 'RECENT_ROOM' | 'RECENT_SLOT' | 'UPCOMING'
> = z.enum(['CANCELED', 'DECLINED', 'LIVE', 'PENDING', 'RECENT_ROOM', 'RECENT_SLOT', 'UPCOMING']);

export const GqlSAdminCallTrafficSortFieldSchema: z.ZodType<'createdAt' | 'occurredAt', 'createdAt' | 'occurredAt'> = z.enum([
    'createdAt',
    'occurredAt',
]);

export const GqlSAdminCookFeaturedLandingKindSchema: z.ZodType<'CITY' | 'OCCASION' | 'PARTNER', 'CITY' | 'OCCASION' | 'PARTNER'> = z.enum([
    'CITY',
    'OCCASION',
    'PARTNER',
]);

export const GqlSAdminCookInventoryStatusSchema: z.ZodType<'DELETED' | 'DRAFT' | 'PUBLISHED', 'DELETED' | 'DRAFT' | 'PUBLISHED'> = z.enum([
    'DELETED',
    'DRAFT',
    'PUBLISHED',
]);

export const GqlSAdminCookMealImageFilterSchema: z.ZodType<
    'NOT_ON_PUBLIC_PAGE' | 'ON_PUBLIC_PAGE' | 'WITHOUT_IMAGE' | 'WITH_IMAGE',
    'NOT_ON_PUBLIC_PAGE' | 'ON_PUBLIC_PAGE' | 'WITHOUT_IMAGE' | 'WITH_IMAGE'
> = z.enum(['NOT_ON_PUBLIC_PAGE', 'ON_PUBLIC_PAGE', 'WITHOUT_IMAGE', 'WITH_IMAGE']);

export const GqlSAdminCookMealSortFieldSchema: z.ZodType<
    'createdAt' | 'deletedAt' | 'publishedAt' | 'title',
    'createdAt' | 'deletedAt' | 'publishedAt' | 'title'
> = z.enum(['createdAt', 'deletedAt', 'publishedAt', 'title']);

export const GqlSAdminCookMenuSortFieldSchema: z.ZodType<
    'createdAt' | 'deletedAt' | 'publishedAt' | 'title',
    'createdAt' | 'deletedAt' | 'publishedAt' | 'title'
> = z.enum(['createdAt', 'deletedAt', 'publishedAt', 'title']);

export const GqlSAdminCookPayoutBlockedReasonSchema: z.ZodType<
    'MISSING_STRIPE_ACCOUNT' | 'STRIPE_ACCOUNT_INACTIVE' | 'STRIPE_PAYOUTS_DISABLED',
    'MISSING_STRIPE_ACCOUNT' | 'STRIPE_ACCOUNT_INACTIVE' | 'STRIPE_PAYOUTS_DISABLED'
> = z.enum(['MISSING_STRIPE_ACCOUNT', 'STRIPE_ACCOUNT_INACTIVE', 'STRIPE_PAYOUTS_DISABLED']);

export const GqlSAdminGiftCardSortFieldSchema: z.ZodType<
    'buyerEmail' | 'createdAt' | 'originalBalanceCents',
    'buyerEmail' | 'createdAt' | 'originalBalanceCents'
> = z.enum(['buyerEmail', 'createdAt', 'originalBalanceCents']);

export const GqlSAdminLogLevelSchema: z.ZodType<'debug' | 'error' | 'info' | 'warn', 'debug' | 'error' | 'info' | 'warn'> = z.enum([
    'debug',
    'error',
    'info',
    'warn',
]);

export const GqlSAdminLogSortFieldSchema: z.ZodType<'createdAt' | 'message', 'createdAt' | 'message'> = z.enum(['createdAt', 'message']);

export const GqlSAdminOutboundEmailLifecycleStatusSchema: z.ZodType<
    'BOUNCED' | 'FAILED' | 'OPENED' | 'PENDING' | 'SENT',
    'BOUNCED' | 'FAILED' | 'OPENED' | 'PENDING' | 'SENT'
> = z.enum(['BOUNCED', 'FAILED', 'OPENED', 'PENDING', 'SENT']);

export const GqlSAdminOutboundEmailProviderSchema: z.ZodType<'console' | 'resend', 'console' | 'resend'> = z.enum(['console', 'resend']);

export const GqlSAdminOutboundEmailPurposeSchema: z.ZodType<
    | 'AUTH_EMAIL_OTP'
    | 'BOOKING_REQUEST_CANCELED'
    | 'BOOKING_REQUEST_COOK_NOTIFY'
    | 'BOOKING_REQUEST_CREATED'
    | 'BOOKING_REQUEST_OFFER_ACCEPTED'
    | 'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK'
    | 'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_CUSTOMER'
    | 'BOOKING_REQUEST_OFFER_CREATED'
    | 'BOOKING_REQUEST_OFFER_DECLINED'
    | 'BOOKING_REQUEST_OFFER_MENU_UPDATED'
    | 'BOOKING_REQUEST_OFFER_NOT_CHOSEN'
    | 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_ACCEPTED'
    | 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_DECLINED'
    | 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_REQUESTED'
    | 'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED'
    | 'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT'
    | 'BOOKING_REQUEST_UPDATED'
    | 'CALL_SLOT_BOOKING_CANCEL'
    | 'CALL_SLOT_BOOKING_CONFIRM'
    | 'CALL_SLOT_BOOKING_DECLINE'
    | 'CALL_SLOT_BOOKING_REMINDER'
    | 'CALL_SLOT_BOOKING_REQUEST'
    | 'COOK_APPROVED_BY_ADMIN'
    | 'EMAIL_ADDRESS_UPDATE_CONFIRM'
    | 'GIFT_CARD_PURCHASED'
    | 'SUPPORT_REQUEST_CREATED'
    | 'SUPPORT_REQUEST_MESSAGE_FROM_ADMIN'
    | 'SUPPORT_REQUEST_RESOLVED'
    | 'TESTIMONIAL_MEMORY_NUDGE_COOK'
    | 'TESTIMONIAL_MEMORY_NUDGE_CUSTOMER'
    | 'TESTIMONIAL_REMINDER_EVENING_COOK'
    | 'TESTIMONIAL_REMINDER_EVENING_CUSTOMER'
    | 'TESTIMONIAL_REMINDER_MORNING_COOK'
    | 'TESTIMONIAL_REMINDER_MORNING_CUSTOMER',
    | 'AUTH_EMAIL_OTP'
    | 'BOOKING_REQUEST_CANCELED'
    | 'BOOKING_REQUEST_COOK_NOTIFY'
    | 'BOOKING_REQUEST_CREATED'
    | 'BOOKING_REQUEST_OFFER_ACCEPTED'
    | 'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK'
    | 'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_CUSTOMER'
    | 'BOOKING_REQUEST_OFFER_CREATED'
    | 'BOOKING_REQUEST_OFFER_DECLINED'
    | 'BOOKING_REQUEST_OFFER_MENU_UPDATED'
    | 'BOOKING_REQUEST_OFFER_NOT_CHOSEN'
    | 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_ACCEPTED'
    | 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_DECLINED'
    | 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_REQUESTED'
    | 'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED'
    | 'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT'
    | 'BOOKING_REQUEST_UPDATED'
    | 'CALL_SLOT_BOOKING_CANCEL'
    | 'CALL_SLOT_BOOKING_CONFIRM'
    | 'CALL_SLOT_BOOKING_DECLINE'
    | 'CALL_SLOT_BOOKING_REMINDER'
    | 'CALL_SLOT_BOOKING_REQUEST'
    | 'COOK_APPROVED_BY_ADMIN'
    | 'EMAIL_ADDRESS_UPDATE_CONFIRM'
    | 'GIFT_CARD_PURCHASED'
    | 'SUPPORT_REQUEST_CREATED'
    | 'SUPPORT_REQUEST_MESSAGE_FROM_ADMIN'
    | 'SUPPORT_REQUEST_RESOLVED'
    | 'TESTIMONIAL_MEMORY_NUDGE_COOK'
    | 'TESTIMONIAL_MEMORY_NUDGE_CUSTOMER'
    | 'TESTIMONIAL_REMINDER_EVENING_COOK'
    | 'TESTIMONIAL_REMINDER_EVENING_CUSTOMER'
    | 'TESTIMONIAL_REMINDER_MORNING_COOK'
    | 'TESTIMONIAL_REMINDER_MORNING_CUSTOMER'
> = z.enum([
    'AUTH_EMAIL_OTP',
    'BOOKING_REQUEST_CANCELED',
    'BOOKING_REQUEST_COOK_NOTIFY',
    'BOOKING_REQUEST_CREATED',
    'BOOKING_REQUEST_OFFER_ACCEPTED',
    'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK',
    'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_CUSTOMER',
    'BOOKING_REQUEST_OFFER_CREATED',
    'BOOKING_REQUEST_OFFER_DECLINED',
    'BOOKING_REQUEST_OFFER_MENU_UPDATED',
    'BOOKING_REQUEST_OFFER_NOT_CHOSEN',
    'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_ACCEPTED',
    'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_DECLINED',
    'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_REQUESTED',
    'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED',
    'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT',
    'BOOKING_REQUEST_UPDATED',
    'CALL_SLOT_BOOKING_CANCEL',
    'CALL_SLOT_BOOKING_CONFIRM',
    'CALL_SLOT_BOOKING_DECLINE',
    'CALL_SLOT_BOOKING_REMINDER',
    'CALL_SLOT_BOOKING_REQUEST',
    'COOK_APPROVED_BY_ADMIN',
    'EMAIL_ADDRESS_UPDATE_CONFIRM',
    'GIFT_CARD_PURCHASED',
    'SUPPORT_REQUEST_CREATED',
    'SUPPORT_REQUEST_MESSAGE_FROM_ADMIN',
    'SUPPORT_REQUEST_RESOLVED',
    'TESTIMONIAL_MEMORY_NUDGE_COOK',
    'TESTIMONIAL_MEMORY_NUDGE_CUSTOMER',
    'TESTIMONIAL_REMINDER_EVENING_COOK',
    'TESTIMONIAL_REMINDER_EVENING_CUSTOMER',
    'TESTIMONIAL_REMINDER_MORNING_COOK',
    'TESTIMONIAL_REMINDER_MORNING_CUSTOMER',
]);

export const GqlSAdminOutboundEmailRelatedEntityTypeSchema: z.ZodType<
    'BOOKING_REQUEST' | 'BOOKING_REQUEST_OFFER' | 'COOK' | 'COOK_CALL_SLOT_BOOKING' | 'GIFT_CARD' | 'SUPPORT_REQUEST',
    'BOOKING_REQUEST' | 'BOOKING_REQUEST_OFFER' | 'COOK' | 'COOK_CALL_SLOT_BOOKING' | 'GIFT_CARD' | 'SUPPORT_REQUEST'
> = z.enum(['BOOKING_REQUEST', 'BOOKING_REQUEST_OFFER', 'COOK', 'COOK_CALL_SLOT_BOOKING', 'GIFT_CARD', 'SUPPORT_REQUEST']);

export const GqlSAdminOutboundEmailSortFieldSchema: z.ZodType<'createdAt' | 'subject' | 'toEmail', 'createdAt' | 'subject' | 'toEmail'> =
    z.enum(['createdAt', 'subject', 'toEmail']);

export const GqlSAdminPromoCodeSortFieldSchema: z.ZodType<
    'amountCents' | 'createdAt' | 'expiresAt' | 'redeemCode',
    'amountCents' | 'createdAt' | 'expiresAt' | 'redeemCode'
> = z.enum(['amountCents', 'createdAt', 'expiresAt', 'redeemCode']);

export const GqlSAdminQueuedJobStateSchema: z.ZodType<'ACTIVE' | 'CREATED' | 'RETRY', 'ACTIVE' | 'CREATED' | 'RETRY'> = z.enum([
    'ACTIVE',
    'CREATED',
    'RETRY',
]);

export const GqlSAdminSessionKindSchema: z.ZodType<'bot' | 'human', 'bot' | 'human'> = z.enum(['bot', 'human']);

export const GqlSAdminSessionSortFieldSchema: z.ZodType<
    'createdAt' | 'lastInteractionAt' | 'user' | 'userAgent',
    'createdAt' | 'lastInteractionAt' | 'user' | 'userAgent'
> = z.enum(['createdAt', 'lastInteractionAt', 'user', 'userAgent']);

export const GqlSAdminSupportRequestSortFieldSchema: z.ZodType<
    'bookingDateTime' | 'createdAt' | 'lastMessageAt',
    'bookingDateTime' | 'createdAt' | 'lastMessageAt'
> = z.enum(['bookingDateTime', 'createdAt', 'lastMessageAt']);

export const GqlSAdminTimeBucketGranularitySchema: z.ZodType<'day' | 'month' | 'week', 'day' | 'month' | 'week'> = z.enum([
    'day',
    'month',
    'week',
]);

export const GqlSAdminUserSortFieldSchema: z.ZodType<
    'createdAt' | 'emailAddress' | 'firstName' | 'lastName',
    'createdAt' | 'emailAddress' | 'firstName' | 'lastName'
> = z.enum(['createdAt', 'emailAddress', 'firstName', 'lastName']);

export const GqlSAdminUserTypeSchema: z.ZodType<'admin' | 'cook' | 'customer', 'admin' | 'cook' | 'customer'> = z.enum([
    'admin',
    'cook',
    'customer',
]);

export const GqlSBookingRequestOfferCallRecordingStatusSchema: z.ZodType<
    'COMPLETED' | 'EGRESS_COMPLETE' | 'FAILED' | 'PENDING' | 'TRANSCRIBING',
    'COMPLETED' | 'EGRESS_COMPLETE' | 'FAILED' | 'PENDING' | 'TRANSCRIBING'
> = z.enum(['COMPLETED', 'EGRESS_COMPLETE', 'FAILED', 'PENDING', 'TRANSCRIBING']);

export const GqlSBookingRequestOfferCallRoomStatusSchema: z.ZodType<'ACTIVE' | 'ENDED', 'ACTIVE' | 'ENDED'> = z.enum(['ACTIVE', 'ENDED']);

export const GqlSBookingRequestOfferPaymentDataTypeSchema: z.ZodType<'PAYMENT_INTENT' | 'SETUP_INTENT', 'PAYMENT_INTENT' | 'SETUP_INTENT'> =
    z.enum(['PAYMENT_INTENT', 'SETUP_INTENT']);

export const GqlSBookingRequestOfferPaymentStatusSchema: z.ZodType<
    'EMPTY' | 'FAILED' | 'PAYED' | 'PAYED_OUT_OF_SYSTEM' | 'SETUP' | 'TRANSFERRED',
    'EMPTY' | 'FAILED' | 'PAYED' | 'PAYED_OUT_OF_SYSTEM' | 'SETUP' | 'TRANSFERRED'
> = z.enum(['EMPTY', 'FAILED', 'PAYED', 'PAYED_OUT_OF_SYSTEM', 'SETUP', 'TRANSFERRED']);

export const GqlSBookingRequestOfferPriceAutoAdjustReasonSchema: z.ZodType<
    'PARTICIPANTS' | 'PARTICIPANTS_AND_TRAVEL' | 'TRAVEL' | 'UNKNOWN',
    'PARTICIPANTS' | 'PARTICIPANTS_AND_TRAVEL' | 'TRAVEL' | 'UNKNOWN'
> = z.enum(['PARTICIPANTS', 'PARTICIPANTS_AND_TRAVEL', 'TRAVEL', 'UNKNOWN']);

export const GqlSBookingRequestOfferStatusSchema: z.ZodType<
    | 'CANCELED'
    | 'COMPLETED'
    | 'COOK_DECLINED'
    | 'COOK_NEEDS_TO_ACCEPT'
    | 'EVENT_PENDING'
    | 'EXPIRED'
    | 'PAYMENT_PULL_PENDING'
    | 'USER_CHOOSE_DIFFERENT_OFFER'
    | 'USER_DECLINED'
    | 'USER_NEEDS_DEPOSIT_PAYMENT'
    | 'USER_NEEDS_TO_ACCEPT'
    | 'USER_REQUESTED_MENU_CHANGES',
    | 'CANCELED'
    | 'COMPLETED'
    | 'COOK_DECLINED'
    | 'COOK_NEEDS_TO_ACCEPT'
    | 'EVENT_PENDING'
    | 'EXPIRED'
    | 'PAYMENT_PULL_PENDING'
    | 'USER_CHOOSE_DIFFERENT_OFFER'
    | 'USER_DECLINED'
    | 'USER_NEEDS_DEPOSIT_PAYMENT'
    | 'USER_NEEDS_TO_ACCEPT'
    | 'USER_REQUESTED_MENU_CHANGES'
> = z.enum([
    'CANCELED',
    'COMPLETED',
    'COOK_DECLINED',
    'COOK_NEEDS_TO_ACCEPT',
    'EVENT_PENDING',
    'EXPIRED',
    'PAYMENT_PULL_PENDING',
    'USER_CHOOSE_DIFFERENT_OFFER',
    'USER_DECLINED',
    'USER_NEEDS_DEPOSIT_PAYMENT',
    'USER_NEEDS_TO_ACCEPT',
    'USER_REQUESTED_MENU_CHANGES',
]);

export const GqlSBookingRequestParticipantTypeSchema: z.ZodType<'ADULT' | 'DISCOUNTED', 'ADULT' | 'DISCOUNTED'> = z.enum([
    'ADULT',
    'DISCOUNTED',
]);

export const GqlSBookingRequestPriceClassTypeSchema: z.ZodType<'HIGH' | 'LOW' | 'MEDIUM', 'HIGH' | 'LOW' | 'MEDIUM'> = z.enum([
    'HIGH',
    'LOW',
    'MEDIUM',
]);

export const GqlSBookingRequestPublicationStatusSchema: z.ZodType<
    'PUBLICATION_APPROVED_BY_ADMIN' | 'PUBLICATION_AUTO_APPROVED' | 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
    'PUBLICATION_APPROVED_BY_ADMIN' | 'PUBLICATION_AUTO_APPROVED' | 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW'
> = z.enum(['PUBLICATION_APPROVED_BY_ADMIN', 'PUBLICATION_AUTO_APPROVED', 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW']);

export const GqlSBookingRequestStatusSchema: z.ZodType<
    | 'CANCELED'
    | 'COMPLETED'
    | 'DEPOSIT_PAYMENT_PENDING'
    | 'EVENT_PENDING'
    | 'EXPIRED'
    | 'OFFERS_WAITING_FOR_REVIEW'
    | 'PAYMENT_PULL_PENDING'
    | 'WAITING_FOR_OFFERS',
    | 'CANCELED'
    | 'COMPLETED'
    | 'DEPOSIT_PAYMENT_PENDING'
    | 'EVENT_PENDING'
    | 'EXPIRED'
    | 'OFFERS_WAITING_FOR_REVIEW'
    | 'PAYMENT_PULL_PENDING'
    | 'WAITING_FOR_OFFERS'
> = z.enum([
    'CANCELED',
    'COMPLETED',
    'DEPOSIT_PAYMENT_PENDING',
    'EVENT_PENDING',
    'EXPIRED',
    'OFFERS_WAITING_FOR_REVIEW',
    'PAYMENT_PULL_PENDING',
    'WAITING_FOR_OFFERS',
]);

export const GqlSChatMessageBookingRequestOfferEventTypeSchema: z.ZodType<
    | 'ADMIN_HANDED_OVER_CLOSED'
    | 'ADMIN_HANDED_OVER_TO_COOK'
    | 'ADMIN_PREPARATIONS_CLEARED'
    | 'COOK_ACCEPTED'
    | 'COOK_CALL_SLOT_CANCELLED'
    | 'COOK_CALL_SLOT_CONFIRMED'
    | 'COOK_CALL_SLOT_DECLINED'
    | 'COOK_CALL_SLOT_REQUESTED'
    | 'COOK_CHANGED_PRICE'
    | 'COOK_CREATED'
    | 'COOK_DECLINED'
    | 'COOK_PARTICIPANT_AMENDMENT_ACCEPTED'
    | 'COOK_PARTICIPANT_AMENDMENT_DECLINED'
    | 'COOK_PREPARATIONS_COMPLETED'
    | 'COOK_UPDATED_SUGGESTED_MENU'
    | 'SYSTEM_CHANGED_PRICE'
    | 'USER_ACCEPTED'
    | 'USER_CALL_SLOT_CANCELLED'
    | 'USER_CALL_SLOT_CONFIRMED'
    | 'USER_CALL_SLOT_DECLINED'
    | 'USER_CALL_SLOT_REQUESTED'
    | 'USER_CANCELLED'
    | 'USER_CONFIGURED_MENU'
    | 'USER_DATE_UPDATED'
    | 'USER_DECLINED'
    | 'USER_LOCATION_UPDATED'
    | 'USER_PARTICIPANTS_UPDATED'
    | 'USER_PARTICIPANT_AMENDMENT_REQUESTED'
    | 'USER_PREFERENCES_UPDATED'
    | 'USER_REQUESTED_MENU_CHANGES'
    | 'USER_RESTRICTIONS_UPDATED'
    | 'USER_TIME_UPDATED',
    | 'ADMIN_HANDED_OVER_CLOSED'
    | 'ADMIN_HANDED_OVER_TO_COOK'
    | 'ADMIN_PREPARATIONS_CLEARED'
    | 'COOK_ACCEPTED'
    | 'COOK_CALL_SLOT_CANCELLED'
    | 'COOK_CALL_SLOT_CONFIRMED'
    | 'COOK_CALL_SLOT_DECLINED'
    | 'COOK_CALL_SLOT_REQUESTED'
    | 'COOK_CHANGED_PRICE'
    | 'COOK_CREATED'
    | 'COOK_DECLINED'
    | 'COOK_PARTICIPANT_AMENDMENT_ACCEPTED'
    | 'COOK_PARTICIPANT_AMENDMENT_DECLINED'
    | 'COOK_PREPARATIONS_COMPLETED'
    | 'COOK_UPDATED_SUGGESTED_MENU'
    | 'SYSTEM_CHANGED_PRICE'
    | 'USER_ACCEPTED'
    | 'USER_CALL_SLOT_CANCELLED'
    | 'USER_CALL_SLOT_CONFIRMED'
    | 'USER_CALL_SLOT_DECLINED'
    | 'USER_CALL_SLOT_REQUESTED'
    | 'USER_CANCELLED'
    | 'USER_CONFIGURED_MENU'
    | 'USER_DATE_UPDATED'
    | 'USER_DECLINED'
    | 'USER_LOCATION_UPDATED'
    | 'USER_PARTICIPANTS_UPDATED'
    | 'USER_PARTICIPANT_AMENDMENT_REQUESTED'
    | 'USER_PREFERENCES_UPDATED'
    | 'USER_REQUESTED_MENU_CHANGES'
    | 'USER_RESTRICTIONS_UPDATED'
    | 'USER_TIME_UPDATED'
> = z.enum([
    'ADMIN_HANDED_OVER_CLOSED',
    'ADMIN_HANDED_OVER_TO_COOK',
    'ADMIN_PREPARATIONS_CLEARED',
    'COOK_ACCEPTED',
    'COOK_CALL_SLOT_CANCELLED',
    'COOK_CALL_SLOT_CONFIRMED',
    'COOK_CALL_SLOT_DECLINED',
    'COOK_CALL_SLOT_REQUESTED',
    'COOK_CHANGED_PRICE',
    'COOK_CREATED',
    'COOK_DECLINED',
    'COOK_PARTICIPANT_AMENDMENT_ACCEPTED',
    'COOK_PARTICIPANT_AMENDMENT_DECLINED',
    'COOK_PREPARATIONS_COMPLETED',
    'COOK_UPDATED_SUGGESTED_MENU',
    'SYSTEM_CHANGED_PRICE',
    'USER_ACCEPTED',
    'USER_CALL_SLOT_CANCELLED',
    'USER_CALL_SLOT_CONFIRMED',
    'USER_CALL_SLOT_DECLINED',
    'USER_CALL_SLOT_REQUESTED',
    'USER_CANCELLED',
    'USER_CONFIGURED_MENU',
    'USER_DATE_UPDATED',
    'USER_DECLINED',
    'USER_LOCATION_UPDATED',
    'USER_PARTICIPANTS_UPDATED',
    'USER_PARTICIPANT_AMENDMENT_REQUESTED',
    'USER_PREFERENCES_UPDATED',
    'USER_REQUESTED_MENU_CHANGES',
    'USER_RESTRICTIONS_UPDATED',
    'USER_TIME_UPDATED',
]);

export const GqlSChatMessageDeliveryStatusSchema: z.ZodType<
    'DELIVERED' | 'FAILED' | 'READ' | 'SENT',
    'DELIVERED' | 'FAILED' | 'READ' | 'SENT'
> = z.enum(['DELIVERED', 'FAILED', 'READ', 'SENT']);

export const GqlSChatMessagePartStateSchema: z.ZodType<'DONE' | 'STREAMING', 'DONE' | 'STREAMING'> = z.enum(['DONE', 'STREAMING']);

export const GqlSChatMessageRoleSchema: z.ZodType<'ASSISTANT' | 'USER', 'ASSISTANT' | 'USER'> = z.enum(['ASSISTANT', 'USER']);

export const GqlSChatMessageStatusSchema: z.ZodType<
    'CANCELLED' | 'COMPLETE' | 'FAILED' | 'PENDING' | 'STREAMING',
    'CANCELLED' | 'COMPLETE' | 'FAILED' | 'PENDING' | 'STREAMING'
> = z.enum(['CANCELLED', 'COMPLETE', 'FAILED', 'PENDING', 'STREAMING']);

export const GqlSChatSurfaceSchema: z.ZodType<'admin' | 'cook' | 'customer', 'admin' | 'cook' | 'customer'> = z.enum([
    'admin',
    'cook',
    'customer',
]);

export const GqlSChatToolApprovalStatusSchema: z.ZodType<'APPROVED' | 'DENIED' | 'REQUESTED', 'APPROVED' | 'DENIED' | 'REQUESTED'> = z.enum(
    ['APPROVED', 'DENIED', 'REQUESTED'],
);

export const GqlSChatToolStateSchema: z.ZodType<
    | 'APPROVAL_REQUESTED'
    | 'APPROVAL_RESPONDED'
    | 'INPUT_AVAILABLE'
    | 'INPUT_STREAMING'
    | 'OUTPUT_AVAILABLE'
    | 'OUTPUT_DENIED'
    | 'OUTPUT_ERROR',
    | 'APPROVAL_REQUESTED'
    | 'APPROVAL_RESPONDED'
    | 'INPUT_AVAILABLE'
    | 'INPUT_STREAMING'
    | 'OUTPUT_AVAILABLE'
    | 'OUTPUT_DENIED'
    | 'OUTPUT_ERROR'
> = z.enum([
    'APPROVAL_REQUESTED',
    'APPROVAL_RESPONDED',
    'INPUT_AVAILABLE',
    'INPUT_STREAMING',
    'OUTPUT_AVAILABLE',
    'OUTPUT_DENIED',
    'OUTPUT_ERROR',
]);

export const GqlSChatTurnStatusSchema: z.ZodType<
    'AWAITING_INPUT' | 'CANCELLED' | 'COMPLETE' | 'FAILED' | 'QUEUED' | 'RUNNING',
    'AWAITING_INPUT' | 'CANCELLED' | 'COMPLETE' | 'FAILED' | 'QUEUED' | 'RUNNING'
> = z.enum(['AWAITING_INPUT', 'CANCELLED', 'COMPLETE', 'FAILED', 'QUEUED', 'RUNNING']);

export const GqlSClientObservabilityKindSchema: z.ZodType<
    'GRAPHQL_ERROR' | 'ROUTE_ERROR' | 'WEB_VITAL',
    'GRAPHQL_ERROR' | 'ROUTE_ERROR' | 'WEB_VITAL'
> = z.enum(['GRAPHQL_ERROR', 'ROUTE_ERROR', 'WEB_VITAL']);

export const GqlSClientWebVitalNameSchema: z.ZodType<'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB', 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB'> =
    z.enum(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']);

export const GqlSContentListStyleSchema: z.ZodType<'BULLET' | 'NUMBERED', 'BULLET' | 'NUMBERED'> = z.enum(['BULLET', 'NUMBERED']);

export const GqlSContentSectionKindSchema: z.ZodType<
    'content' | 'cta' | 'image' | 'list' | 'qa' | 'quote',
    'content' | 'cta' | 'image' | 'list' | 'qa' | 'quote'
> = z.enum(['content', 'cta', 'image', 'list', 'qa', 'quote']);

export const GqlSCookBookingRequestOfferListBucketSchema: z.ZodType<
    'ACTIVE' | 'ARCHIVED' | 'COMPLETED',
    'ACTIVE' | 'ARCHIVED' | 'COMPLETED'
> = z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']);

export const GqlSCookCallAvailabilityExceptionTypeSchema: z.ZodType<'BLOCK' | 'OPEN', 'BLOCK' | 'OPEN'> = z.enum(['BLOCK', 'OPEN']);

export const GqlSCookCallSlotBookingActorSchema: z.ZodType<'COOK' | 'CUSTOMER', 'COOK' | 'CUSTOMER'> = z.enum(['COOK', 'CUSTOMER']);

export const GqlSCookCallSlotBookingStatusSchema: z.ZodType<
    'CANCELED' | 'COMPLETED' | 'CONFIRMED' | 'DECLINED' | 'PENDING',
    'CANCELED' | 'COMPLETED' | 'CONFIRMED' | 'DECLINED' | 'PENDING'
> = z.enum(['CANCELED', 'COMPLETED', 'CONFIRMED', 'DECLINED', 'PENDING']);

export const GqlSCookMenuSuggestionMealOptionTypeSchema: z.ZodType<'EXISTING_MEAL' | 'NEW_MEAL', 'EXISTING_MEAL' | 'NEW_MEAL'> = z.enum([
    'EXISTING_MEAL',
    'NEW_MEAL',
]);

export const GqlSCookStripeBalanceTransactionKindSchema: z.ZodType<
    'ADJUSTMENT' | 'FEE' | 'OTHER' | 'PAYMENT' | 'PAYOUT' | 'TRANSFER',
    'ADJUSTMENT' | 'FEE' | 'OTHER' | 'PAYMENT' | 'PAYOUT' | 'TRANSFER'
> = z.enum(['ADJUSTMENT', 'FEE', 'OTHER', 'PAYMENT', 'PAYOUT', 'TRANSFER']);

export const GqlSCookStripeBalanceTransactionStatusSchema: z.ZodType<'AVAILABLE' | 'PENDING', 'AVAILABLE' | 'PENDING'> = z.enum([
    'AVAILABLE',
    'PENDING',
]);

export const GqlSCookStripeDisabledReasonSchema: z.ZodType<
    'LISTED' | 'OTHER' | 'PAST_DUE' | 'PENDING_VERIFICATION' | 'REJECTED',
    'LISTED' | 'OTHER' | 'PAST_DUE' | 'PENDING_VERIFICATION' | 'REJECTED'
> = z.enum(['LISTED', 'OTHER', 'PAST_DUE', 'PENDING_VERIFICATION', 'REJECTED']);

export const GqlSCookStripeOnboardingKindSchema: z.ZodType<
    'ALREADY_COMPLETE' | 'NOT_APPROVED' | 'ONBOARDING_URL',
    'ALREADY_COMPLETE' | 'NOT_APPROVED' | 'ONBOARDING_URL'
> = z.enum(['ALREADY_COMPLETE', 'NOT_APPROVED', 'ONBOARDING_URL']);

export const GqlSCookStripeRequirementCategorySchema: z.ZodType<
    'BANK_ACCOUNT' | 'BUSINESS_DETAILS' | 'IDENTITY_VERIFICATION' | 'OTHER' | 'PERSONAL_DETAILS' | 'TERMS_OF_SERVICE',
    'BANK_ACCOUNT' | 'BUSINESS_DETAILS' | 'IDENTITY_VERIFICATION' | 'OTHER' | 'PERSONAL_DETAILS' | 'TERMS_OF_SERVICE'
> = z.enum(['BANK_ACCOUNT', 'BUSINESS_DETAILS', 'IDENTITY_VERIFICATION', 'OTHER', 'PERSONAL_DETAILS', 'TERMS_OF_SERVICE']);

export const GqlSCookStripeStatusSchema: z.ZodType<
    'ACTIVE_WAS_RESET' | 'COMPLETED' | 'EMPTY' | 'PREPARED',
    'ACTIVE_WAS_RESET' | 'COMPLETED' | 'EMPTY' | 'PREPARED'
> = z.enum(['ACTIVE_WAS_RESET', 'COMPLETED', 'EMPTY', 'PREPARED']);

export const GqlSFeatureToggleKeySchema: z.ZodType<
    | 'AI_BOOKING_REQUEST_MESSAGE'
    | 'AI_MENU_EVALUATION'
    | 'ASSISTANT_COOK'
    | 'ASSISTANT_CUSTOMER'
    | 'BOOKING_REQUEST_OFFER_CHAT_REACTIONS'
    | 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT'
    | 'BOOKING_REQUEST_RESTRICTIONS'
    | 'COOK_BIOGRAPHY_AI_WRITE'
    | 'COOK_WALLET_STRIPE_BALANCE'
    | 'PUBLICATION_MEALS'
    | 'PUBLICATION_MENUS'
    | 'WHATSAPP_ENGLISH_TEMPLATES',
    | 'AI_BOOKING_REQUEST_MESSAGE'
    | 'AI_MENU_EVALUATION'
    | 'ASSISTANT_COOK'
    | 'ASSISTANT_CUSTOMER'
    | 'BOOKING_REQUEST_OFFER_CHAT_REACTIONS'
    | 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT'
    | 'BOOKING_REQUEST_RESTRICTIONS'
    | 'COOK_BIOGRAPHY_AI_WRITE'
    | 'COOK_WALLET_STRIPE_BALANCE'
    | 'PUBLICATION_MEALS'
    | 'PUBLICATION_MENUS'
    | 'WHATSAPP_ENGLISH_TEMPLATES'
> = z.enum([
    'AI_BOOKING_REQUEST_MESSAGE',
    'AI_MENU_EVALUATION',
    'ASSISTANT_COOK',
    'ASSISTANT_CUSTOMER',
    'BOOKING_REQUEST_OFFER_CHAT_REACTIONS',
    'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT',
    'BOOKING_REQUEST_RESTRICTIONS',
    'COOK_BIOGRAPHY_AI_WRITE',
    'COOK_WALLET_STRIPE_BALANCE',
    'PUBLICATION_MEALS',
    'PUBLICATION_MENUS',
    'WHATSAPP_ENGLISH_TEMPLATES',
]);

export const GqlSGiftCardPaymentStatusSchema: z.ZodType<'PAYED' | 'PREPARED', 'PAYED' | 'PREPARED'> = z.enum(['PAYED', 'PREPARED']);

export const GqlSGiftCardPurchaseErrorCodeSchema: z.ZodType<'RECAPTCHA_FAILED', 'RECAPTCHA_FAILED'> = z.enum(['RECAPTCHA_FAILED']);

export const GqlSLocaleSchema: z.ZodType<'de' | 'en', 'de' | 'en'> = z.enum(['de', 'en']);

export const GqlSSortDirectionSchema: z.ZodType<'ASC' | 'DESC', 'ASC' | 'DESC'> = z.enum(['ASC', 'DESC']);

export const GqlSSupportRequestStatusSchema: z.ZodType<'OPEN' | 'RESOLVED', 'OPEN' | 'RESOLVED'> = z.enum(['OPEN', 'RESOLVED']);

export const GqlSTestimonialPublicationStatusSchema: z.ZodType<'PENDING_REVIEW' | 'PUBLISHED', 'PENDING_REVIEW' | 'PUBLISHED'> = z.enum([
    'PENDING_REVIEW',
    'PUBLISHED',
]);

export const GqlSTestimonialTypeSchema: z.ZodType<'COOK' | 'CUSTOMER', 'COOK' | 'CUSTOMER'> = z.enum(['COOK', 'CUSTOMER']);

export const GqlSUserPreferredCommunicationSchema: z.ZodType<
    'CALL' | 'E_MAIL' | 'SMS' | 'WHATS_APP',
    'CALL' | 'E_MAIL' | 'SMS' | 'WHATS_APP'
> = z.enum(['CALL', 'E_MAIL', 'SMS', 'WHATS_APP']);

export const GqlSUserStatusSchema: z.ZodType<'ACTIVE' | 'ANONYMIZED' | 'BANNED', 'ACTIVE' | 'ANONYMIZED' | 'BANNED'> = z.enum([
    'ACTIVE',
    'ANONYMIZED',
    'BANNED',
]);

export const GqlSWebPageKeySchema: z.ZodType<
    | 'ABOUT_US'
    | 'ADMINISTRATION'
    | 'BLOG_POSTS'
    | 'BOOKING_REQUEST'
    | 'BOOKING_REQUEST_CHAT'
    | 'BOOKING_REQUEST_FORM'
    | 'CHEFS'
    | 'CHEF_SIGN_UP'
    | 'CITIES'
    | 'GIFT_CARD'
    | 'HOW_TO_BECOME_A_CHEF'
    | 'IMPRINT'
    | 'LANDING'
    | 'OCCASIONS'
    | 'PARTNERS'
    | 'PRIVACY_POLICY'
    | 'PROFILE'
    | 'SIGN_IN'
    | 'TERMS_AND_CONDITIONS',
    | 'ABOUT_US'
    | 'ADMINISTRATION'
    | 'BLOG_POSTS'
    | 'BOOKING_REQUEST'
    | 'BOOKING_REQUEST_CHAT'
    | 'BOOKING_REQUEST_FORM'
    | 'CHEFS'
    | 'CHEF_SIGN_UP'
    | 'CITIES'
    | 'GIFT_CARD'
    | 'HOW_TO_BECOME_A_CHEF'
    | 'IMPRINT'
    | 'LANDING'
    | 'OCCASIONS'
    | 'PARTNERS'
    | 'PRIVACY_POLICY'
    | 'PROFILE'
    | 'SIGN_IN'
    | 'TERMS_AND_CONDITIONS'
> = z.enum([
    'ABOUT_US',
    'ADMINISTRATION',
    'BLOG_POSTS',
    'BOOKING_REQUEST',
    'BOOKING_REQUEST_CHAT',
    'BOOKING_REQUEST_FORM',
    'CHEFS',
    'CHEF_SIGN_UP',
    'CITIES',
    'GIFT_CARD',
    'HOW_TO_BECOME_A_CHEF',
    'IMPRINT',
    'LANDING',
    'OCCASIONS',
    'PARTNERS',
    'PRIVACY_POLICY',
    'PROFILE',
    'SIGN_IN',
    'TERMS_AND_CONDITIONS',
]);

export function GqlSAdminAiGenerationCriterionSchema(): z.ZodType<GqlSAdminAiGenerationCriterion> {
    return z.object({
        kinds: z.array(GqlSAdminAiGenerationKindSchema),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        sortDirection: GqlSSortDirectionSchema.nullish(),
        sortField: GqlSAdminAiGenerationSortFieldSchema.nullish(),
        take: z.number().default(25),
    });
}

export function GqlSAdminAssistantChatCriterionSchema(): z.ZodType<GqlSAdminAssistantChatCriterion> {
    return z.object({
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        surface: GqlSChatSurfaceSchema.nullish(),
        take: z.number().default(25),
        userIds: z.array(z.string()).nullish(),
    });
}

export function GqlSAdminBookingRequestCreateSchema(): z.ZodObject<Properties<GqlSAdminBookingRequestCreate>> {
    return z.object({
        cookIds: z.array(z.string()),
        dateTime: z.date(),
        exactEventAddress: GqlSAdminBookingRequestExactEventAddressInputSchema(),
        occasion: z.string(),
        originalMessage: z.string(),
        participants: z.array(z.lazy(() => GqlSUserBookingRequestParticipantCreateSchema())),
        preferences: z.array(z.string()),
        userId: z.string(),
    }) as z.ZodObject<Properties<GqlSAdminBookingRequestCreate>>;
}

export function GqlSAdminBookingRequestCriterionSchema(): z.ZodType<GqlSAdminBookingRequestCriterion> {
    return z.object({
        bookingRequestIds: z.array(z.string()).nullish(),
        cookIds: z.array(z.string()).nullish(),
        createdAtFrom: z.date().nullish(),
        createdAtTo: z.date().nullish(),
        notifiedOnly: z.boolean().nullish(),
        promoCodeId: z.string().nullish(),
        publicationStatuses: z.array(GqlSBookingRequestPublicationStatusSchema).nullish(),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        sortDirection: GqlSSortDirectionSchema.nullish(),
        sortField: GqlSAdminBookingRequestSortFieldSchema.nullish(),
        statuses: z.array(GqlSBookingRequestStatusSchema).nullish(),
        take: z.number().default(25),
        userIds: z.array(z.string()).nullish(),
    });
}

export function GqlSAdminBookingRequestExactEventAddressInputSchema(): z.ZodObject<
    Properties<GqlSAdminBookingRequestExactEventAddressInput>
> {
    return z.object({
        addressLine1: z.string(),
        addressLine2: z.string(),
        city: z.string(),
        country: z.string(),
        displayText: z.string(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        postCode: z.string(),
        state: z.string(),
    });
}

export function GqlSAdminBookingRequestOfferCreateSchema(): z.ZodObject<Properties<GqlSAdminBookingRequestOfferCreate>> {
    return z.object({
        bookingRequestId: z.string(),
        cookAccepted: z.boolean().nullish(),
        cookId: z.string(),
        createdAt: z.date().nullish(),
        menuPriceCents: z.number(),
        message: z.string().nullish(),
        notifyCustomer: z.boolean(),
        paymentDateTime: z.date().nullish(),
        payoutDateTime: z.date().nullish(),
        plannedPayoutDateTime: z.date().nullish(),
        travelDistanceKm: z.number().nullish(),
        travelExpensesCents: z.number(),
        userAccepted: z.boolean().nullish(),
    });
}

export function GqlSAdminBookingRequestOfferCriterionSchema(): z.ZodType<GqlSAdminBookingRequestOfferCriterion> {
    return z.object({
        cookIds: z.array(z.string()).nullish(),
        hasAdminChatReviewPending: z.boolean().nullish(),
        paymentStatuses: z.array(GqlSBookingRequestOfferPaymentStatusSchema).nullish(),
        plannedPayoutDateTimeTo: z.date().nullish(),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        take: z.number().default(25),
    });
}

export function GqlSAdminBookingRequestOfferHandoverSchema(): z.ZodObject<Properties<GqlSAdminBookingRequestOfferHandover>> {
    return z.object({
        bookingRequestOfferId: z.string(),
        confirmOutOfSystemMoneyHandled: z.boolean().nullish(),
        cookId: z.string(),
        copyChatMessages: z.boolean(),
        copyConfiguredMenu: z.boolean(),
        copyPrice: z.boolean(),
        copyScheduleTimestamps: z.boolean(),
        menuPriceCents: z.number().nullish(),
        paymentDateTime: z.date().nullish(),
        plannedPaymentPullDateTime: z.date().nullish(),
        plannedPayoutDateTime: z.date().nullish(),
        travelDistanceKm: z.number().nullish(),
        travelExpensesCents: z.number().nullish(),
    });
}

export function GqlSAdminBookingRequestOfferUpdateSchema(): z.ZodObject<Properties<GqlSAdminBookingRequestOfferUpdate>> {
    return z.object({
        cookAccepted: z.boolean().nullish(),
        menuPriceCents: z.number().nullish(),
        paymentDateTime: z.date().nullish(),
        payoutDateTime: z.date().nullish(),
        plannedPayoutDateTime: z.date().nullish(),
        travelDistanceKm: z.number().nullish(),
        travelExpensesCents: z.number().nullish(),
        userAccepted: z.boolean().nullish(),
    });
}

export function GqlSAdminBookingRequestUpdateSchema(): z.ZodObject<Properties<GqlSAdminBookingRequestUpdate>> {
    return z.object({
        adjustedMessage: z.string().nullish(),
        createdAt: z.date().nullish(),
        dateTime: z.date().nullish(),
        exactEventAddress: GqlSAdminBookingRequestExactEventAddressInputSchema().nullish(),
        expiresAt: z.date().nullish(),
        occasion: z.string().nullish(),
        originalMessage: z.string().nullish(),
        participants: z.array(z.lazy(() => GqlSUserBookingRequestParticipantCreateSchema())).nullish(),
        priceClassType: GqlSBookingRequestPriceClassTypeSchema.nullish(),
    }) as z.ZodObject<Properties<GqlSAdminBookingRequestUpdate>>;
}

export function GqlSAdminCallTrafficCriterionSchema(): z.ZodType<GqlSAdminCallTrafficCriterion> {
    return z.object({
        cookIds: z.array(z.string()).nullish(),
        initiators: z.array(GqlSCookCallSlotBookingActorSchema).nullish(),
        kinds: z.array(GqlSAdminCallListItemKindSchema).nullish(),
        range: z.lazy(() => GqlSDateTimeRangeSchema().nullish()),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        sortDirection: GqlSSortDirectionSchema.nullish(),
        sortField: GqlSAdminCallTrafficSortFieldSchema.nullish(),
        take: z.number().default(25),
        userIds: z.array(z.string()).nullish(),
    });
}

export function GqlSAdminCookMealCriterionSchema(): z.ZodType<GqlSAdminCookMealCriterion> {
    return z.object({
        cookIds: z.array(z.string()).nullish(),
        imageFilter: GqlSAdminCookMealImageFilterSchema.nullish(),
        includeDeleted: z.boolean().default(true),
        mealIds: z.array(z.string()).nullish(),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        sortDirection: GqlSSortDirectionSchema.nullish(),
        sortField: GqlSAdminCookMealSortFieldSchema.nullish(),
        status: GqlSAdminCookInventoryStatusSchema.nullish(),
        take: z.number().default(25),
    });
}

export function GqlSAdminCookMenuCriterionSchema(): z.ZodType<GqlSAdminCookMenuCriterion> {
    return z.object({
        cookIds: z.array(z.string()).nullish(),
        includeDeleted: z.boolean().default(true),
        menuIds: z.array(z.string()).nullish(),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        sortDirection: GqlSSortDirectionSchema.nullish(),
        sortField: GqlSAdminCookMenuSortFieldSchema.nullish(),
        status: GqlSAdminCookInventoryStatusSchema.nullish(),
        take: z.number().default(25),
    });
}

export function GqlSAdminCookTestimonialCreateSchema(): z.ZodObject<Properties<GqlSAdminCookTestimonialCreate>> {
    return z.object({
        authorName: z.string().nullish(),
        body: z.string().nullish(),
        bookingRequestOfferId: z.string().nullish(),
        cookId: z.string(),
        imageFileUploadIds: z.array(z.string()).nullish(),
        location: z.string().nullish(),
        occasion: z.string().nullish(),
        rating: z.number().nullish(),
    });
}

export function GqlSAdminCookTestimonialCriterionSchema(): z.ZodType<GqlSAdminCookTestimonialCriterion> {
    return z.object({
        cookIds: z.array(z.string()).nullish(),
        skip: z.number().default(0),
        take: z.number().default(100),
    });
}

export function GqlSAdminCookTestimonialUpdateSchema(): z.ZodObject<Properties<GqlSAdminCookTestimonialUpdate>> {
    return z.object({
        authorName: z.string().nullish(),
        body: z.string().nullish(),
        location: z.string().nullish(),
        occasion: z.string().nullish(),
        rating: z.number().nullish(),
    });
}

export function GqlSAdminCustomerTestimonialCreateSchema(): z.ZodObject<Properties<GqlSAdminCustomerTestimonialCreate>> {
    return z.object({
        authorName: z.string().nullish(),
        body: z.string(),
        bookingRequestOfferId: z.string().nullish(),
        imageFileUploadIds: z.array(z.string()).nullish(),
        location: z.string().nullish(),
        occasion: z.string().nullish(),
        rating: z.number().nullish(),
        userId: z.string(),
    });
}

export function GqlSAdminCustomerTestimonialCriterionSchema(): z.ZodType<GqlSAdminCustomerTestimonialCriterion> {
    return z.object({
        cookIds: z.array(z.string()).nullish(),
        skip: z.number().default(0),
        take: z.number().default(100),
    });
}

export function GqlSAdminCustomerTestimonialUpdateSchema(): z.ZodObject<Properties<GqlSAdminCustomerTestimonialUpdate>> {
    return z.object({
        authorName: z.string().nullish(),
        body: z.string().nullish(),
        location: z.string().nullish(),
        occasion: z.string().nullish(),
        rating: z.number().nullish(),
    });
}

export function GqlSAdminGiftCardCriterionSchema(): z.ZodType<GqlSAdminGiftCardCriterion> {
    return z.object({
        giftCardIds: z.array(z.string()).nullish(),
        paymentStatuses: z.array(GqlSGiftCardPaymentStatusSchema),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        sortDirection: GqlSSortDirectionSchema.nullish(),
        sortField: GqlSAdminGiftCardSortFieldSchema.nullish(),
        take: z.number().default(25),
    });
}

export function GqlSAdminLegalDocumentDraftInputSchema(): z.ZodObject<Properties<GqlSAdminLegalDocumentDraftInput>> {
    return z.object({
        bodyDe: z.string(),
        changeSummaryDe: z.string(),
    });
}

export function GqlSAdminLogCriterionSchema(): z.ZodType<GqlSAdminLogCriterion> {
    return z.object({
        levels: z.array(GqlSAdminLogLevelSchema),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        sortDirection: GqlSSortDirectionSchema.nullish(),
        sortField: GqlSAdminLogSortFieldSchema.nullish(),
        take: z.number().default(25),
    });
}

export function GqlSAdminObjectStorageObjectCriterionSchema(): z.ZodObject<Properties<GqlSAdminObjectStorageObjectCriterion>> {
    return z.object({
        continuationToken: z.string().nullish(),
        prefix: z.string().nullish(),
        take: z.number().nullish(),
    });
}

export function GqlSAdminOutboundEmailCriterionSchema(): z.ZodType<GqlSAdminOutboundEmailCriterion> {
    return z.object({
        lifecycleStatuses: z.array(GqlSAdminOutboundEmailLifecycleStatusSchema).nullish(),
        purposes: z.array(GqlSAdminOutboundEmailPurposeSchema),
        relatedEntityId: z.string().nullish(),
        relatedEntityType: GqlSAdminOutboundEmailRelatedEntityTypeSchema.nullish(),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        sortDirection: GqlSSortDirectionSchema.nullish(),
        sortField: GqlSAdminOutboundEmailSortFieldSchema.nullish(),
        take: z.number().default(25),
        userIds: z.array(z.string()).nullish(),
    });
}

export function GqlSAdminPromoCodeCreateSchema(): z.ZodObject<Properties<GqlSAdminPromoCodeCreate>> {
    return z.object({
        amountCents: z.number(),
        expiresAt: z.date(),
        minimumTotalAmountCustomerCents: z.number().nullish(),
        redeemCode: z.string(),
    });
}

export function GqlSAdminPromoCodeCriterionSchema(): z.ZodType<GqlSAdminPromoCodeCriterion> {
    return z.object({
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        sortDirection: GqlSSortDirectionSchema.nullish(),
        sortField: GqlSAdminPromoCodeSortFieldSchema.nullish(),
        take: z.number().default(25),
    });
}

export function GqlSAdminPromoCodeUpdateSchema(): z.ZodObject<Properties<GqlSAdminPromoCodeUpdate>> {
    return z.object({
        expiresAt: z.date(),
        promoCodeId: z.string(),
    });
}

export function GqlSAdminSessionCriterionSchema(): z.ZodType<GqlSAdminSessionCriterion> {
    return z.object({
        kinds: z.array(GqlSAdminSessionKindSchema),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        sortDirection: GqlSSortDirectionSchema.nullish(),
        sortField: GqlSAdminSessionSortFieldSchema.nullish(),
        take: z.number().default(25),
        userIds: z.array(z.string()).nullish(),
    });
}

export function GqlSAdminSessionEventCriterionSchema(): z.ZodType<GqlSAdminSessionEventCriterion> {
    return z.object({
        sessionIds: z.array(z.string()).nullish(),
        skip: z.number().default(0),
        take: z.number().default(50),
        types: z.array(z.string()).nullish(),
        userIds: z.array(z.string()).nullish(),
    });
}

export function GqlSAdminSupportRequestCriterionSchema(): z.ZodType<GqlSAdminSupportRequestCriterion> {
    return z.object({
        hasAdminUnread: z.boolean().nullish(),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        sortField: GqlSAdminSupportRequestSortFieldSchema.nullish(),
        statuses: z.array(GqlSSupportRequestStatusSchema).nullish(),
        supportRequestIds: z.array(z.string()).nullish(),
        take: z.number().default(25),
        unreadFirst: z.boolean().default(true).nullish(),
    });
}

export function GqlSAdminUserCreateSchema(): z.ZodType<GqlSAdminUserCreate> {
    return z.object({
        asAdmin: z.boolean().default(false),
        birthDate: z.string(),
        cook: GqlSCookCreateSchema().nullish(),
        emailAddress: z.email(),
        firstName: z.string(),
        lastName: z.string(),
        locale: GqlSLocaleSchema.nullish(),
        phoneNumber: z.string(),
        preferredCommunication: GqlSUserPreferredCommunicationSchema,
        timeZone: z.string().nullish(),
    }) as z.ZodType<GqlSAdminUserCreate>;
}

export function GqlSAdminUserCriterionSchema(): z.ZodType<GqlSAdminUserCriterion> {
    return z.object({
        isApprovedByAdmin: z.boolean().nullish(),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        sortDirection: GqlSSortDirectionSchema.nullish(),
        sortField: GqlSAdminUserSortFieldSchema.nullish(),
        status: GqlSUserStatusSchema.nullish(),
        take: z.number().default(25),
        types: z.array(GqlSAdminUserTypeSchema),
        userIds: z.array(z.string()).nullish(),
    });
}

export function GqlSAdminWebPageUpdateSchema(): z.ZodObject<Properties<GqlSAdminWebPageUpdate>> {
    return z.object({
        descriptionDe: z.string(),
        descriptionEn: z.string(),
        titleDe: z.string(),
        titleEn: z.string(),
    });
}

export function GqlSAdminWhatsAppConversationCriterionSchema(): z.ZodType<GqlSAdminWhatsAppConversationCriterion> {
    return z.object({
        hasAdminUnread: z.boolean().nullish(),
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        take: z.number().default(25),
        userId: z.string().nullish(),
    });
}

export function GqlSBlogPostUpsertSchema(): z.ZodObject<Properties<GqlSBlogPostUpsert>> {
    return z.object({
        blogPostId: z.string().nullish(),
        descriptionDe: z.string(),
        descriptionEn: z.string(),
        headlineDe: z.string(),
        headlineEn: z.string(),
        heroImageFileUploadId: z.string().nullish(),
        pathName: z.string(),
        publishedAt: z.date().nullish(),
        sections: z.array(GqlSContentSectionInputSchema()),
        subHeadlineDe: z.string(),
        subHeadlineEn: z.string(),
        titleDe: z.string(),
        titleEn: z.string(),
    }) as z.ZodObject<Properties<GqlSBlogPostUpsert>>;
}

export function GqlSBookingRequestOfferConfiguredMenuCourseInputSchema(): z.ZodObject<
    Properties<GqlSBookingRequestOfferConfiguredMenuCourseInput>
> {
    return z.object({
        meals: z.array(GqlSBookingRequestOfferConfiguredMenuMealInputSchema()),
        title: z.string(),
    }) as z.ZodObject<Properties<GqlSBookingRequestOfferConfiguredMenuCourseInput>>;
}

export function GqlSBookingRequestOfferConfiguredMenuCourseSelectionInputSchema(): z.ZodObject<
    Properties<GqlSBookingRequestOfferConfiguredMenuCourseSelectionInput>
> {
    return z.object({
        courseId: z.string(),
        mealIds: z.array(z.string()),
    });
}

export function GqlSBookingRequestOfferConfiguredMenuInputSchema(): z.ZodObject<Properties<GqlSBookingRequestOfferConfiguredMenuInput>> {
    return z.object({
        courses: z.array(GqlSBookingRequestOfferConfiguredMenuCourseInputSchema()),
        description: z.string(),
        title: z.string(),
    }) as z.ZodObject<Properties<GqlSBookingRequestOfferConfiguredMenuInput>>;
}

export function GqlSBookingRequestOfferConfiguredMenuMealInputSchema(): z.ZodObject<
    Properties<GqlSBookingRequestOfferConfiguredMenuMealInput>
> {
    return z.object({
        mealDescription: z.string(),
        mealImageUrl: z.string().nullish(),
        mealTitle: z.string(),
    });
}

export function GqlSBookingRequestOfferCreateSchema(): z.ZodObject<Properties<GqlSBookingRequestOfferCreate>> {
    return z.object({
        bookingRequestId: z.string(),
        menuPriceCents: z.number(),
        message: z.string().nullish(),
        suggestedMenuIds: z.array(z.string()),
    });
}

export function GqlSBookingRequestOfferPriceUpdateSchema(): z.ZodObject<Properties<GqlSBookingRequestOfferPriceUpdate>> {
    return z.object({
        bookingRequestOfferId: z.string(),
        menuPriceCents: z.number(),
    });
}

export function GqlSBookingRequestOfferSuggestedMenusUpdateSchema(): z.ZodObject<Properties<GqlSBookingRequestOfferSuggestedMenusUpdate>> {
    return z.object({
        bookingRequestOfferId: z.string(),
        suggestedMenuIds: z.array(z.string()),
    });
}

export function GqlSChatAssistantOptionsSchema(): z.ZodObject<Properties<GqlSChatAssistantOptions>> {
    return z.object({
        requireToolCallApprovals: z.boolean(),
    });
}

export function GqlSCityUpsertSchema(): z.ZodObject<Properties<GqlSCityUpsert>> {
    return z.object({
        cityId: z.string().nullish(),
        descriptionDe: z.string(),
        descriptionEn: z.string(),
        firstSectionBodyDe: z.string(),
        firstSectionBodyEn: z.string(),
        firstSectionHeadlineDe: z.string(),
        firstSectionHeadlineEn: z.string(),
        firstSectionImageFileUploadId: z.string().nullish(),
        headlineDe: z.string(),
        headlineEn: z.string(),
        heroImageFileUploadId: z.string().nullish(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        nameDe: z.string(),
        nameEn: z.string(),
        pathName: z.string(),
        publishedAt: z.date().nullish(),
        sections: z.array(GqlSContentSectionInputSchema()),
        subHeadlineDe: z.string(),
        subHeadlineEn: z.string(),
        titleDe: z.string(),
        titleEn: z.string(),
    }) as z.ZodObject<Properties<GqlSCityUpsert>>;
}

export function GqlSClientObservabilityReportInputSchema(): z.ZodObject<Properties<GqlSClientObservabilityReportInput>> {
    return z.object({
        kind: GqlSClientObservabilityKindSchema,
        message: z.string().nullish(),
        operationName: z.string().nullish(),
        path: z.string().nullish(),
        routeId: z.string().nullish(),
        value: z.number().nullish(),
        vitalName: GqlSClientWebVitalNameSchema.nullish(),
    });
}

export function GqlSContentSectionInputSchema(): z.ZodObject<Properties<GqlSContentSectionInput>> {
    return z.object({
        attributionDe: z.string().nullish(),
        attributionEn: z.string().nullish(),
        bodyDe: z.string().nullish(),
        bodyEn: z.string().nullish(),
        buttonLabelDe: z.string().nullish(),
        buttonLabelEn: z.string().nullish(),
        entries: z.array(z.lazy(() => GqlSContentSectionQaEntryInputSchema())).nullish(),
        headlineDe: z.string().nullish(),
        headlineEn: z.string().nullish(),
        href: z.string().nullish(),
        imageFileUploadId: z.string().nullish(),
        imageFirst: z.boolean().nullish(),
        itemsDe: z.array(z.string()).nullish(),
        itemsEn: z.array(z.string()).nullish(),
        kind: GqlSContentSectionKindSchema,
        quoteDe: z.string().nullish(),
        quoteEn: z.string().nullish(),
        sectionId: z.string(),
        style: GqlSContentListStyleSchema.nullish(),
        subtitleDe: z.string().nullish(),
        subtitleEn: z.string().nullish(),
        titleDe: z.string().nullish(),
        titleEn: z.string().nullish(),
    }) as z.ZodObject<Properties<GqlSContentSectionInput>>;
}

export function GqlSContentSectionQaEntryInputSchema(): z.ZodObject<Properties<GqlSContentSectionQaEntryInput>> {
    return z.object({
        answerDe: z.string(),
        answerEn: z.string().nullish(),
        entryId: z.string(),
        questionDe: z.string(),
        questionEn: z.string().nullish(),
    });
}

export function GqlSCookBookingRequestFindManyCriterionSchema(): z.ZodObject<Properties<GqlSCookBookingRequestFindManyCriterion>> {
    return z.object({
        onlyDeclined: z.boolean().nullish(),
    });
}

export function GqlSCookBookingRequestOfferFindManyCriterionSchema(): z.ZodObject<
    Properties<GqlSCookBookingRequestOfferFindManyCriterion>
> {
    return z.object({
        bucket: GqlSCookBookingRequestOfferListBucketSchema.nullish(),
    });
}

export function GqlSCookBookingRequestOfferTestimonialCreateSchema(): z.ZodObject<
    Properties<GqlSCookBookingRequestOfferTestimonialCreate>
> {
    return z.object({
        authorName: z.string().nullish(),
        body: z.string().nullish(),
        bookingRequestOfferId: z.string(),
        imageFileUploadIds: z.array(z.string()).nullish(),
        location: z.string().nullish(),
        lowRatingAnswers: GqlSCookTestimonialLowRatingAnswersInputSchema().nullish(),
        occasion: z.string().nullish(),
        rating: z.number().nullish(),
    }) as z.ZodObject<Properties<GqlSCookBookingRequestOfferTestimonialCreate>>;
}

export function GqlSCookCallAvailabilityExceptionCreateSchema(): z.ZodObject<Properties<GqlSCookCallAvailabilityExceptionCreate>> {
    return z.object({
        date: z.string(),
        endMinuteOfDay: z.number().nullish(),
        startMinuteOfDay: z.number().nullish(),
        type: GqlSCookCallAvailabilityExceptionTypeSchema,
    });
}

export function GqlSCookCallAvailabilityRuleCreateSchema(): z.ZodObject<Properties<GqlSCookCallAvailabilityRuleCreate>> {
    return z.object({
        dayOfWeek: z.number(),
        endMinuteOfDay: z.number(),
        startMinuteOfDay: z.number(),
    });
}

export function GqlSCookCallSlotBookingCriterionSchema(): z.ZodObject<Properties<GqlSCookCallSlotBookingCriterion>> {
    return z.object({
        from: z.date().nullish(),
        statuses: z.array(GqlSCookCallSlotBookingStatusSchema).nullish(),
        to: z.date().nullish(),
    });
}

export function GqlSCookCreateSchema(): z.ZodObject<Properties<GqlSCookCreate>> {
    return z.object({
        biography: z.string().nullish(),
        cookingPhilosophy: z.string().nullish(),
        cuisineStyle: z.string().nullish(),
        exactTravelOriginAddress: z.string(),
        maximumTravelDistance: z.number(),
        travelExpensesAmount: z.number(),
    });
}

export function GqlSCookMealCreateSchema(): z.ZodObject<Properties<GqlSCookMealCreate>> {
    return z.object({
        description: z.string().nullish(),
        title: z.string(),
    });
}

export function GqlSCookMealCriterionSchema(): z.ZodObject<Properties<GqlSCookMealCriterion>> {
    return z.object({
        searchText: z.string().nullish(),
    });
}

export function GqlSCookMealUpdateSchema(): z.ZodObject<Properties<GqlSCookMealUpdate>> {
    return z.object({
        description: z.string().nullish(),
        imageFileUploadId: z.string().nullish(),
        publishedAt: z.date().nullish(),
        title: z.string().nullish(),
    });
}

export function GqlSCookMenuCourseInputSchema(): z.ZodObject<Properties<GqlSCookMenuCourseInput>> {
    return z.object({
        mealIds: z.array(z.string()),
        mealSelectionLimit: z.number().nullish(),
        title: z.string(),
    });
}

export function GqlSCookMenuCriterionSchema(): z.ZodObject<Properties<GqlSCookMenuCriterion>> {
    return z.object({
        searchText: z.string().nullish(),
    });
}

export function GqlSCookMenuUpdateSchema(): z.ZodObject<Properties<GqlSCookMenuUpdate>> {
    return z.object({
        courses: z.array(GqlSCookMenuCourseInputSchema()).nullish(),
        description: z.string().nullish(),
        publishedAt: z.date().nullish(),
        title: z.string().nullish(),
    }) as z.ZodObject<Properties<GqlSCookMenuUpdate>>;
}

export function GqlSCookTestimonialLowRatingAnswersInputSchema(): z.ZodObject<Properties<GqlSCookTestimonialLowRatingAnswersInput>> {
    return z.object({
        additionalFeedback: z.string().nullish(),
        whatWentWrong: z.string().nullish(),
        wouldRecommend: z.boolean().nullish(),
    });
}

export function GqlSCookUpdateSchema(): z.ZodObject<Properties<GqlSCookUpdate>> {
    return z.object({
        biography: z.string().nullish(),
        biographySummary: z.string().nullish(),
        callDurationMinutes: z.number().nullish(),
        callSchedulingEnabled: z.boolean().nullish(),
        cookingPhilosophy: z.string().nullish(),
        cuisineStyle: z.string().nullish(),
        exactTravelOriginAddress: z.string().nullish(),
        isVisible: z.boolean().nullish(),
        logoFileUploadId: z.string().nullish(),
        maximumParticipants: z.number().nullish(),
        maximumPriceAmount: z.number().nullish(),
        maximumTravelDistance: z.number().nullish(),
        minimumParticipants: z.number().nullish(),
        minimumPriceAmount: z.number().nullish(),
        stageName: z.string().nullish(),
        travelExpensesAmount: z.number().nullish(),
    });
}

export function GqlSDateTimeRangeSchema(): z.ZodObject<Properties<GqlSDateTimeRange>> {
    return z.object({
        endDateTime: z.date(),
        startDateTime: z.date(),
    });
}

export function GqlSGeoCoordinatesInputSchema(): z.ZodObject<Properties<GqlSGeoCoordinatesInput>> {
    return z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
    });
}

export function GqlSGiftCardCreateSchema(): z.ZodObject<Properties<GqlSGiftCardCreate>> {
    return z.object({
        balanceCents: z.number(),
        locale: GqlSLocaleSchema,
        message: z.string(),
        occasion: z.string(),
        recaptchaToken: z.string(),
        recipientName: z.string(),
    });
}

export function GqlSGiftCardPaySchema(): z.ZodObject<Properties<GqlSGiftCardPay>> {
    return z.object({
        giftCardId: z.string(),
        invoiceAddress: GqlSInvoiceAddressInputSchema(),
    }) as z.ZodObject<Properties<GqlSGiftCardPay>>;
}

export function GqlSInvoiceAddressInputSchema(): z.ZodObject<Properties<GqlSInvoiceAddressInput>> {
    return z.object({
        city: z.string(),
        companyName: z.string(),
        country: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        line1: z.string(),
        line2: z.string(),
        postalCode: z.string(),
    });
}

export function GqlSOccasionFormatsCardInputSchema(): z.ZodObject<Properties<GqlSOccasionFormatsCardInput>> {
    return z.object({
        bodyDe: z.string(),
        bodyEn: z.string(),
        fact1De: z.string(),
        fact1En: z.string(),
        fact2De: z.string(),
        fact2En: z.string(),
        fact3De: z.string(),
        fact3En: z.string(),
        imageFileUploadId: z.string().nullish(),
        titleDe: z.string(),
        titleEn: z.string(),
    });
}

export function GqlSOccasionFormatsSectionInputSchema(): z.ZodObject<Properties<GqlSOccasionFormatsSectionInput>> {
    return z.object({
        cards: z.array(GqlSOccasionFormatsCardInputSchema()),
        subtitleDe: z.string(),
        subtitleEn: z.string(),
        titleDe: z.string(),
        titleEn: z.string(),
    }) as z.ZodObject<Properties<GqlSOccasionFormatsSectionInput>>;
}

export function GqlSOccasionUpsertSchema(): z.ZodObject<Properties<GqlSOccasionUpsert>> {
    return z.object({
        descriptionDe: z.string(),
        descriptionEn: z.string(),
        firstSectionBodyDe: z.string(),
        firstSectionBodyEn: z.string(),
        firstSectionHeadlineDe: z.string(),
        firstSectionHeadlineEn: z.string(),
        firstSectionImageFileUploadId: z.string().nullish(),
        formatsSection: GqlSOccasionFormatsSectionInputSchema(),
        headlineDe: z.string(),
        headlineEn: z.string(),
        heroImageFileUploadId: z.string().nullish(),
        name: z.string(),
        occasionId: z.string().nullish(),
        pathName: z.string(),
        promoCodeId: z.string().nullish(),
        publishedAt: z.date().nullish(),
        sections: z.array(GqlSContentSectionInputSchema()),
        subHeadlineDe: z.string(),
        subHeadlineEn: z.string(),
        titleDe: z.string(),
        titleEn: z.string(),
    }) as z.ZodObject<Properties<GqlSOccasionUpsert>>;
}

export function GqlSPartnerUpsertSchema(): z.ZodObject<Properties<GqlSPartnerUpsert>> {
    return z.object({
        descriptionDe: z.string(),
        descriptionEn: z.string(),
        firstSectionBodyDe: z.string(),
        firstSectionBodyEn: z.string(),
        firstSectionCtaUrl: z.string().nullish(),
        firstSectionHeadlineDe: z.string(),
        firstSectionHeadlineEn: z.string(),
        firstSectionImageFileUploadId: z.string().nullish(),
        firstSectionImageOverlay: z.boolean(),
        headlineDe: z.string(),
        headlineEn: z.string(),
        heroImageFileUploadId: z.string().nullish(),
        heroImageOverlay: z.boolean(),
        howItWorksAlternativeMedia: z.boolean(),
        name: z.string(),
        partnerId: z.string().nullish(),
        pathName: z.string(),
        promoCodeId: z.string().nullish(),
        publishedAt: z.date().nullish(),
        sections: z.array(GqlSContentSectionInputSchema()),
        subHeadlineDe: z.string(),
        subHeadlineEn: z.string(),
        titleDe: z.string(),
        titleEn: z.string(),
    }) as z.ZodObject<Properties<GqlSPartnerUpsert>>;
}

export function GqlSPublicCookFindManyCriterionSchema(): z.ZodObject<Properties<GqlSPublicCookFindManyCriterion>> {
    return z.object({
        geoCoordinates: GqlSGeoCoordinatesInputSchema().nullish(),
        searchText: z.string().nullish(),
    }) as z.ZodObject<Properties<GqlSPublicCookFindManyCriterion>>;
}

export function GqlSSessionWebPageInteractionCreateInputSchema(): z.ZodObject<Properties<GqlSSessionWebPageInteractionCreateInput>> {
    return z.object({
        area: z.string(),
        bookingRequestId: z.string().nullish(),
        interaction: z.unknown(),
        webPageKey: GqlSWebPageKeySchema,
    });
}

export function GqlSSessionWebPageVisitCreateInputSchema(): z.ZodObject<Properties<GqlSSessionWebPageVisitCreateInput>> {
    return z.object({
        blogPostId: z.string().nullish(),
        bookingRequestId: z.string().nullish(),
        cityId: z.string().nullish(),
        cookId: z.string().nullish(),
        occasionId: z.string().nullish(),
        partnerId: z.string().nullish(),
        path: z.string().nullish(),
        webPageKey: GqlSWebPageKeySchema,
    });
}

export function GqlSTestimonialJunctionEntryInputSchema(): z.ZodObject<Properties<GqlSTestimonialJunctionEntryInput>> {
    return z.object({
        testimonialId: z.string(),
        testimonialType: GqlSTestimonialTypeSchema,
    });
}

export function GqlSUserAssistantChatCriterionSchema(): z.ZodType<GqlSUserAssistantChatCriterion> {
    return z.object({
        searchText: z.string().nullish(),
        skip: z.number().default(0),
        surface: GqlSChatSurfaceSchema.nullish(),
        take: z.number().default(25),
    });
}

export function GqlSUserBookingRequestCreateSchema(): z.ZodObject<Properties<GqlSUserBookingRequestCreate>> {
    return z.object({
        dateTime: z.date(),
        exactEventAddress: GqlSUserBookingRequestExactEventAddressInputSchema(),
        occasion: z.string(),
        originalMessage: z.string(),
        participants: z.array(z.lazy(() => GqlSUserBookingRequestParticipantCreateSchema())),
        preferences: z.array(z.string()),
        priceClassType: GqlSBookingRequestPriceClassTypeSchema,
        redeemCode: z.string().nullish(),
    }) as z.ZodObject<Properties<GqlSUserBookingRequestCreate>>;
}

export function GqlSUserBookingRequestExactEventAddressInputSchema(): z.ZodObject<
    Properties<GqlSUserBookingRequestExactEventAddressInput>
> {
    return z.object({
        addressLine1: z.string(),
        addressLine2: z.string(),
        city: z.string(),
        country: z.string(),
        displayText: z.string(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        postCode: z.string(),
        state: z.string(),
    });
}

export function GqlSUserBookingRequestOfferTestimonialCreateSchema(): z.ZodObject<
    Properties<GqlSUserBookingRequestOfferTestimonialCreate>
> {
    return z.object({
        authorName: z.string().nullish(),
        body: z.string(),
        bookingRequestOfferId: z.string(),
        imageFileUploadIds: z.array(z.string()).nullish(),
        location: z.string().nullish(),
        occasion: z.string().nullish(),
        rating: z.number().nullish(),
    });
}

export function GqlSUserBookingRequestParticipantCreateSchema(): z.ZodObject<Properties<GqlSUserBookingRequestParticipantCreate>> {
    return z.object({
        name: z.string(),
        restrictions: z.array(z.string()),
        type: GqlSBookingRequestParticipantTypeSchema,
    });
}

export function GqlSUserCreateSchema(): z.ZodObject<Properties<GqlSUserCreate>> {
    return z.object({
        birthDate: z.string().nullish(),
        cook: GqlSCookCreateSchema().nullish(),
        firstName: z.string(),
        lastName: z.string(),
        locale: GqlSLocaleSchema,
        phoneNumber: z.string().nullish(),
        preferredCommunication: GqlSUserPreferredCommunicationSchema.nullish(),
        timeZone: z.string(),
    }) as z.ZodObject<Properties<GqlSUserCreate>>;
}

export function GqlSUserUpdateSchema(): z.ZodObject<Properties<GqlSUserUpdate>> {
    return z.object({
        birthDate: z.string().nullish(),
        firstName: z.string().nullish(),
        lastName: z.string().nullish(),
        locale: GqlSLocaleSchema.nullish(),
        phoneNumber: z.string().nullish(),
        preferredCommunication: GqlSUserPreferredCommunicationSchema.nullish(),
        profilePictureFileUploadId: z.string().nullish(),
        timeZone: z.string().nullish(),
    });
}
