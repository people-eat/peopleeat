import type { WhatsAppTemplateDefinition, WhatsAppTemplateLanguage } from '../domain/whatsappTemplates';

export type MetaTemplate = {
    id: string;
    name: string;
    language: string;
    status: string;
    category: string;
    components: Array<{
        type: string;
        format?: string;
        text?: string;
        buttons?: Array<{ type: string; text: string; url?: string }>;
    }>;
};

export function whatsappTemplateMetaPayloadCreate(
    definition: WhatsAppTemplateDefinition,
    locale: WhatsAppTemplateLanguage,
    webPageUrl: string,
) {
    const copy = definition[locale];
    const exampleUrl = `${webPageUrl.replace(/\/$/u, '')}/api/whatsapp/links/ExampleWhatsAppLink01`;
    return {
        name: definition.name,
        language: locale,
        category: definition.category,
        parameter_format: 'POSITIONAL',
        components: [
            { type: 'HEADER', format: 'TEXT', text: copy.header },
            {
                type: 'BODY',
                text: copy.body,
                ...(definition.examples.length ? { example: { body_text: [definition.examples] } } : {}),
            },
            {
                type: 'BUTTONS',
                buttons: copy.buttonLabel
                    ? [
                          {
                              type: 'URL',
                              text: copy.buttonLabel,
                              url: `${webPageUrl.replace(/\/$/u, '')}/api/whatsapp/links/{{1}}`,
                              example: [exampleUrl],
                          },
                      ]
                    : (copy.quickReplies ?? []).map((text) => ({ type: 'QUICK_REPLY', text })),
            },
        ],
    };
}

