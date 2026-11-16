import type { CatalogLocale } from '../../shared/locale';

type WhatsAppTemplateCopy = {
    header: string;
    body: string;
    buttonLabel?: string;
    quickReplies?: string[];
};

/** Meta-registered template languages. Catalog stays DE/EN only. */
export type WhatsAppTemplateLanguage = 'de' | 'en';

export type WhatsAppTemplateDefinition = {
    name: string;
    category: 'UTILITY';
    parameters: string[];
    examples: string[];
    de: WhatsAppTemplateCopy;
    en: WhatsAppTemplateCopy;
};

export type WhatsAppTemplateSnapshot = {
    name: string;
    /** Effective Meta language actually sent (`de` or `en`), not the recipient catalog locale. */
    languageCode: WhatsAppTemplateLanguage;
    header: string;
    body: string;
    bodyParameters: string[];
    buttons: { type: 'URL' | 'QUICK_REPLY'; label: string; url?: string }[];
};

/** Map recipient catalog locale to a registered Meta template language. Only German uses `de`; all others use `en`. */
export function whatsappTemplateLocale(locale: CatalogLocale): WhatsAppTemplateLanguage {
    return locale === 'de' ? 'de' : 'en';
}

export const whatsappTemplateDefinitions: WhatsAppTemplateDefinition[] = [
    {
        name: 'booking_request_received_customer_v2',
        category: 'UTILITY',
        parameters: ['recipientName', 'eventDate', 'eventTime'],
        examples: ['Anna', '2026-12-12', '18:00'],
        de: {
            header: 'Buchungsanfrage erhalten',
            body: '*Hallo {{1}},* 👋\n\ndanke für deine Buchungsanfrage! Wie schön, dass du deinen Anlass mit peopleeat planst 🙌\n\nDeine Anfrage für den {{2}} um {{3}} ist bei uns angekommen ✅.\n\nSobald ein Menüvorschlag für dich vorliegt, geben wir dir Bescheid 👨🏻‍🍳. Den aktuellen Stand kannst du jederzeit in deiner Anfrage ansehen.\n\nDein peopleeat Team',
            buttonLabel: 'Anfrage ansehen',
        },
        en: {
            header: 'Booking request received',
            body: "*Hello {{1}},* 👋\n\nthanks for your booking request! We're happy you're planning your occasion with peopleeat 🙌\n\nWe've received your request for {{2}} at {{3}} ✅.\n\nWe'll let you know as soon as a menu proposal is available 👨🏻‍🍳. You can check the current status in your request at any time.\n\nYour peopleeat team",
            buttonLabel: 'View request',
        },
    },
    {
        name: 'booking_request_available_cook_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'eventLocation', 'eventDate'],
        examples: ['Michael', 'Frankfurt am Main', '2026-12-12'],
        de: {
            header: 'Neue Buchungsanfrage',
            body: '*Hallo {{1}},* 👋\n\ndu hast eine Buchungsanfrage für deinen Kochservice erhalten 📨.\n\n📍 Ort: *{{2}}*\n📅 Datum: *{{3}}*\n\nBitte prüfe die Angaben und den Termin in deinen Anfragedetails.\n\nDein peopleeat Team',
            buttonLabel: 'Anfrage prüfen',
        },
        en: {
            header: 'New booking request',
            body: '*Hello {{1}},* 👋\n\nyou have received a booking request for your chef service 📨.\n\n📍 Location: *{{2}}*\n📅 Date: *{{3}}*\n\nPlease check the details and appointment date in your booking request.\n\nYour peopleeat team',
            buttonLabel: 'Review request',
        },
    },
    {
        name: 'booking_request_updated_cook_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'customerName'],
        examples: ['Michael', 'Anna'],
        de: {
            header: 'Buchungsanfrage geändert',
            body: '*Hallo {{1}},* 👋\n\n{{2}} hat die Buchungsanfrage geändert, zu der du ein Angebot erstellt hast ✏️.\n\nSchau dir die Änderungen an, damit dein Angebot weiterhin zu den Eventdetails passt. Im Buchungschat könnt ihr offene Fragen direkt klären 💬.\n\nDein peopleeat Team',
            buttonLabel: 'Änderungen prüfen',
        },
        en: {
            header: 'Booking request updated',
            body: '*Hello {{1}},* 👋\n\n{{2}} has updated the booking request for which you submitted an offer ✏️.\n\nTake a look at the changes so your offer still matches the event details. You can discuss any questions in the booking chat 💬.\n\nYour peopleeat team',
            buttonLabel: 'Review changes',
        },
    },
    {
        name: 'menu_offer_created_customer_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'cookName', 'eventDate', 'menuName'],
        examples: ['Anna', 'Michael', '2026-12-12', 'Wintermenü'],
        de: {
            header: 'Menüvorschlag erhalten',
            body: '*Hallo {{1}},* 👋\n\n👨🏻‍🍳 {{2}} hat dir für deine Buchungsanfrage am {{3}} einen persönlichen Menüvorschlag gesendet.\n\n📌 *{{4}}*\n\nSchau dir das Menü ganz in Ruhe an. Wenn du etwas ändern möchtest, kannst du eine Anpassung anfragen 💬. Wenn alles passt, kannst du deine Buchung im Angebot abschließen ✅.\n\nDein peopleeat Team',
            buttonLabel: 'Vorschlag ansehen',
        },
        en: {
            header: 'Menu proposal received',
            body: "*Hello {{1}},* 👋\n\n👨🏻‍🍳 {{2}} has sent you a personal menu proposal for your booking request for {{3}}.\n\n📌 *{{4}}*\n\nTake your time to look through the menu. If you'd like any changes, you can request an adjustment 💬. When everything looks right, you can complete your booking in the offer ✅.\n\nYour peopleeat team",
            buttonLabel: 'View proposal',
        },
    },
    {
        name: 'menu_offer_updated_customer_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'cookName', 'eventDate'],
        examples: ['Anna', 'Michael', '2026-12-12'],
        de: {
            header: 'Menüvorschlag aktualisiert',
            body: '*Hallo {{1}},* 👋\n\n👨🏻‍🍳 {{2}} hat den Menüvorschlag für deine Buchungsanfrage am {{3}} aktualisiert ✏️.\n\nDu kannst dir die Änderungen jetzt in Ruhe anschauen. Offene Fragen könnt ihr direkt im Buchungschat besprechen 💬.\n\nDein peopleeat Team',
            buttonLabel: 'Menü ansehen',
        },
        en: {
            header: 'Menu proposal updated',
            body: '*Hello {{1}},* 👋\n\n👨🏻‍🍳 {{2}} has updated the menu proposal for your booking request for {{3}} ✏️.\n\nYou can now take a look at the changes. Any questions can be discussed directly in the booking chat 💬.\n\nYour peopleeat team',
            buttonLabel: 'View menu',
        },
    },
    {
        name: 'menu_offer_changes_requested_cook_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'customerName', 'eventDate', 'requestedChanges'],
        examples: ['Michael', 'Anna', '2026-12-12', 'Bitte die Vorspeise vegetarisch zubereiten.'],
        de: {
            header: 'Menüanpassung angefragt',
            body: '*Hallo {{1}},* 👋\n\n{{2}} hat zu deinem Menüvorschlag für den {{3}} eine Anpassung angefragt ✏️.\n\nNachricht des Kunden 💬:\n„{{4}}“\n\nBitte prüfe den Wunsch und stimme die Anpassung im Buchungschat ab.\n\nDein peopleeat Team',
            buttonLabel: 'Chat öffnen',
        },
        en: {
            header: 'Menu changes requested',
            body: "*Hello {{1}},* 👋\n\n{{2}} has requested a change to your menu proposal for {{3}} ✏️.\n\nCustomer's message 💬:\n“{{4}}”\n\nPlease review the request and discuss the adjustment in the booking chat.\n\nYour peopleeat team",
            buttonLabel: 'Open chat',
        },
    },
    {
        name: 'menu_offer_accepted_cook_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'customerName', 'eventDate'],
        examples: ['Michael', 'Anna', '2026-12-12'],
        de: {
            header: 'Angebot angenommen',
            body: '*Hallo {{1}},* 👋\n\n{{2}} hat dein Angebot für den {{3}} angenommen, stark gemacht! 🎉\n\nTrage dir den Termin am besten direkt in deinen Kalender ein 🗓️. Den aktuellen Buchungs- und Zahlungsstatus findest du in den Buchungsdetails.\n\nIm Chat könnt ihr die letzten Einzelheiten für das Event abstimmen 💬.\n\nDein peopleeat Team',
            buttonLabel: 'Buchung ansehen',
        },
        en: {
            header: 'Offer accepted',
            body: '*Hello {{1}},* 👋\n\n{{2}} has accepted your offer for {{3}}, nicely done! 🎉\n\nAdd the date to your calendar 🗓️. You can find the current booking and payment status in the booking details.\n\nYou can arrange the final details for the event in the chat 💬.\n\nYour peopleeat team',
            buttonLabel: 'View booking',
        },
    },
    {
        name: 'offer_chat_message_received_customer_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'senderName'],
        examples: ['Anna', 'Michael'],
        de: {
            header: 'Neue Nachricht zur Buchung',
            body: '*Hallo {{1}},* 👋\n\ndu hast eine neue Nachricht von {{2}} im Chat zu deiner Buchungsanfrage erhalten 💬.\n\nÖffne den Buchungschat, um sie zu lesen und direkt zu antworten.\n\nDein peopleeat Team',
            buttonLabel: 'Chat öffnen',
        },
        en: {
            header: 'New booking message',
            body: '*Hello {{1}},* 👋\n\nyou have a new message from {{2}} in your booking request chat 💬.\n\nOpen the booking chat to read it and reply directly.\n\nYour peopleeat team',
            buttonLabel: 'Open chat',
        },
    },
    {
        name: 'offer_chat_message_received_cook_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'senderName'],
        examples: ['Michael', 'Anna'],
        de: {
            header: 'Neue Nachricht zur Buchung',
            body: '*Hallo {{1}},* 👋\n\ndu hast eine neue Nachricht von {{2}} im Chat zu deinem Angebot erhalten 💬.\n\nÖffne den Buchungschat, um sie zu lesen und direkt zu antworten.\n\nDein peopleeat Team',
            buttonLabel: 'Chat öffnen',
        },
        en: {
            header: 'New booking message',
            body: '*Hello {{1}},* 👋\n\nyou have a new message from {{2}} in the chat for your offer 💬.\n\nOpen the booking chat to read it and reply directly.\n\nYour peopleeat team',
            buttonLabel: 'Open chat',
        },
    },
    {
        name: 'booking_request_feedback_requested_customer_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'eventDate'],
        examples: ['Anna', '2026-12-12'],
        de: {
            header: 'Rückmeldung zu deiner Anfrage',
            body: '*Hallo {{1}},* 👋\n\nzu deiner Buchungsanfrage für den {{2}} liegen Menüvorschläge vor 👨🏻‍🍳.\n\nHilf uns mit einer kurzen Rückmeldung. So können wir deine Anfrage bestmöglich begleiten 😊. Wie passen die Vorschläge bisher für dich?',
            quickReplies: [
                'Ich brauche mehr Zeit',
                'Noch nicht angesehen',
                'Budget passt nicht',
                'Menü passt nicht',
                'Kein Interesse mehr',
            ],
        },
        en: {
            header: 'Feedback on your request',
            body: '*Hello {{1}},* 👋\n\nmenu proposals are available for your booking request for {{2}} 👨🏻‍🍳.\n\nA quick update helps us support you with your request 😊. How are the proposals working for you so far?',
            quickReplies: ['I need more time', 'Not viewed yet', 'Budget does not fit', 'Menu does not fit', 'No longer interested'],
        },
    },
    {
        name: 'video_call_requested_participant_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'requesterName', 'callDate', 'callTime', 'eventDate', 'occasion'],
        examples: ['Anna', 'Michael', '2026-12-05', '17:00', '2026-12-12', 'Geburtstag'],
        de: {
            header: 'Neuer Videotermin angefragt',
            body: '*Hallo {{1}},* 👋\n\n{{2}} hat zu deiner bestehenden Buchungsanfrage einen Videotermin angefragt 💬.\n\n*Terminvorschlag*\n📅 {{3}}\n🕒 {{4}}\n\n*Zum Event*\n📅 Datum: {{5}}\n🎉 Anlass: {{6}}\n\nBitte bestätige den Termin oder lehne ihn über den Button ab.\n\nDein peopleeat Team',
            buttonLabel: 'Termin beantworten',
        },
        en: {
            header: 'Video call requested',
            body: '*Hello {{1}},* 👋\n\n{{2}} has requested a video appointment for your existing booking request 💬.\n\n*Proposed appointment*\n📅 {{3}}\n🕒 {{4}}\n\n*About the event*\n📅 Date: {{5}}\n🎉 Occasion: {{6}}\n\nPlease accept or decline the appointment using the button below.\n\nYour peopleeat team',
            buttonLabel: 'Respond to request',
        },
    },
    {
        name: 'video_call_confirmed_participant_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'counterpartyName', 'callDate', 'callTime'],
        examples: ['Anna', 'Michael', '2026-12-05', '17:00'],
        de: {
            header: 'Videotermin bestätigt',
            body: '*Hallo {{1}},* 👋\n\n{{2}} hat euren Videotermin bestätigt ✅.\n\n📅 {{3}}\n🕒 {{4}}\n\nDie Termindetails und den Zugang zum Gespräch findest du über den Button unten. Wir erinnern dich noch einmal 60 Minuten vor Beginn 😊.\n\nDein peopleeat Team',
            buttonLabel: 'Videotermin ansehen',
        },
        en: {
            header: 'Video call confirmed',
            body: "*Hello {{1}},* 👋\n\n{{2}} has confirmed your video call ✅.\n\n📅 {{3}}\n🕒 {{4}}\n\nUse the button below to view the appointment details and access the call. We'll remind you again 60 minutes before it starts 😊.\n\nYour peopleeat team",
            buttonLabel: 'View video call',
        },
    },
    {
        name: 'video_call_canceled_participant_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'counterpartyName', 'reason'],
        examples: ['Anna', 'Michael', 'Der Termin überschneidet sich mit einem anderen Auftrag.'],
        de: {
            header: 'Videotermin abgesagt',
            body: '*Hallo {{1}},*\n\n{{2}} hat euren Videotermin abgesagt.\n\nGrund: {{3}}\n\nDu kannst gerne einen neuen Termin anfragen 🗓️.\n\nDein peopleeat Team',
            buttonLabel: 'Neuen Termin anfragen',
        },
        en: {
            header: 'Video call canceled',
            body: "*Hello {{1}},*\n\n{{2}} has canceled your video call.\n\nReason: {{3}}\n\nYou're welcome to request a new appointment 🗓️.\n\nYour peopleeat team",
            buttonLabel: 'Request new time',
        },
    },
    {
        name: 'video_call_reminder_participant_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'counterpartyName', 'callDate', 'callTime'],
        examples: ['Anna', 'Michael', '2026-12-05', '17:00'],
        de: {
            header: 'Videotermin in 60 Minuten',
            body: '*Hallo {{1}},* 👋\n\ndein Videogespräch mit {{2}} beginnt in 60 Minuten ⏰.\n\n📅 {{3}}\n🕒 {{4}}\n\nÜber den Button kommst du direkt zu deinem Videotermin. Bis gleich 😊!\n\nDein peopleeat Team',
            buttonLabel: 'Zum Videogespräch',
        },
        en: {
            header: 'Video call in 60 minutes',
            body: '*Hello {{1}},* 👋\n\nyour video call with {{2}} starts in 60 minutes ⏰.\n\n📅 {{3}}\n🕒 {{4}}\n\nThe button takes you straight to your video appointment. See you soon 😊!\n\nYour peopleeat team',
            buttonLabel: 'Open video call',
        },
    },
    {
        name: 'booking_review_memory_customer_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'counterpartyName', 'eventDate'],
        examples: ['Anna', 'Michael', '2026-12-12'],
        de: {
            header: 'Hinweis zu deiner Buchung',
            body: '*Hallo {{1}},* 👋\n\nein kleiner Hinweis zu deiner Buchung mit {{2}} am {{3}}: Wenn du magst, halte ein paar Momente des Events fest 📸.\n\nFotos und kurze Notizen helfen dir später, deine Eindrücke in einer Bewertung zu teilen 😊. Deine Buchungsdetails findest du über den Button unten.\n\nDein peopleeat Team',
            buttonLabel: 'Buchung ansehen',
        },
        en: {
            header: 'A note about your booking',
            body: "*Hello {{1}},* 👋\n\na little note about your booking with {{2}} on {{3}}: if you'd like, capture a few moments from the event 📸.\n\nPhotos and short notes can help you share your impressions in a review later 😊. Your booking details are linked below.\n\nYour peopleeat team",
            buttonLabel: 'View booking',
        },
    },
    {
        name: 'booking_review_morning_customer_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'counterpartyName', 'eventDate'],
        examples: ['Anna', 'Michael', '2026-12-12'],
        de: {
            header: 'Bewertung zu deiner Buchung',
            body: '*Hallo {{1}},* 👋\n\nwie war dein Event mit {{2}} am {{3}}? Zu dieser Buchung fehlt noch deine Bewertung ⭐.\n\nTeile gerne, wie du das Event erlebt hast. Über den Button kommst du direkt zur Bewertung. Danke für deine Rückmeldung 😊!\n\nDein peopleeat Team',
            buttonLabel: 'Bewertung schreiben',
        },
        en: {
            header: 'Review your booking',
            body: "*Hello {{1}},* 👋\n\nhow was your event with {{2}} on {{3}}? Your review for this booking is still pending ⭐.\n\nWe'd love to hear about your experience. The button takes you straight to the review. Thanks for your feedback 😊!\n\nYour peopleeat team",
            buttonLabel: 'Write a review',
        },
    },
    {
        name: 'booking_review_evening_customer_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'counterpartyName', 'eventDate'],
        examples: ['Anna', 'Michael', '2026-12-12'],
        de: {
            header: 'Bewertung zu deiner Buchung',
            body: '*Hallo {{1}},* 👋\n\neine kurze Erinnerung an deine Bewertung zur Buchung mit {{2}} am {{3}} ⭐.\n\nWenn du noch einen Moment Zeit hast, teile gerne deine Eindrücke. Falls du inzwischen bewertet hast, ist nichts weiter zu tun. Vielen Dank 😊!\n\nDein peopleeat Team',
            buttonLabel: 'Bewertung schreiben',
        },
        en: {
            header: 'Review your booking',
            body: "*Hello {{1}},* 👋\n\na quick reminder about your review for the booking with {{2}} on {{3}} ⭐.\n\nIf you have a moment, we'd love to hear your impressions. If you've already left a review, there's nothing else to do. Thank you 😊!\n\nYour peopleeat team",
            buttonLabel: 'Write a review',
        },
    },
    {
        name: 'booking_review_memory_cook_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'counterpartyName', 'eventDate'],
        examples: ['Michael', 'Anna', '2026-12-12'],
        de: {
            header: 'Hinweis zu deiner Buchung',
            body: '*Hallo {{1}},* 👋\n\nein kleiner Hinweis zu deiner Buchung mit {{2}} am {{3}}: Wenn du magst, halte ein paar Momente des Events fest 📸.\n\nFotos und kurze Notizen helfen dir später, deine Eindrücke in einer Bewertung zu teilen 😊. Deine Buchungsdetails findest du über den Button unten.\n\nDein peopleeat Team',
            buttonLabel: 'Buchung ansehen',
        },
        en: {
            header: 'A note about your booking',
            body: "*Hello {{1}},* 👋\n\na little note about your booking with {{2}} on {{3}}: if you'd like, capture a few moments from the event 📸.\n\nPhotos and short notes can help you share your impressions in a review later 😊. Your booking details are linked below.\n\nYour peopleeat team",
            buttonLabel: 'View booking',
        },
    },
    {
        name: 'booking_review_morning_cook_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'counterpartyName', 'eventDate'],
        examples: ['Michael', 'Anna', '2026-12-12'],
        de: {
            header: 'Bewertung zu deiner Buchung',
            body: '*Hallo {{1}},* 👋\n\nwie war dein Event mit {{2}} am {{3}}? Zu dieser Buchung fehlt noch deine Bewertung ⭐.\n\nTeile gerne, wie du das Event erlebt hast. Über den Button kommst du direkt zur Bewertung. Danke für deine Rückmeldung 😊!\n\nDein peopleeat Team',
            buttonLabel: 'Bewertung schreiben',
        },
        en: {
            header: 'Review your booking',
            body: "*Hello {{1}},* 👋\n\nhow was your event with {{2}} on {{3}}? Your review for this booking is still pending ⭐.\n\nWe'd love to hear about your experience. The button takes you straight to the review. Thanks for your feedback 😊!\n\nYour peopleeat team",
            buttonLabel: 'Write a review',
        },
    },
    {
        name: 'booking_review_evening_cook_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'counterpartyName', 'eventDate'],
        examples: ['Michael', 'Anna', '2026-12-12'],
        de: {
            header: 'Bewertung zu deiner Buchung',
            body: '*Hallo {{1}},* 👋\n\neine kurze Erinnerung an deine Bewertung zur Buchung mit {{2}} am {{3}} ⭐.\n\nWenn du noch einen Moment Zeit hast, teile gerne deine Eindrücke. Falls du inzwischen bewertet hast, ist nichts weiter zu tun. Vielen Dank 😊!\n\nDein peopleeat Team',
            buttonLabel: 'Bewertung schreiben',
        },
        en: {
            header: 'Review your booking',
            body: "*Hello {{1}},* 👋\n\na quick reminder about your review for the booking with {{2}} on {{3}} ⭐.\n\nIf you have a moment, we'd love to hear your impressions. If you've already left a review, there's nothing else to do. Thank you 😊!\n\nYour peopleeat team",
            buttonLabel: 'Write a review',
        },
    },
    {
        name: 'video_call_declined_participant_v1',
        category: 'UTILITY',
        parameters: ['recipientName', 'counterpartyName', 'reason'],
        examples: ['Anna', 'Michael', 'Der Termin überschneidet sich mit einem anderen Auftrag.'],
        de: {
            header: 'Videotermin abgelehnt',
            body: '*Hallo {{1}},*\n\n{{2}} hat deinen Vorschlag für einen Videotermin leider abgelehnt.\n\nGrund: {{3}}\n\nDu kannst gerne einen neuen Termin anfragen 🗓️.\n\nDein peopleeat Team',
            buttonLabel: 'Neuen Termin anfragen',
        },
        en: {
            header: 'Video call declined',
            body: "*Hello {{1}},*\n\nunfortunately, {{2}} has declined your proposed video call.\n\nReason: {{3}}\n\nYou're welcome to request a new appointment 🗓️.\n\nYour peopleeat team",
            buttonLabel: 'Request new time',
        },
    },
];

