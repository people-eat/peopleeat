import { useLocale } from '../hooks/useLocale';

const partners = [
    {
        name: 'Frankfurt Business School of Finance',
        imagePath: '/shared/known-from-section/frankfurt-school.png',
        url: 'https://entrepreneurship-centre.fs.de/portfolio/peopleeat',
    },
    {
        name: 'Deutsche Startups',
        imagePath: '/shared/known-from-section/deutsche-start-ups.png',
        url: 'https://www.deutsche-startups.de',
    },
    {
        name: 'Statamic',
        imagePath: '/shared/known-from-section/start-up-verband.png',
        url: 'https://startupverband.de',
    },
    {
        name: 'Founders League',
        imagePath: '/shared/known-from-section/founders-league.png',
        url: 'https://www.foundersleague.de',
    },
];

export function SectionKnownFrom() {
    const locale = useLocale();

    return (
        <section className="flex w-full flex-col gap-16 overflow-x-hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4">
                <div className="flex flex-col items-center gap-4 rounded-xl bg-[#3F3F3F] p-4 text-[#FDF6EB] @lg:flex-row">
                    <span className="text-nowrap">{{ de: 'Bekannt durch', en: 'Known for' }[locale]}:</span>

                    <ul className="flex w-full items-center justify-evenly gap-2">
                        {partners.map(({ name, imagePath, url }) => (
                            <li key={name}>
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                    <img alt={name} className="object-contain object-left" height={48} src={imagePath} width={158} />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}
