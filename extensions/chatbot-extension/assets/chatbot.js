document.addEventListener('DOMContentLoaded', function() {
  // Get the container and settings
  const container = document.getElementById('shopify-chatbot');
  if (!container) return;

  const primaryColor = container.dataset.primaryColor || '#0088cc';
  const textColor = container.dataset.textColor || '#ffffff';
  const chatbotTitle = container.dataset.title || 'Store Assistant';

  // Set CSS variables
  container.style.setProperty('--primary-color', primaryColor);
  container.style.setProperty('--text-color', textColor);

  // Create the chatbot components
  createChatbot();

  function createChatbot() {
    // Create Toggle Button
    const toggleButton = createToggleButton();
    container.appendChild(toggleButton);

    // Create Chatbot Window
    const chatbotWindow = createChatbotWindow();
    container.appendChild(chatbotWindow);

    // Toggle functionality
    toggleButton.addEventListener('click', () => {
      chatbotWindow.classList.toggle('open');
      if (chatbotWindow.classList.contains('open')) {
        document.querySelector('.input-box').focus();
      }
    });

    // Initialize chat functionality
    initChat();
  }

  function createToggleButton() {
    const button = document.createElement('button');
    button.className = 'chatbot-toggle-button';
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
        <path d="M7 9h10M7 12h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    return button;
  }

  function createChatbotWindow() {
    const chatbotWindow = document.createElement('div');
    chatbotWindow.className = 'chatbot-window';

    // Create Header
    const header = document.createElement('div');
    header.className = 'chatbot-header';
    header.innerHTML = `
      <h3 class="chatbot-header-title">${chatbotTitle}</h3>
      <button class="chatbot-close-button">✕</button>
    `;
    chatbotWindow.appendChild(header);

    // Close button functionality
    header.querySelector('.chatbot-close-button').addEventListener('click', () => {
      chatbotWindow.classList.remove('open');
    });

    // Create Chat Window with Message List
    const chatWindow = document.createElement('div');
    chatWindow.className = 'chat-window';
    
    const messageList = document.createElement('div');
    messageList.className = 'message-list';
    chatWindow.appendChild(messageList);
    
    chatbotWindow.appendChild(chatWindow);

    // Create Input Component
    const inputComponent = document.createElement('div');
    inputComponent.className = 'input-component';
    inputComponent.innerHTML = `
      <input type="text" class="input-box" placeholder="Type your message...">
      <button class="send-button" disabled>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    `;
    chatbotWindow.appendChild(inputComponent);

    return chatbotWindow;
  }

  function initChat() {
    const inputBox = document.querySelector('.input-box');
    const sendButton = document.querySelector('.send-button');
    const messageList = document.querySelector('.message-list');

    // Enable/disable send button based on input
    inputBox.addEventListener('input', () => {
      sendButton.disabled = inputBox.value.trim() === '';
    });

    // Send message on button click
    sendButton.addEventListener('click', () => sendMessage());

    // Send message on Enter key
    inputBox.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && inputBox.value.trim() !== '') {
        e.preventDefault();
        sendMessage();
      }
    });

    // Send welcome message
    setTimeout(() => {
      addMessage('Hi there! How can I help you today?', 'bot');
    }, 500);

    // Function to send message
    function sendMessage() {
      const message = inputBox.value.trim();
      if (message === '') return;
      
      // Add user message to chat
      addMessage(message, 'user');
      
      // Clear input
      inputBox.value = '';
      sendButton.disabled = true;
      
      // Show typing indicator
      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'typing-indicator';
      typingIndicator.innerHTML = '<span></span><span></span><span></span>';
      messageList.appendChild(typingIndicator);
      
      // Scroll to bottom
      scrollToBottom();
      
      // Send message to API
      fetchBotResponse(message, typingIndicator);
    }

    // Function to add message to chat
    function addMessage(text, sender) {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${sender}-message`;
      messageElement.textContent = text;
      messageList.appendChild(messageElement);
      scrollToBottom();
    }

    // Function to fetch bot response
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

    // Scroll chat to bottom
    function scrollToBottom() {
      const chatWindow = document.querySelector('.chat-window');
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  }
});
