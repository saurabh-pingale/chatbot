<<<<<<< HEAD
document.addEventListener('DOMContentLoaded', function() {
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
=======
!function(){"use strict";const e=async e=>{const t=(()=>{let e=window.Shopify?.shop;return e})();if(t){const n=await(async(e,t)=>{try{const t=await fetch(`/apps/chatbot-api/supabase?shopId=${encodeURIComponent(e)}`,{method:"GET",credentials:"same-origin",headers:{Accept:"application/json"}});if(!t.ok)throw new Error(`Server responded with status: ${t.status}`);return(await t.json()).color}catch(e){return console.error("Error fetching the color preference!",e),t}})(t,e);n&&(e=>{document.querySelectorAll(".chatbot-toggle-button, .chatbot-header, .send-button").forEach((t=>{t.style.backgroundColor=e})),document.querySelectorAll(".chatbot-window").forEach((t=>{t.style.borderColor=e})),document.querySelectorAll(".typing-indicator span").forEach((t=>{t.style.backgroundColor=e}))})(n)}};function t(e,t,o){const r=new Headers({"Content-Type":"application/json",Accept:"application/json"});fetch("/apps/chatbot-api/deepseek",{method:"POST",headers:r,body:JSON.stringify({messages:[{role:"user",content:e}]})}).then((e=>e.ok?e.json():e.json().then((t=>{throw new Error(`Server error: ${e.status} - ${JSON.stringify(t)}`)})))).then((e=>{t&&t.remove(),e&&e.answer?n(e.answer,"bot",e.products||[],o):n("Sorry, I couldn't process your request.","bot",[],o)})).catch((e=>{t&&t.remove(),n("Sorry, there was an error processing your request. Please try again later.","bot",[],o),console.error("Error:",e)}))}function n(e,t,n=[],o){const r=document.querySelector(".message-list"),c=document.createElement("div");c.className="message-wrapper";const s=document.createElement("div");if(s.className=`message ${t}-message`,s.textContent=e,s.style.backgroundColor="#40444b",s.style.borderColor="#40444b",c.appendChild(s),n&&n.length>0){const e=function(e,t){const n=document.createElement("div");return n.className="product-slider",e.slice(0,4).forEach((e=>{const o=document.createElement("div");o.className="product-card";const r=document.createElement("img");r.src=e.image,r.alt=e.title,r.className="product-image";const c=document.createElement("div");c.className="product-title",c.textContent=e.title;const s=document.createElement("div");s.className="product-price",s.textContent=e.price;const a=document.createElement("a");a.href=e.url,a.target="_blank",a.rel="noopener noreferrer",a.className="view-product-button",a.textContent="View Product",a.style.backgroundColor=t,o.appendChild(r),o.appendChild(c),o.appendChild(s),o.appendChild(a),n.appendChild(o)})),n}(n,o);c.appendChild(e)}r.appendChild(s),function(){const e=document.querySelector(".chat-window");e.scrollTop=e.scrollHeight}()}document.addEventListener("DOMContentLoaded",(function(){const n=document.getElementById("shopify-chatbot");if(!n)return;const o="#008080";n.style.setProperty("--primary-color",o),n.style.setProperty("--text-color","#f8f8f8");const r=function(e){const t=document.createElement("button");return t.className="chatbot-toggle-button",t.innerHTML="💬",t.style.backgroundColor=e,t}(o);n.appendChild(r);const c=function(e,t){const n=document.createElement("div");n.className="chatbot-window",n.style.borderColor=e;const o=document.createElement("div");o.className="chatbot-header",o.style.backgroundColor=e,o.innerHTML=`\n      <h3 class="chatbot-header-title">${t}</h3>\n      <button class="chatbot-close-button">✕</button>\n    `,n.appendChild(o);const r=document.createElement("div");r.className="chat-window";const c=document.createElement("div");c.className="message-list",r.appendChild(c),n.appendChild(r);const s=document.createElement("div");return s.className="input-component",s.innerHTML=`\n      <input type="text" class="input-box" placeholder="Type your message...">\n      <button class="send-button" disabled style="background-color: ${e};">\n        Send\n      </button>\n    `,n.appendChild(s),n}(o,"Store Assistant");n.appendChild(c),r.addEventListener("click",(()=>{c.classList.toggle("open"),c.classList.contains("open")?r.innerHTML="×":r.innerHTML="💬",c.classList.contains("open")&&document.querySelector(".input-box").focus()})),c.querySelector(".chatbot-close-button").addEventListener("click",(()=>{c.classList.remove("open"),document.querySelector(".chatbot-toggle-button").innerHTML="💬"})),function(){const e=document.querySelector(".input-box"),n=document.querySelector(".send-button"),o=document.querySelector(".message-list");function r(){const r=e.value.trim();if(""===r)return;c(r,"user"),e.value="",n.disabled=!0;const a=document.createElement("div");a.className="typing-indicator",a.innerHTML="<span></span><span></span><span></span>",a.style.backgroundColor="#40444b",a.style.borderColor="#40444b",o.appendChild(a),s(),t(r,a)}function c(e,t){const n=document.createElement("div");n.className=`message ${t}-message`,n.textContent=e,o.appendChild(n),s()}function s(){const e=document.querySelector(".chat-window");e.scrollTop=e.scrollHeight}e.addEventListener("input",(()=>{n.disabled=""===e.value.trim()})),n.addEventListener("click",(()=>r())),e.addEventListener("keypress",(t=>{"Enter"===t.key&&""!==e.value.trim()&&(t.preventDefault(),r())})),setTimeout((()=>{c("Hi there! How can I help you today?","bot")}),500)}(),e(o)}))}();
>>>>>>> main
