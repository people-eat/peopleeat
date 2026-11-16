import { AppImage } from '../components/AppImage';
import { Reveal } from '../components/Reveal';
import { useT } from '../hooks/useT';

/** Full-bleed quote band over lifestyle photography. */
export function SectionSharedExperiences() {
    const { t } = useT('public');
    const lines = [t('home.shared.line1'), t('home.shared.line2'), t('home.shared.line3')];

    return (
        <Reveal as="section" className="relative w-full overflow-hidden" overMedia>
            <AppImage
                alt={t('home.shared.alt')}
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
