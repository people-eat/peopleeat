import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { findRouteNamespaceMismatches, formatRouteNamespaceMismatches } from './i18nRouteNamespaces';

const LOCALES_DIR = path.join(process.cwd(), 'src/i18n/locales');
const SOURCE_LOCALE = 'de';
const COMPLETE_LOCALES = ['en', 'fr', 'it', 'ru', 'nl'] as const;

/** Values that look like TypeScript/JSX leaked into a catalog by a botched migrator. */
const SOURCE_DUMP = /(?:function |export function |const [A-Za-z][\w]* = |className=|useState<|useRef<|as const|return \(|\{ de:|<\/[A-Z])/;

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

function flatten(value: unknown, prefix = '', acc: Record<string, string> = {}): Record<string, string> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
            flatten(nested, prefix ? `${prefix}.${key}` : key, acc);
        }
        return acc;
    }
    if (prefix) acc[prefix] = typeof value === 'string' ? value : JSON.stringify(value);
    return acc;
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

function assertNoSourceDumps(locale: string, fileName: string, catalog: unknown): string[] {
    const errors: string[] = [];
    for (const [key, value] of Object.entries(flatten(catalog))) {
        if (SOURCE_DUMP.test(value)) {
            errors.push(`${locale}/${fileName} ${key} looks like source code, not copy`);
        }
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
        errors.push(...assertNoSourceDumps(SOURCE_LOCALE, fileName, source));
        for (const locale of locales) {
            if (locale === SOURCE_LOCALE) continue;
            const localePath = path.join(LOCALES_DIR, locale, fileName);
            const catalog = await readJson(localePath);
            errors.push(...assertNoSourceDumps(locale, fileName, catalog));
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

    errors.push(...formatRouteNamespaceMismatches(findRouteNamespaceMismatches()));

    if (errors.length > 0) {
        console.error(errors.join('\n'));
        process.exit(1);
    }
}

void main();
