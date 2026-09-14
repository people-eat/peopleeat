import { ChevronDownIcon } from 'lucide-react';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import type { Locale } from '../../shared/locale';
import { MarkdownBody } from '../components/MarkdownBody';
import { useLocale } from '../hooks/useLocale';
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
            question: { de: 'Wie funktionieren unsere Buchungsanfragen?', en: 'How do our booking requests work?' }[locale],
            answer: {
                de: 'So gehst du vor:',
                en: 'Here is how it works:',
            }[locale],
            items: [
                {
                    de: 'Buchungsdetails und Nachricht an uns: Du startest, indem du uns alle Details zu deinem Anlass mitteilst. Gleichzeitig kannst du uns im Textfeld über deine besonderen Wünsche und Anforderungen informieren.',
                    en: 'Booking details and message to us: Start by sharing all the details about your event. You can also use the text field to tell us about your special wishes and requirements.',
                },
                {
                    de: 'Wir finden für dich den passenden Koch: Wir prüfen deine Anfrage sorgfältig, um sicherzustellen, dass du den idealen Koch für deine Feier erhältst, der deinen Anforderungen entspricht.',
                    en: 'We find the right chef for you: We carefully review your request to ensure you get the ideal chef for your celebration who meets your requirements.',
                },
                {
                    de: 'Kontaktaufnahme: Sobald der passende Koch deine Anfrage akzeptiert, melden wir uns bei dir mit den nächsten Schritten.',
                    en: 'Contact: As soon as the right chef accepts your request, we will get in touch with you about the next steps.',
                },
            ].map((item) => item[locale]),
        },
        {
            question: { de: 'Was ist im Preis inklusive?', en: 'What is included in the price?' }[locale],
            answer: {
                de: 'Bei peopleeat lehnst du dich zurück und genießt die Zeit als Gastgeber. Das bedeutet, dass der Koch vom Einkauf bis zum Verlassen einer sauberen Küche alles übernimmt. Im Preis inbegriffen sind:',
                en: 'At peopleeat you sit back and enjoy your time as a host. This means the chef takes care of everything from grocery shopping to leaving a clean kitchen. Included in the price:',
            }[locale],
            items: [
                {
                    de: 'Einkauf der Lebensmittel: Der Koch kümmert sich um den Einkauf der Lebensmittel.',
                    en: 'Grocery shopping: The chef takes care of the grocery shopping.',
                },
                {
                    de: 'Zubereitung der Gerichte: Die Lebensmittel und die dazugehörigen Zutaten werden frisch in deiner Küche zubereitet.',
                    en: 'Meal preparation: The ingredients are freshly prepared in your kitchen.',
                },
                {
                    de: 'Servieren der Gerichte: Genieße es, Gastgeber zu sein, und mache dir keine Gedanken um das Servieren und Anrichten der Gerichte. Das übernimmt der Koch.',
                    en: "Serving the dishes: Enjoy being a host and don't worry about serving and plating the dishes. The chef takes care of that.",
                },
                {
                    de: 'Eine saubere Küche: Während du und deine Teilnehmer den letzten Gang genussreich verzehren, trägt der Koch dafür Sorge, dass die Küche sauber hinterlassen wird.',
                    en: 'A clean kitchen: While you and your participants enjoy the last course, the chef ensures the kitchen is left clean.',
                },
            ].map((item) => item[locale]),
            footer: {
                de: 'Kurz gesagt, bei peopleeat bieten wir dir die Möglichkeit, Gastgeber auf eine neue Art zu erleben, indem du dich ganz alleine auf deine Teilnehmer und die sensationellen Gerichte konzentrieren kannst.',
                en: 'In short, at peopleeat we offer you the opportunity to experience hosting in a new way by letting you focus entirely on your participants and the sensational dishes.',
            }[locale],
        },
        {
            question: {
                de: 'Wie lange im Voraus sollte ich einen Koch buchen?',
                en: 'How far in advance should I book a chef?',
            }[locale],
            answer: {
                de: 'Unsere Erfahrung: so früh wie möglich. Köche sind sehr gefragt und arbeiten sehr individuell; dennoch kannst du bis spätestens eine Woche vor deinem geplanten Anlass einen Koch buchen.',
                en: 'Our experience: as early as possible. Chefs are in high demand and work very individually, but you can book a chef up to one week before your planned event at the latest.',
            }[locale],
        },
        {
            question: {
                de: 'Wie sieht es mit den Getränken aus?',
                en: 'What about drinks?',
            }[locale],
            answer: {
                de: 'Wir stellen derzeit noch keine Getränkeauswahl zur Verfügung. Wir sind der Meinung, dass das Genießen deiner Lieblingsgetränke wie Weine, Aperitif usw. den Wohlfühlfaktor uneingeschränkt steigert und deshalb in deinen Händen liegen sollte. Falls du Getränkevorschläge benötigst, stehen wir dir dennoch gerne zur Verfügung.',
                en: 'We currently do not offer a drink selection. We believe that enjoying your favorite beverages like wines, aperitifs, etc. fully enhances the feel-good factor and should therefore be in your hands. If you need drink suggestions, we are happy to help.',
            }[locale],
        },
        {
            question: {
                de: 'Benötige ich Besteck und Geschirr?',
                en: 'Do I need cutlery and dishes?',
            }[locale],
            answer: {
                de: 'Im Regelfall sind alle Gegenstände bei dir vorhanden. Falls du Besteck oder Geschirr benötigst, kannst du dich gerne mit uns in Verbindung setzen. Wir finden eine passende Lösung für dich.',
                en: 'Usually all items are available at your place. If you need cutlery or dishes, feel free to get in touch with us. We will find a suitable solution for you.',
            }[locale],
        },
        {
            question: {
                de: 'Wie kann ich Menüdetails mit dem Koch besprechen?',
                en: 'How can I discuss menu details with the chef?',
            }[locale],
            answer: {
                de: 'Menüanpassungen können auch nach der Buchung auftreten. Über den Chat kannst du alle Menüdetails mit dem Koch abstimmen.',
                en: 'Menu adjustments can also occur after booking. You can coordinate all menu details with the chef via the chat.',
            }[locale],
        },
        {
            question: {
                de: 'Wann bezahle ich für die Buchung?',
                en: 'When do I pay for the booking?',
            }[locale],
            answer: {
                de: 'Der Gesamtbetrag deiner Buchung wird frühestens zwei Wochen im Voraus abgebucht. Findet dein Anlass innerhalb von zwei Wochen statt, wird der Gesamtbetrag direkt abgebucht. Es ist wichtig zu beachten, dass deine Zahlung erst einen Tag nach dem Anlass an den Koch ausgezahlt wird. Das stellt sicher, dass alles reibungslos abläuft und deine Zahlung geschützt ist.',
                en: 'The total amount of your booking will be charged at the earliest two weeks in advance. If your event takes place within two weeks, the total amount will be charged immediately. It is important to note that your payment will only be paid out to the chef one day after the event. This ensures that everything runs smoothly and your payment is protected.',
            }[locale],
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
    faqs,
    inset = true,
}: {
    className?: string;
    title?: string;
    faqs?: ReadonlyArray<QuestionsAndAnswersEntry>;
    /** Horizontal padding on heading and rows. Off when nested in a padded content column. */
    inset?: boolean;
}) {
    const locale = useLocale();
    const baseId = useId();
    const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | undefined>(undefined);
    const entries = faqs ?? publicFaqs(locale);
    const heading =
        title === undefined
            ? {
                  de: 'Häufig gestellte Fragen',
                  en: 'Frequently asked questions',
              }[locale]
            : title.trim();
    const insetPad = inset ? 'px-4 @lg:px-6' : undefined;

    return (
        <section className={cn('mx-auto grid w-full max-w-7xl gap-8', className)}>
            {heading ? <h2 className={cn('font-serif text-3xl font-light tracking-tight @3xl:text-5xl', insetPad)}>{heading}</h2> : null}
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
