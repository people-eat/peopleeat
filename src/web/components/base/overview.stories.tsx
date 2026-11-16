import type { Meta, StoryObj } from '@storybook/react-vite';
import { BellIcon, HeartIcon, MailIcon, SettingsIcon } from 'lucide-react';
import { inlineCopy } from '../../../shared';

import { useLocale } from '../../hooks/useLocale';
import { fixtureAvatarCook, fixtureCook, fixtureCustomer } from '../../storybook/fixtures/people';
import { GallerySection, WarmPage } from '../../storybook/gallery';
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from './avatar';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from './input-otp';
import { Kbd } from './kbd';
import { NotificationBadge } from './notification-badge';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from './pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Separator } from './separator';
import { Skeleton } from './skeleton';
import { Slider } from './slider';
import { Spinner } from './spinner';
import { StatusAlert } from './status-alert';
import { StatusBadge } from './status-badge';
import { Switch } from './switch';
import { Textarea } from './textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

const meta = {
    title: 'Base/Overview',
    parameters: {
        layout: 'fullscreen',
    },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function BaseOverview() {
    const locale = useLocale();

    return (
        <TooltipProvider>
            <WarmPage className="mx-auto flex max-w-4xl flex-col gap-10">
                <header className="grid max-w-2xl gap-2">
                    <h1 className="font-serif text-2xl font-semibold">
                        {inlineCopy({ de: 'Basis-Komponenten', en: 'Base components' }, locale)}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {inlineCopy(
                            {
                                de: 'Primitive auf dem warmen Canvas. Für Produktstimmung und Kartenfamilien siehe Foundations/Mood Board. Für Rollenvergleiche siehe Perspectives.',
                                en: 'Primitives on the warm canvas. For product mood and card families see Foundations/Mood Board. For role comparisons see Perspectives.',
                            },
                            locale,
                        )}
                    </p>
                </header>

                <GallerySection title={inlineCopy({ de: 'Status', en: 'Status' }, locale)}>
                    <div className="grid max-w-xl gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone="info" label={inlineCopy({ de: 'Info', en: 'Info' }, locale)} />
                            <StatusBadge tone="success" label={inlineCopy({ de: 'Bereit', en: 'Ready' }, locale)} />
                            <StatusBadge tone="warning" label={inlineCopy({ de: 'Unvollständig', en: 'Incomplete' }, locale)} />
                            <StatusBadge tone="error" label={inlineCopy({ de: 'Fehler', en: 'Error' }, locale)} />
                            <span className="relative inline-flex size-9 items-center justify-center rounded-md border border-border bg-secondary">
                                <NotificationBadge count={3} label={inlineCopy({ de: '3 ungelesen', en: '3 unread' }, locale)} />
                            </span>
                        </div>
                        <StatusAlert tone="warning" title={inlineCopy({ de: 'Profil unvollständig', en: 'Profile incomplete' }, locale)}>
                            {inlineCopy(
                                {
                                    de: 'Ergänze deine Küchenphilosophie, bevor du Menüs veröffentlichst.',
                                    en: 'Add your cooking philosophy before publishing menus.',
                                },
                                locale,
                            )}
                        </StatusAlert>
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={inlineCopy({ de: 'Buttons', en: 'Buttons' }, locale)}>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="default">{inlineCopy({ de: 'Standard', en: 'Default' }, locale)}</Button>
                        <Button variant="secondary">{inlineCopy({ de: 'Sekundär', en: 'Secondary' }, locale)}</Button>
                        <Button variant="destructive">{inlineCopy({ de: 'Löschen', en: 'Destructive' }, locale)}</Button>
                        <Button variant="outline">{inlineCopy({ de: 'Outline', en: 'Outline' }, locale)}</Button>
                        <Button variant="ghost">{inlineCopy({ de: 'Ghost', en: 'Ghost' }, locale)}</Button>
                        <Button variant="link">{inlineCopy({ de: 'Link', en: 'Link' }, locale)}</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button size="xs">{inlineCopy({ de: 'XS', en: 'XS' }, locale)}</Button>
                        <Button size="sm">{inlineCopy({ de: 'Klein', en: 'Small' }, locale)}</Button>
                        <Button size="default">{inlineCopy({ de: 'Standard', en: 'Default' }, locale)}</Button>
                        <Button size="lg">{inlineCopy({ de: 'Groß', en: 'Large' }, locale)}</Button>
                        <Button size="icon" aria-label={inlineCopy({ de: 'Einstellungen', en: 'Settings' }, locale)}>
                            <SettingsIcon />
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button>
                            <MailIcon /> {inlineCopy({ de: 'Nachricht', en: 'Message' }, locale)}
                        </Button>
                        <Button disabled>{inlineCopy({ de: 'Deaktiviert', en: 'Disabled' }, locale)}</Button>
                        <Button disabled>
                            <Spinner /> {inlineCopy({ de: 'Lädt', en: 'Loading' }, locale)}
                        </Button>
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={inlineCopy({ de: 'Eingaben', en: 'Inputs' }, locale)}>
                    <div className="grid max-w-sm gap-3">
                        <Input placeholder={inlineCopy({ de: 'Anlass', en: 'Occasion' }, locale)} />
                        <Input type="email" placeholder={inlineCopy({ de: 'E-Mail', en: 'Email' }, locale)} />
                        <Input disabled placeholder={inlineCopy({ de: 'Deaktiviert', en: 'Disabled' }, locale)} />
                        <Textarea placeholder={inlineCopy({ de: 'Nachricht an die Köchin…', en: 'Message to the cook…' }, locale)} />
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={inlineCopy({ de: 'Select', en: 'Select' }, locale)}>
                    <div className="max-w-sm">
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder={inlineCopy({ de: 'Küchenstil wählen', en: 'Choose a cuisine' }, locale)} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="italian">{inlineCopy({ de: 'Italienisch', en: 'Italian' }, locale)}</SelectItem>
                                <SelectItem value="european">
                                    {inlineCopy({ de: 'Modern European', en: 'Modern European' }, locale)}
                                </SelectItem>
                                <SelectItem value="asian">{inlineCopy({ de: 'Asiatisch', en: 'Asian' }, locale)}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={inlineCopy({ de: 'Switch und Slider', en: 'Switch and slider' }, locale)}>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Switch defaultChecked />
                            <span className="text-sm">{inlineCopy({ de: 'Aktiv', en: 'Enabled' }, locale)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch />
                            <span className="text-sm">{inlineCopy({ de: 'Aus', en: 'Off' }, locale)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch size="sm" defaultChecked />
                            <span className="text-sm">{inlineCopy({ de: 'Klein', en: 'Small' }, locale)}</span>
                        </div>
                    </div>
                    <div className="max-w-sm">
                        <Slider defaultValue={[40]} />
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={inlineCopy({ de: 'Avatare', en: 'Avatars' }, locale)}>
                    <div className="flex items-center gap-4">
                        <Avatar size="sm">
                            <AvatarFallback>AS</AvatarFallback>
                        </Avatar>
                        <Avatar>
                            <AvatarFallback>MK</AvatarFallback>
                        </Avatar>
                        <Avatar size="lg">
                            <AvatarImage src={fixtureAvatarCook} alt={fixtureCook.display} />
                            <AvatarFallback>MK</AvatarFallback>
                        </Avatar>
                        <AvatarGroup>
                            <Avatar>
                                <AvatarFallback>A</AvatarFallback>
                            </Avatar>
                            <Avatar>
                                <AvatarFallback>B</AvatarFallback>
                            </Avatar>
                            <Avatar>
                                <AvatarFallback>C</AvatarFallback>
                            </Avatar>
                        </AvatarGroup>
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={inlineCopy({ de: 'Card', en: 'Card' }, locale)}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>{inlineCopy({ de: 'Benachrichtigungen', en: 'Notifications' }, locale)}</CardTitle>
                                <CardDescription>
                                    {inlineCopy(
                                        {
                                            de: 'Du hast 3 ungelesene Nachrichten.',
                                            en: 'You have 3 unread messages.',
                                        },
                                        locale,
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <BellIcon className="size-5 text-muted-foreground" />
                                    <span className="text-sm">
                                        {inlineCopy(
                                            {
                                                de: 'Push-Benachrichtigungen sind aktiv',
                                                en: 'Push notifications are enabled',
                                            },
                                            locale,
                                        )}
                                    </span>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button size="sm" variant="outline">
                                    {inlineCopy({ de: 'Alle gelesen', en: 'Mark all read' }, locale)}
                                </Button>
                            </CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>{inlineCopy({ de: 'Profil', en: 'Profile' }, locale)}</CardTitle>
                                <CardDescription>
                                    {inlineCopy(
                                        {
                                            de: 'Verwalte deine Kontodaten.',
                                            en: 'Manage your account details.',
                                        },
                                        locale,
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col gap-2">
                                    <Input
                                        placeholder={inlineCopy({ de: 'Name', en: 'Name' }, locale)}
                                        defaultValue={fixtureCustomer.display}
                                    />
                                    <Input
                                        placeholder={inlineCopy({ de: 'E-Mail', en: 'Email' }, locale)}
                                        defaultValue={fixtureCustomer.emailAddress}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button size="sm">{inlineCopy({ de: 'Speichern', en: 'Save' }, locale)}</Button>
                            </CardFooter>
                        </Card>
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={inlineCopy({ de: 'OTP', en: 'OTP' }, locale)}>
                    <InputOTP maxLength={6}>
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </GallerySection>

                <Separator />

                <GallerySection title={inlineCopy({ de: 'Tooltip und Tastatur', en: 'Tooltip and keyboard' }, locale)}>
                    <div className="flex items-center gap-4">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" aria-label={inlineCopy({ de: 'Merken', en: 'Favorite' }, locale)}>
                                    <HeartIcon />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    {inlineCopy({ de: 'Merken', en: 'Add to favorites' }, locale)} <Kbd>F</Kbd>
                                </p>
                            </TooltipContent>
                        </Tooltip>
                        <div className="flex items-center gap-2 text-sm">
                            <span>{inlineCopy({ de: 'Shortcuts:', en: 'Shortcuts:' }, locale)}</span>
                            <Kbd>⌘</Kbd>
                            <Kbd>K</Kbd>
                            <Kbd>Ctrl+S</Kbd>
                        </div>
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={inlineCopy({ de: 'Skeleton und Spinner', en: 'Skeleton and spinner' }, locale)}>
                    <div className="flex items-center gap-4">
                        <Skeleton className="size-10 rounded-full" />
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Spinner />
                        <Spinner className="size-6" />
                        <Spinner className="size-8" />
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={inlineCopy({ de: 'Pagination', en: 'Pagination' }, locale)}>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious href="#" />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#">1</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#" isActive>
                                    2
                                </PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#">3</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext href="#" />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </GallerySection>
            </WarmPage>
        </TooltipProvider>
    );
}

export const Overview: Story = {
    render: () => <BaseOverview />,
};
