export const getColorPreference = async (shopId, primaryColor) => {
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
  
  export const applyColorToChatbot = (color) => {
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
  
  export const getShopId = () => {
    let shopId = window.Shopify?.shop;
    return shopId;
  }
  
  export const initColorPreference = async (primaryColor) => {
    const shopId = getShopId();
    if (shopId) {
      const color = await getColorPreference(shopId, primaryColor);
      if(color) applyColorToChatbot(color);
    }
  };