/** Single-database limiter. It is not shared across regions and it is not a substitute for an edge limiter. */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_FAILURE_LIMIT = 8;

export function loginWindowStart(now = Date.now()) {
  return new Date(now - LOGIN_WINDOW_MS);
}

export function isLoginLimited(failureCount: number) {
  return failureCount >= LOGIN_FAILURE_LIMIT;
}
