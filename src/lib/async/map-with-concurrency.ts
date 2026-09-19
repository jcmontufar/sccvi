export async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results: R[] = [];
  const limit = Math.max(1, Math.floor(concurrency));

  for (let index = 0; index < values.length; index += limit) {
    results.push(
      ...(await Promise.all(values.slice(index, index + limit).map(mapper))),
    );
  }

  return results;
}
