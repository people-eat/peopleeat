import type { Meta, StoryObj } from '@storybook/react-vite';
import { BellIcon, HeartIcon, MailIcon, SettingsIcon } from 'lucide-react';
import { useT } from '../../hooks/useT';
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
    const { t } = useT('common');

    return (
        <TooltipProvider>
            <WarmPage className="mx-auto flex max-w-4xl flex-col gap-10">
                <header className="grid max-w-2xl gap-2">
                    <h1 className="font-serif text-2xl font-semibold">{t('storybook.overview.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('storybook.overview.intro')}</p>
                </header>

                <GallerySection title={t('storybook.overview.status')}>
                    <div className="grid max-w-xl gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone="info" label={t('storybook.moodBoard.info')} />
                            <StatusBadge tone="success" label={t('storybook.moodBoard.ready')} />
                            <StatusBadge tone="warning" label={t('storybook.moodBoard.incomplete')} />
                            <StatusBadge tone="error" label={t('storybook.moodBoard.error')} />
                            <span className="relative inline-flex size-9 items-center justify-center rounded-md border border-border bg-secondary">
                                <NotificationBadge count={3} label={t('storybook.overview.unread3')} />
                            </span>
                        </div>
                        <StatusAlert tone="warning" title={t('storybook.overview.profileIncomplete')}>
                            {t('storybook.overview.addPhilosophy')}
                        </StatusAlert>
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={t('storybook.overview.buttons')}>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="default">{t('storybook.overview.default')}</Button>
                        <Button variant="secondary">{t('storybook.overview.secondary')}</Button>
                        <Button variant="destructive">{t('storybook.overview.destructive')}</Button>
                        <Button variant="outline">{t('storybook.overview.outline')}</Button>
                        <Button variant="ghost">{t('storybook.overview.ghost')}</Button>
                        <Button variant="link">{t('storybook.overview.link')}</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button size="xs">{t('storybook.overview.xs')}</Button>
                        <Button size="sm">{t('storybook.overview.small')}</Button>
                        <Button size="default">{t('storybook.overview.default')}</Button>
                        <Button size="lg">{t('storybook.overview.large')}</Button>
                        <Button size="icon" aria-label={t('storybook.overview.settings')}>
                            <SettingsIcon />
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button>
                            <MailIcon /> {t('storybook.overview.message')}
                        </Button>
                        <Button disabled>{t('storybook.overview.disabled')}</Button>
                        <Button disabled>
                            <Spinner /> {t('loading')}
                        </Button>
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={t('storybook.overview.inputs')}>
                    <div className="grid max-w-sm gap-3">
                        <Input placeholder={t('storybook.overview.occasion')} />
                        <Input type="email" placeholder={t('storybook.overview.email')} />
                        <Input disabled placeholder={t('storybook.overview.disabled')} />
                        <Textarea placeholder={t('storybook.moodBoard.messageToCook')} />
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={t('storybook.overview.select')}>
                    <div className="max-w-sm">
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder={t('storybook.overview.chooseCuisine')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="italian">{t('storybook.overview.italian')}</SelectItem>
                                <SelectItem value="european">{t('storybook.overview.modernEuropean')}</SelectItem>
                                <SelectItem value="asian">{t('storybook.overview.asian')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={t('storybook.overview.switchAndSlider')}>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Switch defaultChecked />
                            <span className="text-sm">{t('storybook.overview.enabled')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch />
                            <span className="text-sm">{t('storybook.overview.off')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch size="sm" defaultChecked />
                            <span className="text-sm">{t('storybook.overview.small')}</span>
                        </div>
                    </div>
                    <div className="max-w-sm">
                        <Slider defaultValue={[40]} />
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={t('storybook.overview.avatars')}>
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

                <GallerySection title={t('storybook.overview.card')}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('storybook.overview.notifications')}</CardTitle>
                                <CardDescription>{t('storybook.overview.unreadMessages')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <BellIcon className="size-5 text-muted-foreground" />
                                    <span className="text-sm">{t('storybook.overview.pushEnabled')}</span>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button size="sm" variant="outline">
                                    {t('storybook.overview.markAllRead')}
                                </Button>
                            </CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('storybook.overview.profile')}</CardTitle>
                                <CardDescription>{t('storybook.overview.manageAccount')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col gap-2">
                                    <Input placeholder={t('storybook.overview.name')} defaultValue={fixtureCustomer.display} />
                                    <Input placeholder={t('storybook.overview.email')} defaultValue={fixtureCustomer.emailAddress} />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button size="sm">{t('save')}</Button>
                            </CardFooter>
                        </Card>
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={t('storybook.overview.otp')}>
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

                <GallerySection title={t('storybook.overview.tooltipAndKeyboard')}>
                    <div className="flex items-center gap-4">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" aria-label={t('storybook.overview.favorite')}>
                                    <HeartIcon />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    {t('storybook.overview.addToFavorites')} <Kbd>F</Kbd>
                                </p>
                            </TooltipContent>
                        </Tooltip>
                        <div className="flex items-center gap-2 text-sm">
                            <span>{t('storybook.overview.shortcuts')}</span>
                            <Kbd>⌘</Kbd>
                            <Kbd>K</Kbd>
                            <Kbd>Ctrl+S</Kbd>
                        </div>
                    </div>
                </GallerySection>

                <Separator />

                <GallerySection title={t('storybook.overview.skeletonAndSpinner')}>
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

                <GallerySection title={t('storybook.overview.pagination')}>
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
