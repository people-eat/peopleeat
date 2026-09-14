import { UserIcon } from 'lucide-react';

import { useLocale } from '../hooks/useLocale';

export function SectionChefTestimonials() {
    const locale = useLocale();

    const testimonials = {
        de: {
            first: 'Sollte es mal Probleme mit einem Kunden geben, werden schnelle Lösungen durch den Support gefunden, sodass beide Seiten happy sind. Das Team legt sehr viel Wert auf eine erfolgreiche Zusammenarbeit. Klasse Idee, macht weiter so.',
            firstRole: 'Professioneller Koch',
            second: 'Ohne die simple Lösung, Kochdienstleistungen online zu managen, hätte ich meinen Weg zum Privatkoch nie so einfach gemeistert. Ich habe bereits sehr enge Kundenbindungen aufbauen können und freue mich stetig, diese zu erweitern. Falls du mit dem Gedanken spielst, dein Talent mit mehr Menschen zu teilen, mach es mit peopleeat.',
            secondRole: 'Privatkoch',
        },
        en: {
            first: 'Whenever there are issues with a customer, the support team quickly finds solutions so both sides are happy. The team places great importance on successful collaboration. Great idea, keep it up.',
            firstRole: 'Professional chef',
            second: "Without the simple solution to manage chef services online, I would never have made my way to becoming a private chef so easily. I've already been able to build very close customer relationships and I'm constantly looking forward to expanding them. If you're thinking about sharing your talent with more people, do it with peopleeat.",
            secondRole: 'Private chef',
        },
    }[locale];

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <div className="mx-auto grid max-w-2xl grid-cols-1 @lg:mx-0 @lg:max-w-none @lg:grid-cols-2">
                <div className="flex flex-col pb-10 @sm:pb-16 @lg:pr-8 @lg:pb-0 @xl:pr-20">
                    <figure className="mt-10 flex flex-auto flex-col justify-between">
                        <blockquote className="text-lg/8 text-foreground">
                            <p>{testimonials.first}</p>
                        </blockquote>
                        <figcaption className="mt-10 flex items-center gap-x-6">
                            <span className="inline-flex size-14 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                                <UserIcon aria-hidden className="size-8" />
                            </span>
                            <div className="text-base">
                                <div className="font-medium text-foreground">René W.</div>
                                <div className="mt-1 text-muted-foreground">{testimonials.firstRole}</div>
                            </div>
                        </figcaption>
                    </figure>
                </div>
                <div className="flex flex-col border-t border-foreground/10 pt-10 @sm:pt-16 @lg:border-t-0 @lg:border-l @lg:pt-0 @lg:pl-8 @xl:pl-20">
                    <figure className="mt-10 flex flex-auto flex-col justify-between">
                        <blockquote className="text-lg/8 text-foreground">
                            <p>{testimonials.second}</p>
                        </blockquote>
                        <figcaption className="mt-10 flex items-center gap-x-6">
                            <span className="inline-flex size-14 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                                <UserIcon aria-hidden className="size-8" />
                            </span>
                            <div className="text-base">
                                <div className="font-semibold text-foreground">Chris K.</div>
                                <div className="mt-1 text-muted-foreground">{testimonials.secondRole}</div>
                            </div>
                        </figcaption>
                    </figure>
                </div>
            </div>
        </section>
    );
}
