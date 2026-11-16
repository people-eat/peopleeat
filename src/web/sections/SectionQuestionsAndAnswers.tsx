import { ChevronDownIcon } from 'lucide-react';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import { t } from '../../i18n/t';
import type { Locale } from '../../shared/locale';
import { MarkdownBody } from '../components/MarkdownBody';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { cn } from '../utils/cn';

export type QuestionsAndAnswersEntry = {
    question: string;
    answer: string;
    /** When `markdown`, `answer` is rendered via `MarkdownBody`. Default plain. */
    answerFormat?: 'plain' | 'markdown';
    items?: ReadonlyArray<string>;
    footer?: string;
};

function publicFaqs(locale: Locale): ReadonlyArray<QuestionsAndAnswersEntry> {
    return [
        {
            question: t(locale, 'public', 'faq.bookingQuestion'),
            answer: t(locale, 'public', 'faq.bookingIntro'),
            items: [
                t(locale, 'public', 'faq.bookingItem1'),
                t(locale, 'public', 'faq.bookingItem2'),
                t(locale, 'public', 'faq.bookingItem3'),
            ],
        },
        {
            question: t(locale, 'public', 'faq.includedQuestion'),
            answer: t(locale, 'public', 'faq.includedIntro'),
            items: [
                t(locale, 'public', 'faq.includedItem1'),
                t(locale, 'public', 'faq.includedItem2'),
                t(locale, 'public', 'faq.includedItem3'),
                t(locale, 'public', 'faq.includedItem4'),
            ],
            footer: t(locale, 'public', 'faq.includedFooter'),
        },
        {
            question: t(locale, 'public', 'faq.advanceQuestion'),
            answer: t(locale, 'public', 'faq.advanceAnswer'),
        },
        {
            question: t(locale, 'public', 'faq.drinksQuestion'),
            answer: t(locale, 'public', 'faq.drinksAnswer'),
        },
        {
            question: t(locale, 'public', 'faq.cutleryQuestion'),
            answer: t(locale, 'public', 'faq.cutleryAnswer'),
        },
        {
            question: t(locale, 'public', 'faq.menuQuestion'),
            answer: t(locale, 'public', 'faq.menuAnswer'),
        },
        {
            question: t(locale, 'public', 'faq.paymentQuestion'),
            answer: t(locale, 'public', 'faq.paymentAnswer'),
        },
    ];
}

export function publicFaqJsonLdEntries(locale: Locale) {
    return publicFaqs(locale).map((faq) => ({
        question: faq.question,
        answer: [faq.answer, ...(faq.items ?? []), faq.footer].filter(Boolean).join(' '),
    }));
}

export function SectionQuestionsAndAnswers({
    className,
    title,
    titleClassName,
    faqs,
    inset = true,
}: {
    className?: string;
    title?: string;
    /** Overrides the default FAQ heading size/weight. */
    titleClassName?: string;
    faqs?: ReadonlyArray<QuestionsAndAnswersEntry>;
    /** Horizontal padding on heading and rows. Off when nested in a padded content column. */
    inset?: boolean;
}) {
    const locale = useLocale();
    const { t: tPublic } = useT('public');
    const baseId = useId();
    const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | undefined>(undefined);
    const entries = faqs ?? publicFaqs(locale);
    const heading = title === undefined ? tPublic('faq.heading') : title.trim();
    const insetPad = inset ? 'px-4 @lg:px-6' : undefined;

    return (
        <section className={cn('mx-auto grid w-full max-w-7xl gap-8', className)}>
            {heading ? <h2 className={cn(titleClassName ?? 'font-serif text-3xl font-light @md:text-4xl', insetPad)}>{heading}</h2> : null}
            <dl className="divide-y divide-border/70 border-y border-border/70">
                {entries.map((faq, index) => {
                    const expanded = expandedFaqIndex === index;
                    const panelId = `${baseId}-panel-${index}`;
                    const buttonId = `${baseId}-button-${index}`;
                    return (
                        <div key={`${faq.question}-${index}`} className={cn('py-1.5', insetPad)}>
                            <dt>
                                <button
                                    id={buttonId}
                                    type="button"
                                    aria-expanded={expanded}
                                    aria-controls={panelId}
                                    className={cn(
                                        'group flex w-full cursor-pointer items-start justify-between gap-6 p-3 text-left text-foreground @lg:px-4',
                                        'rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                        'hover:bg-foreground/5 active:bg-foreground/10',
                                    )}
                                    onClick={() => setExpandedFaqIndex(expanded ? undefined : index)}
                                >
                                    <span
                                        className={cn(
                                            'text-base/7 transition-colors duration-200 ease-out motion-reduce:transition-none',
                                            expanded ? 'text-foreground' : 'text-foreground/90 group-hover:text-foreground',
                                        )}
                                    >
                                        {faq.question}
                                    </span>
                                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border/80 text-muted-foreground transition-colors duration-200 ease-out group-hover:border-foreground/30 group-hover:text-foreground motion-reduce:transition-none">
                                        <ChevronDownIcon
                                            aria-hidden
                                            className={cn(
                                                'size-4 transition-transform duration-200 ease-out motion-reduce:transition-none',
                                                expanded && 'rotate-180',
                                            )}
                                        />
                                    </span>
                                </button>
                            </dt>
                            <dd>
                                <div
                                    id={panelId}
                                    role="region"
                                    aria-labelledby={buttonId}
                                    className={cn(
                                        'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                                        expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                                    )}
                                >
                                    <div className="min-h-0 overflow-hidden" aria-hidden={!expanded} inert={!expanded || undefined}>
                                        <div className="px-3 pb-4 @lg:px-4">
                                            <FaqAnswer faq={faq} />
                                        </div>
                                    </div>
                                </div>
                            </dd>
                        </div>
                    );
                })}
            </dl>
        </section>
    );
}

function FaqAnswer({ faq }: { faq: QuestionsAndAnswersEntry }): ReactNode {
    if (faq.answerFormat === 'markdown') {
        return <MarkdownBody text={faq.answer} className="text-base/7 text-muted-foreground" />;
    }

    return (
        <>
            <p className="text-base/7 text-muted-foreground">{faq.answer}</p>
            {faq.items ? (
                <ol className="mt-2 list-decimal pl-5 text-base/7 text-muted-foreground">
                    {faq.items.map((item) => (
                        <li className="pl-1" key={item}>
                            {item}
                        </li>
                    ))}
                </ol>
            ) : null}
            {faq.footer ? <p className="mt-2 text-base/7 text-muted-foreground">{faq.footer}</p> : null}
        </>
    );
}
