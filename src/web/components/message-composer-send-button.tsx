import { CheckIcon, SendIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { InputGroupButton } from './base/input-group';
import { Spinner } from './base/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';

export function MessageComposerSendButton({
    submitting,
    showSent,
    expanded,
    disabled,
    label,
}: Readonly<{
    submitting: boolean;
    showSent: boolean;
    expanded: boolean;
    disabled: boolean;
    label: string;
}>) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <InputGroupButton
                    type="submit"
                    variant="default"
                    size="icon-sm"
                    className={cn(
                        'rounded-full',
                        expanded && 'ml-auto',
                        'transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 enabled:-translate-y-px motion-reduce:enabled:translate-y-0',
                    )}
                    disabled={disabled}
                    aria-label={label}
                >
                    <span className="relative grid size-4 place-items-center">
                        <SendIcon
                            aria-hidden
                            className={cn('transition-opacity duration-150', submitting || showSent ? 'opacity-0' : 'opacity-100')}
                        />
                        <Spinner
                            aria-hidden
                            className={cn('absolute inset-0 transition-opacity duration-150', submitting ? 'opacity-100' : 'opacity-0')}
                        />
                        <CheckIcon
                            aria-hidden
                            className={cn(
                                'absolute inset-0 transition-opacity duration-150',
                                !submitting && showSent ? 'opacity-100' : 'opacity-0',
                            )}
                        />
                    </span>
                </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
    );
}
