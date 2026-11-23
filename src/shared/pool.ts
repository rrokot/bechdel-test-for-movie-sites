export const runPool = async <T>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<void>,
) => {
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++] as T;
      await task(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
};
