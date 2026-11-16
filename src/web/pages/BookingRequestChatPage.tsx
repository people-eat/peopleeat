import { Link } from '@tanstack/react-router';
import { useT } from '../hooks/useT';

export function BookingRequestChatPage() {
    const { t } = useT('publicBooking');

    return (
        <main id="main-content" className="mx-auto max-w-3xl p-8">
            <h1>{t('chat.title')}</h1>
            <Link to="/{-$locale}/booking-request" className="mt-4 inline-block text-sm underline-offset-4 hover:underline">
                {t('chat.back')}
            </Link>
        </main>
    );
}