/** The host is fixed when the template is approved. Demo and production share one account, so only the path is compared. */
function trackingButtonUrlCanonical(url: string): string {
    let decoded = url;
    try {
        decoded = decodeURIComponent(url);
    } catch {
        decoded = url;
    }
    const match = /^https:\/\/[^/?#]+(\/api\/whatsapp\/links\/\{\{1\}\})$/u.exec(decoded);
    return match?.[1] ?? decoded;
}

type ComparableComponent = {
    type: string;
    text?: string;
    format?: string;
    buttons?: Array<{ type: string; text: string; url?: string }>;
};

function comparableComponents(components: MetaTemplate['components'] | undefined): ComparableComponent[] {
    return (components ?? []).map((component) => ({
        type: component.type.toUpperCase(),
        ...(component.text !== undefined ? { text: component.text } : {}),
        ...(component.format !== undefined ? { format: component.format.toUpperCase() } : {}),
        ...(component.buttons
            ? {
                  buttons: component.buttons.map((button) => ({
                      type: button.type.toUpperCase(),
                      text: button.text,
                      ...(button.url !== undefined ? { url: trackingButtonUrlCanonical(button.url) } : {}),
                  })),
              }
            : {}),
    }));
}

function componentDifference(expected: ComparableComponent, actual: ComparableComponent | undefined): string {
    if (!actual) return `${expected.type} missing`;
    if (expected.type !== actual.type) return `${expected.type} registered as ${actual.type}`;
    if (expected.format !== actual.format)
        return `${expected.type} format ${actual.format ?? 'none'}, catalog ${expected.format ?? 'none'}`;
    if (expected.text !== actual.text) return `${expected.type} text differs`;
    const expectedButtons = expected.buttons ?? [];
    const actualButtons = actual.buttons ?? [];
    if (expectedButtons.length !== actualButtons.length)
        return `${expected.type} button count ${actualButtons.length}, catalog ${expectedButtons.length}`;
    for (const [index, button] of expectedButtons.entries()) {
        const registered = actualButtons[index];
        if (!registered || button.type !== registered.type || button.text !== registered.text || button.url !== registered.url) {
            return `${expected.type} button ${index + 1} is ${registered?.type ?? 'none'} "${registered?.text ?? ''}" ${registered?.url ?? ''}`.trim();
        }
    }
    return `${expected.type} differs`;
}

export function whatsappTemplateMetaMatches(
    template: MetaTemplate,
    definition: WhatsAppTemplateDefinition,
    locale: WhatsAppTemplateLanguage,
    webPageUrl: string,
) {
    const expected = whatsappTemplateMetaPayloadCreate(definition, locale, webPageUrl);
    return (
        template.name === definition.name &&
        template.language === locale &&
        JSON.stringify(comparableComponents(template.components)) === JSON.stringify(comparableComponents(expected.components))
    );
}

/** Null when this variant may be sent. Otherwise a short reason safe to put in the send log. */
export function whatsappTemplateBlockReason(
    template: MetaTemplate,
    definition: WhatsAppTemplateDefinition,
    locale: WhatsAppTemplateLanguage,
    webPageUrl: string,
): string | null {
    if (template.status.toUpperCase() !== 'APPROVED') return `status ${template.status}`;
    if (template.category.toUpperCase() !== 'UTILITY') return `category ${template.category}`;
    const expected = comparableComponents(whatsappTemplateMetaPayloadCreate(definition, locale, webPageUrl).components);
    const actual = comparableComponents(template.components);
    if (JSON.stringify(actual) === JSON.stringify(expected)) return null;
    if (actual.length !== expected.length) {
        return `components ${actual.map((component) => component.type).join(',') || 'none'}, catalog ${expected.map((component) => component.type).join(',')}`;
    }
    for (const [index, component] of expected.entries()) {
        if (JSON.stringify(component) !== JSON.stringify(actual[index])) return componentDifference(component, actual[index]);
    }
    return 'copy differs';
}

type MetaGraphError = {
    message?: string;
    code?: number;
    error_subcode?: number;
    error_user_msg?: string;
    error_data?: { details?: string };
    fbtrace_id?: string;
};

function metaTemplateErrorMessage(status: number, error: MetaGraphError | undefined, bodyText: string): string {
    if (!error) return `Meta template management failed (${status}): ${bodyText.slice(0, 300)}`;
    const codes = [`code ${error.code ?? 'unknown'}`];
    if (error.error_subcode !== undefined) codes.push(`subcode ${error.error_subcode}`);
    const detail = [error.message, error.error_user_msg, error.error_data?.details].filter(Boolean).join(' ');
    const trace = error.fbtrace_id ? ` fbtrace_id=${error.fbtrace_id}` : '';
    return `Meta template management failed (${status}, ${codes.join(', ')})${detail ? `: ${detail}` : ''}${trace}`;
}

export function whatsappTemplatesMetaCreate(options: { accessToken: string; businessAccountId: string }) {
    const accessToken = options.accessToken.trim();
    const businessAccountId = options.businessAccountId.trim();
    const base = `https://graph.facebook.com/v22.0/${encodeURIComponent(businessAccountId)}/message_templates`;
    async function request<T>(url: string, payload?: unknown): Promise<T> {
        if (new URL(url).origin !== 'https://graph.facebook.com') throw new Error('Unexpected Meta pagination origin');
        const response = await fetch(url, {
            method: payload ? 'POST' : 'GET',
            headers: { Authorization: `Bearer ${accessToken}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
            ...(payload ? { body: JSON.stringify(payload) } : {}),
        });
        const bodyText = await response.text();
        let body: (T & { error?: MetaGraphError }) | undefined;
        try {
            body = bodyText ? (JSON.parse(bodyText) as T & { error?: MetaGraphError }) : undefined;
        } catch {
            body = undefined;
        }
        if (!response.ok) throw new Error(metaTemplateErrorMessage(response.status, body?.error, bodyText));
        if (!body) throw new Error(`Meta template management failed (${response.status}): empty response`);
        return body;
    }
    return {
        async findMany(name?: string): Promise<MetaTemplate[]> {
            const url = new URL(base);
            url.searchParams.set('fields', 'id,name,language,status,category,components');
            url.searchParams.set('limit', '100');
            if (name) url.searchParams.set('name', name);
            let next: string | undefined = url.toString();
            const templates: MetaTemplate[] = [];
            while (next) {
                const page: { data: MetaTemplate[]; paging?: { next?: string } } = await request(next);
                templates.push(...page.data);
                next = page.paging?.next;
            }
            return templates;
        },
        async create(definition: WhatsAppTemplateDefinition, locale: WhatsAppTemplateLanguage, webPageUrl: string): Promise<void> {
            await request(base, whatsappTemplateMetaPayloadCreate(definition, locale, webPageUrl));
        },
    };
}
