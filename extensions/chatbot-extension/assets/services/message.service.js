import { createMessage } from '../components/chat/Message/Message';
import { createProductSlider } from '../components/products/ProductSlider/ProductSlider';
import { addToCart } from '../modules/cart/cart.module';

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
}