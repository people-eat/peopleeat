import {
    DateResolver,
    DateTimeResolver,
    EmailAddressResolver,
    JSONResolver,
    LatitudeResolver,
    LongitudeResolver,
    PhoneNumberResolver,
    TimeZoneResolver,
} from 'graphql-scalars';

import { adminBlogPostDelete } from '../commands/adminBlogPostDelete';
import { adminBlogPostUpsert } from '../commands/adminBlogPostUpsert';
import { adminBookingRequestCancel } from '../commands/adminBookingRequestCancel';
import { adminBookingRequestCooksNotify } from '../commands/adminBookingRequestCooksNotify';
import { adminBookingRequestCreate } from '../commands/adminBookingRequestCreate';
import { adminBookingRequestDiscountUpdate } from '../commands/adminBookingRequestDiscountUpdate';
import { adminBookingRequestOfferCallCreate } from '../commands/adminBookingRequestOfferCallCreate';
import { adminBookingRequestOfferCallJoin } from '../commands/adminBookingRequestOfferCallJoin';
import { adminBookingRequestOfferCallLeave } from '../commands/adminBookingRequestOfferCallLeave';
import { adminBookingRequestOfferCallRecordingDelete } from '../commands/adminBookingRequestOfferCallRecordingDelete';
import { adminBookingRequestOfferCallRecordingSummaryGenerate } from '../commands/adminBookingRequestOfferCallRecordingSummaryGenerate';
import { adminBookingRequestOfferCallSlotDecline } from '../commands/adminBookingRequestOfferCallSlotDecline';
import { adminBookingRequestOfferChatMessageCreate } from '../commands/adminBookingRequestOfferChatMessageCreate';
import { adminBookingRequestOfferChatMessageDelete } from '../commands/adminBookingRequestOfferChatMessageDelete';
import { adminBookingRequestOfferChatMessageUpdate } from '../commands/adminBookingRequestOfferChatMessageUpdate';
import { adminBookingRequestOfferChatMessageVisibilityUpdate } from '../commands/adminBookingRequestOfferChatMessageVisibilityUpdate';
import { adminBookingRequestOfferChatReviewAcknowledge } from '../commands/adminBookingRequestOfferChatReviewAcknowledge';
import { adminBookingRequestOfferConfiguredMenuUpdate } from '../commands/adminBookingRequestOfferConfiguredMenuUpdate';
import { adminBookingRequestOfferCreate } from '../commands/adminBookingRequestOfferCreate';
import { adminBookingRequestOfferHandover } from '../commands/adminBookingRequestOfferHandover';
import { adminBookingRequestOfferPayoutAlreadyTookPlaceCheck } from '../commands/adminBookingRequestOfferPayoutAlreadyTookPlaceCheck';
import { adminBookingRequestOfferPayoutMarkOutOfSystem } from '../commands/adminBookingRequestOfferPayoutMarkOutOfSystem';
import { adminBookingRequestOfferPayoutRelease } from '../commands/adminBookingRequestOfferPayoutRelease';
import { adminBookingRequestOfferPreparationsClear } from '../commands/adminBookingRequestOfferPreparationsClear';
import { adminBookingRequestOfferUpdate } from '../commands/adminBookingRequestOfferUpdate';
import { adminBookingRequestPublicationApprove } from '../commands/adminBookingRequestPublicationApprove';
import { adminBookingRequestUpdate } from '../commands/adminBookingRequestUpdate';
import { adminCityCooksUpdate } from '../commands/adminCityCooksUpdate';
import { adminCityDelete } from '../commands/adminCityDelete';
import { adminCityTestimonialsUpdate } from '../commands/adminCityTestimonialsUpdate';
import { adminCityUpsert } from '../commands/adminCityUpsert';
import { adminCookApprovalUpdate } from '../commands/adminCookApprovalUpdate';
import { adminCookBiographySuggest } from '../commands/adminCookBiographySuggest';
import { adminCookBiographySummarySuggest } from '../commands/adminCookBiographySummarySuggest';
import { adminCookMealCreate } from '../commands/adminCookMealCreate';
import { adminCookMealDelete } from '../commands/adminCookMealDelete';
import { adminCookMealUpdate } from '../commands/adminCookMealUpdate';
import { adminCookMenuCopy } from '../commands/adminCookMenuCopy';
import { adminCookMenuCreate } from '../commands/adminCookMenuCreate';
import { adminCookMenuDelete } from '../commands/adminCookMenuDelete';
import { adminCookMenuUpdate } from '../commands/adminCookMenuUpdate';
import { adminCookTestimonialCreate } from '../commands/adminCookTestimonialCreate';
import { adminCookTestimonialDelete } from '../commands/adminCookTestimonialDelete';
import { adminCookTestimonialImageUpdate } from '../commands/adminCookTestimonialImageUpdate';
import { adminCookTestimonialPublish } from '../commands/adminCookTestimonialPublish';
import { adminCookTestimonialUpdate } from '../commands/adminCookTestimonialUpdate';
import { adminCookUpdate } from '../commands/adminCookUpdate';
import { adminCustomerTestimonialCreate } from '../commands/adminCustomerTestimonialCreate';
import { adminCustomerTestimonialDelete } from '../commands/adminCustomerTestimonialDelete';
import { adminCustomerTestimonialImageUpdate } from '../commands/adminCustomerTestimonialImageUpdate';
import { adminCustomerTestimonialPublish } from '../commands/adminCustomerTestimonialPublish';
import { adminCustomerTestimonialUpdate } from '../commands/adminCustomerTestimonialUpdate';
import { adminFeatureToggleUpdate } from '../commands/adminFeatureToggleUpdate';
import { adminFeatureToggleUserOverrideDelete } from '../commands/adminFeatureToggleUserOverrideDelete';
import { adminFeatureToggleUserOverrideUpsert } from '../commands/adminFeatureToggleUserOverrideUpsert';
import { adminGiftCardPdfsRegenerate } from '../commands/adminGiftCardPdfsRegenerate';
import { adminLegalImprintDraftCreate } from '../commands/adminLegalImprintDraftCreate';
import { adminLegalImprintDraftUpdate } from '../commands/adminLegalImprintDraftUpdate';
import { adminLegalImprintPublish } from '../commands/adminLegalImprintPublish';
import { adminLegalPrivacyPolicyDraftCreate } from '../commands/adminLegalPrivacyPolicyDraftCreate';
import { adminLegalPrivacyPolicyDraftUpdate } from '../commands/adminLegalPrivacyPolicyDraftUpdate';
import { adminLegalPrivacyPolicyPublish } from '../commands/adminLegalPrivacyPolicyPublish';
import { adminLegalTermsAndConditionsDraftCreate } from '../commands/adminLegalTermsAndConditionsDraftCreate';
import { adminLegalTermsAndConditionsDraftUpdate } from '../commands/adminLegalTermsAndConditionsDraftUpdate';
import { adminLegalTermsAndConditionsPublish } from '../commands/adminLegalTermsAndConditionsPublish';
import { adminOccasionCooksUpdate } from '../commands/adminOccasionCooksUpdate';
import { adminOccasionDelete } from '../commands/adminOccasionDelete';
import { adminOccasionTestimonialsUpdate } from '../commands/adminOccasionTestimonialsUpdate';
import { adminOccasionUpsert } from '../commands/adminOccasionUpsert';
import { adminPartnerCooksUpdate } from '../commands/adminPartnerCooksUpdate';
import { adminPartnerDelete } from '../commands/adminPartnerDelete';
import { adminPartnerTestimonialsUpdate } from '../commands/adminPartnerTestimonialsUpdate';
import { adminPartnerUpsert } from '../commands/adminPartnerUpsert';
import { adminPromoCodeCreate } from '../commands/adminPromoCodeCreate';
import { adminPromoCodeUpdate } from '../commands/adminPromoCodeUpdate';
import { adminQueuedJobCancel } from '../commands/adminQueuedJobCancel';
import { adminSessionTerminateMany } from '../commands/adminSessionTerminateMany';
import { adminSessionUserBind } from '../commands/adminSessionUserBind';
import { adminSupportRequestMessageCreate } from '../commands/adminSupportRequestMessageCreate';
import { adminSupportRequestResolve } from '../commands/adminSupportRequestResolve';
import { adminSupportRequestUnreadNotificationCountReset } from '../commands/adminSupportRequestUnreadNotificationCountReset';
import { adminUserAdminNoteUpdate } from '../commands/adminUserAdminNoteUpdate';
import { adminUserAnonymize } from '../commands/adminUserAnonymize';
import { adminUserCreate } from '../commands/adminUserCreate';
import { adminUserEmailAddressUpdate } from '../commands/adminUserEmailAddressUpdate';
import { adminUserStatusUpdate } from '../commands/adminUserStatusUpdate';
import { adminUserUpdate } from '../commands/adminUserUpdate';
import { adminWebPageUpdate } from '../commands/adminWebPageUpdate';
import { adminWhatsAppConversationUnreadCountReset } from '../commands/adminWhatsAppConversationUnreadCountReset';
import { adminWhatsAppMessageCreate } from '../commands/adminWhatsAppMessageCreate';
import { adminWhatsAppMessageReactionUpsert } from '../commands/adminWhatsAppMessageReactionUpsert';
import { authEmailOtpDelete } from '../commands/authEmailOtpDelete';
import { authEmailOtpRequest } from '../commands/authEmailOtpRequest';
import { authEmailOtpVerify } from '../commands/authEmailOtpVerify';
import { authPasskeyAuthenticateOptions } from '../commands/authPasskeyAuthenticateOptions';
import { authPasskeyAuthenticateVerify } from '../commands/authPasskeyAuthenticateVerify';
import { authPasskeyDelete } from '../commands/authPasskeyDelete';
import { authPasskeyRegisterOptions } from '../commands/authPasskeyRegisterOptions';
import { authPasskeyRegisterVerify } from '../commands/authPasskeyRegisterVerify';
import { authTotpChallengeDelete } from '../commands/authTotpChallengeDelete';
import { authTotpDisable } from '../commands/authTotpDisable';
import { authTotpEnrollCancel } from '../commands/authTotpEnrollCancel';
import { authTotpEnrollConfirm } from '../commands/authTotpEnrollConfirm';
import { authTotpEnrollStart } from '../commands/authTotpEnrollStart';
import { authTotpVerify } from '../commands/authTotpVerify';
import { bookingRequestOfferChatMessageReactionUpsert } from '../commands/bookingRequestOfferChatMessageReactionUpsert';
import { chatDelete } from '../commands/chatDelete';
import { chatInputCollectionRespond } from '../commands/chatInputCollectionRespond';
import { chatMessageCreate } from '../commands/chatMessageCreate';
import { chatTitleUpdate } from '../commands/chatTitleUpdate';
import { chatToolApprovalRespond } from '../commands/chatToolApprovalRespond';
import { clientObservabilityReport } from '../commands/clientObservabilityReport';
import { cookBiographySuggest } from '../commands/cookBiographySuggest';
import { cookBookingRequestDecline } from '../commands/cookBookingRequestDecline';
import { cookBookingRequestGeneratedMenuApply } from '../commands/cookBookingRequestGeneratedMenuApply';
import { cookBookingRequestMenuEvaluationRefresh } from '../commands/cookBookingRequestMenuEvaluationRefresh';
import { cookBookingRequestOfferAccept } from '../commands/cookBookingRequestOfferAccept';
import { cookBookingRequestOfferCallCreate } from '../commands/cookBookingRequestOfferCallCreate';
import { cookBookingRequestOfferCallJoin } from '../commands/cookBookingRequestOfferCallJoin';
import { cookBookingRequestOfferCallLeave } from '../commands/cookBookingRequestOfferCallLeave';
import { cookBookingRequestOfferCallSlotCancel } from '../commands/cookBookingRequestOfferCallSlotCancel';
import { cookBookingRequestOfferCallSlotConfirm } from '../commands/cookBookingRequestOfferCallSlotConfirm';
import { cookBookingRequestOfferCallSlotDecline } from '../commands/cookBookingRequestOfferCallSlotDecline';
import { cookBookingRequestOfferCallSlotRequest } from '../commands/cookBookingRequestOfferCallSlotRequest';
import { cookBookingRequestOfferChatMessageCreate } from '../commands/cookBookingRequestOfferChatMessageCreate';
import { cookBookingRequestOfferCreate } from '../commands/cookBookingRequestOfferCreate';
import { cookBookingRequestOfferDecline } from '../commands/cookBookingRequestOfferDecline';
import { cookBookingRequestOfferParticipantAmendmentAccept } from '../commands/cookBookingRequestOfferParticipantAmendmentAccept';
import { cookBookingRequestOfferParticipantAmendmentDecline } from '../commands/cookBookingRequestOfferParticipantAmendmentDecline';
import { cookBookingRequestOfferPreparationsComplete } from '../commands/cookBookingRequestOfferPreparationsComplete';
import { cookBookingRequestOfferPriceUpdate } from '../commands/cookBookingRequestOfferPriceUpdate';
import { cookBookingRequestOfferSuggestedMenusUpdate } from '../commands/cookBookingRequestOfferSuggestedMenusUpdate';
import { cookBookingRequestOfferTestimonialCreate } from '../commands/cookBookingRequestOfferTestimonialCreate';
import { cookBookingRequestOfferUnreadNotificationCountReset } from '../commands/cookBookingRequestOfferUnreadNotificationCountReset';
import { cookBookingRequestOpen } from '../commands/cookBookingRequestOpen';
import { cookCallAvailabilityExceptionCreate } from '../commands/cookCallAvailabilityExceptionCreate';
import { cookCallAvailabilityExceptionDelete } from '../commands/cookCallAvailabilityExceptionDelete';
import { cookCallAvailabilityRuleCreate } from '../commands/cookCallAvailabilityRuleCreate';
import { cookCallAvailabilityRuleDelete } from '../commands/cookCallAvailabilityRuleDelete';
import { cookMealCreate } from '../commands/cookMealCreate';
import { cookMealDelete } from '../commands/cookMealDelete';
import { cookMealUpdate } from '../commands/cookMealUpdate';
import { cookMenuCopy } from '../commands/cookMenuCopy';
import { cookMenuCreate } from '../commands/cookMenuCreate';
import { cookMenuDelete } from '../commands/cookMenuDelete';
import { cookMenuSuggestionFromInventory } from '../commands/cookMenuSuggestionFromInventory';
import { cookMenuSuggestionFromText } from '../commands/cookMenuSuggestionFromText';
import { cookMenuSyncToTemplate } from '../commands/cookMenuSyncToTemplate';
import { cookMenuTitleDescriptionSuggest } from '../commands/cookMenuTitleDescriptionSuggest';
import { cookMenuUpdate } from '../commands/cookMenuUpdate';
import { cookStripeDashboardUrlCreate } from '../commands/cookStripeDashboardUrlCreate';
import { cookStripeOnboardingStart } from '../commands/cookStripeOnboardingStart';
import { cookStripeStatusSync } from '../commands/cookStripeStatusSync';
import { cookUpdate } from '../commands/cookUpdate';
import { emailAddressUpdateOtpRequest } from '../commands/emailAddressUpdateOtpRequest';
import { emailAddressUpdateOtpVerify } from '../commands/emailAddressUpdateOtpVerify';
import { giftCardCreate } from '../commands/giftCardCreate';
import { giftCardPay } from '../commands/giftCardPay';
import { giftCardPdfsRegenerate } from '../commands/giftCardPdfsRegenerate';
import { sessionCookieSettingAcceptAll } from '../commands/sessionCookieSettingAcceptAll';
import { sessionCookieSettingAcceptMandatory } from '../commands/sessionCookieSettingAcceptMandatory';
import { sessionNewsletterSubscriptionCreate } from '../commands/sessionNewsletterSubscriptionCreate';
import { sessionWebPageInteractionCreate } from '../commands/sessionWebPageInteractionCreate';
import { sessionWebPageVisitCreate } from '../commands/sessionWebPageVisitCreate';
import { userAnonymize } from '../commands/userAnonymize';
import { userBookingRequestCancel } from '../commands/userBookingRequestCancel';
import { userBookingRequestChurnPromoCodeCreate } from '../commands/userBookingRequestChurnPromoCodeCreate';
import { userBookingRequestCreate } from '../commands/userBookingRequestCreate';
import { userBookingRequestDiscountUpdate } from '../commands/userBookingRequestDiscountUpdate';
import { userBookingRequestOfferAccept } from '../commands/userBookingRequestOfferAccept';
import { userBookingRequestOfferCallCreate } from '../commands/userBookingRequestOfferCallCreate';
import { userBookingRequestOfferCallJoin } from '../commands/userBookingRequestOfferCallJoin';
import { userBookingRequestOfferCallLeave } from '../commands/userBookingRequestOfferCallLeave';
import { userBookingRequestOfferCallSlotCancel } from '../commands/userBookingRequestOfferCallSlotCancel';
import { userBookingRequestOfferCallSlotConfirm } from '../commands/userBookingRequestOfferCallSlotConfirm';
import { userBookingRequestOfferCallSlotDecline } from '../commands/userBookingRequestOfferCallSlotDecline';
import { userBookingRequestOfferCallSlotRequest } from '../commands/userBookingRequestOfferCallSlotRequest';
import { userBookingRequestOfferChatMessageCreate } from '../commands/userBookingRequestOfferChatMessageCreate';
import { userBookingRequestOfferConfiguredMenuCreate } from '../commands/userBookingRequestOfferConfiguredMenuCreate';
import { userBookingRequestOfferDecline } from '../commands/userBookingRequestOfferDecline';
import { userBookingRequestOfferParticipantAmendmentCancel } from '../commands/userBookingRequestOfferParticipantAmendmentCancel';
import { userBookingRequestOfferParticipantAmendmentCreate } from '../commands/userBookingRequestOfferParticipantAmendmentCreate';
import { userBookingRequestOfferPaymentStatusUpdate } from '../commands/userBookingRequestOfferPaymentStatusUpdate';
import { userBookingRequestOfferTestimonialCreate } from '../commands/userBookingRequestOfferTestimonialCreate';
import { userBookingRequestOfferUnreadNotificationCountReset } from '../commands/userBookingRequestOfferUnreadNotificationCountReset';
import { userBookingRequestRequestRecall } from '../commands/userBookingRequestRequestRecall';
import { userBookingRequestUpdate } from '../commands/userBookingRequestUpdate';
import { userCookCreate } from '../commands/userCookCreate';
import { userCreate } from '../commands/userCreate';
import { userLegalAccept as userLegalAcceptCommand } from '../commands/userLegalAccept';
import { userSessionTerminateMany } from '../commands/userSessionTerminateMany';
import { userSupportRequestCreate } from '../commands/userSupportRequestCreate';
import { userSupportRequestMessageCreate } from '../commands/userSupportRequestMessageCreate';
import { userSupportRequestUnreadNotificationCountReset } from '../commands/userSupportRequestUnreadNotificationCountReset';
import { userUpdate } from '../commands/userUpdate';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { guardAdminMutation } from '../guards/guardAdminMutation';
import { guardAdminSubscription } from '../guards/guardAdminSubscription';
import { guardCookMutation } from '../guards/guardCookMutation';
import { guardSessionSubscription } from '../guards/guardSessionSubscription';
import { guardUserMutation } from '../guards/guardUserMutation';
import { guardUserSubscription } from '../guards/guardUserSubscription';
import { chatTurnUpdatesSubscribe } from '../lib/chatTurnUpdatesSubscribe';
import { toGqlBookingRequestOfferCallRoom } from '../mappers/toGqlBookingRequestOfferCallRoom';
import { adminAiGenerationCounts } from '../queries/adminAiGenerationCounts';
import { adminAiGenerationCreationsFindMany } from '../queries/adminAiGenerationCreationsFindMany';
import { adminAiGenerationFindMany } from '../queries/adminAiGenerationFindMany';
import { adminAiGenerationFindOne } from '../queries/adminAiGenerationFindOne';
import { adminAnalyticsBookingRequestCheckoutFlow } from '../queries/adminAnalyticsBookingRequestCheckoutFlow';
import { adminAnalyticsBookingRequestFormFlow } from '../queries/adminAnalyticsBookingRequestFormFlow';
import { adminAnalyticsChefSignUpFlow } from '../queries/adminAnalyticsChefSignUpFlow';
import { adminAnalyticsCookBookingRequestOfferFlow } from '../queries/adminAnalyticsCookBookingRequestOfferFlow';
import { adminAnalyticsGiftCardFlow } from '../queries/adminAnalyticsGiftCardFlow';
import { adminAssistantChatCreationsFindMany } from '../queries/adminAssistantChatCreationsFindMany';
import { adminAssistantChatFindMany } from '../queries/adminAssistantChatFindMany';
import { adminAssistantChatFindOne } from '../queries/adminAssistantChatFindOne';
import { adminAssistantChatsCounts } from '../queries/adminAssistantChatsCounts';
import { adminBlogPostFindMany } from '../queries/adminBlogPostFindMany';
import { adminBlogPostFindOne } from '../queries/adminBlogPostFindOne';
import { adminBookingRequestAverageParticipantsFindOne } from '../queries/adminBookingRequestAverageParticipantsFindOne';
import { adminBookingRequestCookOfferStatsFindMany } from '../queries/adminBookingRequestCookOfferStatsFindMany';
import { adminBookingRequestCooksInTravelRadiusFindMany } from '../queries/adminBookingRequestCooksInTravelRadiusFindMany';
import { adminBookingRequestCounts } from '../queries/adminBookingRequestCounts';
import { adminBookingRequestCreationMonthStatsFindMany } from '../queries/adminBookingRequestCreationMonthStatsFindMany';
import { adminBookingRequestCreationsFindMany } from '../queries/adminBookingRequestCreationsFindMany';
import { adminBookingRequestFindMany } from '../queries/adminBookingRequestFindMany';
import { adminBookingRequestFindOne } from '../queries/adminBookingRequestFindOne';
import { adminBookingRequestOccasionStatsFindMany } from '../queries/adminBookingRequestOccasionStatsFindMany';
import { adminBookingRequestOfferCallRecordingsFindMany } from '../queries/adminBookingRequestOfferCallRecordingsFindMany';
import { adminBookingRequestOfferCounts } from '../queries/adminBookingRequestOfferCounts';
import { adminBookingRequestOfferEconomicsFindOne } from '../queries/adminBookingRequestOfferEconomicsFindOne';
import { adminBookingRequestOfferFindMany } from '../queries/adminBookingRequestOfferFindMany';
import { adminBookingRequestOfferFindOne } from '../queries/adminBookingRequestOfferFindOne';
import { adminBookingRequestOfferQueuedJobsByOfferIdFindMany } from '../queries/adminBookingRequestOfferQueuedJobsByOfferIdFindMany';
import { adminBookingRequestQueuedJobsFindMany } from '../queries/adminBookingRequestQueuedJobsFindMany';
import { adminCallCookStatsFindMany } from '../queries/adminCallCookStatsFindMany';
import { adminCallFindOne } from '../queries/adminCallFindOne';
import { adminCallRoomCreationsFindMany } from '../queries/adminCallRoomCreationsFindMany';
import { adminCallsFindMany } from '../queries/adminCallsFindMany';
import { adminCallSlotCreationsFindMany } from '../queries/adminCallSlotCreationsFindMany';
import { adminCallTrafficCounts } from '../queries/adminCallTrafficCounts';
import { adminCallTrafficFindMany } from '../queries/adminCallTrafficFindMany';
import { adminCityCooksFindMany } from '../queries/adminCityCooksFindMany';
import { adminCityFindMany } from '../queries/adminCityFindMany';
import { adminCityFindOne } from '../queries/adminCityFindOne';
import { adminCityTestimonialsFindMany } from '../queries/adminCityTestimonialsFindMany';
import { adminCookFeaturedLandingsFindMany } from '../queries/adminCookFeaturedLandingsFindMany';
import { adminCookMealCounts } from '../queries/adminCookMealCounts';
import { adminCookMealFindMany } from '../queries/adminCookMealFindMany';
import { adminCookMealFindOne } from '../queries/adminCookMealFindOne';
import { adminCookMenuCounts } from '../queries/adminCookMenuCounts';
import { adminCookMenuFindMany } from '../queries/adminCookMenuFindMany';
import { adminCookMenuFindOne } from '../queries/adminCookMenuFindOne';
import { adminCooksInTravelRadiusPreviewFindMany } from '../queries/adminCooksInTravelRadiusPreviewFindMany';
import { adminCookStripeAccountDetailsFindOne } from '../queries/adminCookStripeAccountDetailsFindOne';
import { adminCookStripeWalletFindOne } from '../queries/adminCookStripeWalletFindOne';
import { adminCookTestimonialCookFindOne } from '../queries/adminCookTestimonialCookFindOne';
import { adminCookTestimonialFindOne } from '../queries/adminCookTestimonialFindOne';
import { adminCookTestimonialFindOneByOfferId } from '../queries/adminCookTestimonialFindOneByOfferId';
import { adminCookTestimonialsFindMany } from '../queries/adminCookTestimonialsFindMany';
import { adminCookUserFindOne } from '../queries/adminCookUserFindOne';
import { adminCustomerTestimonialFindOne } from '../queries/adminCustomerTestimonialFindOne';
import { adminCustomerTestimonialFindOneByOfferId } from '../queries/adminCustomerTestimonialFindOneByOfferId';
import { adminCustomerTestimonialsFindMany } from '../queries/adminCustomerTestimonialsFindMany';
import { adminDatabaseSlowStatementsFindMany } from '../queries/adminDatabaseSlowStatementsFindMany';
import { adminFeatureToggleFindMany } from '../queries/adminFeatureToggleFindMany';
import { adminFeatureToggleUserOverrideFindMany } from '../queries/adminFeatureToggleUserOverrideFindMany';
import { adminFeatureToggleUserOverrideFindManyByKey } from '../queries/adminFeatureToggleUserOverrideFindManyByKey';
import { adminGiftCardCounts } from '../queries/adminGiftCardCounts';
import { adminGiftCardCreationsFindMany } from '../queries/adminGiftCardCreationsFindMany';
import { adminGiftCardFindMany } from '../queries/adminGiftCardFindMany';
import { adminGiftCardFindOne } from '../queries/adminGiftCardFindOne';
import { adminGiftCardOccasionStatsFindMany } from '../queries/adminGiftCardOccasionStatsFindMany';
import { adminGiftCardPaidPurchaseAverageCentsFindOne } from '../queries/adminGiftCardPaidPurchaseAverageCentsFindOne';
import { adminGiftCardSalesMonthStatsFindMany } from '../queries/adminGiftCardSalesMonthStatsFindMany';
import { adminLegalImprintFindMany } from '../queries/adminLegalImprintFindMany';
import { adminLegalPrivacyPolicyFindMany } from '../queries/adminLegalPrivacyPolicyFindMany';
import { adminLegalTermsAndConditionsFindMany } from '../queries/adminLegalTermsAndConditionsFindMany';
import { adminLogCounts } from '../queries/adminLogCounts';
import { adminLogCreationsFindMany } from '../queries/adminLogCreationsFindMany';
import { adminLogFindMany } from '../queries/adminLogFindMany';
import { adminLogFindOne } from '../queries/adminLogFindOne';
import { adminObjectStorageObjectFindMany } from '../queries/adminObjectStorageObjectFindMany';
import { adminOccasionCooksFindMany } from '../queries/adminOccasionCooksFindMany';
import { adminOccasionFindMany } from '../queries/adminOccasionFindMany';
import { adminOccasionFindOne } from '../queries/adminOccasionFindOne';
import { adminOccasionTestimonialsFindMany } from '../queries/adminOccasionTestimonialsFindMany';
import { adminOutboundEmailAttachmentsFindMany } from '../queries/adminOutboundEmailAttachmentsFindMany';
import { adminOutboundEmailCounts } from '../queries/adminOutboundEmailCounts';
import { adminOutboundEmailCreationsFindMany } from '../queries/adminOutboundEmailCreationsFindMany';
import { adminOutboundEmailFindMany } from '../queries/adminOutboundEmailFindMany';
import { adminOutboundEmailFindOne } from '../queries/adminOutboundEmailFindOne';
import { adminOutboundEmailPurposeStatsFindMany } from '../queries/adminOutboundEmailPurposeStatsFindMany';
import { adminOutboundEmailRecipientStatsFindMany } from '../queries/adminOutboundEmailRecipientStatsFindMany';
import { adminPartnerCooksFindMany } from '../queries/adminPartnerCooksFindMany';
import { adminPartnerFindMany } from '../queries/adminPartnerFindMany';
import { adminPartnerFindOne } from '../queries/adminPartnerFindOne';
import { adminPartnerTestimonialsFindMany } from '../queries/adminPartnerTestimonialsFindMany';
import { adminPromoCodeCounts } from '../queries/adminPromoCodeCounts';
import { adminPromoCodeFindMany } from '../queries/adminPromoCodeFindMany';
import { adminPromoCodeFindOne } from '../queries/adminPromoCodeFindOne';
import { adminQueuedJobsFindMany } from '../queries/adminQueuedJobsFindMany';
import { adminResendUsage } from '../queries/adminResendUsage';
import { adminSessionCounts } from '../queries/adminSessionCounts';
import { adminSessionCreationsFindMany } from '../queries/adminSessionCreationsFindMany';
import { adminSessionEventCounts } from '../queries/adminSessionEventCounts';
import { adminSessionEventFindMany } from '../queries/adminSessionEventFindMany';
import { adminSessionEventWebPageVisitCreationsFindMany } from '../queries/adminSessionEventWebPageVisitCreationsFindMany';
import { adminSessionFindMany } from '../queries/adminSessionFindMany';
import { adminSessionFindOne } from '../queries/adminSessionFindOne';
import { adminSupportRequestCounts } from '../queries/adminSupportRequestCounts';
import { adminSupportRequestFindMany } from '../queries/adminSupportRequestFindMany';
import { adminSupportRequestFindOne } from '../queries/adminSupportRequestFindOne';
import { adminUserCookFindOne } from '../queries/adminUserCookFindOne';
import { adminUserCounts } from '../queries/adminUserCounts';
import { adminUserFindMany } from '../queries/adminUserFindMany';
import { adminUserFindOne } from '../queries/adminUserFindOne';
import { adminUserInsightsFindOne } from '../queries/adminUserInsightsFindOne';
import { adminUserRegistrationsFindMany } from '../queries/adminUserRegistrationsFindMany';
import { adminUserUpcomingBirthdaysFindMany } from '../queries/adminUserUpcomingBirthdaysFindMany';
import { adminWebPageFindMany } from '../queries/adminWebPageFindMany';
import { adminWebPageFindOne } from '../queries/adminWebPageFindOne';
import { adminWhatsAppConversationFindMany } from '../queries/adminWhatsAppConversationFindMany';
import { adminWhatsAppConversationFindManyCounts } from '../queries/adminWhatsAppConversationFindManyCounts';
import { adminWhatsAppConversationFindOne } from '../queries/adminWhatsAppConversationFindOne';
import { adminWhatsAppConversationsAdminUnreadCount } from '../queries/adminWhatsAppConversationsAdminUnreadCount';
import { bookingRequestOfferCallRoomFindActive } from '../queries/bookingRequestOfferCallRoomFindActive';
import { bookingRequestOfferMessagesFindMany } from '../queries/bookingRequestOfferMessagesFindMany';
import { chatTurnsFindMany } from '../queries/chatTurnsFindMany';
import { cityCooksInTravelRadiusFindMany } from '../queries/cityCooksInTravelRadiusFindMany';
import { cityFeaturedCooksFindMany } from '../queries/cityFeaturedCooksFindMany';
import { cityTestimonialsFindMany } from '../queries/cityTestimonialsFindMany';
import { cookBookingRequestFindMany } from '../queries/cookBookingRequestFindMany';
import { cookBookingRequestFindOne } from '../queries/cookBookingRequestFindOne';
import { cookBookingRequestLookup } from '../queries/cookBookingRequestLookup';
import { cookBookingRequestOfferCookTestimonialFindOne } from '../queries/cookBookingRequestOfferCookTestimonialFindOne';
import { cookBookingRequestOfferFindMany } from '../queries/cookBookingRequestOfferFindMany';
import { cookBookingRequestOfferFindOne } from '../queries/cookBookingRequestOfferFindOne';
import { cookBookingRequestOfferTestimonialMissing } from '../queries/cookBookingRequestOfferTestimonialMissing';
import { cookCallAvailabilityExceptionFindMany } from '../queries/cookCallAvailabilityExceptionFindMany';
import { cookCallAvailabilityRuleFindMany } from '../queries/cookCallAvailabilityRuleFindMany';
import { cookCallSlotBookingCustomerFindOne } from '../queries/cookCallSlotBookingCustomerFindOne';
import { cookCallSlotBookingsFindMany } from '../queries/cookCallSlotBookingsFindMany';
import { cookLogoFindOne } from '../queries/cookLogoFindOne';
import { cookMealCounts } from '../queries/cookMealCounts';
import { cookMealFindMany } from '../queries/cookMealFindMany';
import { cookMealFindOne } from '../queries/cookMealFindOne';
import { cookMenuCounts } from '../queries/cookMenuCounts';
import { cookMenuFindMany } from '../queries/cookMenuFindMany';
import { cookMenuFindOne } from '../queries/cookMenuFindOne';
import { cookMenuTemplateFindOne } from '../queries/cookMenuTemplateFindOne';
import { cookOfferMenuFindMany } from '../queries/cookOfferMenuFindMany';
import { cookStripeAccountDetailsFindOne } from '../queries/cookStripeAccountDetailsFindOne';
import { cookStripeWalletFindOne } from '../queries/cookStripeWalletFindOne';
import { giftCardFileUploadFindOne } from '../queries/giftCardFileUploadFindOne';
import { occasionFeaturedCooksFindMany } from '../queries/occasionFeaturedCooksFindMany';
import { occasionPromoFindOne } from '../queries/occasionPromoFindOne';
import { occasionTestimonialsFindMany } from '../queries/occasionTestimonialsFindMany';
import { partnerFeaturedCooksFindMany } from '../queries/partnerFeaturedCooksFindMany';
import { partnerPromoFindOne } from '../queries/partnerPromoFindOne';
import { partnerTestimonialsFindMany } from '../queries/partnerTestimonialsFindMany';
import { publicBlogPostFindMany } from '../queries/publicBlogPostFindMany';
import { publicBlogPostFindOneByPathName } from '../queries/publicBlogPostFindOneByPathName';
import { publicCityFindMany } from '../queries/publicCityFindMany';
import { publicCityFindOneByPathName } from '../queries/publicCityFindOneByPathName';
import { publicCookCustomerTestimonialRatingSummary } from '../queries/publicCookCustomerTestimonialRatingSummary';
import { publicCookCustomerTestimonialsFindMany } from '../queries/publicCookCustomerTestimonialsFindMany';
import { publicCookFindMany } from '../queries/publicCookFindMany';
import { publicCookFindOne } from '../queries/publicCookFindOne';
import { publicCookMealFindMany } from '../queries/publicCookMealFindMany';
import { publicLegalFind } from '../queries/publicLegalFind';
import { publicOccasionFindMany } from '../queries/publicOccasionFindMany';
import { publicOccasionFindOneByPathName } from '../queries/publicOccasionFindOneByPathName';
import { publicPartnerFindMany } from '../queries/publicPartnerFindMany';
import { publicPartnerFindOneByPathName } from '../queries/publicPartnerFindOneByPathName';
import { publicWebPageFindOne } from '../queries/publicWebPageFindOne';
import { sessionAuthEmailOtpFindOne } from '../queries/sessionAuthEmailOtpFindOne';
import { sessionAuthTotpChallengeFindOne } from '../queries/sessionAuthTotpChallengeFindOne';
import { sessionCookieSettingFindOne } from '../queries/sessionCookieSettingFindOne';
import { sessionDiscount } from '../queries/sessionDiscount';
import { sessionFeatureToggleFindActive } from '../queries/sessionFeatureToggleFindActive';
import { sessionFindOne } from '../queries/sessionFindOne';
import { sessionGiftCardFindOne } from '../queries/sessionGiftCardFindOne';
import { sessionGiftCardPurchaseErrorFindOne } from '../queries/sessionGiftCardPurchaseErrorFindOne';
import { sessionLocationSuggestionsFindMany } from '../queries/sessionLocationSuggestionsFindMany';
import { sessionUserFindOne } from '../queries/sessionUserFindOne';
import { supportRequestMessagesFindMany } from '../queries/supportRequestMessagesFindMany';
import { userAdminFindOne } from '../queries/userAdminFindOne';
import { userAssistantChatFindMany } from '../queries/userAssistantChatFindMany';
import { userAssistantChatFindOne } from '../queries/userAssistantChatFindOne';
import { userBookingRequestFindMany } from '../queries/userBookingRequestFindMany';
import { userBookingRequestFindOne } from '../queries/userBookingRequestFindOne';
import { userBookingRequestOfferCustomerTestimonialFindOne } from '../queries/userBookingRequestOfferCustomerTestimonialFindOne';
import { userBookingRequestOfferTestimonialMissing } from '../queries/userBookingRequestOfferTestimonialMissing';
import { userBookingRequestPriceImpactFindMany } from '../queries/userBookingRequestPriceImpactFindMany';
import { userBookingRequestSupportRequestFindOne } from '../queries/userBookingRequestSupportRequestFindOne';
import { userBookingRequestTravelImpactFindMany } from '../queries/userBookingRequestTravelImpactFindMany';
import { userCookFindOne } from '../queries/userCookFindOne';
import { userGiftCardFindMany } from '../queries/userGiftCardFindMany';
import { userLegalAcceptanceFindOne } from '../queries/userLegalAcceptanceFindOne';
import { userPasskeysFindMany } from '../queries/userPasskeysFindMany';
import { userPreviousEventAddressesFindMany } from '../queries/userPreviousEventAddressesFindMany';
import { userProfilePictureFindOne } from '../queries/userProfilePictureFindOne';
import { userSessionsFindMany } from '../queries/userSessionsFindMany';
import { userSupportRequestFindMany } from '../queries/userSupportRequestFindMany';
import { userSupportRequestFindOne } from '../queries/userSupportRequestFindOne';
import { userTimeBasedOneTimePasswordFindOne } from '../queries/userTimeBasedOneTimePasswordFindOne';
import { whatsAppMessagesFindMany } from '../queries/whatsAppMessagesFindMany';
import { cookBiographySummaryGenerating } from '../utils/cookBiographySummaryGenerateSchedule';
import { cookCallSlotsFindMany } from '../utils/cookCallSlotsFindMany';
import { cookMealRelationshipsFind } from '../utils/cookMealRelationshipsFind';
import type {
    GqlSAdmin,
    GqlSAdminAiGeneration,
    GqlSAdminAiGenerationArgs,
    GqlSAdminAiGenerationCountsArgs,
    GqlSAdminAiGenerationCreationsArgs,
    GqlSAdminAiGenerationsArgs,
    GqlSAdminAssistantChat,
    GqlSAdminAssistantChatArgs,
    GqlSAdminAssistantChatCreationsArgs,
    GqlSAdminAssistantChatsArgs,
    GqlSAdminAssistantChatsCountsArgs,
    GqlSAdminBlogPostArgs,
    GqlSAdminBookingRequest,
    GqlSAdminBookingRequestArgs,
    GqlSAdminBookingRequestCheckoutFlowArgs,
    GqlSAdminBookingRequestCookOfferStatsArgs,
    GqlSAdminBookingRequestCreationMonthStatsArgs,
    GqlSAdminBookingRequestCreationsArgs,
    GqlSAdminBookingRequestFormFlowArgs,
    GqlSAdminBookingRequestOccasionStatsArgs,
    GqlSAdminBookingRequestOffer,
    GqlSAdminBookingRequestOfferArgs,
    GqlSAdminBookingRequestOfferEconomicsArgs,
    GqlSAdminBookingRequestOffersArgs,
    GqlSAdminBookingRequestOffersCountsArgs,
    GqlSAdminBookingRequestsArgs,
    GqlSAdminBookingRequestsCountsArgs,
    GqlSAdminCallArgs,
    GqlSAdminCallCookStatsArgs,
    GqlSAdminCallRoomCreationsArgs,
    GqlSAdminCallSlotCreationsArgs,
    GqlSAdminCallTrafficArgs,
    GqlSAdminCallTrafficCountsArgs,
    GqlSAdminChefSignUpFlowArgs,
    GqlSAdminCity,
    GqlSAdminCityArgs,
    GqlSAdminCook,
    GqlSAdminCookBookingRequestOfferFlowArgs,
    GqlSAdminCookMeal,
    GqlSAdminCookMealArgs,
    GqlSAdminCookMealsArgs,
    GqlSAdminCookMealsCountsArgs,
    GqlSAdminCookMenuArgs,
    GqlSAdminCookMenusArgs,
    GqlSAdminCookMenusCountsArgs,
    GqlSAdminCooksInTravelRadiusArgs,
    GqlSAdminCookTestimonial,
    GqlSAdminCookTestimonialArgs,
    GqlSAdminCookTestimonialsArgs,
    GqlSAdminCustomerTestimonial,
    GqlSAdminCustomerTestimonialArgs,
    GqlSAdminCustomerTestimonialsArgs,
    GqlSAdminDatabaseSlowStatementsArgs,
    GqlSAdminFeatureToggle,
    GqlSAdminFeatureToggleUserOverride,
    GqlSAdminGiftCard,
    GqlSAdminGiftCardArgs,
    GqlSAdminGiftCardCreationsArgs,
    GqlSAdminGiftCardFlowArgs,
    GqlSAdminGiftCardOccasionStatsArgs,
    GqlSAdminGiftCardSalesMonthStatsArgs,
    GqlSAdminGiftCardsArgs,
    GqlSAdminGiftCardsCountsArgs,
    GqlSAdminLog,
    GqlSAdminLogArgs,
    GqlSAdminLogCountsArgs,
    GqlSAdminLogCreationsArgs,
    GqlSAdminLogsArgs,
    GqlSAdminMutation,
    GqlSAdminMutationBlogPostDeleteArgs,
    GqlSAdminMutationBlogPostUpsertArgs,
    GqlSAdminMutationBookingRequestCancelArgs,
    GqlSAdminMutationBookingRequestCooksNotifyArgs,
    GqlSAdminMutationBookingRequestCreateArgs,
    GqlSAdminMutationBookingRequestDiscountUpdateArgs,
    GqlSAdminMutationBookingRequestOfferCallCreateArgs,
    GqlSAdminMutationBookingRequestOfferCallJoinArgs,
    GqlSAdminMutationBookingRequestOfferCallLeaveArgs,
    GqlSAdminMutationBookingRequestOfferCallRecordingDeleteArgs,
    GqlSAdminMutationBookingRequestOfferCallRecordingSummaryGenerateArgs,
    GqlSAdminMutationBookingRequestOfferCallSlotDeclineArgs,
    GqlSAdminMutationBookingRequestOfferChatMessageCreateArgs,
    GqlSAdminMutationBookingRequestOfferChatMessageDeleteArgs,
    GqlSAdminMutationBookingRequestOfferChatMessageReactionUpsertArgs,
    GqlSAdminMutationBookingRequestOfferChatMessageUpdateArgs,
    GqlSAdminMutationBookingRequestOfferChatMessageVisibilityUpdateArgs,
    GqlSAdminMutationBookingRequestOfferChatReviewAcknowledgeArgs,
    GqlSAdminMutationBookingRequestOfferConfiguredMenuUpdateArgs,
    GqlSAdminMutationBookingRequestOfferCreateArgs,
    GqlSAdminMutationBookingRequestOfferHandoverArgs,
    GqlSAdminMutationBookingRequestOfferPayoutAlreadyTookPlaceCheckArgs,
    GqlSAdminMutationBookingRequestOfferPayoutMarkOutOfSystemArgs,
    GqlSAdminMutationBookingRequestOfferPayoutReleaseArgs,
    GqlSAdminMutationBookingRequestOfferPreparationsClearArgs,
    GqlSAdminMutationBookingRequestOfferUpdateArgs,
    GqlSAdminMutationBookingRequestPublicationApproveArgs,
    GqlSAdminMutationBookingRequestUpdateArgs,
    GqlSAdminMutationCityCooksUpdateArgs,
    GqlSAdminMutationCityDeleteArgs,
    GqlSAdminMutationCityTestimonialsUpdateArgs,
    GqlSAdminMutationCityUpsertArgs,
    GqlSAdminMutationCookApprovalUpdateArgs,
    GqlSAdminMutationCookBiographySuggestArgs,
    GqlSAdminMutationCookBiographySummarySuggestArgs,
    GqlSAdminMutationCookMealCreateArgs,
    GqlSAdminMutationCookMealDeleteArgs,
    GqlSAdminMutationCookMealUpdateArgs,
    GqlSAdminMutationCookMenuCopyArgs,
    GqlSAdminMutationCookMenuCreateArgs,
    GqlSAdminMutationCookMenuDeleteArgs,
    GqlSAdminMutationCookMenuUpdateArgs,
    GqlSAdminMutationCookTestimonialCreateArgs,
    GqlSAdminMutationCookTestimonialDeleteArgs,
    GqlSAdminMutationCookTestimonialImageUpdateArgs,
    GqlSAdminMutationCookTestimonialPublishArgs,
    GqlSAdminMutationCookTestimonialUpdateArgs,
    GqlSAdminMutationCookUpdateArgs,
    GqlSAdminMutationCustomerTestimonialCreateArgs,
    GqlSAdminMutationCustomerTestimonialDeleteArgs,
    GqlSAdminMutationCustomerTestimonialImageUpdateArgs,
    GqlSAdminMutationCustomerTestimonialPublishArgs,
    GqlSAdminMutationCustomerTestimonialUpdateArgs,
    GqlSAdminMutationFeatureToggleUpdateArgs,
    GqlSAdminMutationFeatureToggleUserOverrideDeleteArgs,
    GqlSAdminMutationFeatureToggleUserOverrideUpsertArgs,
    GqlSAdminMutationGiftCardPdfsRegenerateArgs,
    GqlSAdminMutationLegalImprintDraftUpdateArgs,
    GqlSAdminMutationLegalImprintPublishArgs,
    GqlSAdminMutationLegalPrivacyPolicyDraftUpdateArgs,
    GqlSAdminMutationLegalPrivacyPolicyPublishArgs,
    GqlSAdminMutationLegalTermsAndConditionsDraftUpdateArgs,
    GqlSAdminMutationLegalTermsAndConditionsPublishArgs,
    GqlSAdminMutationOccasionCooksUpdateArgs,
    GqlSAdminMutationOccasionDeleteArgs,
    GqlSAdminMutationOccasionTestimonialsUpdateArgs,
    GqlSAdminMutationOccasionUpsertArgs,
    GqlSAdminMutationPartnerCooksUpdateArgs,
    GqlSAdminMutationPartnerDeleteArgs,
    GqlSAdminMutationPartnerTestimonialsUpdateArgs,
    GqlSAdminMutationPartnerUpsertArgs,
    GqlSAdminMutationPromoCodeCreateArgs,
    GqlSAdminMutationPromoCodeUpdateArgs,
    GqlSAdminMutationQueuedJobCancelArgs,
    GqlSAdminMutationSessionUserBindArgs,
    GqlSAdminMutationSupportRequestMessageCreateArgs,
    GqlSAdminMutationSupportRequestResolveArgs,
    GqlSAdminMutationSupportRequestUnreadNotificationCountResetArgs,
    GqlSAdminMutationTerminateSessionsArgs,
    GqlSAdminMutationUserAdminNoteUpdateArgs,
    GqlSAdminMutationUserAnonymizeArgs,
    GqlSAdminMutationUserCreateArgs,
    GqlSAdminMutationUserEmailAddressUpdateArgs,
    GqlSAdminMutationUserStatusUpdateArgs,
    GqlSAdminMutationUserUpdateArgs,
    GqlSAdminMutationWebPageUpdateArgs,
    GqlSAdminMutationWhatsAppConversationUnreadCountResetArgs,
    GqlSAdminMutationWhatsAppMessageCreateArgs,
    GqlSAdminMutationWhatsAppMessageReactionUpsertArgs,
    GqlSAdminObjectStorageObjectsArgs,
    GqlSAdminOccasion,
    GqlSAdminOccasionArgs,
    GqlSAdminOutboundEmail,
    GqlSAdminOutboundEmailArgs,
    GqlSAdminOutboundEmailCreationsArgs,
    GqlSAdminOutboundEmailPurposeStatsArgs,
    GqlSAdminOutboundEmailRecipientStatsArgs,
    GqlSAdminOutboundEmailsArgs,
    GqlSAdminOutboundEmailsCountsArgs,
    GqlSAdminPartner,
    GqlSAdminPartnerArgs,
    GqlSAdminPromoCode,
    GqlSAdminPromoCodeArgs,
    GqlSAdminPromoCodesArgs,
    GqlSAdminPromoCodesCountsArgs,
    GqlSAdminSession,
    GqlSAdminSessionArgs,
    GqlSAdminSessionCountsArgs,
    GqlSAdminSessionCreationsArgs,
    GqlSAdminSessionEventsArgs,
    GqlSAdminSessionEventsCountsArgs,
    GqlSAdminSessionEventWebPageVisitCreationsArgs,
    GqlSAdminSessionsArgs,
    GqlSAdminSupportRequest,
    GqlSAdminSupportRequestArgs,
    GqlSAdminSupportRequestsArgs,
    GqlSAdminSupportRequestsCountsArgs,
    GqlSAdminUpcomingBirthdaysArgs,
    GqlSAdminUser,
    GqlSAdminUserArgs,
    GqlSAdminUserCountsArgs,
    GqlSAdminUserRegistrationsArgs,
    GqlSAdminUsersArgs,
    GqlSAdminWebPageArgs,
    GqlSAdminWhatsAppConversation,
    GqlSAdminWhatsAppConversationArgs,
    GqlSAdminWhatsAppConversationsArgs,
    GqlSAdminWhatsAppConversationsCountsArgs,
    GqlSChat,
    GqlSChatMessagePart,
    GqlSChatTurnUpdate,
    GqlSContentSection,
    GqlSCook,
    GqlSCookBookingRequestArgs,
    GqlSCookBookingRequestLookupArgs,
    GqlSCookBookingRequestLookupResult,
    GqlSCookBookingRequestOffer,
    GqlSCookBookingRequestOfferArgs,
    GqlSCookBookingRequestOffersArgs,
    GqlSCookBookingRequestsArgs,
    GqlSCookCallAvailabilityExceptionsArgs,
    GqlSCookCallSlotBooking,
    GqlSCookCallSlotBookingsArgs,
    GqlSCookCallSlotsArgs,
    GqlSCookMeal,
    GqlSCookMealArgs,
    GqlSCookMealsCountsArgs,
    GqlSCookMenu,
    GqlSCookMenuArgs,
    GqlSCookMenusCountsArgs,
    GqlSCookMutation,
    GqlSCookMutationBiographySuggestArgs,
    GqlSCookMutationBookingRequestDeclineArgs,
    GqlSCookMutationBookingRequestGeneratedMenuApplyArgs,
    GqlSCookMutationBookingRequestMenuEvaluationRefreshArgs,
    GqlSCookMutationBookingRequestOfferAcceptArgs,
    GqlSCookMutationBookingRequestOfferCallCreateArgs,
    GqlSCookMutationBookingRequestOfferCallJoinArgs,
    GqlSCookMutationBookingRequestOfferCallLeaveArgs,
    GqlSCookMutationBookingRequestOfferCallSlotCancelArgs,
    GqlSCookMutationBookingRequestOfferCallSlotConfirmArgs,
    GqlSCookMutationBookingRequestOfferCallSlotDeclineArgs,
    GqlSCookMutationBookingRequestOfferCallSlotRequestArgs,
    GqlSCookMutationBookingRequestOfferChatMessageCreateArgs,
    GqlSCookMutationBookingRequestOfferChatMessageReactionUpsertArgs,
    GqlSCookMutationBookingRequestOfferCreateArgs,
    GqlSCookMutationBookingRequestOfferDeclineArgs,
    GqlSCookMutationBookingRequestOfferParticipantAmendmentAcceptArgs,
    GqlSCookMutationBookingRequestOfferParticipantAmendmentDeclineArgs,
    GqlSCookMutationBookingRequestOfferPreparationsCompleteArgs,
    GqlSCookMutationBookingRequestOfferPriceUpdateArgs,
    GqlSCookMutationBookingRequestOfferSuggestedMenusUpdateArgs,
    GqlSCookMutationBookingRequestOfferTestimonialCreateArgs,
    GqlSCookMutationBookingRequestOfferUnreadNotificationCountResetArgs,
    GqlSCookMutationBookingRequestOpenArgs,
    GqlSCookMutationCallAvailabilityExceptionCreateArgs,
    GqlSCookMutationCallAvailabilityExceptionDeleteArgs,
    GqlSCookMutationCallAvailabilityRuleCreateArgs,
    GqlSCookMutationCallAvailabilityRuleDeleteArgs,
    GqlSCookMutationMealCreateArgs,
    GqlSCookMutationMealDeleteArgs,
    GqlSCookMutationMealUpdateArgs,
    GqlSCookMutationMenuCopyArgs,
    GqlSCookMutationMenuDeleteArgs,
    GqlSCookMutationMenuSuggestionFromInventoryArgs,
    GqlSCookMutationMenuSuggestionFromTextArgs,
    GqlSCookMutationMenuSyncToTemplateArgs,
    GqlSCookMutationMenuTitleDescriptionSuggestArgs,
    GqlSCookMutationMenuUpdateArgs,
    GqlSCookMutationStripeOnboardingStartArgs,
    GqlSCookMutationUpdateArgs,
    GqlSCookTestimonial,
    GqlSCustomerTestimonial,
    GqlSHumanChatMessage,
    GqlSMutationAuthEmailOtpDeleteArgs,
    GqlSMutationAuthEmailOtpRequestArgs,
    GqlSMutationAuthEmailOtpVerifyArgs,
    GqlSMutationAuthPasskeyAuthenticateVerifyArgs,
    GqlSMutationAuthTotpVerifyArgs,
    GqlSMutationClientObservabilityReportArgs,
    GqlSMutationSessionNewsletterSubscriptionCreateArgs,
    GqlSMutationSessionWebPageInteractionCreateArgs,
    GqlSMutationSessionWebPageVisitCreateArgs,
    GqlSMutationUserCreateArgs,
    GqlSPublicBlogPostQuery,
    GqlSPublicBlogPostQueryFindOneByPathNameArgs,
    GqlSPublicCity,
    GqlSPublicCityQuery,
    GqlSPublicCityQueryFindOneByPathNameArgs,
    GqlSPublicCook,
    GqlSPublicCookCallSlotsArgs,
    GqlSPublicCookQuery,
    GqlSPublicCookQueryFindManyArgs,
    GqlSPublicCookQueryFindOneArgs,
    GqlSPublicOccasion,
    GqlSPublicOccasionQuery,
    GqlSPublicOccasionQueryFindOneByPathNameArgs,
    GqlSPublicPartner,
    GqlSPublicPartnerQuery,
    GqlSPublicPartnerQueryFindOneByPathNameArgs,
    GqlSPublicWebPageQuery,
    GqlSPublicWebPageQueryFindOneArgs,
    GqlSResolvers,
    GqlSSession,
    GqlSSessionDiscountArgs,
    GqlSSessionLocationSuggestionsArgs,
    GqlSSubscriptionChatTurnUpdatesArgs,
    GqlSUser,
    GqlSUserAssistantChatArgs,
    GqlSUserAssistantChatsArgs,
    GqlSUserBookingRequest,
    GqlSUserBookingRequestArgs,
    GqlSUserBookingRequestOffer,
    GqlSUserBookingRequestPriceImpactArgs,
    GqlSUserBookingRequestTravelImpactArgs,
    GqlSUserGiftCard,
    GqlSUserMutation,
    GqlSUserMutationAuthPasskeyDeleteArgs,
    GqlSUserMutationAuthPasskeyRegisterVerifyArgs,
    GqlSUserMutationAuthTotpDisableArgs,
    GqlSUserMutationAuthTotpEnrollConfirmArgs,
    GqlSUserMutationBookingRequestCancelArgs,
    GqlSUserMutationBookingRequestChurnPromoCodeCreateArgs,
    GqlSUserMutationBookingRequestCreateArgs,
    GqlSUserMutationBookingRequestDiscountUpdateArgs,
    GqlSUserMutationBookingRequestOfferAcceptArgs,
    GqlSUserMutationBookingRequestOfferCallCreateArgs,
    GqlSUserMutationBookingRequestOfferCallJoinArgs,
    GqlSUserMutationBookingRequestOfferCallLeaveArgs,
    GqlSUserMutationBookingRequestOfferCallSlotCancelArgs,
    GqlSUserMutationBookingRequestOfferCallSlotConfirmArgs,
    GqlSUserMutationBookingRequestOfferCallSlotDeclineArgs,
    GqlSUserMutationBookingRequestOfferCallSlotRequestArgs,
    GqlSUserMutationBookingRequestOfferChatMessageCreateArgs,
    GqlSUserMutationBookingRequestOfferChatMessageReactionUpsertArgs,
    GqlSUserMutationBookingRequestOfferConfiguredMenuCreateArgs,
    GqlSUserMutationBookingRequestOfferDeclineArgs,
    GqlSUserMutationBookingRequestOfferParticipantAmendmentCancelArgs,
    GqlSUserMutationBookingRequestOfferParticipantAmendmentCreateArgs,
    GqlSUserMutationBookingRequestOfferPaymentStatusUpdateArgs,
    GqlSUserMutationBookingRequestOfferTestimonialCreateArgs,
    GqlSUserMutationBookingRequestOfferUnreadNotificationCountResetArgs,
    GqlSUserMutationBookingRequestRequestRecallArgs,
    GqlSUserMutationBookingRequestUpdateArgs,
    GqlSUserMutationChatDeleteArgs,
    GqlSUserMutationChatInputCollectionRespondArgs,
    GqlSUserMutationChatMessageCreateArgs,
    GqlSUserMutationChatTitleUpdateArgs,
    GqlSUserMutationChatToolApprovalRespondArgs,
    GqlSUserMutationCookCreateArgs,
    GqlSUserMutationEmailAddressUpdateOtpRequestArgs,
    GqlSUserMutationEmailAddressUpdateOtpVerifyArgs,
    GqlSUserMutationGiftCardCreateArgs,
    GqlSUserMutationGiftCardPayArgs,
    GqlSUserMutationGiftCardPdfsRegenerateArgs,
    GqlSUserMutationSupportRequestCreateArgs,
    GqlSUserMutationSupportRequestMessageCreateArgs,
    GqlSUserMutationSupportRequestUnreadNotificationCountResetArgs,
    GqlSUserMutationTerminateSessionsArgs,
    GqlSUserMutationUserUpdateArgs,
    GqlSUserSupportRequest,
    GqlSUserSupportRequestArgs,
} from './generated';

