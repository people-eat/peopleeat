import { SquareArrowOutUpRightIcon } from 'lucide-react';

import { t } from '../../../i18n/t';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import { adminStubRouteBySlug, adminStubRouteDescription, adminStubRouteTitle } from './adminCatalog';
import { AdminOverviewListCardExternal } from './AdminOverviewListCard';

const route = adminStubRouteBySlug('links');

export function adminLinksPageTitle(locale: Locale): string {
    return adminStubRouteTitle(route.slug, locale);
}
export function adminLinksPageDescription(locale: Locale): string {
    return adminStubRouteDescription(route.slug, locale);
}

type AdminImportantLink = {
    title: string;
    href: string;
};

type AdminImportantLinkGroup = {
    titleKey: 'copy.infrastructure' | 'copy.notificationsMessaging' | 'copy.socialMedia';
    links: readonly AdminImportantLink[];
};

const ADMIN_IMPORTANT_LINK_GROUPS: readonly AdminImportantLinkGroup[] = [
    {
        titleKey: 'copy.infrastructure',
        links: [
            {
                title: 'Coolify',
                href: 'https://coolify.people-eat.com',
            },
            {
                title: 'Kuma',
                href: 'https://kuma.people-eat.com',
            },
            {
                title: 'Grafana',
                href: 'https://grafana.people-eat.com',
            },
            {
                title: 'Langfuse',
                href: 'https://langfuse.people-eat.com',
            },
            {
                title: 'IONOS',
                href: 'https://mein.ionos.de/',
            },
            {
                title: 'Metabase',
                href: 'https://metabase.people-eat.com',
            },
            {
                title: 'Storybook',
                href: 'https://storybook.people-eat.com',
            },
            {
                title: 'Email preview',
                href: 'https://email-preview.people-eat.com',
            },
            {
                title: 'Google Search Console',
                href: 'https://search.google.com/search-console?resource_id=sc-domain%3Apeople-eat.com&hl=de',
            },
            {
                title: 'Microsoft Clarity',
                href: 'https://clarity.microsoft.com',
            },
            {
                title: 'OpenAI Dashboard',
                href: 'https://platform.openai.com/usage',
            },
            {
                title: 'Stripe',
                href: 'https://dashboard.stripe.com/dashboard',
            },
            {
                title: 'GitHub Projects',
                href: 'https://github.com/people-eat/people-eat/projects?query=is%3Aopen',
            },
        ],
    },
    {
        titleKey: 'copy.notificationsMessaging',
        links: [
            {
                title: 'Resend',
                href: 'https://resend.com',
            },
            {
                title: 'Klaviyo',
                href: 'https://www.klaviyo.com/dashboard',
            },
            {
                title: 'Slack',
                href: 'https://api.slack.com/apps/A0924QE1013',
            },
            {
                title: 'WhatsApp Manager',
                href: 'https://business.facebook.com/latest/whatsapp_manager/overview/?asset_id=2340222286349376&business_id=347782383309722',
            },
        ],
    },
    {
        titleKey: 'copy.socialMedia',
        links: [
            {
                title: 'Facebook',
                href: 'https://www.facebook.com/PeopleEatSharing',
            },
            {
                title: 'Instagram',
                href: 'https://www.instagram.com/peopleeat_official',
            },
            {
                title: 'LinkedIn',
                href: 'https://www.linkedin.com/company/peopleeat',
            },
        ],
    },
];

export function AdminLinksPage() {
    const locale = useLocale();

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                        <SquareArrowOutUpRightIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminLinksPageTitle(locale)}
                    </h1>
                    <p className="text-muted-foreground">{adminLinksPageDescription(locale)}</p>
                </div>
                <div className="grid gap-8">
                    {ADMIN_IMPORTANT_LINK_GROUPS.map((group) => (
                        <section key={group.titleKey} className="grid gap-3">
                            <h2 className="text-lg font-medium">{t(locale, 'admin', group.titleKey)}</h2>
                            <ul className="grid gap-2 sm:grid-cols-2">
                                {group.links.map((link) => (
                                    <li key={link.href}>
                                        <AdminOverviewListCardExternal title={link.title} href={link.href} />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </main>
        </AdminPathPageChrome>
    );
}
