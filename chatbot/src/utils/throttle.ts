export function throttle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  let lastExecutionTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let latestArgs: Parameters<T> | null = null;

  const executeTrailingCallback = () => {
    if (latestArgs) {
      lastExecutionTime = Date.now();
      callback(...latestArgs);
    }
    timeoutId = null;
    latestArgs = null;
  };

  return function (...args: Parameters<T>) {
    const now = Date.now();
    const remainingTime = delay - (now - lastExecutionTime);

    latestArgs = args;

    if (remainingTime <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      lastExecutionTime = now;
      callback(...latestArgs);
      latestArgs = null;

    } else if (!timeoutId) {
      timeoutId = setTimeout(executeTrailingCallback, remainingTime);
    }
  };
}