const FIND_MANY_DEFAULT = 25;
const FIND_MANY_MAX = 100;

export function findManyTake(take: number | null | undefined): number {
    if (take == null) return FIND_MANY_DEFAULT;
    return Math.min(Math.max(take, 1), FIND_MANY_MAX);
}

export function findManySkip(skip: number | null | undefined): number {
    if (skip == null || skip < 0) return 0;
    return Math.floor(skip);
}
