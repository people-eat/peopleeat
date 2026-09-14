export const CUISINE_STYLES = [
    'Moderne Küche',
    'Mediterran',
    'Japanisch',
    'Italienisch',
    'Französisch',
    'Deutsche Küche',
    'Asiatisch',
    'Nordisch',
    'Naher Osten',
    'Fusion',
    'Lateinamerikanisch',
    'Sharing & Tapas',
] as const;

export type CuisineStyle = (typeof CUISINE_STYLES)[number];

export const COOKING_PHILOSOPHIES = [
    'Saisonal',
    'Regional',
    'Farm-to-Table',
    'Fine Dining',
    'Plant-Based',
    'Healthy Cuisine',
    'Comfort Food',
] as const;

export type CookingPhilosophy = (typeof COOKING_PHILOSOPHIES)[number];

export function isCuisineStyle(value: string): value is CuisineStyle {
    return (CUISINE_STYLES as readonly string[]).includes(value);
}

export function isCookingPhilosophy(value: string): value is CookingPhilosophy {
    return (COOKING_PHILOSOPHIES as readonly string[]).includes(value);
}
