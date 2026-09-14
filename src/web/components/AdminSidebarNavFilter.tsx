import { SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useLocale } from '../hooks/useLocale';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './base/input-group';
import { Kbd } from './base/kbd';

function shortcutModifierLabel(): string {
    if (typeof navigator === 'undefined') {
        return '⌘';
    }
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform) || /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘' : 'Ctrl';
}

export function AdminSidebarNavFilter({
    value,
    onChange,
    onOpenCommand,
}: {
    value: string;
    onChange: (value: string) => void;
    onOpenCommand: () => void;
}) {
    const locale = useLocale();
    const [modifier, setModifier] = useState('⌘');
    const filterLabel = { de: 'Navigation filtern', en: 'Filter navigation' }[locale];
    const commandShortcutLabel = {
        de: `Befehlspalette öffnen (${modifier}+K)`,
        en: `Open command palette (${modifier}+K)`,
    }[locale];

    useEffect(() => {
        setModifier(shortcutModifierLabel());
    }, []);

    return (
        <InputGroup className="w-full">
            <InputGroupAddon align="inline-start">
                <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={{ de: 'Filtern…', en: 'Filter…' }[locale]}
                aria-label={filterLabel}
            />
            <InputGroupAddon align="inline-end">
                <InputGroupButton
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="px-1.5 text-muted-foreground hover:text-foreground"
                    aria-label={commandShortcutLabel}
                    onClick={onOpenCommand}
                >
                    <Kbd>{modifier === '⌘' ? '⌘K' : 'Ctrl+K'}</Kbd>
                </InputGroupButton>
            </InputGroupAddon>
        </InputGroup>
    );
}
