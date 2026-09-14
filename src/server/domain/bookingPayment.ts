/** Default TZ for booking payment timing (15-day SetupIntent threshold). */
export const BOOKING_PAYMENT_TIME_ZONE = 'Europe/Berlin';

/** Days before the event when SetupIntent is preferred over immediate PaymentIntent. */
export const BOOKING_PAYMENT_SETUP_INTENT_MIN_DAYS = 15;

/** Days before the event when the saved card is charged (pull job). */
export const BOOKING_PAYMENT_PULL_DAYS_BEFORE_EVENT = 14;

/** Days before the event when the customer is warned about the upcoming pull. */
export const BOOKING_PAYMENT_PULL_ANNOUNCEMENT_DAYS_BEFORE_EVENT = 15;
