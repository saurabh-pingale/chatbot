document.addEventListener('DOMContentLoaded', function() {
  console.log("Mounting----------------------------------------------------------------");
  const container = document.getElementById('shopify-chatbot');
  if (!container) return;

  const primaryColor = container.dataset.primaryColor || '#008080';
  const textColor = container.dataset.textColor || '#f8f8f8';
  const chatbotTitle = container.dataset.title || 'Store Assistant';

  container.style.setProperty('--primary-color', primaryColor);
  container.style.setProperty('--text-color', textColor);

  createChatbot();
  
  
  const getColorPreference = async (shopId) => {
    try {
      const response = await fetch(`/apps/chatbot-api/supabase?shopId=${encodeURIComponent(shopId)}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      return data.color;
    } catch (error) {
      console.error("Error fetching the color preference!", error);
      return primaryColor; 
    }
  };

  getColorPreference();

  // Function to apply color to chatbot elements
  const applyColorToChatbot = (color) => {
    const chatbotElements = document.querySelectorAll('.chatbot-toggle-button, .chatbot-header, .send-button, .user-message');
    chatbotElements.forEach((element) => {
      element.style.backgroundColor = color;
    });

    const borderElements = document.querySelectorAll('.chatbot-window, .user-message');
    borderElements.forEach((element) => {
      element.style.borderColor = color;
    });

    const typingLoaderDots = document.querySelectorAll('.typing-indicator span');
    typingLoaderDots.forEach((dot) => {
      dot.style.backgroundColor = color;
    });
  };

  const getShopId = () => {
    let shopId = window.Shopify?.shop;
    return shopId;
  }

  // Initialize chatbot with color preference
  const initColorPreference = async () => {
    const shopId = getShopId();
    console.log("ShopId:", shopId);
    if (shopId) {
      const color = await getColorPreference(shopId);
      if(color) applyColorToChatbot(color);
    }
  };
  
  initColorPreference();

  function createChatbot() {
    const toggleButton = createToggleButton();
    container.appendChild(toggleButton);

    const chatbotWindow = createChatbotWindow();
    container.appendChild(chatbotWindow);

    toggleButton.addEventListener('click', () => {
      chatbotWindow.classList.toggle('open');
      if (chatbotWindow.classList.contains('open')) {
        toggleButton.innerHTML = '×';
      } else {
        toggleButton.innerHTML = '💬';
      }
      
      if (chatbotWindow.classList.contains('open')) {
        document.querySelector('.input-box').focus();
      }
    });

    initChat();
  }

  function createToggleButton() {
    const button = document.createElement('button');
    button.className = 'chatbot-toggle-button';
    button.innerHTML = '💬';
    button.style.backgroundColor = primaryColor;
    return button;
  }

  function createChatbotWindow() {
    const chatbotWindow = document.createElement('div');
    chatbotWindow.className = 'chatbot-window';
    chatbotWindow.style.borderColor = primaryColor;

    const header = document.createElement('div');
    header.className = 'chatbot-header';
    header.style.backgroundColor = primaryColor;
    header.innerHTML = `
      <h3 class="chatbot-header-title">${chatbotTitle}</h3>
      <button class="chatbot-close-button">✕</button>
    `;
    chatbotWindow.appendChild(header);

    header.querySelector('.chatbot-close-button').addEventListener('click', () => {
      chatbotWindow.classList.remove('open');
      document.querySelector('.chatbot-toggle-button').innerHTML = '💬';
    });

    const chatWindow = document.createElement('div');
    chatWindow.className = 'chat-window';
    
    const messageList = document.createElement('div');
    messageList.className = 'message-list';
    chatWindow.appendChild(messageList);
    
    chatbotWindow.appendChild(chatWindow);

    const inputComponent = document.createElement('div');
    inputComponent.className = 'input-component';
    inputComponent.innerHTML = `
      <input type="text" class="input-box" placeholder="Type your message...">
      <button class="send-button" disabled style="background-color: ${primaryColor};">
        Send
      </button>
    `;
    chatbotWindow.appendChild(inputComponent);

    return chatbotWindow;
  }

  function initChat() {
    const inputBox = document.querySelector('.input-box');
    const sendButton = document.querySelector('.send-button');
    const messageList = document.querySelector('.message-list');

    inputBox.addEventListener('input', () => {
      sendButton.disabled = inputBox.value.trim() === '';
    });

    sendButton.addEventListener('click', () => sendMessage());

    inputBox.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && inputBox.value.trim() !== '') {
        e.preventDefault();
        sendMessage();
      }
    });

    setTimeout(() => {
      addMessage('Hi there! How can I help you today?', 'bot');
    }, 500);

    function sendMessage() {
      const message = inputBox.value.trim();
      if (message === '') return;
      
      addMessage(message, 'user');

      inputBox.value = '';
      sendButton.disabled = true;
      
      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'typing-indicator';
      typingIndicator.innerHTML = '<span></span><span></span><span></span>';
      typingIndicator.style.backgroundColor = '#40444b';
      typingIndicator.style.borderColor = '#40444b';
      
      messageList.appendChild(typingIndicator);

      scrollToBottom();

      fetchBotResponse(message, typingIndicator);
    }

    function addMessage(text, sender) {
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
      
      messageList.appendChild(messageElement);
      scrollToBottom();
    }

    function fetchBotResponse(message, typingIndicator) {
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
          addMessage(data.answer, 'bot');
        } else {
          addMessage('Sorry, I couldn\'t process your request.', 'bot');
        }
      })
      .catch(error => {
        if (typingIndicator) {
          typingIndicator.remove();
        }
        
        addMessage('Sorry, there was an error processing your request. Please try again later.', 'bot');
        console.error('Error:', error);
      });
    }

    function scrollToBottom() {
      const chatWindow = document.querySelector('.chat-window');
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  }
});