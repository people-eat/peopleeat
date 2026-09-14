import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import { cn } from '../utils/cn';
import { Button } from './base/button';

export type BookingRequestFormCompletedStep = {
    title: string;
    summary: string;
};

export function BookingRequestFormStepLayout({
    stepNumber,
    stepCount,
    title,
    subTitle,
    completedSteps,
    onCompletedStepClick,
    children,
}: PropsWithChildren<{
    stepNumber: number;
    stepCount: number;
    title: string;
    subTitle?: string;
    completedSteps: BookingRequestFormCompletedStep[];
    onCompletedStepClick: (index: number) => void;
}>) {
    const progressPercent = Math.min(100, Math.max(0, (stepNumber / stepCount) * 100));

    return (
        <div className="flex justify-between gap-16">
            <div className="flex flex-1 flex-col gap-8 p-4">
                <div className="lg:hidden" aria-hidden="true">
                    <div className="overflow-hidden rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary transition-[width]" style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>

                <div className="flex flex-col gap-4 lg:flex-row">
                    <div
                        className={cn(
                            'mr-4 flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground',
                            'lg:size-16 lg:text-3xl',
                        )}
                    >
                        {String(stepNumber).padStart(2, '0')}
                    </div>
                    <div className="lg:mt-1.5">
                        <h1 className="font-serif text-2xl font-light tracking-tight lg:text-4xl">{title}</h1>
                        {subTitle ? <p className="text-sm text-muted-foreground">{subTitle}</p> : null}
                    </div>
                </div>

                {children}
            </div>

            <aside className="hidden w-64 shrink-0 lg:block">
                <div className="flex flex-col gap-6">
                    {completedSteps.map((completed, index) => (
                        <button
                            key={`${completed.title}-${index}`}
                            type="button"
                            tabIndex={-1}
                            onClick={() => onCompletedStepClick(index)}
                            className="min-h-16 cursor-pointer rounded-r-xl border-l-4 border-primary py-1 pl-4 text-start hover:bg-muted"
                        >
                            <p className="text-2xl">{completed.title}</p>
                            <p className="line-clamp-1 text-lg text-muted-foreground">{completed.summary}</p>
                        </button>
                    ))}
                </div>
            </aside>
        </div>
    );
}

export function BookingRequestFormBackNext({
    back,
    next,
}: {
    back?: { label: string; onClick: () => void; disabled?: boolean };
    next?: {
        label: string;
        disabled?: boolean;
        showArrow?: boolean;
    } & ({ type?: 'button'; onClick: () => void; form?: never } | { type: 'submit'; form: string; onClick?: never });
}) {
    return (
        <div className="flex gap-4 p-4">
            <div className="mx-auto flex w-full max-w-7xl flex-row-reverse gap-4 lg:max-w-lg">
                {next ? (
                    <Button
                        type={next.type === 'submit' ? 'submit' : 'button'}
                        form={next.type === 'submit' ? next.form : undefined}
                        className="flex-3"
                        disabled={next.disabled}
                        onClick={next.type === 'submit' ? undefined : next.onClick}
                    >
                        {next.label}
                        {next.showArrow !== false ? <ChevronRightIcon /> : null}
                    </Button>
                ) : null}
                <Button
                    type="button"
                    variant="outline"
                    className={cn(next ? 'flex-1' : 'flex-3', !back && 'invisible')}
                    disabled={!back || back.disabled}
                    onClick={back?.onClick}
                >
                    <ChevronLeftIcon />
                    {back?.label ?? ''}
                </Button>
            </div>
        </div>
    );
}
