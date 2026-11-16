import { Link } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
import { formatCurrency } from '../../../shared';
import { Button } from '../../components/base/button';
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
            contentClassName="grid min-w-0 content-start gap-8"
            footer={
                <Button asChild>
                    <Link to="/{-$locale}/profile/travel/edit">{t(locale, 'profileCook', 'actions.edit')}</Link>
                </Button>
            }
        >
            <div className="grid gap-2">
                <h1 className="font-serif text-3xl/tight text-foreground">{route.title(locale)}</h1>
                <p className="text-muted-foreground">{route.description(locale)}</p>
            </div>

            <section className="grid min-w-0 gap-4">
                <dl className="grid min-w-0 gap-4">
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
        </ProfilePinnedFooterLayout>
    );
}
