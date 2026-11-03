import { writeFile } from 'node:fs/promises';

import { config } from 'dotenv';

import { whatsappTemplateDefinitions } from '../src/server/domain/whatsappTemplates';
import { environmentVariablesCreate } from '../src/server/env/environmentVariablesCreate';
import {
    whatsappTemplateMetaMatches,
    whatsappTemplateMetaPayloadCreate,
    whatsappTemplatesMetaCreate,
} from '../src/server/whatsapp/whatsappTemplatesMeta';

config({ path: ['.env.local'], quiet: true });

const args = process.argv.slice(2);
const option = (name: string) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
};
const webPageUrl = option('--base-url');
if (!webPageUrl || new URL(webPageUrl).protocol !== 'https:' || new URL(webPageUrl).pathname !== '/') {
    throw new Error('Pass --base-url with the deployed HTTPS site origin');
}
const manifest = whatsappTemplateDefinitions.flatMap((definition) =>
    (['de', 'en'] as const).map((locale) => whatsappTemplateMetaPayloadCreate(definition, locale, webPageUrl)),
);
if (args.includes('--manifest')) {
    await writeFile(option('--manifest')!, `${JSON.stringify(manifest, null, 2)}\n`);
}
if (!args.includes('--offline')) {
    const env = environmentVariablesCreate();
    if (!env.whatsappAccessToken || !env.whatsappBusinessAccountId || env.whatsappBusinessAccountId !== option('--account-id')) {
        throw new Error('Pass --account-id matching WHATSAPP_BUSINESS_ACCOUNT_ID and configure its management access token');
    }
    const client = whatsappTemplatesMetaCreate({ accessToken: env.whatsappAccessToken, businessAccountId: env.whatsappBusinessAccountId });
    let registered = await client.findMany();
    for (const definition of whatsappTemplateDefinitions) {
        for (const locale of ['de', 'en'] as const) {
            const existing = registered.find((entry) => entry.name === definition.name && entry.language === locale);
            if (existing) {
                if (!whatsappTemplateMetaMatches(existing, definition, locale, webPageUrl)) {
                    throw new Error(
                        `Registered copy differs for ${definition.name}/${locale}. Create a new version instead of changing history.`,
                    );
                }
                continue;
            }
            if (args.includes('--apply')) {
                await client.create(definition, locale, webPageUrl);
                console.info(`Submitted Utility template: ${definition.name}/${locale}`);
            } else {
                console.info(`Would submit Utility template: ${definition.name}/${locale}`);
            }
        }
    }
    registered = await client.findMany();
    const statuses = manifest.map((entry) => {
        const found = registered.find((template) => template.name === entry.name && template.language === entry.language);
        return {
            name: entry.name,
            language: entry.language,
            id: found?.id ?? null,
            status: found?.status ?? 'NOT_CREATED',
            category: found?.category ?? null,
        };
    });
    console.info(JSON.stringify(statuses, null, 2));
    if (args.includes('--report')) await writeFile(option('--report')!, `${JSON.stringify(statuses, null, 2)}\n`);
}
