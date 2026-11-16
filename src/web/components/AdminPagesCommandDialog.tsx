import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';

import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { adminNavPages } from '../pages/admin/adminNavPages';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './base/command';

export function AdminPagesCommandDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const locale = useLocale();
    const { t } = useT('admin');
    const navigate = useNavigate();
    const pages = useMemo(() => adminNavPages(locale), [locale]);

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            showCloseButton={false}
            title={t('command.title')}
            description={t('command.description')}
        >
            <CommandInput placeholder={t('command.placeholder')} />
            <CommandList>
                <CommandEmpty>{t('command.empty')}</CommandEmpty>
                <CommandGroup heading={t('command.pages')}>
                    {pages.map((page) => {
                        const Icon = page.icon;
                        return (
                            <CommandItem
                                key={page.id}
                                value={`${page.title} ${page.description} ${page.keywords.join(' ')}`}
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
                                <span className="truncate">{page.title}</span>
                            </CommandItem>
                        );
                    })}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
