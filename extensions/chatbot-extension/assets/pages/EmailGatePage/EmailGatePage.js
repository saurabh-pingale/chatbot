document.addEventListener('DOMContentLoaded', function() {
  const emailGatePage = document.getElementById('email-gate-container');
  if (emailGatePage) {
      emailGatePage.style.borderColor = primaryColor;
  }
  const header = document.getElementById('email-gate-header');
  if (header) {
      header.style.backgroundColor = primaryColor;
      
      const title = document.getElementById('email-gate-title');
      if (title) {
          title.textContent = chatbotTitle;
      }
      
      const logo = document.getElementById('email-gate-logo');
      if (logo) {
          logo.src = finalImageUrl;
      }
  }
  const emailInput = document.querySelector('.email-input');
  const errorMessage = document.getElementById('email-error');
  const startButton = document.getElementById('start-chat-btn');
  const skipButton = document.getElementById('skip-btn');
  if (startButton) {
      startButton.style.backgroundColor = primaryColor;
  }
  function isValidEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
  }
  function createLoader(color = 'white') {
      const loader = document.createElement('div');
      loader.className = 'circular-loader';
      loader.style.borderTopColor = color;
      
      loader.innerHTML = `
          <svg class="circular-loader-svg" viewBox="25 25 50 50">
              <circle 
                  class="loader-path" 
                  cx="50" 
                  cy="50" 
                  r="20" 
                  fill="none" 
                  stroke="${color}"
                  stroke-width="3" 
                  stroke-miterlimit="10"
              />
          </svg>
      `;
      
      return loader;
  }
  async function initializeUserSession(identifier) {
      return new Promise((resolve) => {
          setTimeout(() => {
              console.log(`Session initialized for: ${identifier}`);
              resolve();
          }, 1500);
      });
  }
  if (startButton) {
      startButton.addEventListener('click', async () => {
          const email = emailInput ? emailInput.value.trim() : '';
          
          if (!isValidEmail(email)) {
              if (errorMessage) errorMessage.classList.remove('hidden');
              if (emailInput) emailInput.focus();
              return;
          }
          const originalText = startButton.textContent;
          const loader = createLoader();
          startButton.innerHTML = '';
          startButton.appendChild(loader);
          startButton.disabled = true;
          
          try {
              await initializeUserSession(email);
              
              if (window.chatbotRenderContent) {
                  window.chatbotRenderContent(true);
              }
              
          } catch (error) {
              console.error('Session initialization failed:', error);
              if (errorMessage) {
                  errorMessage.textContent = 'Failed to start chat. Please try again.';
                  errorMessage.classList.remove('hidden');
              }
              startButton.removeChild(loader);
              startButton.textContent = originalText;
              startButton.disabled = false;
          }
      });
  }
  if (emailInput) {
      emailInput.addEventListener('input', () => {
          if (isValidEmail(emailInput.value.trim())) {
              if (errorMessage) errorMessage.classList.add('hidden');
          }
      });
  }
  if (skipButton) {
      skipButton.addEventListener('click', async () => {
          const originalText = skipButton.textContent;
          const loader = createLoader('black');
          skipButton.innerHTML = '';
          skipButton.appendChild(loader);
          skipButton.disabled = true;
          try {
              const anonymousId = `Anonymous_${Date.now()}`;
              await initializeUserSession(anonymousId);
              if (window.chatbotRenderContent) {
                  window.chatbotRenderContent(true);
              }
          } catch (error) {
              console.error('Session initialization failed:', error);
          
              skipButton.removeChild(loader);
              skipButton.textContent = originalText;
              skipButton.disabled = false;
          }
      });
    }
});