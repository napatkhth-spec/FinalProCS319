export function getAccessTokenExpirationMs(accessToken: string): number | null {
  const payloadSegment = accessToken.split('.')[1];
  if (!payloadSegment) return null;

  try {
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload: unknown = JSON.parse(atob(paddedBase64));
    if (typeof payload !== 'object' || payload === null || !('exp' in payload)) return null;

    const expirationSeconds = payload.exp;
    if (
      typeof expirationSeconds !== 'number' ||
      !Number.isSafeInteger(expirationSeconds) ||
      expirationSeconds <= 0
    ) {
      return null;
    }

    const expirationMs = expirationSeconds * 1000;
    return Number.isSafeInteger(expirationMs) ? expirationMs : null;
  } catch {
    return null;
  }
}
