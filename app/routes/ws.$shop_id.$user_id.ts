import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const backendUrl = process.env.FASTAPI_BACKEND_URL;
  if (!backendUrl) {
    throw new Error("FASTAPI_BACKEND_URL is not set");
  }

  const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
  const wsUrl = backendUrl.replace(/^https?:\/\//, `${wsProtocol}://`);
  
  const shopId = params.shop_id;
  const userId = params.user_id;
  const wsEndpoint = `/conversation_router/${wsUrl}/ws/conversation/${shopId}/${userId}`;
  console.log('Constructed WebSocket URL:', wsEndpoint);

  return json({ wsEndpoint });
}