export function whatsappTemplateDefinitionFind(name: string): WhatsAppTemplateDefinition {
    const definition = whatsappTemplateDefinitions.find((template) => template.name === name);
    if (!definition) throw new Error(`Unknown WhatsApp template: ${name}`);
    return definition;
}

export function whatsappTemplateSnapshotCreate(
    definition: WhatsAppTemplateDefinition,
    locale: CatalogLocale,
    parameters: ReadonlyArray<string>,
    buttonUrl?: string,
): WhatsAppTemplateSnapshot {
    if (parameters.length !== definition.parameters.length || parameters.some((value) => !value.trim())) {
        throw new Error(`Invalid body parameters for WhatsApp template ${definition.name}`);
    }
    const languageCode = whatsappTemplateLocale(locale);
    const copy = definition[languageCode];
    if (Boolean(copy.buttonLabel) !== Boolean(buttonUrl)) {
        throw new Error(`Invalid URL button for WhatsApp template ${definition.name}`);
    }
    return {
        name: definition.name,
        languageCode,
        header: copy.header,
        body: copy.body.replace(/\{\{(\d+)\}\}/gu, (_token, index: string) => parameters[Number(index) - 1]!),
        bodyParameters: [...parameters],
        buttons: copy.buttonLabel
            ? [{ type: 'URL', label: copy.buttonLabel, url: buttonUrl }]
            : (copy.quickReplies ?? []).map((label) => ({ type: 'QUICK_REPLY', label })),
    };
}

export function whatsappTemplateSnapshotText(snapshot: WhatsAppTemplateSnapshot): string {
    return [
        snapshot.header,
        snapshot.body,
        snapshot.buttons.map((button) => `${button.label}${button.url ? `: ${button.url}` : ''}`).join('\n'),
    ]
        .filter(Boolean)
        .join('\n\n');
}
