import { SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useT } from '../hooks/useT';
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
    const { t } = useT('admin');
    const [modifier, setModifier] = useState('⌘');
    const filterLabel = t('sidebar.filter');
    const commandShortcutLabel = t('sidebar.commandShortcut', { modifier });

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
                placeholder={t('sidebar.filterPlaceholder')}
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
