import { SquareArrowOutUpRightIcon } from 'lucide-react';

import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import { adminStubRouteBySlug } from './adminCatalog';
import { AdminOverviewListCardExternal } from './AdminOverviewListCard';

const route = adminStubRouteBySlug('links');

export const adminLinksPageTitle = route.title;
export const adminLinksPageDescription = route.description;

type AdminImportantLink = {
    title: string;
    href: string;
};

type AdminImportantLinkGroup = {
    title: Record<Locale, string>;
    links: readonly AdminImportantLink[];
};

const ADMIN_IMPORTANT_LINK_GROUPS: readonly AdminImportantLinkGroup[] = [
    {
        title: { de: 'Infrastruktur', en: 'Infrastructure' },
        links: [
            { title: 'Coolify', href: 'https://coolify.people-eat.com' },
            { title: 'Kuma', href: 'https://kuma.people-eat.com' },
            { title: 'IONOS', href: 'https://mein.ionos.de/' },
            { title: 'Metabase', href: 'https://metabase.people-eat.com' },
            { title: 'Storybook', href: 'https://storybook.people-eat.com' },
            { title: 'Email preview', href: 'https://email.people-eat.com' },
            {
                title: 'Google Search Console',
                href: 'https://search.google.com/search-console?resource_id=sc-domain%3Apeople-eat.com&hl=de',
            },
            { title: 'Microsoft Clarity', href: 'https://clarity.microsoft.com' },
            { title: 'OpenAI Dashboard', href: 'https://platform.openai.com/usage' },
            { title: 'Stripe', href: 'https://dashboard.stripe.com/dashboard' },
            { title: 'GitHub Projects', href: 'https://github.com/people-eat/people-eat/projects?query=is%3Aopen' },
        ],
    },
    {
        title: { de: 'Benachrichtigungen & Messaging', en: 'Notifications & messaging' },
        links: [
            { title: 'Resend', href: 'https://resend.com' },
            { title: 'Klaviyo', href: 'https://www.klaviyo.com/dashboard' },
            { title: 'Slack', href: 'https://api.slack.com/apps/A0924QE1013' },
            {
                title: 'WhatsApp Manager',
                href: 'https://business.facebook.com/latest/whatsapp_manager/overview/?asset_id=2340222286349376&business_id=347782383309722',
            },
        ],
    },
    {
        title: { de: 'Social Media', en: 'Social media' },
        links: [
            { title: 'Facebook', href: 'https://www.facebook.com/PeopleEatSharing' },
            { title: 'Instagram', href: 'https://www.instagram.com/peopleeat_official' },
            { title: 'LinkedIn', href: 'https://www.linkedin.com/company/peopleeat' },
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
                        {adminLinksPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminLinksPageDescription[locale]}</p>
                </div>
                <div className="grid gap-8">
                    {ADMIN_IMPORTANT_LINK_GROUPS.map((group) => (
                        <section key={group.title.en} className="grid gap-3">
                            <h2 className="text-lg font-medium">{group.title[locale]}</h2>
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
