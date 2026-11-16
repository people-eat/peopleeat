import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const LOCALES_DIR = path.join(process.cwd(), 'src/i18n/locales');
const SOURCE_LOCALE = 'de';
const COMPLETE_LOCALES = ['en', 'fr', 'it'] as const;

function keysOf(value: unknown, prefix = ''): string[] {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
            keysOf(nested, prefix ? `${prefix}.${key}` : key),
        );
    }
    return prefix ? [prefix] : [];
}

function extraKeys(source: Set<string>, other: Set<string>): string[] {
    return [...other].filter((key) => !source.has(key)).sort();
}

function missingKeys(source: Set<string>, other: Set<string>): string[] {
    return [...source].filter((key) => !other.has(key)).sort();
}

async function readJson(filePath: string): Promise<unknown> {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as unknown;
}

async function assertWebLoadersStaySplit(): Promise<string[]> {
    const errors: string[] = [];
    const loaders = await readFile(path.join(process.cwd(), 'src/i18n/catalogLoaders.ts'), 'utf8');
    if (loaders.includes('email.json') || loaders.includes('emailCatalogLoaders')) {
        errors.push('src/i18n/catalogLoaders.ts must not import email catalogs (those are server-only)');
    }
    if (loaders.includes('import.meta.glob') || loaders.includes('require.context')) {
        errors.push('src/i18n/catalogLoaders.ts must use explicit per-locale dynamic imports, not a glob');
    }
    return errors;
}

async function main(): Promise<void> {
    const locales = (await readdir(LOCALES_DIR)).filter((name) => !name.startsWith('.'));
    const sourceDir = path.join(LOCALES_DIR, SOURCE_LOCALE);
    const namespaces = (await readdir(sourceDir)).filter((name) => name.endsWith('.json'));
    const errors: string[] = await assertWebLoadersStaySplit();

    for (const fileName of namespaces) {
        const source = await readJson(path.join(sourceDir, fileName));
        const sourceKeys = new Set(keysOf(source));
        for (const locale of locales) {
            if (locale === SOURCE_LOCALE) continue;
            const localePath = path.join(LOCALES_DIR, locale, fileName);
            const catalog = await readJson(localePath);
            const localeKeys = new Set(keysOf(catalog));
            const extra = extraKeys(sourceKeys, localeKeys);
            if (extra.length > 0) {
                errors.push(`${locale}/${fileName} has keys missing from de: ${extra.join(', ')}`);
            }
            if ((COMPLETE_LOCALES as readonly string[]).includes(locale)) {
                const missing = missingKeys(sourceKeys, localeKeys);
                if (missing.length > 0) {
                    errors.push(`${locale}/${fileName} is missing keys: ${missing.join(', ')}`);
                }
            }
        }
    }

    if (errors.length > 0) {
        console.error(errors.join('\n'));
        process.exit(1);
    }
}

void main();
