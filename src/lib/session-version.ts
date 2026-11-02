export function sessionVersionMatches(tokenVersion: number | undefined, storedVersion: number) {
  return (tokenVersion ?? 0) === storedVersion;
}
