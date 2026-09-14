import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../../utils/cn';
import { statusAlertToneClass } from './status';

const alertVariants = cva(
    [
        'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm',
        'has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
        'has-[>[data-slot=status-icon]]:grid-cols-[auto_1fr] has-[>[data-slot=status-icon]]:gap-x-3',
    ].join(' '),
    {
        variants: {
            variant: {
                default: 'bg-card text-card-foreground',
                info: statusAlertToneClass.info,
                success: statusAlertToneClass.success,
                warning: statusAlertToneClass.warning,
                error: statusAlertToneClass.error,
                destructive: statusAlertToneClass.error,
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

function Alert({ className, variant, ...props }: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
    return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div data-slot="alert-title" className={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)} {...props} />
    );
}

function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="alert-description"
            className={cn('col-start-2 space-y-1 text-sm text-muted-foreground [&_p]:leading-relaxed', className)}
            {...props}
        />
    );
}

export { Alert, AlertDescription, AlertTitle, alertVariants };
