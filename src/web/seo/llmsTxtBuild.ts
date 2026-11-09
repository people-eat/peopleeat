import { SITE_NAME } from './seoConstants';
import { SITEMAP_PATHS } from './sitemapRoutes';

const DESCRIPTION_MAX = 180;

/** English one-liners for static public pages. Keys must match `SITEMAP_PATHS`. */
export const LLMS_PAGE_BLURBS: Record<string, string> = {
    '/': 'Private chefs who cook at your home. Customers send a booking request and cooks reply with offers.',
    '/cities': 'City pages for finding private chefs who travel to that area.',
    '/partners': 'Partner landing pages for venues and hosts booking a private chef.',
    '/occasions': 'Occasion pages for dinners such as birthdays and other celebrations.',
    '/chefs': 'Public chef profiles with meals, a biography, and customer reviews.',
    '/blog-posts': 'Articles about private dining and booking a chef.',
    '/about-us': 'Who peopleeat is and how the platform works.',
    '/gift-card': 'Buy a peopleeat gift card.',
    '/how-to-become-a-chef': 'How cooks join peopleeat and receive booking requests.',
    '/booking-request': 'Start a booking request for a private chef.',
    '/chef-sign-up': 'Create a cook account and set up a public profile.',
    '/imprint': 'Legal imprint for PeopleEat UG in Frankfurt am Main.',
    '/terms-and-conditions': 'Terms and conditions for using peopleeat.',
    '/privacy-policy': 'Privacy policy for peopleeat.',
};

export interface LlmsResource {
    path: string;
    title: string;
    description: string;
}

export interface LlmsChef {
    pathName: string;
    displayName: string;
    city: string | null;
}

function englishUrl(webPageUrl: string, path: string): string {
    if (path === '/') return `${webPageUrl}/en`;
    return `${webPageUrl}/en${path}`;
}

function clip(value: string): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= DESCRIPTION_MAX) return normalized;
    const head = normalized.slice(0, DESCRIPTION_MAX + 1);
    const lastSpace = head.lastIndexOf(' ');
    const cut = lastSpace > 40 ? head.slice(0, lastSpace) : normalized.slice(0, DESCRIPTION_MAX);
    return cut.trimEnd().replace(/[.,;:]+$/, '');
}

function bullet(webPageUrl: string, path: string, title: string, description: string): string {
    return `- [${title}](${englishUrl(webPageUrl, path)}): ${clip(description)}`;
}

function section(title: string, lines: string[]): string {
    if (lines.length === 0) return '';
    return `## ${title}\n\n${lines.join('\n')}\n`;
}

export function llmsTxtBuild(input: {
    webPageUrl: string;
    cities: LlmsResource[];
    occasions: LlmsResource[];
    posts: LlmsResource[];
    chefs: LlmsChef[];
}): string {
    const pageLines = SITEMAP_PATHS.map(({ path }) => {
        const title = path === '/' ? 'Home' : path.replace(/^\//, '');
        const description = LLMS_PAGE_BLURBS[path] ?? 'Public page on peopleeat.';
        return bullet(input.webPageUrl, path, title, description);
    });
    const cityLines = input.cities.map((city) =>
        bullet(input.webPageUrl, city.path, city.title, city.description.trim() || `Private chefs in ${city.title}.`),
    );
    const occasionLines = input.occasions.map((occasion) =>
        bullet(input.webPageUrl, occasion.path, occasion.title, occasion.description.trim() || `Private chef for ${occasion.title}.`),
    );
    const postLines = input.posts.map((post) =>
        bullet(input.webPageUrl, post.path, post.title, post.description.trim() || 'Article on peopleeat.'),
    );
    const chefLines = input.chefs.map((chef) =>
        bullet(
            input.webPageUrl,
            `/chefs/${chef.pathName}`,
            chef.displayName,
            chef.city ? `Private chef in ${chef.city}.` : 'Private chef on peopleeat.',
        ),
    );

    const blocks = [
        `# ${SITE_NAME}`,
        `> ${SITE_NAME} is a private-chef booking platform in Germany. Customers send a booking request for a cook to come to their home. Cooks reply with an offer and a menu. The site is in German and English.`,
        section('Pages', pageLines),
        section('Cities', cityLines),
        section('Occasions', occasionLines),
        section('Chefs', chefLines),
        section('Articles', postLines),
        section('For crawlers', [
            `- [Sitemap](${input.webPageUrl}/sitemap.xml): Sitemap index for pages, cities, partners, occasions, articles, and chefs.`,
            `- [Robots](${input.webPageUrl}/robots.txt): Crawler policy. AI crawlers are allowed.`,
        ]),
    ].filter((block) => block.length > 0);

    return `${blocks.join('\n\n')}\n`;
}
