import { Link } from '@tanstack/react-router';
import { Header } from '../components/Header';
import type { GqlCBookingRequestPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

const bookingRequestPageTitle = { de: 'Buchungsanfrage', en: 'Booking request' } as const;
export function BookingRequestPage({ data }: { data: GqlCBookingRequestPageQuery }) {
    const locale = useLocale();

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="mx-auto max-w-3xl p-8">
                <h1>{bookingRequestPageTitle[locale]}</h1>
                <nav className="mt-6 flex gap-6 text-sm">
                    <Link to="/{-$locale}/booking-request/chat" className="underline-offset-4 hover:underline">
                        {{ de: 'Chat', en: 'Chat' }[locale]}
                    </Link>
                    <Link to="/{-$locale}/booking-request/form" className="underline-offset-4 hover:underline">
                        {{ de: 'Formular', en: 'Form' }[locale]}
                    </Link>
                </nav>
            </main>
        </>
    );
}
