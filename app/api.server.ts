import { API } from "app/constants/api.constants";
export async function forwardRequestToBackend(path: string, request: Request) {
  const fullUrl = `${API.BACKEND_URL}${path}`;

  const headers = new Headers(request.headers);
  
  // headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '');
  // headers.set('X-Shopify-Shop-Domain', request.headers.get('X-Shopify-Shop-Domain') || '');

  try {
    console.log("Full URL:", fullUrl);
    const response = await fetch(fullUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        // headers: {
        //   'Content-Type': 'application/json',
        //   'X-Shopify-API-Version': response.headers.get('X-Shopify-API-Version') || '',
        // },
      });
    }

    return new Response(await response.text(), {
      status: response.status,
      // headers: {
      //   'Content-Type': response.headers.get('content-type') || 'text/plain',
      // },
    });
  } catch (error) {
    console.error('Proxy request failed1111:', error);
    const errorData = {
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return new Response(JSON.stringify(errorData), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}