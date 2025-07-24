import axios from "axios";
import { API } from "./constants/api.constants";

export async function forwardRequestToBackend(path: string, request: Request) {
  const fullUrl = `${API.BACKEND_URL}${path}`;

  const authorizationHeader = request.headers.get('Authorization');

  const outgoingHeaders: any = {
    'Content-Type': 'application/json',
  };

  if (authorizationHeader) {
    outgoingHeaders['Authorization'] = authorizationHeader;
  }

  try {
    const axiosResponse = await axios({
      url: fullUrl,
      method: request.method,
      headers: outgoingHeaders,
      data: request.method !== 'GET' ? await request.text() : undefined,
      responseType: 'text', 
      decompress: true,
    });

    return new Response(axiosResponse.data, {
      status: axiosResponse.status,
      headers: {
        'Content-Type': axiosResponse.headers['content-type'] || 'text/plain',
      },
    });
  } catch (error: any) {
    console.error('Proxy request failed:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: error.message || 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}