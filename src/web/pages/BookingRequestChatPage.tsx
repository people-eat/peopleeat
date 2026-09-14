import { Link } from '@tanstack/react-router';
import { useLocale } from '../hooks/useLocale';

const bookingRequestChatPageTitle = { de: 'Buchungsanfrage: Chat', en: 'Booking request: chat' } as const;
export function BookingRequestChatPage() {
    const locale = useLocale();

    return (
        <main id="main-content" className="mx-auto max-w-3xl p-8">
            <h1>{bookingRequestChatPageTitle[locale]}</h1>
            <Link to="/{-$locale}/booking-request" className="mt-4 inline-block text-sm underline-offset-4 hover:underline">
                {{ de: 'Zur Buchungsanfrage', en: 'Back to booking request' }[locale]}
            </Link>
        </main>
    );
}
