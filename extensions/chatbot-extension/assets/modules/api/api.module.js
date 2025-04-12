import { API } from '../../constants/api.constants';

export async function sendSessionData(sessionData) {
  try {
    const response = await fetch(API.SESSION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });
    return await response.json();
  } catch (error) {
    console.error('Session data error:', error);
    throw error;
  }
}

export async function fetchBotResponse(message, shopId) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  const URL = `${API.CHAT_ENDPOINT}?shopId=${encodeURIComponent(shopId)}`;

  const response = await fetch(URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ 
      messages: [{ role: "user", content: message }],
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get bot response');
  }

  const data = await response.json();

  return {
    answer: data.answer,
    products: data.products || []
  };

}