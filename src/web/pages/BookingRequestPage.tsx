import { Link } from '@tanstack/react-router';
import { Header } from '../components/Header';
import type { GqlCBookingRequestPageQuery } from '../graphql/generated';
import { useT } from '../hooks/useT';

export function BookingRequestPage({ data }: { data: GqlCBookingRequestPageQuery }) {
    const { t } = useT('publicBooking');

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="mx-auto max-w-3xl p-8">
                <h1>{t('index.title')}</h1>
                <nav className="mt-6 flex gap-6 text-sm">
                    <Link to="/{-$locale}/booking-request/chat" className="underline-offset-4 hover:underline">
                        {t('index.chat')}
                    </Link>
                    <Link to="/{-$locale}/booking-request/form" className="underline-offset-4 hover:underline">
                        {t('index.form')}
                    </Link>
                </nav>
            </main>
        </>
    );
}
