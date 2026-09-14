import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';

import { useLocale } from '../hooks/useLocale';
import { adminNavPages } from '../pages/admin/adminNavPages';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './base/command';

export function AdminPagesCommandDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const locale = useLocale();
    const navigate = useNavigate();
    const pages = useMemo(() => adminNavPages(), []);

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            showCloseButton={false}
            title={{ de: 'Admin-Seiten', en: 'Admin pages' }[locale]}
            description={{ de: 'Schnell zu einer Admin-Seite springen.', en: 'Jump quickly to an admin page.' }[locale]}
        >
            <CommandInput placeholder={{ de: 'Admin-Seite suchen…', en: 'Search admin pages…' }[locale]} />
            <CommandList>
                <CommandEmpty>{{ de: 'Keine Seite gefunden.', en: 'No page found.' }[locale]}</CommandEmpty>
                <CommandGroup heading={{ de: 'Seiten', en: 'Pages' }[locale]}>
                    {pages.map((page) => {
                        const Icon = page.icon;
                        return (
                            <CommandItem
                                key={page.id}
                                value={`${page.title[locale]} ${page.description[locale]} ${page.keywords[locale].join(' ')}`}
                                onSelect={() => {
                                    onOpenChange(false);
                                    if (page.params) {
                                        void navigate({ to: page.to, params: page.params });
                                        return;
                                    }
                                    void navigate({ to: page.to });
                                }}
                            >
                                <Icon />
                                <span className="truncate">{page.title[locale]}</span>
                            </CommandItem>
                        );
                    })}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
