import { generateText, Output } from 'ai';
import { z } from 'zod';

import { textNormalizeProse, textNormalizeSingleLine } from '../../shared/textNormalize';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationWebPageSeoTranslateArgs,
    GqlSAdminWebPageSeoTranslation,
    GqlSLocale,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { aiTelemetry } from '../observability/aiTelemetry';
import { aiGenerationOutputSerialize } from '../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../utils/aiGenerationUsage';

const TRANSLATION_SCHEMA = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
});

const TARGET_LANGUAGE_BY_LOCALE = {
    en: 'English',
    nl: 'Dutch (Netherlands)',
} as const satisfies Record<Exclude<GqlSLocale, 'de' | 'fr' | 'it' | 'ru'>, string>;

function adminWebPageSeoTranslateLocaleParse(locale: GqlSLocale): keyof typeof TARGET_LANGUAGE_BY_LOCALE | null {
    if (locale === 'en' || locale === 'nl') return locale;
    return null;
}

export async function adminWebPageSeoTranslate(
    { adminId }: GqlSAdminMutation,
    { webPageKey, locale, titleDe, descriptionDe }: GqlSAdminMutationWebPageSeoTranslateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminWebPageSeoTranslation> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    const targetLocale = adminWebPageSeoTranslateLocaleParse(locale);
    if (!targetLocale) {
        throw new Error('adminWebPageSeoTranslate: locale must be en or nl');
    }

    const sourceTitle = titleDe.trim();
    const sourceDescription = descriptionDe.trim();
    if (!sourceTitle || !sourceDescription) {
        throw new Error('adminWebPageSeoTranslate: titleDe and descriptionDe must not be empty');
    }

    const targetLanguage = TARGET_LANGUAGE_BY_LOCALE[targetLocale];
    const system = `
You translate peopleeat public-page SEO metadata.
peopleeat is a marketplace that connects hosts with private chefs who cook at home.
Keep the brand name peopleeat unchanged. Do not add quotation marks around the fields.
Write natural ${targetLanguage} for search-result titles and meta descriptions.
The title should stay short (about 50 to 60 characters). The description should stay about 120 to 160 characters.
Do not invent offers, cities, or claims that are not in the German source.
Return title and description only.
`.trim();

    const prompt = [
        `Translate this ${webPageKey} SEO copy from German to ${targetLanguage}.`,
        `Title: ${sourceTitle}`,
        `Description: ${sourceDescription}`,
    ].join('\n');

    try {
        const result = await generateText({
            model: serverRuntime.ai.webPageSeoTranslateModel(),
            instructions: system,
            prompt,
            output: Output.object({ schema: TRANSLATION_SCHEMA }),
            telemetry: aiTelemetry('WEB_PAGE_SEO_TRANSLATE'),
        });

        const title = textNormalizeSingleLine(result.output.title);
        const description = textNormalizeProse(result.output.description);
        if (!title || !description) {
            throw new Error('adminWebPageSeoTranslate: translation was empty after normalize');
        }

        serverRuntime.aiGenerations.record({
            kind: 'WEB_PAGE_SEO_TRANSLATE',
            userId: adminId,
            sessionId: requestingSession.sessionId,
            system,
            prompt,
            output: aiGenerationOutputSerialize(result.output),
            ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
        });

        return { title, description };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
