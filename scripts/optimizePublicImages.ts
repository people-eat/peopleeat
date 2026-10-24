/**
 * Re-runnable: resize + encode heavy `public/` marketing photos as WebP and
 * print a size report. Sources are the current WebP paths (after the first
 * conversion from PNG/JPEG). Add new jobs when shipping new marketing photos.
 *
 * Usage: npm run images:optimize-public
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

type Job = {
    /** Path under `public/` (leading slash omitted). */
    from: string;
    /** Max long edge in px. */
    maxEdgePx: number;
    quality?: number;
};

/** Photos only — skip logos, favicons, email icons, known-from marks. */
const JOBS: Job[] = [
    { from: 'booking-request/submitted/1.webp', maxEdgePx: 960, quality: 78 },
    { from: 'booking-request/submitted/2.webp', maxEdgePx: 960, quality: 78 },
    { from: 'booking-request/submitted/3.webp', maxEdgePx: 960, quality: 78 },
    { from: 'city/find-a-chef-in-city-section/fine-dining.webp', maxEdgePx: 1920, quality: 78 },
    { from: 'city/cta/chef-preparing.webp', maxEdgePx: 1600, quality: 78 },
    { from: 'home/comparison-section/dinner-mixed-friend-group.webp', maxEdgePx: 1600, quality: 78 },
    // Portrait / avatar assets: keep near-original edge length so larger UI
    // uses stay sharp (do not crush to display-size thumbs).
    { from: 'home/comparison-section/private-chef-max.webp', maxEdgePx: 1280, quality: 82 },
    { from: 'home/how-it-works-section/clean-kitchen.webp', maxEdgePx: 1280, quality: 78 },
    { from: 'home/how-it-works-section/preparing-dinner.webp', maxEdgePx: 1280, quality: 78 },
    { from: 'home/how-it-works-section/enjoying-dinner.alternative.webp', maxEdgePx: 1280, quality: 78 },
    { from: 'home/empty-section/dinner-table-in-nature.webp', maxEdgePx: 1600, quality: 78 },
    { from: 'home/testimonials-section/dinner-table-with-menu-card.webp', maxEdgePx: 960, quality: 78 },
    { from: 'home/testimonials-section/rounded-dessert.webp', maxEdgePx: 960, quality: 78 },
    { from: 'about-us/meet-our-team-section/team.webp', maxEdgePx: 1600, quality: 78 },
    { from: 'about-us/how-we-started-section/founders.webp', maxEdgePx: 1280, quality: 78 },
    { from: 'how-to-become-a-chef/main-section/chef.webp', maxEdgePx: 1600, quality: 78 },
    { from: 'how-to-become-a-chef/benefits-for-chefs-section/1.webp', maxEdgePx: 960, quality: 78 },
    { from: 'how-to-become-a-chef/benefits-for-chefs-section/2.webp', maxEdgePx: 960, quality: 78 },
    { from: 'how-to-become-a-chef/benefits-for-chefs-section/3.webp', maxEdgePx: 960, quality: 78 },
    { from: 'concierge-juliana.webp', maxEdgePx: 1280, quality: 82 },
];

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

for (const job of JOBS) {
    const inputPath = path.join(root, 'public', job.from);
    const before = (await sharp(inputPath).metadata()).size ?? 0;

    const buffer = await sharp(inputPath)
        .rotate()
        .resize({
            width: job.maxEdgePx,
            height: job.maxEdgePx,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .webp({ quality: job.quality ?? 78, effort: 5 })
        .toBuffer();

    await writeFile(inputPath, buffer);
    console.log(`${job.from}: ${formatBytes(before)} → ${formatBytes(buffer.byteLength)}`);
}

console.log(`\nRe-encoded ${JOBS.length} public marketing assets.`);
