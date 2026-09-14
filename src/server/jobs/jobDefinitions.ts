import { adminActionItemsSlackDaily } from './handlers/adminActionItemsSlackDaily';
import { bookingRequestExpireNotify } from './handlers/bookingRequestExpireNotify';
import { bookingRequestNoOffersNotify } from './handlers/bookingRequestNoOffersNotify';
import { bookingRequestOfferCallRecordingFinalize } from './handlers/bookingRequestOfferCallRecordingFinalize';
import { bookingRequestOfferCallRoomsSweep } from './handlers/bookingRequestOfferCallRoomsSweep';
import { bookingRequestOfferCallSlotReminder } from './handlers/bookingRequestOfferCallSlotReminder';
import { bookingRequestOfferCallSlotsComplete } from './handlers/bookingRequestOfferCallSlotsComplete';
import { bookingRequestOfferChatMessageNotify } from './handlers/bookingRequestOfferChatMessageNotify';
import { bookingRequestOfferEventTomorrowNotify } from './handlers/bookingRequestOfferEventTomorrowNotify';
import { bookingRequestOfferPullPayment } from './handlers/bookingRequestOfferPullPayment';
import { bookingRequestOfferPullPaymentAnnouncement } from './handlers/bookingRequestOfferPullPaymentAnnouncement';
import { bookingRequestOfferTestimonialReminder } from './handlers/bookingRequestOfferTestimonialReminder';
import { bookingRequestReactionReminder } from './handlers/bookingRequestReactionReminder';
import { bookingRequestSlackDigest } from './handlers/bookingRequestSlackDigest';
import { chatTitleGenerate } from './handlers/chatTitleGenerate';
import { cookBiographySummaryGenerate } from './handlers/cookBiographySummaryGenerate';
import { cookBookingRequestMenuEvaluationGenerateJob } from './handlers/cookBookingRequestMenuEvaluationGenerate';
import { giftCardPreparedExpire } from './handlers/giftCardPreparedExpire';
import { resendUsageSlackAlert } from './handlers/resendUsageSlackAlert';
import { supportRequestCustomerReplyNotify } from './handlers/supportRequestCustomerReplyNotify';
import { userKlaviyoProfileSync } from './handlers/userKlaviyoProfileSync';
import type { JobDefinition } from './types';

export const jobDefinitions: JobDefinition[] = [
    userKlaviyoProfileSync,
    chatTitleGenerate,
    cookBiographySummaryGenerate,
    cookBookingRequestMenuEvaluationGenerateJob,
    giftCardPreparedExpire,
    bookingRequestOfferPullPayment,
    bookingRequestOfferPullPaymentAnnouncement,
    bookingRequestExpireNotify,
    bookingRequestOfferCallSlotReminder,
    bookingRequestOfferCallSlotsComplete,
    bookingRequestOfferCallRoomsSweep,
    bookingRequestOfferCallRecordingFinalize,
    bookingRequestOfferTestimonialReminder,
    bookingRequestOfferChatMessageNotify,
    bookingRequestNoOffersNotify,
    bookingRequestReactionReminder,
    bookingRequestOfferEventTomorrowNotify,
    bookingRequestSlackDigest,
    adminActionItemsSlackDaily,
    resendUsageSlackAlert,
    supportRequestCustomerReplyNotify,
];
