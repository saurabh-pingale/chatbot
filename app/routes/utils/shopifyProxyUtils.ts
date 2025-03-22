import crypto from 'crypto';

export function verifyAppProxySignature(query: URLSearchParams, apiSecret: string): boolean {
  const { signature, ...params } = Object.fromEntries(query.entries());

  if (!signature) return false;

  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, string>);

  const signatureMessage = Object.keys(sortedParams)
    .map((key) => `${key}=${sortedParams[key]}`)
    .join('');

  const hmac = crypto
    .createHmac('sha256', apiSecret)
    .update(signatureMessage)
    .digest('hex');

  return hmac === signature;
}