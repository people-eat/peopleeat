// Await these from the `/profile` route loader so the shell chunk download is
// part of TanStack Router's `isLoading` window (NavigationProgress). Rendering
// `React.lazy` alone after the loader finishes leaves a blank Suspense gap the
// progress bar does not cover.

export async function profileShellPreload(isCook: boolean): Promise<void> {
    if (isCook) {
        await import('./ProfileCookShell');
        return;
    }
    await import('./ProfileCustomerShell');
}

export async function profileHomePreload(isCook: boolean): Promise<void> {
    if (isCook) {
        await import('../ProfilePageCook');
        return;
    }
    await import('../ProfilePageCustomer');
}
