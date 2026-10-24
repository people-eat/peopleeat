/** Shared people / cook / customer fixtures for Storybook (no server imports). */

function svgDataUrl(fill: string, label: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="${fill}"/><text x="128" y="140" text-anchor="middle" font-family="system-ui,sans-serif" font-size="72" fill="#fff">${label}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const fixtureAvatarCook = svgDataUrl('#5c7a6a', 'MK');
export const fixtureAvatarCustomer = svgDataUrl('#8a6b4a', 'AS');
export const fixtureMealImage = svgDataUrl('#c4a06a', '🍽');
export const fixtureMenuImageA = svgDataUrl('#6a8a7a', '1');
export const fixtureMenuImageB = svgDataUrl('#7a6a8a', '2');
export const fixtureMenuImageC = svgDataUrl('#8a7a6a', '3');
export const fixtureMenuImageD = svgDataUrl('#6a7a8a', '4');

export const fixtureCook = {
    cookId: 'cookFixture00000001',
    firstName: 'Mara',
    lastName: 'Keller',
    display: 'Mara Keller',
    emailAddress: 'mara.keller@example.com',
    userId: 'userCookFixture00001',
    city: 'München',
    cuisineStyle: 'Italienisch',
    cookingPhilosophy: 'Regional & saisonal',
    profilePictureUrl: fixtureAvatarCook,
} as const;

export const fixtureCookAlt = {
    cookId: 'cookFixture00000002',
    firstName: 'Jonas',
    lastName: 'Weber',
    display: 'Jonas Weber',
    emailAddress: 'jonas.weber@example.com',
    userId: 'userCookFixture00002',
    city: 'Berlin',
    cuisineStyle: 'Modern European',
    cookingPhilosophy: 'Zero waste',
    profilePictureUrl: null as string | null,
} as const;

export const fixtureCustomer = {
    firstName: 'Anna',
    lastName: 'Schmidt',
    display: 'Anna Schmidt',
    emailAddress: 'anna.schmidt@example.com',
    userId: 'userCustomerFixture01',
    profilePictureUrl: fixtureAvatarCustomer,
} as const;

export const fixtureOccasion = 'Geburtstagsdinner';
export const fixtureEventDateTime = '2026-11-14T18:00:00.000Z';
export const fixtureAddress = {
    displayText: 'Maximilianstraße 12, 80539 München',
    city: 'München',
} as const;
