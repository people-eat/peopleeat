import { UserIcon } from 'lucide-react';

import { useT } from '../hooks/useT';

export function SectionChefTestimonials() {
    const { t } = useT('public');

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <div className="mx-auto grid max-w-2xl grid-cols-1 @lg:mx-0 @lg:max-w-none @lg:grid-cols-2">
                <div className="flex flex-col pb-10 @sm:pb-16 @lg:pr-8 @lg:pb-0 @xl:pr-20">
                    <figure className="mt-10 flex flex-auto flex-col justify-between">
                        <blockquote className="text-lg/8 text-foreground">
                            <p>{t('howToBecome.testimonial1')}</p>
                        </blockquote>
                        <figcaption className="mt-10 flex items-center gap-x-6">
                            <span className="inline-flex size-14 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                                <UserIcon aria-hidden className="size-8" />
                            </span>
                            <div className="text-base">
                                <div className="font-medium text-foreground">René W.</div>
                                <div className="mt-1 text-muted-foreground">{t('howToBecome.testimonial1Role')}</div>
                            </div>
                        </figcaption>
                    </figure>
                </div>
                <div className="flex flex-col border-t border-foreground/10 pt-10 @sm:pt-16 @lg:border-t-0 @lg:border-l @lg:pt-0 @lg:pl-8 @xl:pl-20">
                    <figure className="mt-10 flex flex-auto flex-col justify-between">
                        <blockquote className="text-lg/8 text-foreground">
                            <p>{t('howToBecome.testimonial2')}</p>
                        </blockquote>
                        <figcaption className="mt-10 flex items-center gap-x-6">
                            <span className="inline-flex size-14 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                                <UserIcon aria-hidden className="size-8" />
                            </span>
                            <div className="text-base">
                                <div className="font-semibold text-foreground">Chris K.</div>
                                <div className="mt-1 text-muted-foreground">{t('howToBecome.testimonial2Role')}</div>
                            </div>
                        </figcaption>
                    </figure>
                </div>
            </div>
        </section>
    );
}
