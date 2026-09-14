export async function* asyncIterablePrepend<T>(initial: T, updates: AsyncIterable<T>): AsyncGenerator<T> {
    yield initial;
    yield* updates;
}
