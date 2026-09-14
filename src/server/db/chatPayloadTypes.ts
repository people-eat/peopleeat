// Type declarations for JSONB payloads used by chat tooling and data parts.
// Persistence of assistant messages is `ChatMessageBody` (see
// `src/server/domain/chatMessageBody.ts`). Slot schemas for `promptUserForInput`
// live in Zod (`toolPromptUserForInput`) and the UI registry
// (`chatAssistantInputKinds`) — not GraphQL unions.
//
// No runtime validation here — writers are in this codebase.

type ChatAssistantBodyCard = {
    imageUrl?: string;
    title: string;
    description: string;
    price?: string;
    href?: string;
    buttonTitle?: string;
};

export const CHAT_DATA_TYPE_CHEF_CARD_LIST = 'chef.cardList' as const;

/** One booking-request card snapshot for `admin.bookingRequestList`. */
export type ChatAdminBookingRequestListItem = {
    bookingRequestId: string;
    status: string;
    publicationStatus: string;
    occasion: string;
    dateTime: string;
    createdAt: string;
    exactEventAddress: { city: string; displayText: string };
    participants: { type: string }[];
    customer: { userId: string; firstName: string; lastName: string; emailAddress: string | null };
    offers: Array<{
        bookingRequestOfferId: string;
        status: string;
        createdAt: string;
        userUnreadNotificationCount: number;
        cookUnreadNotificationCount: number;
        cook: {
            cookId: string;
            user: { userId: string; firstName: string; lastName: string };
        };
    }>;
};

export const CHAT_DATA_TYPE_ADMIN_BOOKING_REQUEST_LIST = 'admin.bookingRequestList' as const;

export const CHAT_TOOL_ADMIN_BOOKING_REQUESTS_FIND_MANY = 'adminBookingRequestsFindMany' as const;

/** One user card snapshot for `admin.userList`. */
export type ChatAdminUserListItem = {
    userId: string;
    firstName: string;
    lastName: string;
    emailAddress: string | null;
    status: string;
    types: string[];
    createdAt: string;
};

export const CHAT_DATA_TYPE_ADMIN_USER_LIST = 'admin.userList' as const;

export const CHAT_TOOL_ADMIN_USERS_FIND_MANY = 'adminUsersFindMany' as const;

/** One meal card snapshot for `admin.mealList`. */
export type ChatAdminMealListItem = {
    mealId: string;
    cookId: string;
    cookName: string;
    title: string;
    description: string;
    imageUrl: string | null;
    publishedAt: string | null;
    deletedAt: string | null;
    createdAt: string;
};

export const CHAT_DATA_TYPE_ADMIN_MEAL_LIST = 'admin.mealList' as const;

export const CHAT_TOOL_ADMIN_COOK_MEALS_FIND_MANY = 'adminCookMealsFindMany' as const;

/** One menu card snapshot for `admin.menuList`. */
export type ChatAdminMenuListItem = {
    menuId: string;
    cookId: string;
    cookName: string;
    title: string;
    description: string;
    courseCount: number;
    courseMealOptionImages: string[];
    publishedAt: string | null;
    deletedAt: string | null;
    createdAt: string;
};

export const CHAT_DATA_TYPE_ADMIN_MENU_LIST = 'admin.menuList' as const;

export const CHAT_TOOL_ADMIN_COOK_MENUS_FIND_MANY = 'adminCookMenusFindMany' as const;

/** Provider grounding / citation sources (UI-only; also `sourceUrl` parts). */
export interface ChatMessageSource {
    title: string;
    url: string;
}

/** Intermediate Output.object block shape; persist as text + `chef.cardList` data parts. */
export type ChatAssistantBodyBlock = { kind: 'markdown'; text: string } | { kind: 'cardList'; cards: ChatAssistantBodyCard[] };

/** Intermediate Output.object payload; persist as ChatMessageBody parts. */
export type ChatAssistantBodyPayload = {
    blocks: ChatAssistantBodyBlock[];
};
