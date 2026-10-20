/**
 * Read-only product-docs wiki for the admin assistant.
 *
 * Corpus: `docs/features/*.md`, product text above `## Implementation` only
 * (see `docs/documentation.md`). Pages are bundled via `import.meta.glob` so
 * Docker runtime does not need the markdown tree on disk.
 */

export type ProductDocsPage = {
    slug: string;
    title: string;
    blurb: string;
    body: string;
};

export const PRODUCT_DOCS_READ_MAX_SLUGS = 3;

const BLURB_MAX_CHARS = 140;

const IMPLEMENTATION_HEADING = /^## Implementation\b/m;

const featureDocModules: Record<string, string> = import.meta.glob<string>('../../../docs/features/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
});

/** Strip from `## Implementation` onward. Whole file when the heading is absent. */
export function productDocsStripImplementation(markdown: string): string {
    const match = IMPLEMENTATION_HEADING.exec(markdown);
    if (!match) {
        return markdown.trimEnd();
    }
    return markdown.slice(0, match.index).trimEnd();
}

function productDocsTitle(productMarkdown: string, fallbackSlug: string): string {
    const firstLine = productMarkdown.split('\n', 1)[0] ?? '';
    const heading = firstLine.match(/^#\s+(.+)$/);
    return heading?.[1]?.trim() || fallbackSlug;
}

function productDocsBlurb(productMarkdown: string): string {
    const withoutTitle = productMarkdown.replace(/^#\s+[^\n]*\n?/, '');
    const paragraphs = withoutTitle
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter((block) => block.length > 0 && !block.startsWith('#'));
    const first = (paragraphs[0] ?? '').replace(/\s+/g, ' ').trim();
    if (first.length <= BLURB_MAX_CHARS) {
        return first;
    }
    return `${first.slice(0, BLURB_MAX_CHARS - 3).trimEnd()}...`;
}

export function productDocsParsePage(slug: string, rawMarkdown: string): ProductDocsPage {
    const body = productDocsStripImplementation(rawMarkdown);
    return {
        slug,
        title: productDocsTitle(body, slug),
        blurb: productDocsBlurb(body),
        body,
    };
}

function productDocsSlugFromGlobPath(globPath: string): string {
    const fileName = globPath.split('/').pop() ?? globPath;
    return fileName.replace(/\.md$/i, '');
}

function productDocsPagesFromModules(modules: Record<string, string>): Map<string, ProductDocsPage> {
    const pages = new Map<string, ProductDocsPage>();
    for (const [path, raw] of Object.entries(modules)) {
        const slug = productDocsSlugFromGlobPath(path);
        pages.set(slug, productDocsParsePage(slug, raw));
    }
    return pages;
}

const productDocsPages = productDocsPagesFromModules(featureDocModules);

/** All product wiki pages, sorted by slug. */
export function productDocsCatalog(pages: Map<string, ProductDocsPage> = productDocsPages): ProductDocsPage[] {
    return [...pages.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export type ProductDocsReadResult = {
    pages: Array<Pick<ProductDocsPage, 'slug' | 'title' | 'body'>>;
    missing: string[];
    truncated: boolean;
};

/**
 * Resolve wiki pages by slug. At most `PRODUCT_DOCS_READ_MAX_SLUGS` slugs are
 * honored; extras are ignored and set `truncated: true`.
 */
export function productDocsReadPages(slugs: string[], pages: Map<string, ProductDocsPage> = productDocsPages): ProductDocsReadResult {
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const raw of slugs) {
        const slug = raw.trim();
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        unique.push(slug);
    }

    const truncated = unique.length > PRODUCT_DOCS_READ_MAX_SLUGS;
    const requested = unique.slice(0, PRODUCT_DOCS_READ_MAX_SLUGS);
    const found: ProductDocsReadResult['pages'] = [];
    const missing: string[] = [];

    for (const slug of requested) {
        const page = pages.get(slug);
        if (!page) {
            missing.push(slug);
            continue;
        }
        found.push({ slug: page.slug, title: page.title, body: page.body });
    }

    return { pages: found, missing, truncated };
}

/** System-prompt block: wiki rules + slug index. */
export function productDocsCatalogFormat(pages: Map<string, ProductDocsPage> = productDocsPages): string {
    const lines = [
        '## Product docs wiki (read-only)',
        'Feature product documentation only (behavior and decisions). Never invent product rules; call productDocsRead with slug(s) from the index when you need details.',
        'Do not claim implementation, schema, or file-path details from these docs.',
        'Prefer this wiki for how the product or admin surfaces work. Prefer list tools for live database rows.',
        'Index:',
    ];
    for (const page of productDocsCatalog(pages)) {
        const blurb = page.blurb || page.title;
        lines.push(`- \`${page.slug}\`: ${blurb}`);
    }
    return lines.join('\n');
}
