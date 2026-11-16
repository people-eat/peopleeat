import { ShieldCheckIcon, UtensilsIcon, WineIcon } from 'lucide-react';

import { useT } from '../hooks/useT';

/** Marketing benefits shown on the public chef About column when the cook has no additional picture. */
export function CookAboutBenefitsFallback() {
    const { t } = useT('public');

    const benefits = [
        { Icon: UtensilsIcon, titleKey: 'aboutBenefits.tasteTitle', bodyKey: 'aboutBenefits.tasteBody' },
        { Icon: WineIcon, titleKey: 'aboutBenefits.relaxedTitle', bodyKey: 'aboutBenefits.relaxedBody' },
        { Icon: ShieldCheckIcon, titleKey: 'aboutBenefits.secureTitle', bodyKey: 'aboutBenefits.secureBody' },
    ] as const;

    return (
        <ul className="grid gap-8">
            {benefits.map(({ Icon, titleKey, bodyKey }) => (
                <li key={titleKey} className="flex gap-4">
                    <Icon className="mt-0.5 size-6 shrink-0 text-foreground" strokeWidth={1.5} aria-hidden />
                    <div className="min-w-0 grid gap-1">
                        <p className="text-base font-semibold text-foreground">{t(titleKey)}</p>
                        <p className="text-sm/relaxed text-muted-foreground">{t(bodyKey)}</p>
                    </div>
                </li>
            ))}
        </ul>
    );
}
