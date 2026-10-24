import { AppImage } from '../components/AppImage';
import { Reveal } from '../components/Reveal';
import { useLocale } from '../hooks/useLocale';

/** Full-bleed quote band over lifestyle photography. */
export function SectionSharedExperiences() {
    const locale = useLocale();

    const lines = {
        de: ['Leben ist von Erlebnissen geprägt,', 'aber die Besten sind jene,', 'die man mit anderen Menschen teilt.'],
        en: ['Life is shaped by experiences,', 'but the best ones are those', 'shared with other people.'],
    }[locale];

    return (
        <Reveal as="section" className="relative w-full overflow-hidden" overMedia>
            <AppImage
                alt={
                    {
                        de: 'Ein kreativ dekorierter Tisch mit Obst, Gemüse, Kerzen, Sektgläsern und Käse steht draußen im Park an einem Herbsttag.',
                        en: 'A creatively decorated table with fruit, vegetables, candles, champagne glasses, and cheese stands outdoors in a park on an autumn day.',
                    }[locale]
                }
                className="relative size-full object-cover object-center"
                height={800}
                src="/home/empty-section/dinner-table-in-nature.webp"
                width={1200}
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 mx-auto max-w-7xl p-8">
                <h2 className="font-serif text-2xl/relaxed font-light text-white @md:mt-[16%] @md:text-3xl @lg:text-5xl">
                    {lines.map((part) => (
                        <span className="inline @md:block" key={part}>
                            {part}{' '}
                        </span>
                    ))}
                </h2>
            </div>
        </Reveal>
    );
}
