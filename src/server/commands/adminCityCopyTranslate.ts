import { generateText, Output } from 'ai';
import { z } from 'zod';

import { textNormalizeProse, textNormalizeSingleLine } from '../../shared/textNormalize';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminCityCopyTranslation,
    GqlSAdminMutation,
    GqlSAdminMutationCityCopyTranslateArgs,
    GqlSLocale,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { aiTelemetry } from '../observability/aiTelemetry';
import { aiGenerationOutputSerialize } from '../utils/aiGenerationOutputSerialize';
import { aiGenerationUsageFromLanguageModel } from '../utils/aiGenerationUsage';

const TRANSLATION_SCHEMA = z.object({
    name: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    headline: z.string().min(1),
    subHeadline: z.string().min(1),
    firstSectionHeadline: z.string(),
    firstSectionBody: z.string(),
});

const TARGET_LANGUAGE_BY_LOCALE = {
    en: 'English',
    nl: 'Dutch (Netherlands)',
} as const satisfies Record<Exclude<GqlSLocale, 'de' | 'fr' | 'it' | 'ru'>, string>;

function adminCityCopyTranslateLocaleParse(locale: GqlSLocale): keyof typeof TARGET_LANGUAGE_BY_LOCALE | null {
    if (locale === 'en' || locale === 'nl') return locale;
    return null;
}

export async function adminCityCopyTranslate(
    { adminId }: GqlSAdminMutation,
    { locale, input }: GqlSAdminMutationCityCopyTranslateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCityCopyTranslation> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    const targetLocale = adminCityCopyTranslateLocaleParse(locale);
    if (!targetLocale) {
        throw new Error('adminCityCopyTranslate: locale must be en or nl');
    }

    const nameDe = input.nameDe.trim();
    const titleDe = input.titleDe.trim();
    const descriptionDe = input.descriptionDe.trim();
    const headlineDe = input.headlineDe.trim();
    const subHeadlineDe = input.subHeadlineDe.trim();
    const firstSectionHeadlineDe = input.firstSectionHeadlineDe.trim();
    const firstSectionBodyDe = input.firstSectionBodyDe.trim();
    if (!nameDe || !titleDe || !descriptionDe || !headlineDe || !subHeadlineDe) {
        throw new Error('adminCityCopyTranslate: required German fields must not be empty');
    }

    const targetLanguage = TARGET_LANGUAGE_BY_LOCALE[targetLocale];
    const system = `
You translate peopleeat city landing-page copy.
peopleeat is a marketplace that connects hosts with private chefs who cook at home.
Keep the brand name peopleeat unchanged. Do not add quotation marks around the fields.
Write natural ${targetLanguage}. Keep city names as locals actually write them.
The SEO title should stay short (about 50 to 60 characters). The SEO description should stay about 120 to 160 characters.
Do not invent offers, neighborhoods, or claims that are not in the German source.
If first-section headline or body is empty in the source, return an empty string for that field.
Return the named fields only.
`.trim();

    const prompt = [
        `Translate this city page copy from German to ${targetLanguage}.`,
        `Name: ${nameDe}`,
        `SEO title: ${titleDe}`,
        `SEO description: ${descriptionDe}`,
        `Headline: ${headlineDe}`,
        `Subheadline: ${subHeadlineDe}`,
        `First-section headline: ${firstSectionHeadlineDe}`,
        `First-section body: ${firstSectionBodyDe}`,
    ].join('\n');

    try {
        const result = await generateText({
            model: serverRuntime.ai.cityCopyTranslateModel(),
            instructions: system,
            prompt,
            output: Output.object({ schema: TRANSLATION_SCHEMA }),
            telemetry: aiTelemetry('CITY_COPY_TRANSLATE'),
        });

        const name = textNormalizeSingleLine(result.output.name);
        const title = textNormalizeSingleLine(result.output.title);
        const description = textNormalizeProse(result.output.description);
        const headline = textNormalizeSingleLine(result.output.headline);
        const subHeadline = textNormalizeSingleLine(result.output.subHeadline);
        const firstSectionHeadline = firstSectionHeadlineDe ? textNormalizeSingleLine(result.output.firstSectionHeadline) : '';
        const firstSectionBody = firstSectionBodyDe ? textNormalizeProse(result.output.firstSectionBody) : '';
        if (!name || !title || !description || !headline || !subHeadline) {
            throw new Error('adminCityCopyTranslate: translation was empty after normalize');
        }

        serverRuntime.aiGenerations.record({
            kind: 'CITY_COPY_TRANSLATE',
            userId: adminId,
            sessionId: requestingSession.sessionId,
            system,
            prompt,
            output: aiGenerationOutputSerialize(result.output),
            ...aiGenerationUsageFromLanguageModel(result.finalStep.response.modelId, result.usage),
        });

        return { name, title, description, headline, subHeadline, firstSectionHeadline, firstSectionBody };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
