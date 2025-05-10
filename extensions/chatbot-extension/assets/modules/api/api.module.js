import { API } from '../../constants/api.constants';
import { getShopId } from '../../utils/shopify.utils';

let conversationHistory = [];

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

export async function fetchBotResponse(message, shopId, user_id) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds 
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  const newMessage = {
    id: conversationHistory.length,
    user: message,
    agent: "",
    timestamp: new Date().toISOString()
  };
  conversationHistory.push(newMessage);

  sessionStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));

  const queryParams = new URLSearchParams({
    shopId: shopId || '',
    user_id: user_id || ''
  });

  const URL = `${API.CHAT_ENDPOINT}?${queryParams.toString()}`;

  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        messages: conversationHistory,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get bot response');
    }

    const data = await response.json();

    if (conversationHistory.length > 0) {
      conversationHistory[conversationHistory.length - 1].agent = data.answer;
      conversationHistory[conversationHistory.length - 1].timestamp = new Date().toISOString();

      sessionStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
    }

    return {
      answer: data.answer,
      products: data.products || [],
      history: data.hisory || conversationHistory
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    } else {
      throw error;
    }
  }
}

export function resetConversationHistory(history = []) {
  conversationHistory = history;
  if (history.length === 0) {
    sessionStorage.removeItem('conversationHistory');
  } else {
    sessionStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
  }
}

export async function fetchStoreImage(shopId) {
  try {
    const response = await fetch(`${API.STORE_IMAGE_ENDPOINT}?shopId=${encodeURIComponent(shopId)}`);
    if (!response.ok) throw new Error("Failed to fetch image");
    const data = await response.json();
    return data.image || null;
  } catch (error) {
    console.error("Error fetching store image:", error);
    return null;
  }
}

export async function createCart(product) {
  try {
    const shopId = await getShopId();
    const sessionData = JSON.parse(sessionStorage.getItem('chatbotSessionData') || {});
    const user_id = sessionData?.email || '';

    const queryParams = new URLSearchParams({
      shop: shopId || '',
      user_id: user_id || ''
    });
  
    const URL = `${API.STORE_CHECKOUT_PRODUCT_ENDPOINT}?${queryParams.toString()}`;
    
    const response = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: product.id,
        product_count: product.quantity,
        timestamp: new Date().toISOString()  
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to send cart data to backend');
    }

    return data; 
  } catch (error) {
    console.error('Error sending cart data:', error);
    throw error;
  }
}

export async function removeCartItem(productId) {
  try {
    const response = await fetch(API.REMOVE_CHECKOUT_PRODUCT_ENDPOINT, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to remove product from backend cart');
    }

    return await response.json();
  } catch (error) {
    console.error('Error removing product from backend cart:', error);
    return null;
  }
}
