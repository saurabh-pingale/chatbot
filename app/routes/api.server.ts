import { json } from "@remix-run/node"; 

export async function forwardRequestToBackend(path: string, request: Request) {
  const backendUrl = process.env.FASTAPI_BACKEND_URL;
  if (!backendUrl) {
    throw new Error("FASTAPI_BACKEND_URL is not set");
  }

  const fullUrl = `${backendUrl}${path}`;

  const headers = new Headers(request.headers);
  
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
  headers.set('X-Shopify-Shop-Domain', request.headers.get('X-Shopify-Shop-Domain') || '');

  try {
    const response = await fetch(fullUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    if (response.headers.get('content-type')?.includes('application/json')) {
      return json(await response.json(), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-API-Version': response.headers.get('X-Shopify-API-Version') || '',
        },
      });
    }

    return new Response(await response.text(), {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'text/plain',
      },
    });
  } catch (error) {
    console.error('Proxy request failed:', error);
    return json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}