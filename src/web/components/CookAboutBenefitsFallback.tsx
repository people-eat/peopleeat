import { ShieldCheckIcon, UtensilsIcon, WineIcon } from 'lucide-react';

import { useLocale } from '../hooks/useLocale';

const BENEFITS = [
    {
        Icon: UtensilsIcon,
        title: { de: 'Ganz nach eurem Geschmack', en: 'Exactly to your taste' },
        body: {
            de: 'Jedes Menü wird gemeinsam mit eurem Koch auf eure Wünsche und euren Anlass abgestimmt.',
            en: 'Every menu is tailored with your chef to your wishes and your occasion.',
        },
    },
    {
        Icon: WineIcon,
        title: { de: 'Alles entspannt', en: 'Completely relaxed' },
        body: {
            de: 'Euer Koch kümmert sich um Einkauf, Zubereitung und Aufräumen. Ihr habt Zeit für eure Gäste.',
            en: 'Your chef takes care of shopping, cooking, and clean-up. You have time for your guests.',
        },
    },
    {
        Icon: ShieldCheckIcon,
        title: { de: 'Einfach & sicher buchen', en: 'Easy and secure booking' },
        body: {
            de: 'Kostenlose, unverbindliche Anfrage und sichere Bezahlung direkt über peopleeat.',
            en: 'Free, non-binding enquiry and secure payment directly through peopleeat.',
        },
    },
];

/** Marketing benefits shown on the public chef About column when the cook has no additional picture. */
export function CookAboutBenefitsFallback() {
    const locale = useLocale();

    return (
        <ul className="grid gap-8">
            {BENEFITS.map(({ Icon, title, body }) => (
                <li key={title.en} className="flex gap-4">
                    <Icon className="mt-0.5 size-6 shrink-0 text-foreground" strokeWidth={1.5} aria-hidden />
                    <div className="min-w-0 grid gap-1">
                        <p className="text-base font-semibold text-foreground">{title[locale]}</p>
                        <p className="text-sm/relaxed text-muted-foreground">{body[locale]}</p>
                    </div>
                </li>
            ))}
        </ul>
    );
}
