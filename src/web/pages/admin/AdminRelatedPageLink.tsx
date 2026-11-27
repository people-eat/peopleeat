import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';

import { Button } from '../../components/base/button';

export function AdminRelatedPageLinks({
    links,
}: {
    links: ReadonlyArray<{ to: string; search?: Record<string, unknown>; label: string }>;
}) {
    if (links.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {links.map((link) => (
                <Button key={`${link.to}:${link.label}`} asChild variant="outline" size="sm">
                    <Link to={link.to} search={link.search}>
                        {link.label}
                        <ChevronRightIcon aria-hidden />
                    </Link>
                </Button>
            ))}
        </div>
    );
}
