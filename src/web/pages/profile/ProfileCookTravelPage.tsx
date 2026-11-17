import { Link } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
import { formatCurrency } from '../../../shared';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { CookTravelRadiusMap } from '../../components/CookTravelRadiusMap';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCProfileCookTravelPageQuery } from '../../graphql/generated';
import { ProfileCookTravelPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookNavRouteBySlug } from './cookCatalog';

const route = cookNavRouteBySlug('travel');
export const profileCookTravelPageTitle = route.title;
export const profileCookTravelPageDescription = route.description;

function DetailField({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="text-sm whitespace-pre-wrap text-foreground">{value}</dd>
        </div>
    );
}

export function ProfileCookTravelPage({ data }: { data: GqlCProfileCookTravelPageQuery }) {
    const locale = useLocale();
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookTravelPageUpdatesDocument);
    const cook = user?.cook ?? null;

    if (!cook) {
        return null;
    }

    return (
        <ProfilePinnedFooterLayout
            contentClassName="grid w-full min-w-0 content-start gap-6"
            footer={
                <Button asChild>
                    <Link to="/{-$locale}/profile/travel/edit">{t(locale, 'profileCook', 'actions.edit')}</Link>
                </Button>
            }
        >
            <StatusAlert
                tone="info"
                title={t(locale, 'profileCook', 'travel.poolIntro')}
                action={
                    <Button asChild variant="outline" size="sm">
                        <Link to="/{-$locale}/profile/booking-request-pool">{t(locale, 'profileCook', 'travel.goToPool')}</Link>
                    </Button>
                }
            />

            <section className="grid min-w-0 gap-4">
                <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <DetailField
                        label={t(locale, 'profileCook', 'travelEdit.origin')}
                        value={
                            cook.exactTravelOriginAddress?.displayText.trim()
                                ? cook.exactTravelOriginAddress.displayText
                                : t(locale, 'profileCook', 'actions.notSet')
                        }
                    />
                    {cook.exactTravelOriginAddress?.city.trim() ? (
                        <DetailField
                            label={t(locale, 'profileCook', 'travel.cityForCustomers')}
                            value={cook.exactTravelOriginAddress.city}
                        />
                    ) : null}
                    <DetailField
                        label={t(locale, 'profileCook', 'travelEdit.maxDistance')}
                        value={`${cook.maximumTravelDistance ?? '—'} km`}
                    />
                    <DetailField
                        label={t(locale, 'profileCook', 'travelEdit.expensesPerKm')}
                        value={formatCurrency(cook.travelExpensesAmount, { locale })}
                    />
                </dl>
            </section>

            {cook.exactTravelOriginAddress &&
            Number.isFinite(cook.exactTravelOriginAddress.latitude) &&
            Number.isFinite(cook.exactTravelOriginAddress.longitude) ? (
                <section className="grid min-w-0 gap-2">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t(locale, 'profileCook', 'travel.mapHint')}
                    </p>
                    <CookTravelRadiusMap
                        latitude={cook.exactTravelOriginAddress.latitude}
                        longitude={cook.exactTravelOriginAddress.longitude}
                        radiusKm={cook.maximumTravelDistance}
                    />
                </section>
            ) : null}
        </ProfilePinnedFooterLayout>
    );
}
