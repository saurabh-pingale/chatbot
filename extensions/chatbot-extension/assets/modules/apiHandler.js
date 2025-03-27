export function fetchBotResponse(message, typingIndicator, primaryColor) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  fetch('/apps/chatbot-api/deepseek', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ 
      messages: [{ role: "user", content: message }]  
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
  
export function addMessage(text, sender, products = [], primaryColor) {
  const messageList = document.querySelector('.message-list');
  const messageWrapper = document.createElement('div');
  messageWrapper.className = 'message-wrapper';

  const messageElement = document.createElement('div');
  messageElement.className = `message ${sender}-message`;
  messageElement.textContent = text;
  
  if (sender === 'user') {
    messageElement.style.backgroundColor = primaryColor;
    messageElement.style.borderColor = primaryColor;
  } else {
    messageElement.style.backgroundColor = '#40444b';
    messageElement.style.borderColor = '#40444b';
  }

  messageWrapper.appendChild(messageElement);

  if (sender === 'bot' && products && products.length > 0) {
    const productSlider = createProductSlider(products, primaryColor);
    messageWrapper.appendChild(productSlider);
  }
  
  messageList.appendChild(messageElement);
  scrollToBottom();
}

export function createProductSlider(products, primaryColor) {
  const slider = document.createElement('div');
  slider.className = 'product-slider';

  products.slice(0, 4).forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';

    const productImage = document.createElement('img');
    productImage.src = product.image;
    productImage.alt = product.title;
    productImage.className = 'product-image';

    const titleElement = document.createElement('div');
    titleElement.className = 'product-title';
    titleElement.textContent = product.title;

    const priceElement = document.createElement('div');
    priceElement.className = 'product-price';
    priceElement.textContent = product.price;

    const viewButton = document.createElement('a');
    viewButton.href = product.url;
    viewButton.target = '_blank';
    viewButton.rel = 'noopener noreferrer';
    viewButton.className = 'view-product-button';
    viewButton.textContent = 'View Product';
    viewButton.style.backgroundColor = primaryColor;

    productCard.appendChild(productImage);
    productCard.appendChild(titleElement);
    productCard.appendChild(priceElement);
    productCard.appendChild(viewButton);

    slider.appendChild(productCard);
  });

  return slider;
}
  
export function scrollToBottom() {
  const chatWindow = document.querySelector('.chat-window');
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
