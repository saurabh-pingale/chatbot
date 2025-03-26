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
      addMessage(data.answer, 'bot', primaryColor);
    } else {
      addMessage('Sorry, I couldn\'t process your request.', 'bot', primaryColor);
    }
  })
  .catch(error => {
    if (typingIndicator) {
      typingIndicator.remove();
    }
    
    addMessage('Sorry, there was an error processing your request. Please try again later.', 'bot', primaryColor);
    console.error('Error:', error);
  });
}
  
export function addMessage(text, sender, primaryColor) {
  const messageList = document.querySelector('.message-list');
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
  
export function scrollToBottom() {
  const chatWindow = document.querySelector('.chat-window');
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
