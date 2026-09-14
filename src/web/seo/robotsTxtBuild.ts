// Dynamic robots.txt body — absolute `Sitemap:` via WEB_PAGE_URL; excludes API /
// server capture surfaces and legacy booking deep-link query params; enumerates
// AI crawlers with the same Disallow block. See docs/architecture/discovery-geo.md.

const AI_USER_AGENTS = [
    'anthropic-ai',
    'Applebot-Extended',
    'CCBot',
    'ChatGPT-User',
    'ClaudeBot',
    'cohere-ai',
    'Google-Extended',
    'GPTBot',
    'OAI-SearchBot',
    'PerplexityBot',
    'Perplexity-User',
] as const;

const DISALLOW_LINES = [
    'Disallow: /api/',
    'Disallow: /server/',
    'Disallow: /*?locationLatitude',
    'Disallow: /*?locationLongitude',
    'Disallow: /*?locationText',
    'Disallow: /*?dateString',
    'Disallow: /*?address',
    'Disallow: /*?adults=',
    'Disallow: /*?children=',
] as const;

export function robotsTxtBuild(webPageUrl: string): string {
    const disallowBlock = DISALLOW_LINES.join('\n');
    const genericGroup = `User-agent: *\nAllow: /\n\n${disallowBlock}`;
    const aiGroups = AI_USER_AGENTS.map((agent) => `User-agent: ${agent}\nAllow: /\n${disallowBlock}`).join('\n\n');
    return `${genericGroup}\n\n${aiGroups}\n\nSitemap: ${webPageUrl}/sitemap.xml\n`;
}
