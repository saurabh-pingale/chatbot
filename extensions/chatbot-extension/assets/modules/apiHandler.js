import { addMessage } from './messageService.js';
import { getShopId } from './colorHandling.js';

export function fetchBotResponse(message, typingIndicator, primaryColor) {
  const shopId = getShopId();

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  fetch('/apps/chatbot-api/deepseek', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ 
      messages: [{ role: "user", content: message }],
      namespace: shopId
    }),
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => {
          throw new Error(`Server error: ${response.status} - ${JSON.stringify(err)}`);
        });
    }
    return response.json();
  })
  .then(data => {
    if (typingIndicator) {
      typingIndicator.remove();
    }

    if (data && data.answer) {
      addMessage(data.answer, 'bot', data.products || [], primaryColor);
    } else {
      addMessage('Sorry, I couldn\'t process your request.', 'bot', [], primaryColor);
    }
  })
  .catch(error => {
    if (typingIndicator) {
      typingIndicator.remove();
    }
    
    addMessage('Sorry, there was an error processing your request. Please try again later.', 'bot', [], primaryColor);
    console.error('Error:', error);
  });
}