export function resolversCreate(serverRuntime: ServerRuntime): GqlSResolvers {
    return {
        DateTime: DateTimeResolver,
        Date: DateResolver,
        JSON: JSONResolver,
        EmailAddress: EmailAddressResolver,
        PhoneNumber: PhoneNumberResolver,
        TimeZone: TimeZoneResolver,
        Latitude: LatitudeResolver,
        Longitude: LongitudeResolver,
        HumanChatMessage: {
            __resolveType(obj: GqlSHumanChatMessage) {
                return obj.gqlTypeName;
            },
        },
        ChatMessagePart: {
            __resolveType(obj: GqlSChatMessagePart) {
                return obj.gqlTypeName;
            },
        },
        ChatTurnUpdate: {
            __resolveType(obj: GqlSChatTurnUpdate) {
                return obj.gqlTypeName;
            },
        },
        ContentSection: {
            __resolveType(obj: GqlSContentSection) {
                return obj.gqlTypeName;
            },
        },
        Testimonial: {
            __resolveType(obj: GqlSCustomerTestimonial | GqlSCookTestimonial) {
                return obj.gqlTypeName;
            },
        },
        AdminTestimonial: {
            __resolveType(obj: GqlSAdminCustomerTestimonial | GqlSAdminCookTestimonial) {
                return obj.gqlTypeName;
            },
        },
        CookBookingRequestLookupResult: {
            __resolveType(obj: GqlSCookBookingRequestLookupResult) {
                return obj.gqlTypeName;
            },
        },
        AdminCity: {
            cooks(parent: GqlSAdminCity) {
                return adminCityCooksFindMany(parent, serverRuntime);
            },
            cooksInTravelRadius(parent: GqlSAdminCity) {
                return cityCooksInTravelRadiusFindMany(parent, serverRuntime);
            },
            testimonials(parent: GqlSAdminCity) {
                return adminCityTestimonialsFindMany(parent, serverRuntime);
            },
        },
        PublicCity: {
            featuredCooks(parent: GqlSPublicCity) {
                return cityFeaturedCooksFindMany(parent, serverRuntime);
            },
            testimonials(parent: GqlSPublicCity) {
                return cityTestimonialsFindMany(parent, serverRuntime);
            },
        },
        AdminPartner: {
            cooks(parent: GqlSAdminPartner) {
                return adminPartnerCooksFindMany(parent, serverRuntime);
            },
            promo(parent: GqlSAdminPartner, _: unknown, requestingSession: GqlSSession) {
                return partnerPromoFindOne(parent.partnerId, requestingSession, serverRuntime);
            },
            testimonials(parent: GqlSAdminPartner) {
                return adminPartnerTestimonialsFindMany(parent, serverRuntime);
            },
        },
        PublicPartner: {
            featuredCooks(parent: GqlSPublicPartner) {
                return partnerFeaturedCooksFindMany(parent, serverRuntime);
            },
            promo(parent: GqlSPublicPartner, _: unknown, requestingSession: GqlSSession) {
                return partnerPromoFindOne(parent.partnerId, requestingSession, serverRuntime);
            },
            testimonials(parent: GqlSPublicPartner) {
                return partnerTestimonialsFindMany(parent, serverRuntime);
            },
        },
        AdminOccasion: {
            cooks(parent: GqlSAdminOccasion) {
                return adminOccasionCooksFindMany(parent, serverRuntime);
            },
            promo(parent: GqlSAdminOccasion, _: unknown, requestingSession: GqlSSession) {
                return occasionPromoFindOne(parent.occasionId, requestingSession, serverRuntime);
            },
            testimonials(parent: GqlSAdminOccasion) {
                return adminOccasionTestimonialsFindMany(parent, serverRuntime);
            },
        },
        PublicOccasion: {
            featuredCooks(parent: GqlSPublicOccasion) {
                return occasionFeaturedCooksFindMany(parent, serverRuntime);
            },
            promo(parent: GqlSPublicOccasion, _: unknown, requestingSession: GqlSSession) {
                return occasionPromoFindOne(parent.occasionId, requestingSession, serverRuntime);
            },
            testimonials(parent: GqlSPublicOccasion) {
                return occasionTestimonialsFindMany(parent, serverRuntime);
            },
        },
        Session: {
            user(session: GqlSSession, __: unknown, requestingSession: GqlSSession) {
                // Prefer the parent Session's userId (reloaded from DB on
                // `sessionUpdates`). The SSE connection's requestingSession can
                // still hold a stale null userId after auth binds over HTTP.
                const userId = session.userId ?? requestingSession.userId;
                if (!userId) {
                    return null;
                }
                return sessionUserFindOne({ ...requestingSession, userId }, serverRuntime);
            },
            authEmailOtp(_session: GqlSSession, __: unknown, requestingSession: GqlSSession) {
                return sessionAuthEmailOtpFindOne(requestingSession, serverRuntime);
            },
            authTotpChallenge(_session: GqlSSession, __: unknown, requestingSession: GqlSSession) {
                return sessionAuthTotpChallengeFindOne(requestingSession, serverRuntime);
            },
            giftCard(_session: GqlSSession, __: unknown, requestingSession: GqlSSession) {
                return sessionGiftCardFindOne(requestingSession, serverRuntime);
            },
            giftCardPurchaseError(_session: GqlSSession, __: unknown, requestingSession: GqlSSession) {
                return sessionGiftCardPurchaseErrorFindOne(requestingSession, serverRuntime);
            },
            cookieSetting(_session: GqlSSession, __: unknown, requestingSession: GqlSSession) {
                return sessionCookieSettingFindOne(requestingSession, serverRuntime);
            },
            activeFeatureToggleKeys(session: GqlSSession, __: unknown, requestingSession: GqlSSession) {
                const userId = session.userId ?? requestingSession.userId;
                return sessionFeatureToggleFindActive(serverRuntime, userId);
            },
            locationSuggestions(_session: GqlSSession, args: GqlSSessionLocationSuggestionsArgs, requestingSession: GqlSSession) {
                return sessionLocationSuggestionsFindMany(args, requestingSession, serverRuntime);
            },
            discount(_session: GqlSSession, args: GqlSSessionDiscountArgs, requestingSession: GqlSSession) {
                return sessionDiscount(args, requestingSession, serverRuntime);
            },
        },
        Chat: {
            turns(parent: GqlSChat, _: unknown, requestingSession: GqlSSession) {
                return chatTurnsFindMany(parent, requestingSession, serverRuntime);
            },
        },
        UserBookingRequestOffer: {
            messages(parent: GqlSUserBookingRequestOffer, _: unknown, requestingSession: GqlSSession) {
                return bookingRequestOfferMessagesFindMany(parent, 'user', requestingSession, serverRuntime);
            },
            async activeCallRoom(parent: GqlSUserBookingRequestOffer) {
                const room = await bookingRequestOfferCallRoomFindActive(serverRuntime.db, parent.bookingRequestOfferId);
                return room ? toGqlBookingRequestOfferCallRoom(room) : null;
            },
            customerTestimonial(parent: GqlSUserBookingRequestOffer) {
                return userBookingRequestOfferCustomerTestimonialFindOne(parent, serverRuntime);
            },
            testimonialMissing(parent: GqlSUserBookingRequestOffer) {
                return userBookingRequestOfferTestimonialMissing(parent, serverRuntime);
            },
        },
        UserBookingRequest: {
            travelImpact(parent: GqlSUserBookingRequest, args: GqlSUserBookingRequestTravelImpactArgs) {
                return userBookingRequestTravelImpactFindMany(parent, args, serverRuntime);
            },
            priceImpact(parent: GqlSUserBookingRequest, args: GqlSUserBookingRequestPriceImpactArgs) {
                return userBookingRequestPriceImpactFindMany(parent, args, serverRuntime);
            },
            supportRequest(parent: GqlSUserBookingRequest, _: unknown, requestingSession: GqlSSession) {
                return userBookingRequestSupportRequestFindOne(parent, requestingSession, serverRuntime);
            },
        },
        UserSupportRequest: {
            messages(parent: GqlSUserSupportRequest) {
                return supportRequestMessagesFindMany({ supportRequestId: parent.supportRequestId, viewerRole: 'user' }, serverRuntime);
            },
        },
        AdminSupportRequest: {
            messages(parent: GqlSAdminSupportRequest) {
                return supportRequestMessagesFindMany({ supportRequestId: parent.supportRequestId, viewerRole: 'admin' }, serverRuntime);
            },
        },
        AdminWhatsAppConversation: {
            messages(parent: GqlSAdminWhatsAppConversation) {
                return whatsAppMessagesFindMany({ whatsAppConversationId: parent.whatsAppConversationId }, serverRuntime);
            },
        },
        CookBookingRequestOffer: {
            messages(parent: GqlSCookBookingRequestOffer, _: unknown, requestingSession: GqlSSession) {
                return bookingRequestOfferMessagesFindMany(parent, 'cook', requestingSession, serverRuntime);
            },
            async activeCallRoom(parent: GqlSCookBookingRequestOffer) {
                const room = await bookingRequestOfferCallRoomFindActive(serverRuntime.db, parent.bookingRequestOfferId);
                return room ? toGqlBookingRequestOfferCallRoom(room) : null;
            },
            cookTestimonial(parent: GqlSCookBookingRequestOffer) {
                return cookBookingRequestOfferCookTestimonialFindOne(parent, serverRuntime);
            },
            testimonialMissing(parent: GqlSCookBookingRequestOffer) {
                return cookBookingRequestOfferTestimonialMissing(parent, serverRuntime);
            },
        },
        AdminBookingRequestOffer: {
            messages(parent: GqlSAdminBookingRequestOffer, _: unknown, requestingSession: GqlSSession) {
                return bookingRequestOfferMessagesFindMany(parent, 'admin', requestingSession, serverRuntime);
            },
            async bookingRequest(parent: GqlSAdminBookingRequestOffer, _: unknown, requestingSession: GqlSSession) {
                const bookingRequest = await adminBookingRequestFindOne(
                    { bookingRequestId: parent.bookingRequestId },
                    requestingSession,
                    serverRuntime,
                );
                if (!bookingRequest) {
                    throw new Error(`AdminBookingRequestOffer.bookingRequest: missing request ${parent.bookingRequestId}`);
                }
                return bookingRequest;
            },
            async activeCallRoom(parent: GqlSAdminBookingRequestOffer) {
                const room = await bookingRequestOfferCallRoomFindActive(serverRuntime.db, parent.bookingRequestOfferId);
                return room ? toGqlBookingRequestOfferCallRoom(room) : null;
            },
            callRecordings(parent: GqlSAdminBookingRequestOffer, _: unknown, requestingSession: GqlSSession) {
                return adminBookingRequestOfferCallRecordingsFindMany(parent, requestingSession, serverRuntime);
            },
            queuedJobs(parent: GqlSAdminBookingRequestOffer) {
                return adminBookingRequestOfferQueuedJobsByOfferIdFindMany(parent.bookingRequestOfferId, serverRuntime);
            },
            customerTestimonial(parent: GqlSAdminBookingRequestOffer, _: unknown, requestingSession: GqlSSession) {
                return adminCustomerTestimonialFindOneByOfferId(parent.bookingRequestOfferId, requestingSession, serverRuntime);
            },
            cookTestimonial(parent: GqlSAdminBookingRequestOffer, _: unknown, requestingSession: GqlSSession) {
                return adminCookTestimonialFindOneByOfferId(parent.bookingRequestOfferId, requestingSession, serverRuntime);
            },
        },
        AdminBookingRequest: {
            cooksInTravelRadius(parent: GqlSAdminBookingRequest) {
                return adminBookingRequestCooksInTravelRadiusFindMany(parent, serverRuntime);
            },
            queuedJobs(parent: GqlSAdminBookingRequest, _: unknown, requestingSession: GqlSSession) {
                return adminBookingRequestQueuedJobsFindMany(parent, requestingSession, serverRuntime);
            },
        },
        User: {
            profilePicture(parentUser: GqlSUser) {
                return userProfilePictureFindOne(parentUser, serverRuntime);
            },
            admin(parentUser: GqlSUser, _: unknown, requestingSession: GqlSSession) {
                return userAdminFindOne(parentUser, requestingSession, serverRuntime);
            },
            cook(parentUser: GqlSUser, _: unknown, requestingSession: GqlSSession) {
                return userCookFindOne(parentUser, requestingSession, serverRuntime);
            },
            sessions(parentUser: GqlSUser, _: unknown, requestingSession: GqlSSession) {
                return userSessionsFindMany(parentUser, requestingSession, serverRuntime);
            },
            passkeys(parentUser: GqlSUser, _: unknown, requestingSession: GqlSSession) {
                return userPasskeysFindMany(parentUser, requestingSession, serverRuntime);
            },
            timeBasedOneTimePassword(parentUser: GqlSUser, _: unknown, requestingSession: GqlSSession) {
                return userTimeBasedOneTimePasswordFindOne(parentUser, requestingSession, serverRuntime);
            },
            legalAcceptance(parentUser: GqlSUser, _: unknown, requestingSession: GqlSSession) {
                return userLegalAcceptanceFindOne(parentUser, requestingSession, serverRuntime);
            },
            bookingRequests(parentUser: GqlSUser, _: unknown, requestingSession: GqlSSession) {
                return userBookingRequestFindMany(parentUser, requestingSession, serverRuntime);
            },
            bookingRequest(parentUser: GqlSUser, args: GqlSUserBookingRequestArgs, requestingSession: GqlSSession) {
                return userBookingRequestFindOne(parentUser, args, requestingSession, serverRuntime);
            },
            previousEventAddresses(parentUser: GqlSUser, _: unknown, requestingSession: GqlSSession) {
                return userPreviousEventAddressesFindMany(parentUser, requestingSession, serverRuntime);
            },
            supportRequests(parentUser: GqlSUser, _: unknown, requestingSession: GqlSSession) {
                return userSupportRequestFindMany(parentUser, requestingSession, serverRuntime);
            },
            supportRequest(parentUser: GqlSUser, args: GqlSUserSupportRequestArgs, requestingSession: GqlSSession) {
                return userSupportRequestFindOne(parentUser, args, requestingSession, serverRuntime);
            },
            assistantChats(parentUser: GqlSUser, args: GqlSUserAssistantChatsArgs, requestingSession: GqlSSession) {
                return userAssistantChatFindMany(parentUser, args, requestingSession, serverRuntime);
            },
            assistantChat(parentUser: GqlSUser, args: GqlSUserAssistantChatArgs, requestingSession: GqlSSession) {
                return userAssistantChatFindOne(parentUser, args, requestingSession, serverRuntime);
            },
            giftCards(parentUser: GqlSUser, _: unknown, requestingSession: GqlSSession) {
                return userGiftCardFindMany(parentUser, requestingSession, serverRuntime);
            },
        },

        Admin: {
            users(_parent: GqlSAdmin, args: GqlSAdminUsersArgs, requestingSession: GqlSSession) {
                return adminUserFindMany(args, requestingSession, serverRuntime);
            },
            user(_parent: GqlSAdmin, args: GqlSAdminUserArgs, requestingSession: GqlSSession) {
                return adminUserFindOne(args, requestingSession, serverRuntime);
            },
            cookMeals(_parent: GqlSAdmin, args: GqlSAdminCookMealsArgs, requestingSession: GqlSSession) {
                return adminCookMealFindMany(args, requestingSession, serverRuntime);
            },
            cookMealsCounts(_parent: GqlSAdmin, args: GqlSAdminCookMealsCountsArgs, requestingSession: GqlSSession) {
                return adminCookMealCounts(args, requestingSession, serverRuntime);
            },
            cookMeal(_parent: GqlSAdmin, args: GqlSAdminCookMealArgs, requestingSession: GqlSSession) {
                return adminCookMealFindOne(args, requestingSession, serverRuntime);
            },
            cookMenus(_parent: GqlSAdmin, args: GqlSAdminCookMenusArgs, requestingSession: GqlSSession) {
                return adminCookMenuFindMany(args, requestingSession, serverRuntime);
            },
            cookMenusCounts(_parent: GqlSAdmin, args: GqlSAdminCookMenusCountsArgs, requestingSession: GqlSSession) {
                return adminCookMenuCounts(args, requestingSession, serverRuntime);
            },
            cookMenu(_parent: GqlSAdmin, args: GqlSAdminCookMenuArgs, requestingSession: GqlSSession) {
                return adminCookMenuFindOne(args, requestingSession, serverRuntime);
            },
            userCounts(_parent: GqlSAdmin, args: GqlSAdminUserCountsArgs, requestingSession: GqlSSession) {
                return adminUserCounts(args, requestingSession, serverRuntime);
            },
            userRegistrations(_parent: GqlSAdmin, args: GqlSAdminUserRegistrationsArgs, requestingSession: GqlSSession) {
                return adminUserRegistrationsFindMany(args, requestingSession, serverRuntime);
            },
            userInsights(_parent: GqlSAdmin, _args: Record<string, never>, requestingSession: GqlSSession) {
                return adminUserInsightsFindOne(requestingSession, serverRuntime);
            },
            upcomingBirthdays(_parent: GqlSAdmin, args: GqlSAdminUpcomingBirthdaysArgs, requestingSession: GqlSSession) {
                return adminUserUpcomingBirthdaysFindMany(args, requestingSession, serverRuntime);
            },
            sessions(_parent: GqlSAdmin, args: GqlSAdminSessionsArgs, requestingSession: GqlSSession) {
                return adminSessionFindMany(args, requestingSession, serverRuntime);
            },
            sessionCounts(_parent: GqlSAdmin, args: GqlSAdminSessionCountsArgs, requestingSession: GqlSSession) {
                return adminSessionCounts(args, requestingSession, serverRuntime);
            },
            sessionCreations(_parent: GqlSAdmin, args: GqlSAdminSessionCreationsArgs, requestingSession: GqlSSession) {
                return adminSessionCreationsFindMany(args, requestingSession, serverRuntime);
            },
            session(_parent: GqlSAdmin, args: GqlSAdminSessionArgs, requestingSession: GqlSSession) {
                return adminSessionFindOne(args, requestingSession, serverRuntime);
            },
            sessionEvents(_parent: GqlSAdmin, args: GqlSAdminSessionEventsArgs, requestingSession: GqlSSession) {
                return adminSessionEventFindMany(args.criterion, requestingSession, serverRuntime);
            },
            sessionEventsCounts(_parent: GqlSAdmin, args: GqlSAdminSessionEventsCountsArgs, requestingSession: GqlSSession) {
                return adminSessionEventCounts(args, requestingSession, serverRuntime);
            },
            bookingRequestFormFlow(_parent: GqlSAdmin, args: GqlSAdminBookingRequestFormFlowArgs, requestingSession: GqlSSession) {
                return adminAnalyticsBookingRequestFormFlow(args.range, requestingSession, serverRuntime);
            },
            giftCardFlow(_parent: GqlSAdmin, args: GqlSAdminGiftCardFlowArgs, requestingSession: GqlSSession) {
                return adminAnalyticsGiftCardFlow(args.range, requestingSession, serverRuntime);
            },
            chefSignUpFlow(_parent: GqlSAdmin, args: GqlSAdminChefSignUpFlowArgs, requestingSession: GqlSSession) {
                return adminAnalyticsChefSignUpFlow(args.range, requestingSession, serverRuntime);
            },
            bookingRequestCheckoutFlow(_parent: GqlSAdmin, args: GqlSAdminBookingRequestCheckoutFlowArgs, requestingSession: GqlSSession) {
                return adminAnalyticsBookingRequestCheckoutFlow(args.range, requestingSession, serverRuntime);
            },
            cookBookingRequestOfferFlow(
                _parent: GqlSAdmin,
                args: GqlSAdminCookBookingRequestOfferFlowArgs,
                requestingSession: GqlSSession,
            ) {
                return adminAnalyticsCookBookingRequestOfferFlow(args.range, requestingSession, serverRuntime);
            },
            sessionEventWebPageVisitCreations(
                _parent: GqlSAdmin,
                args: GqlSAdminSessionEventWebPageVisitCreationsArgs,
                requestingSession: GqlSSession,
            ) {
                return adminSessionEventWebPageVisitCreationsFindMany(
                    args.webPageKey,
                    args.range,
                    args.granularity ?? 'day',
                    requestingSession,
                    serverRuntime,
                );
            },
            assistantChats(_parent: GqlSAdmin, args: GqlSAdminAssistantChatsArgs, requestingSession: GqlSSession) {
                return adminAssistantChatFindMany(args, requestingSession, serverRuntime);
            },
            assistantChatsCounts(_parent: GqlSAdmin, args: GqlSAdminAssistantChatsCountsArgs, requestingSession: GqlSSession) {
                return adminAssistantChatsCounts(args, requestingSession, serverRuntime);
            },
            assistantChatCreations(_parent: GqlSAdmin, args: GqlSAdminAssistantChatCreationsArgs, requestingSession: GqlSSession) {
                return adminAssistantChatCreationsFindMany(args, requestingSession, serverRuntime);
            },
            assistantChat(_parent: GqlSAdmin, args: GqlSAdminAssistantChatArgs, requestingSession: GqlSSession) {
                return adminAssistantChatFindOne(args, requestingSession, serverRuntime);
            },
            log(_parent: GqlSAdmin, args: GqlSAdminLogArgs, requestingSession: GqlSSession) {
                return adminLogFindOne(args, requestingSession, serverRuntime);
            },
            logs(_parent: GqlSAdmin, args: GqlSAdminLogsArgs, requestingSession: GqlSSession) {
                return adminLogFindMany(args, requestingSession, serverRuntime);
            },
            logCounts(_parent: GqlSAdmin, args: GqlSAdminLogCountsArgs, requestingSession: GqlSSession) {
                return adminLogCounts(args, requestingSession, serverRuntime);
            },
            logCreations(_parent: GqlSAdmin, args: GqlSAdminLogCreationsArgs, requestingSession: GqlSSession) {
                return adminLogCreationsFindMany(args, requestingSession, serverRuntime);
            },
            databaseSlowStatements(_parent: GqlSAdmin, args: GqlSAdminDatabaseSlowStatementsArgs, requestingSession: GqlSSession) {
                return adminDatabaseSlowStatementsFindMany(args, requestingSession, serverRuntime);
            },
            aiGeneration(_parent: GqlSAdmin, args: GqlSAdminAiGenerationArgs, requestingSession: GqlSSession) {
                return adminAiGenerationFindOne(args, requestingSession, serverRuntime);
            },
            aiGenerations(_parent: GqlSAdmin, args: GqlSAdminAiGenerationsArgs, requestingSession: GqlSSession) {
                return adminAiGenerationFindMany(args, requestingSession, serverRuntime);
            },
            aiGenerationCounts(_parent: GqlSAdmin, args: GqlSAdminAiGenerationCountsArgs, requestingSession: GqlSSession) {
                return adminAiGenerationCounts(args, requestingSession, serverRuntime);
            },
            aiGenerationCreations(_parent: GqlSAdmin, args: GqlSAdminAiGenerationCreationsArgs, requestingSession: GqlSSession) {
                return adminAiGenerationCreationsFindMany(args, requestingSession, serverRuntime);
            },
            legalPrivacyPolicies() {
                return adminLegalPrivacyPolicyFindMany(serverRuntime);
            },
            legalTermsAndConditions() {
                return adminLegalTermsAndConditionsFindMany(serverRuntime);
            },
            legalImprints() {
                return adminLegalImprintFindMany(serverRuntime);
            },
            giftCards(_parent: GqlSAdmin, args: GqlSAdminGiftCardsArgs, requestingSession: GqlSSession) {
                return adminGiftCardFindMany(args, requestingSession, serverRuntime);
            },
            giftCardsCounts(_parent: GqlSAdmin, args: GqlSAdminGiftCardsCountsArgs, requestingSession: GqlSSession) {
                return adminGiftCardCounts(args, requestingSession, serverRuntime);
            },
            giftCardCreations(_parent: GqlSAdmin, args: GqlSAdminGiftCardCreationsArgs, requestingSession: GqlSSession) {
                return adminGiftCardCreationsFindMany(args, requestingSession, serverRuntime);
            },
            giftCardOccasionStats(_parent: GqlSAdmin, args: GqlSAdminGiftCardOccasionStatsArgs, requestingSession: GqlSSession) {
                return adminGiftCardOccasionStatsFindMany(args, requestingSession, serverRuntime);
            },
            giftCardSalesMonthStats(_parent: GqlSAdmin, args: GqlSAdminGiftCardSalesMonthStatsArgs, requestingSession: GqlSSession) {
                return adminGiftCardSalesMonthStatsFindMany(args, requestingSession, serverRuntime);
            },
            giftCardPaidPurchaseAverageCents(_parent: GqlSAdmin, _args: unknown, requestingSession: GqlSSession) {
                return adminGiftCardPaidPurchaseAverageCentsFindOne(requestingSession, serverRuntime);
            },
            giftCard(_parent: GqlSAdmin, args: GqlSAdminGiftCardArgs, requestingSession: GqlSSession) {
                return adminGiftCardFindOne(args, requestingSession, serverRuntime);
            },
            bookingRequests(_parent: GqlSAdmin, args: GqlSAdminBookingRequestsArgs, requestingSession: GqlSSession) {
                return adminBookingRequestFindMany(args, requestingSession, serverRuntime);
            },
            bookingRequestsCounts(_parent: GqlSAdmin, args: GqlSAdminBookingRequestsCountsArgs, requestingSession: GqlSSession) {
                return adminBookingRequestCounts(args, requestingSession, serverRuntime);
            },
            bookingRequestCreations(_parent: GqlSAdmin, args: GqlSAdminBookingRequestCreationsArgs, requestingSession: GqlSSession) {
                return adminBookingRequestCreationsFindMany(args, requestingSession, serverRuntime);
            },
            bookingRequestOccasionStats(
                _parent: GqlSAdmin,
                args: GqlSAdminBookingRequestOccasionStatsArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOccasionStatsFindMany(args, requestingSession, serverRuntime);
            },
            bookingRequestCreationMonthStats(
                _parent: GqlSAdmin,
                args: GqlSAdminBookingRequestCreationMonthStatsArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestCreationMonthStatsFindMany(args, requestingSession, serverRuntime);
            },
            bookingRequestAverageParticipants(_parent: GqlSAdmin, _args: unknown, requestingSession: GqlSSession) {
                return adminBookingRequestAverageParticipantsFindOne(requestingSession, serverRuntime);
            },
            bookingRequestOfferEconomics(
                _parent: GqlSAdmin,
                args: GqlSAdminBookingRequestOfferEconomicsArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferEconomicsFindOne(args, requestingSession, serverRuntime);
            },
            bookingRequestCookOfferStats(
                _parent: GqlSAdmin,
                args: GqlSAdminBookingRequestCookOfferStatsArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestCookOfferStatsFindMany(args, requestingSession, serverRuntime);
            },
            bookingRequest(_parent: GqlSAdmin, args: GqlSAdminBookingRequestArgs, requestingSession: GqlSSession) {
                return adminBookingRequestFindOne(args, requestingSession, serverRuntime);
            },
            cooksInTravelRadius(_parent: GqlSAdmin, args: GqlSAdminCooksInTravelRadiusArgs, requestingSession: GqlSSession) {
                return adminCooksInTravelRadiusPreviewFindMany(args, requestingSession, serverRuntime);
            },
            bookingRequestOffers(_parent: GqlSAdmin, args: GqlSAdminBookingRequestOffersArgs, requestingSession: GqlSSession) {
                return adminBookingRequestOfferFindMany(args, requestingSession, serverRuntime);
            },
            bookingRequestOffersCounts(_parent: GqlSAdmin, args: GqlSAdminBookingRequestOffersCountsArgs, requestingSession: GqlSSession) {
                return adminBookingRequestOfferCounts(args, requestingSession, serverRuntime);
            },
            bookingRequestOffer(_parent: GqlSAdmin, args: GqlSAdminBookingRequestOfferArgs, requestingSession: GqlSSession) {
                return adminBookingRequestOfferFindOne(args, requestingSession, serverRuntime);
            },
            supportRequests(_parent: GqlSAdmin, args: GqlSAdminSupportRequestsArgs, requestingSession: GqlSSession) {
                return adminSupportRequestFindMany(args, requestingSession, serverRuntime);
            },
            supportRequestsCounts(_parent: GqlSAdmin, args: GqlSAdminSupportRequestsCountsArgs, requestingSession: GqlSSession) {
                return adminSupportRequestCounts(args, requestingSession, serverRuntime);
            },
            supportRequest(_parent: GqlSAdmin, args: GqlSAdminSupportRequestArgs, requestingSession: GqlSSession) {
                return adminSupportRequestFindOne(args, requestingSession, serverRuntime);
            },
            whatsAppConversations(_parent: GqlSAdmin, args: GqlSAdminWhatsAppConversationsArgs, requestingSession: GqlSSession) {
                return adminWhatsAppConversationFindMany(args, requestingSession, serverRuntime);
            },
            whatsAppConversationsCounts(
                _parent: GqlSAdmin,
                args: GqlSAdminWhatsAppConversationsCountsArgs,
                requestingSession: GqlSSession,
            ) {
                return adminWhatsAppConversationFindManyCounts(args, requestingSession, serverRuntime);
            },
            whatsAppConversation(_parent: GqlSAdmin, args: GqlSAdminWhatsAppConversationArgs, requestingSession: GqlSSession) {
                return adminWhatsAppConversationFindOne(args, requestingSession, serverRuntime);
            },
            whatsAppConversationsAdminUnreadCount(_parent: GqlSAdmin, _: unknown, requestingSession: GqlSSession) {
                return adminWhatsAppConversationsAdminUnreadCount(requestingSession, serverRuntime);
            },
            calls(_parent: GqlSAdmin, _: unknown, requestingSession: GqlSSession) {
                return adminCallsFindMany(_parent, requestingSession, serverRuntime);
            },
            callTraffic(_parent: GqlSAdmin, args: GqlSAdminCallTrafficArgs, requestingSession: GqlSSession) {
                return adminCallTrafficFindMany(args, requestingSession, serverRuntime);
            },
            callTrafficCounts(_parent: GqlSAdmin, args: GqlSAdminCallTrafficCountsArgs, requestingSession: GqlSSession) {
                return adminCallTrafficCounts(args, requestingSession, serverRuntime);
            },
            callSlotCreations(_parent: GqlSAdmin, args: GqlSAdminCallSlotCreationsArgs, requestingSession: GqlSSession) {
                return adminCallSlotCreationsFindMany(args, requestingSession, serverRuntime);
            },
            callRoomCreations(_parent: GqlSAdmin, args: GqlSAdminCallRoomCreationsArgs, requestingSession: GqlSSession) {
                return adminCallRoomCreationsFindMany(args, requestingSession, serverRuntime);
            },
            callCookStats(_parent: GqlSAdmin, args: GqlSAdminCallCookStatsArgs, requestingSession: GqlSSession) {
                return adminCallCookStatsFindMany(args, requestingSession, serverRuntime);
            },
            call(_parent: GqlSAdmin, args: GqlSAdminCallArgs, requestingSession: GqlSSession) {
                return adminCallFindOne(args, requestingSession, serverRuntime);
            },
            promoCodes(_parent: GqlSAdmin, args: GqlSAdminPromoCodesArgs, requestingSession: GqlSSession) {
                return adminPromoCodeFindMany(args, requestingSession, serverRuntime);
            },
            promoCodesCounts(_parent: GqlSAdmin, args: GqlSAdminPromoCodesCountsArgs, requestingSession: GqlSSession) {
                return adminPromoCodeCounts(args, requestingSession, serverRuntime);
            },
            promoCode(_parent: GqlSAdmin, args: GqlSAdminPromoCodeArgs, requestingSession: GqlSSession) {
                return adminPromoCodeFindOne(args, requestingSession, serverRuntime);
            },
            outboundEmails(_parent: GqlSAdmin, args: GqlSAdminOutboundEmailsArgs, requestingSession: GqlSSession) {
                return adminOutboundEmailFindMany(args, requestingSession, serverRuntime);
            },
            outboundEmailsCounts(_parent: GqlSAdmin, args: GqlSAdminOutboundEmailsCountsArgs, requestingSession: GqlSSession) {
                return adminOutboundEmailCounts(args, requestingSession, serverRuntime);
            },
            outboundEmailCreations(_parent: GqlSAdmin, args: GqlSAdminOutboundEmailCreationsArgs, requestingSession: GqlSSession) {
                return adminOutboundEmailCreationsFindMany(args, requestingSession, serverRuntime);
            },
            outboundEmailRecipientStats(
                _parent: GqlSAdmin,
                args: GqlSAdminOutboundEmailRecipientStatsArgs,
                requestingSession: GqlSSession,
            ) {
                return adminOutboundEmailRecipientStatsFindMany(args, requestingSession, serverRuntime);
            },
            outboundEmailPurposeStats(_parent: GqlSAdmin, args: GqlSAdminOutboundEmailPurposeStatsArgs, requestingSession: GqlSSession) {
                return adminOutboundEmailPurposeStatsFindMany(args, requestingSession, serverRuntime);
            },
            outboundEmail(_parent: GqlSAdmin, args: GqlSAdminOutboundEmailArgs, requestingSession: GqlSSession) {
                return adminOutboundEmailFindOne(args, requestingSession, serverRuntime);
            },
            resendUsage(_parent: GqlSAdmin, _args: unknown, requestingSession: GqlSSession) {
                return adminResendUsage({}, requestingSession, serverRuntime);
            },
            cities() {
                return adminCityFindMany(serverRuntime);
            },
            city(_parent: GqlSAdmin, args: GqlSAdminCityArgs) {
                return adminCityFindOne(args, serverRuntime);
            },
            partners() {
                return adminPartnerFindMany(serverRuntime);
            },
            partner(_parent: GqlSAdmin, args: GqlSAdminPartnerArgs) {
                return adminPartnerFindOne(args, serverRuntime);
            },
            occasions() {
                return adminOccasionFindMany(serverRuntime);
            },
            occasion(_parent: GqlSAdmin, args: GqlSAdminOccasionArgs) {
                return adminOccasionFindOne(args, serverRuntime);
            },
            blogPosts() {
                return adminBlogPostFindMany(serverRuntime);
            },
            blogPost(_parent: GqlSAdmin, args: GqlSAdminBlogPostArgs) {
                return adminBlogPostFindOne(args, serverRuntime);
            },
            webPages() {
                return adminWebPageFindMany(serverRuntime);
            },
            webPage(_parent: GqlSAdmin, args: GqlSAdminWebPageArgs) {
                return adminWebPageFindOne(args, serverRuntime);
            },
            featureToggles() {
                return adminFeatureToggleFindMany(serverRuntime);
            },
            customerTestimonials(_parent: GqlSAdmin, args: GqlSAdminCustomerTestimonialsArgs, requestingSession: GqlSSession) {
                return adminCustomerTestimonialsFindMany(requestingSession, serverRuntime, args.criterion);
            },
            customerTestimonial(_parent: GqlSAdmin, args: GqlSAdminCustomerTestimonialArgs, requestingSession: GqlSSession) {
                return adminCustomerTestimonialFindOne(args, requestingSession, serverRuntime);
            },
            cookTestimonials(_parent: GqlSAdmin, args: GqlSAdminCookTestimonialsArgs, requestingSession: GqlSSession) {
                return adminCookTestimonialsFindMany(requestingSession, serverRuntime, args.criterion);
            },
            cookTestimonial(_parent: GqlSAdmin, args: GqlSAdminCookTestimonialArgs, requestingSession: GqlSSession) {
                return adminCookTestimonialFindOne(args, requestingSession, serverRuntime);
            },
            objectStorageObjects(_parent: GqlSAdmin, args: GqlSAdminObjectStorageObjectsArgs, requestingSession: GqlSSession) {
                return adminObjectStorageObjectFindMany(args, requestingSession, serverRuntime);
            },
            queuedJobs(_parent: GqlSAdmin, _: unknown, requestingSession: GqlSSession) {
                return adminQueuedJobsFindMany(requestingSession, serverRuntime);
            },
        },
        AdminCustomerTestimonial: {
            async user(parent: GqlSAdminCustomerTestimonial, _: unknown, requestingSession: GqlSSession) {
                const user = await adminUserFindOne({ userId: parent.userId }, requestingSession, serverRuntime);
                if (!user) {
                    throw new Error(`AdminCustomerTestimonial.user: missing user ${parent.userId}`);
                }
                return user;
            },
        },
        AdminCookTestimonial: {
            cook(parent: GqlSAdminCookTestimonial) {
                return adminCookTestimonialCookFindOne(parent, serverRuntime);
            },
        },
        AdminPromoCode: {
            bookingRequests(parent: GqlSAdminPromoCode, _: unknown, requestingSession: GqlSSession) {
                return adminBookingRequestFindMany(
                    { criterion: { promoCodeId: parent.promoCodeId, skip: 0, take: 100 } },
                    requestingSession,
                    serverRuntime,
                );
            },
        },
        AdminFeatureToggle: {
            userOverrides(parent: GqlSAdminFeatureToggle) {
                return adminFeatureToggleUserOverrideFindManyByKey(parent, serverRuntime);
            },
        },
        AdminFeatureToggleUserOverride: {
            async user(parent: GqlSAdminFeatureToggleUserOverride, _: unknown, requestingSession: GqlSSession) {
                const user = await adminUserFindOne({ userId: parent.userId }, requestingSession, serverRuntime);
                if (!user) {
                    throw new Error(`AdminFeatureToggleUserOverride.user: missing user ${parent.userId}`);
                }
                return user;
            },
        },
        AdminSession: {
            user(parent: GqlSAdminSession, _: unknown, requestingSession: GqlSSession) {
                if (!parent.userId) {
                    return null;
                }
                return adminUserFindOne({ userId: parent.userId }, requestingSession, serverRuntime);
            },
        },
        AdminAssistantChat: {
            async user(parent: GqlSAdminAssistantChat, _: unknown, requestingSession: GqlSSession) {
                const user = await adminUserFindOne({ userId: parent.userId }, requestingSession, serverRuntime);
                if (!user) {
                    throw new Error(`AdminAssistantChat.user: missing user ${parent.userId}`);
                }
                return user;
            },
            turns(parent: GqlSAdminAssistantChat, _: unknown, requestingSession: GqlSSession) {
                return chatTurnsFindMany(parent, requestingSession, serverRuntime, { skipOwnershipCheck: true });
            },
        },
        AdminLog: {
            session(parent: GqlSAdminLog, _: unknown, requestingSession: GqlSSession) {
                if (!parent.sessionId) {
                    return null;
                }
                return adminSessionFindOne({ sessionId: parent.sessionId }, requestingSession, serverRuntime);
            },
        },
        AdminAiGeneration: {
            user(parent: GqlSAdminAiGeneration, _: unknown, requestingSession: GqlSSession) {
                if (!parent.userId) {
                    return null;
                }
                return adminUserFindOne({ userId: parent.userId }, requestingSession, serverRuntime);
            },
            session(parent: GqlSAdminAiGeneration, _: unknown, requestingSession: GqlSSession) {
                if (!parent.sessionId) {
                    return null;
                }
                return adminSessionFindOne({ sessionId: parent.sessionId }, requestingSession, serverRuntime);
            },
        },
        AdminOutboundEmail: {
            user(parent: GqlSAdminOutboundEmail, _: unknown, requestingSession: GqlSSession) {
                if (!parent.userId) {
                    return null;
                }
                return adminUserFindOne({ userId: parent.userId }, requestingSession, serverRuntime);
            },
            attachments(parent: GqlSAdminOutboundEmail) {
                return adminOutboundEmailAttachmentsFindMany(parent, serverRuntime);
            },
        },
        AdminGiftCard: {
            invoiceFileUpload(parent: GqlSAdminGiftCard) {
                return giftCardFileUploadFindOne(parent.invoiceFileUploadId, serverRuntime);
            },
            voucherFileUpload(parent: GqlSAdminGiftCard) {
                return giftCardFileUploadFindOne(parent.voucherFileUploadId, serverRuntime);
            },
        },
        UserGiftCard: {
            invoiceFileUpload(parent: GqlSUserGiftCard) {
                return giftCardFileUploadFindOne(parent.invoiceFileUploadId, serverRuntime);
            },
            voucherFileUpload(parent: GqlSUserGiftCard) {
                return giftCardFileUploadFindOne(parent.voucherFileUploadId, serverRuntime);
            },
        },
        Cook: {
            rating(parent: GqlSCook) {
                return publicCookCustomerTestimonialRatingSummary(parent.cookId, serverRuntime);
            },
            biographySummaryGenerating(parent: GqlSCook) {
                return cookBiographySummaryGenerating(serverRuntime, parent.cookId);
            },
            logo(parent: GqlSCook) {
                return cookLogoFindOne(parent.cookId, serverRuntime);
            },
            stripeAccountDetails(parent: GqlSCook, _: unknown, requestingSession: GqlSSession) {
                return cookStripeAccountDetailsFindOne(parent, requestingSession, serverRuntime);
            },
            stripeWallet(parent: GqlSCook, _: unknown, requestingSession: GqlSSession) {
                return cookStripeWalletFindOne(parent, requestingSession, serverRuntime);
            },
            callAvailabilityRules(parent: GqlSCook, _: unknown, requestingSession: GqlSSession) {
                return cookCallAvailabilityRuleFindMany(parent, requestingSession, serverRuntime);
            },
            callAvailabilityExceptions(parent: GqlSCook, args: GqlSCookCallAvailabilityExceptionsArgs, requestingSession: GqlSSession) {
                return cookCallAvailabilityExceptionFindMany(parent, args, requestingSession, serverRuntime);
            },
            async callSlots(parent: GqlSCook, args: GqlSCookCallSlotsArgs) {
                return cookCallSlotsFindMany(serverRuntime.db, {
                    cookId: parent.cookId,
                    from: new Date(args.from),
                    to: new Date(args.to),
                });
            },
            callSlotBookings(parent: GqlSCook, args: GqlSCookCallSlotBookingsArgs, requestingSession: GqlSSession) {
                return cookCallSlotBookingsFindMany(parent, args, requestingSession, serverRuntime);
            },
            meals(parent: GqlSCook, _: unknown, requestingSession: GqlSSession) {
                return cookMealFindMany(parent, requestingSession, serverRuntime);
            },
            meal(parent: GqlSCook, args: GqlSCookMealArgs, requestingSession: GqlSSession) {
                return cookMealFindOne(parent, args, requestingSession, serverRuntime);
            },
            mealsCounts(parent: GqlSCook, args: GqlSCookMealsCountsArgs, requestingSession: GqlSSession) {
                return cookMealCounts(parent, args, requestingSession, serverRuntime);
            },
            menus(parent: GqlSCook, _: unknown, requestingSession: GqlSSession) {
                return cookMenuFindMany(parent, requestingSession, serverRuntime);
            },
            offerMenus(parent: GqlSCook, _: unknown, requestingSession: GqlSSession) {
                return cookOfferMenuFindMany(parent, requestingSession, serverRuntime);
            },
            menu(parent: GqlSCook, args: GqlSCookMenuArgs, requestingSession: GqlSSession) {
                return cookMenuFindOne(parent, args, requestingSession, serverRuntime);
            },
            menusCounts(parent: GqlSCook, args: GqlSCookMenusCountsArgs, requestingSession: GqlSSession) {
                return cookMenuCounts(parent, args, requestingSession, serverRuntime);
            },
            bookingRequests(parent: GqlSCook, args: GqlSCookBookingRequestsArgs, requestingSession: GqlSSession) {
                return cookBookingRequestFindMany(parent, args, requestingSession, serverRuntime);
            },
            bookingRequest(parent: GqlSCook, args: GqlSCookBookingRequestArgs, requestingSession: GqlSSession) {
                return cookBookingRequestFindOne(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestLookup(parent: GqlSCook, args: GqlSCookBookingRequestLookupArgs, requestingSession: GqlSSession) {
                return cookBookingRequestLookup(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOffers(parent: GqlSCook, args: GqlSCookBookingRequestOffersArgs, requestingSession: GqlSSession) {
                return cookBookingRequestOfferFindMany(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOffer(parent: GqlSCook, args: GqlSCookBookingRequestOfferArgs, requestingSession: GqlSSession) {
                return cookBookingRequestOfferFindOne(parent, args, requestingSession, serverRuntime);
            },
        },
        CookCallSlotBooking: {
            customer(parent: GqlSCookCallSlotBooking, _: unknown, requestingSession: GqlSSession) {
                return cookCallSlotBookingCustomerFindOne(parent, requestingSession, serverRuntime);
            },
        },
        CookMeal: {
            relationships(parent: GqlSCookMeal, _: unknown, requestingSession: GqlSSession) {
                return cookMealRelationshipsFind(parent.mealId, requestingSession, serverRuntime);
            },
        },
        AdminCookMeal: {
            relationships(parent: GqlSAdminCookMeal, _: unknown, requestingSession: GqlSSession) {
                return cookMealRelationshipsFind(parent.mealId, requestingSession, serverRuntime);
            },
        },
        CookMenu: {
            templateMenu(parent: GqlSCookMenu, _: unknown, requestingSession: GqlSSession) {
                if (parent.copyOfMenuId == null || requestingSession.userId == null) return null;
                return cookMenuTemplateFindOne(requestingSession.userId, parent.copyOfMenuId, requestingSession, serverRuntime);
            },
        },
        CookMutation: {
            update(parent: GqlSCookMutation, args: GqlSCookMutationUpdateArgs, requestingSession: GqlSSession) {
                return cookUpdate(parent, args, requestingSession, serverRuntime);
            },
            stripeOnboardingStart(
                parent: GqlSCookMutation,
                args: GqlSCookMutationStripeOnboardingStartArgs,
                requestingSession: GqlSSession,
            ) {
                return cookStripeOnboardingStart(parent, args, requestingSession, serverRuntime);
            },
            stripeStatusSync(parent: GqlSCookMutation, _: unknown, requestingSession: GqlSSession) {
                return cookStripeStatusSync(parent, requestingSession, serverRuntime);
            },
            stripeDashboardUrlCreate(parent: GqlSCookMutation, _: unknown, requestingSession: GqlSSession) {
                return cookStripeDashboardUrlCreate(parent, requestingSession, serverRuntime);
            },
            mealCreate(parent: GqlSCookMutation, args: GqlSCookMutationMealCreateArgs, requestingSession: GqlSSession) {
                return cookMealCreate(parent, args, requestingSession, serverRuntime);
            },
            mealUpdate(parent: GqlSCookMutation, args: GqlSCookMutationMealUpdateArgs, requestingSession: GqlSSession) {
                return cookMealUpdate(parent, args, requestingSession, serverRuntime);
            },
            mealDelete(parent: GqlSCookMutation, args: GqlSCookMutationMealDeleteArgs, requestingSession: GqlSSession) {
                return cookMealDelete(parent, args, requestingSession, serverRuntime);
            },
            menuCreate(parent: GqlSCookMutation, _: unknown, requestingSession: GqlSSession) {
                return cookMenuCreate(parent, requestingSession, serverRuntime);
            },
            menuUpdate(parent: GqlSCookMutation, args: GqlSCookMutationMenuUpdateArgs, requestingSession: GqlSSession) {
                return cookMenuUpdate(parent, args, requestingSession, serverRuntime);
            },
            menuDelete(parent: GqlSCookMutation, args: GqlSCookMutationMenuDeleteArgs, requestingSession: GqlSSession) {
                return cookMenuDelete(parent, args, requestingSession, serverRuntime);
            },
            menuCopy(parent: GqlSCookMutation, args: GqlSCookMutationMenuCopyArgs, requestingSession: GqlSSession) {
                return cookMenuCopy(parent, args, requestingSession, serverRuntime);
            },
            menuSyncToTemplate(parent: GqlSCookMutation, args: GqlSCookMutationMenuSyncToTemplateArgs, requestingSession: GqlSSession) {
                return cookMenuSyncToTemplate(parent, args, requestingSession, serverRuntime);
            },
            menuSuggestionFromText(
                parent: GqlSCookMutation,
                args: GqlSCookMutationMenuSuggestionFromTextArgs,
                requestingSession: GqlSSession,
            ) {
                return cookMenuSuggestionFromText(parent, args, requestingSession, serverRuntime);
            },
            menuSuggestionFromInventory(
                parent: GqlSCookMutation,
                args: GqlSCookMutationMenuSuggestionFromInventoryArgs,
                requestingSession: GqlSSession,
            ) {
                return cookMenuSuggestionFromInventory(parent, args, requestingSession, serverRuntime);
            },
            menuTitleDescriptionSuggest(
                parent: GqlSCookMutation,
                args: GqlSCookMutationMenuTitleDescriptionSuggestArgs,
                requestingSession: GqlSSession,
            ) {
                return cookMenuTitleDescriptionSuggest(parent, args, requestingSession, serverRuntime);
            },
            biographySuggest(parent: GqlSCookMutation, args: GqlSCookMutationBiographySuggestArgs, requestingSession: GqlSSession) {
                return cookBiographySuggest(parent, args, requestingSession, serverRuntime);
            },
            callAvailabilityRuleCreate(
                parent: GqlSCookMutation,
                args: GqlSCookMutationCallAvailabilityRuleCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return cookCallAvailabilityRuleCreate(parent, args, requestingSession, serverRuntime);
            },
            callAvailabilityRuleDelete(
                parent: GqlSCookMutation,
                args: GqlSCookMutationCallAvailabilityRuleDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return cookCallAvailabilityRuleDelete(parent, args, requestingSession, serverRuntime);
            },
            callAvailabilityExceptionCreate(
                parent: GqlSCookMutation,
                args: GqlSCookMutationCallAvailabilityExceptionCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return cookCallAvailabilityExceptionCreate(parent, args, requestingSession, serverRuntime);
            },
            callAvailabilityExceptionDelete(
                parent: GqlSCookMutation,
                args: GqlSCookMutationCallAvailabilityExceptionDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return cookCallAvailabilityExceptionDelete(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOpen(parent: GqlSCookMutation, args: GqlSCookMutationBookingRequestOpenArgs, requestingSession: GqlSSession) {
                return cookBookingRequestOpen(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestMenuEvaluationRefresh(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestMenuEvaluationRefreshArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestMenuEvaluationRefresh(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestGeneratedMenuApply(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestGeneratedMenuApplyArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestGeneratedMenuApply(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestDecline(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestDeclineArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestDecline(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCreate(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferAccept(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferAcceptArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferAccept(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferDecline(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferDeclineArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferDecline(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferParticipantAmendmentAccept(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferParticipantAmendmentAcceptArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferParticipantAmendmentAccept(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferParticipantAmendmentDecline(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferParticipantAmendmentDeclineArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferParticipantAmendmentDecline(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferPreparationsComplete(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferPreparationsCompleteArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferPreparationsComplete(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferPriceUpdate(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferPriceUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferPriceUpdate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferSuggestedMenusUpdate(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferSuggestedMenusUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferSuggestedMenusUpdate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferTestimonialCreate(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferTestimonialCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferTestimonialCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferChatMessageCreate(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferChatMessageCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferChatMessageCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferChatMessageReactionUpsert(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferChatMessageReactionUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return bookingRequestOfferChatMessageReactionUpsert(
                    {
                        reactorUserId: parent.cookId,
                        reactorRole: 'COOK',
                        bookingRequestOfferEventId: args.bookingRequestOfferEventId,
                        emoji: args.emoji,
                    },
                    requestingSession,
                    serverRuntime,
                );
            },
            bookingRequestOfferUnreadNotificationCountReset(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferUnreadNotificationCountResetArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferUnreadNotificationCountReset(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallSlotRequest(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferCallSlotRequestArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferCallSlotRequest(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallSlotConfirm(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferCallSlotConfirmArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferCallSlotConfirm(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallSlotDecline(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferCallSlotDeclineArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferCallSlotDecline(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallSlotCancel(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferCallSlotCancelArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferCallSlotCancel(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallCreate(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferCallCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferCallCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallJoin(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferCallJoinArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferCallJoin(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallLeave(
                parent: GqlSCookMutation,
                args: GqlSCookMutationBookingRequestOfferCallLeaveArgs,
                requestingSession: GqlSSession,
            ) {
                return cookBookingRequestOfferCallLeave(parent, args, requestingSession, serverRuntime);
            },
        },
        AdminUser: {
            profilePicture(parentUser: GqlSAdminUser) {
                return userProfilePictureFindOne(parentUser, serverRuntime);
            },
            cook(parent: GqlSAdminUser) {
                return adminUserCookFindOne(parent, serverRuntime);
            },
            featureToggleOverrides(parent: GqlSAdminUser) {
                return adminFeatureToggleUserOverrideFindMany(parent, serverRuntime);
            },
        },
        AdminCook: {
            user(parent: GqlSAdminCook, _: unknown, requestingSession: GqlSSession) {
                return adminCookUserFindOne(parent, requestingSession, serverRuntime);
            },
            biographySummaryGenerating(parent: GqlSAdminCook) {
                return cookBiographySummaryGenerating(serverRuntime, parent.cookId);
            },
            logo(parent: GqlSAdminCook) {
                return cookLogoFindOne(parent.cookId, serverRuntime);
            },
            rating(parent: GqlSAdminCook) {
                return publicCookCustomerTestimonialRatingSummary(parent.cookId, serverRuntime);
            },
            callAvailabilityRules(parent: GqlSAdminCook, _: unknown, requestingSession: GqlSSession) {
                return cookCallAvailabilityRuleFindMany(parent, requestingSession, serverRuntime);
            },
            featuredOn(parent: GqlSAdminCook) {
                return adminCookFeaturedLandingsFindMany(parent.cookId, serverRuntime);
            },
            stripeAccountDetails(parent: GqlSAdminCook, _: unknown, requestingSession: GqlSSession) {
                return adminCookStripeAccountDetailsFindOne(parent, requestingSession, serverRuntime);
            },
            stripeWallet(parent: GqlSAdminCook, _: unknown, requestingSession: GqlSSession) {
                return adminCookStripeWalletFindOne(parent, requestingSession, serverRuntime);
            },
        },
        AdminMutation: {
            userCreate(parent: GqlSAdminMutation, args: GqlSAdminMutationUserCreateArgs, requestingSession: GqlSSession) {
                return adminUserCreate(parent, args, requestingSession, serverRuntime);
            },
            userAdminNoteUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationUserAdminNoteUpdateArgs, requestingSession: GqlSSession) {
                return adminUserAdminNoteUpdate(parent, args, requestingSession, serverRuntime);
            },
            userUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationUserUpdateArgs, requestingSession: GqlSSession) {
                return adminUserUpdate(parent, args, requestingSession, serverRuntime);
            },
            userEmailAddressUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationUserEmailAddressUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminUserEmailAddressUpdate(parent, args, requestingSession, serverRuntime);
            },
            userAnonymize(parent: GqlSAdminMutation, args: GqlSAdminMutationUserAnonymizeArgs, requestingSession: GqlSSession) {
                return adminUserAnonymize(parent, args, requestingSession, serverRuntime);
            },
            userStatusUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationUserStatusUpdateArgs, requestingSession: GqlSSession) {
                return adminUserStatusUpdate(parent, args, requestingSession, serverRuntime);
            },
            sessionUserBind(parent: GqlSAdminMutation, args: GqlSAdminMutationSessionUserBindArgs, requestingSession: GqlSSession) {
                return adminSessionUserBind(parent, args, requestingSession, serverRuntime);
            },
            terminateSessions(parent: GqlSAdminMutation, args: GqlSAdminMutationTerminateSessionsArgs, requestingSession: GqlSSession) {
                return adminSessionTerminateMany(parent, args, requestingSession, serverRuntime);
            },
            cookApprovalUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationCookApprovalUpdateArgs, requestingSession: GqlSSession) {
                return adminCookApprovalUpdate(parent, args, requestingSession, serverRuntime);
            },
            cookUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationCookUpdateArgs, requestingSession: GqlSSession) {
                return adminCookUpdate(parent, args, requestingSession, serverRuntime);
            },
            cookBiographySuggest(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCookBiographySuggestArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCookBiographySuggest(parent, args, requestingSession, serverRuntime);
            },
            cookBiographySummarySuggest(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCookBiographySummarySuggestArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCookBiographySummarySuggest(parent, args, requestingSession, serverRuntime);
            },
            cookMealCreate(parent: GqlSAdminMutation, args: GqlSAdminMutationCookMealCreateArgs, requestingSession: GqlSSession) {
                return adminCookMealCreate(parent, args, requestingSession, serverRuntime);
            },
            cookMealUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationCookMealUpdateArgs, requestingSession: GqlSSession) {
                return adminCookMealUpdate(parent, args, requestingSession, serverRuntime);
            },
            cookMealDelete(parent: GqlSAdminMutation, args: GqlSAdminMutationCookMealDeleteArgs, requestingSession: GqlSSession) {
                return adminCookMealDelete(parent, args, requestingSession, serverRuntime);
            },
            cookMenuCreate(parent: GqlSAdminMutation, args: GqlSAdminMutationCookMenuCreateArgs, requestingSession: GqlSSession) {
                return adminCookMenuCreate(parent, args, requestingSession, serverRuntime);
            },
            cookMenuUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationCookMenuUpdateArgs, requestingSession: GqlSSession) {
                return adminCookMenuUpdate(parent, args, requestingSession, serverRuntime);
            },
            cookMenuDelete(parent: GqlSAdminMutation, args: GqlSAdminMutationCookMenuDeleteArgs, requestingSession: GqlSSession) {
                return adminCookMenuDelete(parent, args, requestingSession, serverRuntime);
            },
            cookMenuCopy(parent: GqlSAdminMutation, args: GqlSAdminMutationCookMenuCopyArgs, requestingSession: GqlSSession) {
                return adminCookMenuCopy(parent, args, requestingSession, serverRuntime);
            },
            legalPrivacyPolicyDraftCreate(parent: GqlSAdminMutation, _: unknown, requestingSession: GqlSSession) {
                return adminLegalPrivacyPolicyDraftCreate(parent, requestingSession, serverRuntime);
            },
            legalPrivacyPolicyDraftUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationLegalPrivacyPolicyDraftUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminLegalPrivacyPolicyDraftUpdate(parent, args, requestingSession, serverRuntime);
            },
            legalPrivacyPolicyPublish(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationLegalPrivacyPolicyPublishArgs,
                requestingSession: GqlSSession,
            ) {
                return adminLegalPrivacyPolicyPublish(parent, args, requestingSession, serverRuntime);
            },
            legalTermsAndConditionsDraftCreate(parent: GqlSAdminMutation, _: unknown, requestingSession: GqlSSession) {
                return adminLegalTermsAndConditionsDraftCreate(parent, requestingSession, serverRuntime);
            },
            legalTermsAndConditionsDraftUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationLegalTermsAndConditionsDraftUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminLegalTermsAndConditionsDraftUpdate(parent, args, requestingSession, serverRuntime);
            },
            legalTermsAndConditionsPublish(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationLegalTermsAndConditionsPublishArgs,
                requestingSession: GqlSSession,
            ) {
                return adminLegalTermsAndConditionsPublish(parent, args, requestingSession, serverRuntime);
            },
            legalImprintDraftCreate(parent: GqlSAdminMutation, _: unknown, requestingSession: GqlSSession) {
                return adminLegalImprintDraftCreate(parent, requestingSession, serverRuntime);
            },
            legalImprintDraftUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationLegalImprintDraftUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminLegalImprintDraftUpdate(parent, args, requestingSession, serverRuntime);
            },
            legalImprintPublish(parent: GqlSAdminMutation, args: GqlSAdminMutationLegalImprintPublishArgs, requestingSession: GqlSSession) {
                return adminLegalImprintPublish(parent, args, requestingSession, serverRuntime);
            },
            cityUpsert(parent: GqlSAdminMutation, args: GqlSAdminMutationCityUpsertArgs, requestingSession: GqlSSession) {
                return adminCityUpsert(parent, args, requestingSession, serverRuntime);
            },
            cityDelete(parent: GqlSAdminMutation, args: GqlSAdminMutationCityDeleteArgs, requestingSession: GqlSSession) {
                return adminCityDelete(parent, args, requestingSession, serverRuntime);
            },
            cityCooksUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationCityCooksUpdateArgs, requestingSession: GqlSSession) {
                return adminCityCooksUpdate(parent, args, requestingSession, serverRuntime);
            },
            cityTestimonialsUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCityTestimonialsUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCityTestimonialsUpdate(parent, args, requestingSession, serverRuntime);
            },
            partnerUpsert(parent: GqlSAdminMutation, args: GqlSAdminMutationPartnerUpsertArgs, requestingSession: GqlSSession) {
                return adminPartnerUpsert(parent, args, requestingSession, serverRuntime);
            },
            partnerDelete(parent: GqlSAdminMutation, args: GqlSAdminMutationPartnerDeleteArgs, requestingSession: GqlSSession) {
                return adminPartnerDelete(parent, args, requestingSession, serverRuntime);
            },
            partnerCooksUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationPartnerCooksUpdateArgs, requestingSession: GqlSSession) {
                return adminPartnerCooksUpdate(parent, args, requestingSession, serverRuntime);
            },
            partnerTestimonialsUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationPartnerTestimonialsUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminPartnerTestimonialsUpdate(parent, args, requestingSession, serverRuntime);
            },
            occasionUpsert(parent: GqlSAdminMutation, args: GqlSAdminMutationOccasionUpsertArgs, requestingSession: GqlSSession) {
                return adminOccasionUpsert(parent, args, requestingSession, serverRuntime);
            },
            occasionDelete(parent: GqlSAdminMutation, args: GqlSAdminMutationOccasionDeleteArgs, requestingSession: GqlSSession) {
                return adminOccasionDelete(parent, args, requestingSession, serverRuntime);
            },
            occasionCooksUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationOccasionCooksUpdateArgs, requestingSession: GqlSSession) {
                return adminOccasionCooksUpdate(parent, args, requestingSession, serverRuntime);
            },
            occasionTestimonialsUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationOccasionTestimonialsUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminOccasionTestimonialsUpdate(parent, args, requestingSession, serverRuntime);
            },
            customerTestimonialCreate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCustomerTestimonialCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCustomerTestimonialCreate(parent, args, requestingSession, serverRuntime);
            },
            customerTestimonialUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCustomerTestimonialUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCustomerTestimonialUpdate(parent, args, requestingSession, serverRuntime);
            },
            customerTestimonialDelete(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCustomerTestimonialDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCustomerTestimonialDelete(parent, args, requestingSession, serverRuntime);
            },
            customerTestimonialImageUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCustomerTestimonialImageUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCustomerTestimonialImageUpdate(parent, args, requestingSession, serverRuntime);
            },
            customerTestimonialPublish(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCustomerTestimonialPublishArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCustomerTestimonialPublish(parent, args, requestingSession, serverRuntime);
            },
            cookTestimonialCreate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCookTestimonialCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCookTestimonialCreate(parent, args, requestingSession, serverRuntime);
            },
            cookTestimonialUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCookTestimonialUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCookTestimonialUpdate(parent, args, requestingSession, serverRuntime);
            },
            cookTestimonialDelete(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCookTestimonialDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCookTestimonialDelete(parent, args, requestingSession, serverRuntime);
            },
            cookTestimonialImageUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCookTestimonialImageUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCookTestimonialImageUpdate(parent, args, requestingSession, serverRuntime);
            },
            cookTestimonialPublish(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationCookTestimonialPublishArgs,
                requestingSession: GqlSSession,
            ) {
                return adminCookTestimonialPublish(parent, args, requestingSession, serverRuntime);
            },
            blogPostUpsert(parent: GqlSAdminMutation, args: GqlSAdminMutationBlogPostUpsertArgs, requestingSession: GqlSSession) {
                return adminBlogPostUpsert(parent, args, requestingSession, serverRuntime);
            },
            blogPostDelete(parent: GqlSAdminMutation, args: GqlSAdminMutationBlogPostDeleteArgs, requestingSession: GqlSSession) {
                return adminBlogPostDelete(parent, args, requestingSession, serverRuntime);
            },
            webPageUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationWebPageUpdateArgs, requestingSession: GqlSSession) {
                return adminWebPageUpdate(parent, args, requestingSession, serverRuntime);
            },
            featureToggleUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationFeatureToggleUpdateArgs, requestingSession: GqlSSession) {
                return adminFeatureToggleUpdate(parent, args, requestingSession, serverRuntime);
            },
            featureToggleUserOverrideUpsert(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationFeatureToggleUserOverrideUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFeatureToggleUserOverrideUpsert(parent, args, requestingSession, serverRuntime);
            },
            featureToggleUserOverrideDelete(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationFeatureToggleUserOverrideDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminFeatureToggleUserOverrideDelete(parent, args, requestingSession, serverRuntime);
            },
            promoCodeCreate(parent: GqlSAdminMutation, args: GqlSAdminMutationPromoCodeCreateArgs, requestingSession: GqlSSession) {
                return adminPromoCodeCreate(parent, args, requestingSession, serverRuntime);
            },
            promoCodeUpdate(parent: GqlSAdminMutation, args: GqlSAdminMutationPromoCodeUpdateArgs, requestingSession: GqlSSession) {
                return adminPromoCodeUpdate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestCreate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestUpdate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCreate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferUpdate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferConfiguredMenuUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferConfiguredMenuUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferConfiguredMenuUpdate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestPublicationApprove(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestPublicationApproveArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestPublicationApprove(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestCooksNotify(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestCooksNotifyArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestCooksNotify(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferPreparationsClear(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferPreparationsClearArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferPreparationsClear(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferPayoutRelease(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferPayoutReleaseArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferPayoutRelease(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferPayoutMarkOutOfSystem(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferPayoutMarkOutOfSystemArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferPayoutMarkOutOfSystem(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferPayoutAlreadyTookPlaceCheck(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferPayoutAlreadyTookPlaceCheckArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferPayoutAlreadyTookPlaceCheck(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferChatMessageCreate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferChatMessageCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferChatMessageCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferChatMessageReactionUpsert(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferChatMessageReactionUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return bookingRequestOfferChatMessageReactionUpsert(
                    {
                        reactorUserId: parent.adminId,
                        reactorRole: 'ADMIN',
                        bookingRequestOfferEventId: args.bookingRequestOfferEventId,
                        emoji: args.emoji,
                    },
                    requestingSession,
                    serverRuntime,
                );
            },
            bookingRequestOfferChatMessageUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferChatMessageUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferChatMessageUpdate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferChatMessageVisibilityUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferChatMessageVisibilityUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferChatMessageVisibilityUpdate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferChatMessageDelete(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferChatMessageDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferChatMessageDelete(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferChatReviewAcknowledge(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferChatReviewAcknowledgeArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferChatReviewAcknowledge(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallCreate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferCallCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferCallCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallJoin(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferCallJoinArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferCallJoin(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallLeave(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferCallLeaveArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferCallLeave(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallSlotDecline(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferCallSlotDeclineArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferCallSlotDecline(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallRecordingDelete(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferCallRecordingDeleteArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferCallRecordingDelete(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallRecordingSummaryGenerate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferCallRecordingSummaryGenerateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferCallRecordingSummaryGenerate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestCancel(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestCancelArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestCancel(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestDiscountUpdate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestDiscountUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestDiscountUpdate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferHandover(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationBookingRequestOfferHandoverArgs,
                requestingSession: GqlSSession,
            ) {
                return adminBookingRequestOfferHandover(parent, args, requestingSession, serverRuntime);
            },
            supportRequestMessageCreate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationSupportRequestMessageCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminSupportRequestMessageCreate(parent, args, requestingSession, serverRuntime);
            },
            supportRequestUnreadNotificationCountReset(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationSupportRequestUnreadNotificationCountResetArgs,
                requestingSession: GqlSSession,
            ) {
                return adminSupportRequestUnreadNotificationCountReset(parent, args, requestingSession, serverRuntime);
            },
            supportRequestResolve(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationSupportRequestResolveArgs,
                requestingSession: GqlSSession,
            ) {
                return adminSupportRequestResolve(parent, args, requestingSession, serverRuntime);
            },
            queuedJobCancel(parent: GqlSAdminMutation, args: GqlSAdminMutationQueuedJobCancelArgs, requestingSession: GqlSSession) {
                return adminQueuedJobCancel(parent, args, requestingSession, serverRuntime);
            },
            whatsAppMessageCreate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationWhatsAppMessageCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminWhatsAppMessageCreate(parent, args, requestingSession, serverRuntime);
            },
            whatsAppMessageReactionUpsert(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationWhatsAppMessageReactionUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return adminWhatsAppMessageReactionUpsert(parent, args, requestingSession, serverRuntime);
            },
            whatsAppConversationUnreadCountReset(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationWhatsAppConversationUnreadCountResetArgs,
                requestingSession: GqlSSession,
            ) {
                return adminWhatsAppConversationUnreadCountReset(parent, args, requestingSession, serverRuntime);
            },
            giftCardPdfsRegenerate(
                parent: GqlSAdminMutation,
                args: GqlSAdminMutationGiftCardPdfsRegenerateArgs,
                requestingSession: GqlSSession,
            ) {
                return adminGiftCardPdfsRegenerate(parent, args, requestingSession, serverRuntime);
            },
        },
        UserMutation: {
            userUpdate(parent: GqlSUserMutation, args: GqlSUserMutationUserUpdateArgs, requestingSession: GqlSSession) {
                return userUpdate(parent, args, requestingSession, serverRuntime);
            },
            userAnonymize(parent: GqlSUserMutation, _: unknown, requestingSession: GqlSSession) {
                return userAnonymize(parent, requestingSession, serverRuntime);
            },
            terminateSessions(parent: GqlSUserMutation, args: GqlSUserMutationTerminateSessionsArgs, requestingSession: GqlSSession) {
                return userSessionTerminateMany(parent, args, requestingSession, serverRuntime);
            },
            userLegalAccept(parent: GqlSUserMutation, _: unknown, requestingSession: GqlSSession) {
                return userLegalAcceptCommand(parent, requestingSession, serverRuntime);
            },
            authPasskeyRegisterOptions(parent: GqlSUserMutation, __: unknown, requestingSession: GqlSSession) {
                return authPasskeyRegisterOptions(parent, requestingSession, serverRuntime);
            },
            authPasskeyRegisterVerify(
                parent: GqlSUserMutation,
                args: GqlSUserMutationAuthPasskeyRegisterVerifyArgs,
                requestingSession: GqlSSession,
            ) {
                return authPasskeyRegisterVerify(parent, args, requestingSession, serverRuntime);
            },
            authPasskeyDelete(parent: GqlSUserMutation, args: GqlSUserMutationAuthPasskeyDeleteArgs, requestingSession: GqlSSession) {
                return authPasskeyDelete(parent, args, requestingSession, serverRuntime);
            },
            authTotpEnrollStart(parent: GqlSUserMutation, __: unknown, requestingSession: GqlSSession) {
                return authTotpEnrollStart(parent, requestingSession, serverRuntime);
            },
            authTotpEnrollConfirm(
                parent: GqlSUserMutation,
                args: GqlSUserMutationAuthTotpEnrollConfirmArgs,
                requestingSession: GqlSSession,
            ) {
                return authTotpEnrollConfirm(parent, args, requestingSession, serverRuntime);
            },
            authTotpEnrollCancel(parent: GqlSUserMutation, __: unknown, requestingSession: GqlSSession) {
                return authTotpEnrollCancel(parent, requestingSession, serverRuntime);
            },
            authTotpDisable(parent: GqlSUserMutation, args: GqlSUserMutationAuthTotpDisableArgs, requestingSession: GqlSSession) {
                return authTotpDisable(parent, args, requestingSession, serverRuntime);
            },
            emailAddressUpdateOtpRequest(
                parent: GqlSUserMutation,
                args: GqlSUserMutationEmailAddressUpdateOtpRequestArgs,
                requestingSession: GqlSSession,
            ) {
                return emailAddressUpdateOtpRequest(parent, args, requestingSession, serverRuntime);
            },
            emailAddressUpdateOtpVerify(
                parent: GqlSUserMutation,
                args: GqlSUserMutationEmailAddressUpdateOtpVerifyArgs,
                requestingSession: GqlSSession,
            ) {
                return emailAddressUpdateOtpVerify(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestCreate(parent: GqlSUserMutation, args: GqlSUserMutationBookingRequestCreateArgs, requestingSession: GqlSSession) {
                return userBookingRequestCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestDiscountUpdate(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestDiscountUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestDiscountUpdate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestChurnPromoCodeCreate(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestChurnPromoCodeCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestChurnPromoCodeCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestCancel(parent: GqlSUserMutation, args: GqlSUserMutationBookingRequestCancelArgs, requestingSession: GqlSSession) {
                return userBookingRequestCancel(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestRequestRecall(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestRequestRecallArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestRequestRecall(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestUpdate(parent: GqlSUserMutation, args: GqlSUserMutationBookingRequestUpdateArgs, requestingSession: GqlSSession) {
                return userBookingRequestUpdate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferAccept(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferAcceptArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferAccept(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferParticipantAmendmentCreate(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferParticipantAmendmentCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferParticipantAmendmentCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferParticipantAmendmentCancel(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferParticipantAmendmentCancelArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferParticipantAmendmentCancel(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferPaymentStatusUpdate(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferPaymentStatusUpdateArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferPaymentStatusUpdate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferTestimonialCreate(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferTestimonialCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferTestimonialCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferDecline(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferDeclineArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferDecline(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferConfiguredMenuCreate(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferConfiguredMenuCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferConfiguredMenuCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferChatMessageCreate(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferChatMessageCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferChatMessageCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferChatMessageReactionUpsert(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferChatMessageReactionUpsertArgs,
                requestingSession: GqlSSession,
            ) {
                return bookingRequestOfferChatMessageReactionUpsert(
                    {
                        reactorUserId: parent.userId,
                        reactorRole: 'USER',
                        bookingRequestOfferEventId: args.bookingRequestOfferEventId,
                        emoji: args.emoji,
                    },
                    requestingSession,
                    serverRuntime,
                );
            },
            bookingRequestOfferUnreadNotificationCountReset(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferUnreadNotificationCountResetArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferUnreadNotificationCountReset(parent, args, requestingSession, serverRuntime);
            },
            supportRequestCreate(parent: GqlSUserMutation, args: GqlSUserMutationSupportRequestCreateArgs, requestingSession: GqlSSession) {
                return userSupportRequestCreate(parent, args, requestingSession, serverRuntime);
            },
            supportRequestMessageCreate(
                parent: GqlSUserMutation,
                args: GqlSUserMutationSupportRequestMessageCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return userSupportRequestMessageCreate(parent, args, requestingSession, serverRuntime);
            },
            supportRequestUnreadNotificationCountReset(
                parent: GqlSUserMutation,
                args: GqlSUserMutationSupportRequestUnreadNotificationCountResetArgs,
                requestingSession: GqlSSession,
            ) {
                return userSupportRequestUnreadNotificationCountReset(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallSlotRequest(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferCallSlotRequestArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferCallSlotRequest(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallSlotConfirm(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferCallSlotConfirmArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferCallSlotConfirm(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallSlotDecline(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferCallSlotDeclineArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferCallSlotDecline(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallSlotCancel(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferCallSlotCancelArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferCallSlotCancel(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallCreate(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferCallCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferCallCreate(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallJoin(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferCallJoinArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferCallJoin(parent, args, requestingSession, serverRuntime);
            },
            bookingRequestOfferCallLeave(
                parent: GqlSUserMutation,
                args: GqlSUserMutationBookingRequestOfferCallLeaveArgs,
                requestingSession: GqlSSession,
            ) {
                return userBookingRequestOfferCallLeave(parent, args, requestingSession, serverRuntime);
            },
            cookCreate(parent: GqlSUserMutation, args: GqlSUserMutationCookCreateArgs, requestingSession: GqlSSession) {
                return userCookCreate(parent, args, requestingSession, serverRuntime);
            },
            chatMessageCreate(parent: GqlSUserMutation, args: GqlSUserMutationChatMessageCreateArgs, requestingSession: GqlSSession) {
                return chatMessageCreate(parent, args, requestingSession, serverRuntime);
            },
            chatInputCollectionRespond(
                parent: GqlSUserMutation,
                args: GqlSUserMutationChatInputCollectionRespondArgs,
                requestingSession: GqlSSession,
            ) {
                return chatInputCollectionRespond(parent, args, requestingSession, serverRuntime);
            },
            chatToolApprovalRespond(
                parent: GqlSUserMutation,
                args: GqlSUserMutationChatToolApprovalRespondArgs,
                requestingSession: GqlSSession,
            ) {
                return chatToolApprovalRespond(parent, args, requestingSession, serverRuntime);
            },
            chatDelete(parent: GqlSUserMutation, args: GqlSUserMutationChatDeleteArgs, requestingSession: GqlSSession) {
                return chatDelete(parent, args, requestingSession, serverRuntime);
            },
            chatTitleUpdate(parent: GqlSUserMutation, args: GqlSUserMutationChatTitleUpdateArgs, requestingSession: GqlSSession) {
                return chatTitleUpdate(parent, args, requestingSession, serverRuntime);
            },
            giftCardCreate(parent: GqlSUserMutation, args: GqlSUserMutationGiftCardCreateArgs, requestingSession: GqlSSession) {
                return giftCardCreate(parent, args, requestingSession, serverRuntime);
            },
            giftCardPay(parent: GqlSUserMutation, args: GqlSUserMutationGiftCardPayArgs, requestingSession: GqlSSession) {
                return giftCardPay(parent, args, requestingSession, serverRuntime);
            },
            giftCardPdfsRegenerate(
                parent: GqlSUserMutation,
                args: GqlSUserMutationGiftCardPdfsRegenerateArgs,
                requestingSession: GqlSSession,
            ) {
                return giftCardPdfsRegenerate(parent, args, requestingSession, serverRuntime);
            },
            cook(_: GqlSUserMutation, __: unknown, requestingSession: GqlSSession) {
                return guardCookMutation(requestingSession, serverRuntime);
            },
        },
        Query: {
            currentSession(_: unknown, __: unknown, requestingSession: GqlSSession) {
                return requestingSession;
            },
            publicLegal() {
                return publicLegalFind(serverRuntime);
            },
            publicCity() {
                return {} as GqlSPublicCityQuery;
            },
            publicPartner() {
                return {} as GqlSPublicPartnerQuery;
            },
            publicOccasion() {
                return {} as GqlSPublicOccasionQuery;
            },
            publicBlogPost() {
                return {} as GqlSPublicBlogPostQuery;
            },
            publicCook() {
                return {} as GqlSPublicCookQuery;
            },
            publicWebPage() {
                return {} as GqlSPublicWebPageQuery;
            },
        },
        PublicCityQuery: {
            findMany() {
                return publicCityFindMany(serverRuntime);
            },
            findOneByPathName(_parent: unknown, args: GqlSPublicCityQueryFindOneByPathNameArgs) {
                return publicCityFindOneByPathName(args, serverRuntime);
            },
        },
        PublicPartnerQuery: {
            findMany() {
                return publicPartnerFindMany(serverRuntime);
            },
            findOneByPathName(_parent: unknown, args: GqlSPublicPartnerQueryFindOneByPathNameArgs) {
                return publicPartnerFindOneByPathName(args, serverRuntime);
            },
        },
        PublicOccasionQuery: {
            findMany() {
                return publicOccasionFindMany(serverRuntime);
            },
            findOneByPathName(_parent: unknown, args: GqlSPublicOccasionQueryFindOneByPathNameArgs) {
                return publicOccasionFindOneByPathName(args, serverRuntime);
            },
        },
        PublicBlogPostQuery: {
            findMany() {
                return publicBlogPostFindMany(serverRuntime);
            },
            findOneByPathName(_parent: unknown, args: GqlSPublicBlogPostQueryFindOneByPathNameArgs) {
                return publicBlogPostFindOneByPathName(args, serverRuntime);
            },
        },
        PublicCookQuery: {
            findMany(_parent: unknown, args: GqlSPublicCookQueryFindManyArgs) {
                return publicCookFindMany(args, serverRuntime);
            },
            findOne(_parent: unknown, args: GqlSPublicCookQueryFindOneArgs) {
                return publicCookFindOne(args, serverRuntime);
            },
        },
        PublicCook: {
            logo(parent: GqlSPublicCook) {
                return cookLogoFindOne(parent.cookId, serverRuntime);
            },
            meals(parent: GqlSPublicCook) {
                return publicCookMealFindMany(parent, serverRuntime);
            },
            async callSlots(parent: GqlSPublicCook, args: GqlSPublicCookCallSlotsArgs) {
                return cookCallSlotsFindMany(serverRuntime.db, {
                    cookId: parent.cookId,
                    from: new Date(args.from),
                    to: new Date(args.to),
                });
            },
            testimonials(parent: GqlSPublicCook) {
                return publicCookCustomerTestimonialsFindMany(parent, serverRuntime);
            },
            rating(parent: GqlSPublicCook) {
                return publicCookCustomerTestimonialRatingSummary(parent.cookId, serverRuntime);
            },
        },
        PublicWebPageQuery: {
            findOne(_parent: unknown, args: GqlSPublicWebPageQueryFindOneArgs) {
                return publicWebPageFindOne(args, serverRuntime);
            },
        },
        Mutation: {
            authEmailOtpRequest(_parent: unknown, args: GqlSMutationAuthEmailOtpRequestArgs, requestingSession: GqlSSession) {
                return authEmailOtpRequest(args, requestingSession, serverRuntime);
            },
            authEmailOtpVerify(_parent: unknown, args: GqlSMutationAuthEmailOtpVerifyArgs, requestingSession: GqlSSession) {
                return authEmailOtpVerify(args, requestingSession, serverRuntime);
            },
            authEmailOtpDelete(_parent: unknown, args: GqlSMutationAuthEmailOtpDeleteArgs, requestingSession: GqlSSession) {
                return authEmailOtpDelete(args, requestingSession, serverRuntime);
            },
            userCreate(_parent: unknown, args: GqlSMutationUserCreateArgs, requestingSession: GqlSSession) {
                return userCreate(args, requestingSession, serverRuntime);
            },
            authPasskeyAuthenticateOptions(_parent: unknown, __: unknown, requestingSession: GqlSSession) {
                return authPasskeyAuthenticateOptions(requestingSession, serverRuntime);
            },
            authPasskeyAuthenticateVerify(
                _parent: unknown,
                args: GqlSMutationAuthPasskeyAuthenticateVerifyArgs,
                requestingSession: GqlSSession,
            ) {
                return authPasskeyAuthenticateVerify(args, requestingSession, serverRuntime);
            },
            authTotpVerify(_parent: unknown, args: GqlSMutationAuthTotpVerifyArgs, requestingSession: GqlSSession) {
                return authTotpVerify(args, requestingSession, serverRuntime);
            },
            authTotpChallengeDelete(_parent: unknown, __: unknown, requestingSession: GqlSSession) {
                return authTotpChallengeDelete(requestingSession, serverRuntime);
            },
            sessionCookieSettingAcceptAll(_parent: unknown, __: unknown, requestingSession: GqlSSession) {
                return sessionCookieSettingAcceptAll(requestingSession, serverRuntime);
            },
            sessionCookieSettingAcceptMandatory(_parent: unknown, __: unknown, requestingSession: GqlSSession) {
                return sessionCookieSettingAcceptMandatory(requestingSession, serverRuntime);
            },
            sessionNewsletterSubscriptionCreate(
                _parent: unknown,
                args: GqlSMutationSessionNewsletterSubscriptionCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return sessionNewsletterSubscriptionCreate(requestingSession, args, serverRuntime);
            },
            sessionWebPageVisitCreate(_parent: unknown, args: GqlSMutationSessionWebPageVisitCreateArgs, requestingSession: GqlSSession) {
                return sessionWebPageVisitCreate(args, requestingSession, serverRuntime);
            },
            sessionWebPageInteractionCreate(
                _parent: unknown,
                args: GqlSMutationSessionWebPageInteractionCreateArgs,
                requestingSession: GqlSSession,
            ) {
                return sessionWebPageInteractionCreate(args, requestingSession, serverRuntime);
            },
            clientObservabilityReport(_parent: unknown, args: GqlSMutationClientObservabilityReportArgs, requestingSession: GqlSSession) {
                return clientObservabilityReport(args, requestingSession, serverRuntime);
            },
            user(_parent: unknown, __: unknown, requestingSession: GqlSSession) {
                return guardUserMutation(requestingSession);
            },
            admin(_parent: unknown, __: unknown, requestingSession: GqlSSession) {
                return guardAdminMutation(requestingSession, serverRuntime);
            },
        },
        Subscription: {
            userUpdates: {
                subscribe(_: unknown, __: unknown, requestingSession: GqlSSession) {
                    return guardUserSubscription(requestingSession, serverRuntime);
                },
                resolve(_: unknown, __: unknown, requestingSession: GqlSSession) {
                    return sessionUserFindOne(requestingSession, serverRuntime) as Promise<GqlSUser>; // todo
                },
            },
            sessionUpdates: {
                subscribe(_: unknown, __: unknown, requestingSession: GqlSSession) {
                    return guardSessionSubscription(requestingSession, serverRuntime);
                },
                async resolve(_: unknown, __: unknown, requestingSession: GqlSSession): Promise<GqlSSession> {
                    const session = await sessionFindOne(requestingSession, serverRuntime);
                    // Keep the long-lived SSE context in sync after HTTP auth binds.
                    requestingSession.userId = session.userId;
                    return session;
                },
            },
            adminUpdates: {
                subscribe(_: unknown, __: unknown, requestingSession: GqlSSession) {
                    return guardAdminSubscription(requestingSession, serverRuntime);
                },
                resolve(_: unknown, __: unknown, requestingSession: GqlSSession): GqlSAdmin {
                    return { adminId: requestingSession.userId! } as GqlSAdmin;
                },
            },
            chatTurnUpdates: {
                subscribe(_: unknown, args: GqlSSubscriptionChatTurnUpdatesArgs, requestingSession: GqlSSession) {
                    return chatTurnUpdatesSubscribe(args, requestingSession, serverRuntime);
                },
                resolve(payload: GqlSChatTurnUpdate): GqlSChatTurnUpdate {
                    return payload;
                },
            },
        },
    };
}
