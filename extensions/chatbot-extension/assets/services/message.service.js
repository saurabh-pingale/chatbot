import { createMessage } from '../components/chat/Message/Message';
import { createProductSlider } from '../components/products/ProductSlider/ProductSlider';
import { addToCart } from '../modules/cart/cart.module';
import { storeConversation } from './websocket.service';

export function addMessage(text, sender, products = [], primaryColor) {
  const messageList = document.querySelector('.message-list');
  if (!messageList) return;

  const messageWrapper = document.createElement('div');
  messageWrapper.className = 'message-wrapper';

  const messageElement = createMessage(text, sender);
  messageWrapper.appendChild(messageElement);

  if (sender === 'bot' && products.length > 0) {
    const slider = createProductSlider(products, primaryColor, (product) => {
        addToCart({
          title: product.title,
          price: product.price,
          image: product.image,
          variant_id: product.variant_id || product.id,
          quantity: 1
        });
    });
    messageWrapper.appendChild(slider);
  }

  messageList.appendChild(messageWrapper);

  if (!window.isLoadingHistory) {
    saveMessageToSession(text, sender, products);
    
    if (sender === 'bot') {
      const messages = JSON.parse(sessionStorage.getItem('chatMessages') || '[]');
      if (messages.length >= 2) {
        const lastUserMessage = messages.filter(m => m.sender === 'user').pop();
        if (lastUserMessage) {
          storeConversation(lastUserMessage.text, text);
        }
      }
    }
  }
}

function saveMessageToSession(text, sender, products) {
  try {
    const existingMessages = JSON.parse(sessionStorage.getItem('chatMessages') || '[]');

    existingMessages.push({
      text,
      sender,
      products,
      timestamp: new Date().toISOString()
    });

    sessionStorage.setItem('chatMessages', JSON.stringify(existingMessages));
  } catch (error) {
    console.error('Error saving message to session storage:', error);
  }
}