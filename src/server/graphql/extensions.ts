import './generated';

declare module './generated' {
    export interface GqlSSession {
        userId?: string | null | undefined;
    }
    export interface GqlSUserMutation {
        userId: string;
    }
    export interface GqlSCookMutation {
        cookId: string;
    }
    export interface GqlSAdminMutation {
        adminId: string;
    }

    // --- HumanChatMessage union (offer/support) -----------------------------
    export interface GqlSChatMessageUser {
        gqlTypeName: 'ChatMessageUser';
    }
    export interface GqlSChatMessageBookingRequestOfferEvent {
        gqlTypeName: 'ChatMessageBookingRequestOfferEvent';
    }

    // --- ChatMessagePart union (assistant) ----------------------------------
    export interface GqlSChatMessageTextPart {
        gqlTypeName: 'ChatMessageTextPart';
    }
    export interface GqlSChatMessageReasoningPart {
        gqlTypeName: 'ChatMessageReasoningPart';
    }
    export interface GqlSChatMessageToolPart {
        gqlTypeName: 'ChatMessageToolPart';
    }
    export interface GqlSChatMessageSourceUrlPart {
        gqlTypeName: 'ChatMessageSourceUrlPart';
    }
    export interface GqlSChatMessageSourceDocumentPart {
        gqlTypeName: 'ChatMessageSourceDocumentPart';
    }
    export interface GqlSChatMessageFilePart {
        gqlTypeName: 'ChatMessageFilePart';
    }
    export interface GqlSChatMessageDataPart {
        gqlTypeName: 'ChatMessageDataPart';
    }

    // --- ChatTurnUpdate union -----------------------------------------------
    export interface GqlSChatTurnSnapshot {
        gqlTypeName: 'ChatTurnSnapshot';
    }
    export interface GqlSChatTurnUpserted {
        gqlTypeName: 'ChatTurnUpserted';
    }

    // --- ContentSection union -----------------------------------------------
    export interface GqlSContentSectionContent {
        gqlTypeName: 'ContentSectionContent';
    }
    export interface GqlSContentSectionImage {
        gqlTypeName: 'ContentSectionImage';
    }
    export interface GqlSContentSectionQuote {
        gqlTypeName: 'ContentSectionQuote';
    }
    export interface GqlSContentSectionList {
        gqlTypeName: 'ContentSectionList';
    }
    export interface GqlSContentSectionCta {
        gqlTypeName: 'ContentSectionCta';
    }
    export interface GqlSContentSectionQa {
        gqlTypeName: 'ContentSectionQa';
    }

    // --- Testimonial union ---------------------------------------------------
    export interface GqlSCustomerTestimonial {
        gqlTypeName: 'CustomerTestimonial';
    }
    export interface GqlSCookTestimonial {
        gqlTypeName: 'CookTestimonial';
    }

    // --- AdminTestimonial union -----------------------------------------------
    export interface GqlSAdminCustomerTestimonial {
        gqlTypeName: 'AdminCustomerTestimonial';
    }
    export interface GqlSAdminCookTestimonial {
        gqlTypeName: 'AdminCookTestimonial';
    }

    // --- CookBookingRequestLookupResult union --------------------------------
    export interface GqlSCookBookingRequestAvailable {
        gqlTypeName: 'CookBookingRequestAvailable';
    }
    export interface GqlSCookBookingRequestCanceled {
        gqlTypeName: 'CookBookingRequestCanceled';
    }
    export interface GqlSCookBookingRequestTaken {
        gqlTypeName: 'CookBookingRequestTaken';
    }
    export interface GqlSCookBookingRequestExpired {
        gqlTypeName: 'CookBookingRequestExpired';
    }
    export interface GqlSCookBookingRequestOfferAlreadyExists {
        gqlTypeName: 'CookBookingRequestOfferAlreadyExists';
    }
    export interface GqlSCookBookingRequestNotFound {
        gqlTypeName: 'CookBookingRequestNotFound';
    }
}
