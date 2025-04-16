let websocket = null;
let isConnected = false;
let messageQueue = [];
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export async function initWebSocket(shopId, userId) {
  if (websocket) {
    closeWebSocket();
  }

  try {
    const backendHost = "d800d2abedfcbd7a8a3c03d022818a8e.serveo.net";
    const protocol = "wss";
    console.log("Protocol:", protocol)
    const wsUrl = `${protocol}://${backendHost}/ws/conversation/${encodeURIComponent(shopId)}/${userId}`;
    console.log("wsUrl:", wsUrl);
    websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket connection established');
      isConnected = true;
      reconnectAttempts = 0;
      
      while (messageQueue.length > 0) {
        const message = messageQueue.shift();
        sendWebSocketMessage(message);
      }
    };
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        if (data.type === 'conversation_stored') {
          if (data.success) {
            console.log(`Conversation stored successfully with ID: ${data.conversation_id}`);
          } else {
            console.error(`Failed to store conversation: ${data.error}`);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    websocket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
      isConnected = false;
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const timeout = Math.min(1000 * reconnectAttempts, 5000);
        console.log(`Attempting to reconnect in ${timeout}ms (attempt ${reconnectAttempts})`);
        setTimeout(() => initWebSocket(shopId, userId), timeout);
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  } catch (error) {
    console.error('Error initializing WebSocket:', error);
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const timeout = Math.min(1000 * reconnectAttempts, 5000);
      console.log(`Error connecting. Retrying in ${timeout}ms (attempt ${reconnectAttempts})`);
      setTimeout(() => initWebSocket(shopId, userId), timeout);
    }
  }
}

export function sendWebSocketMessage(message) {
  if (isConnected && websocket) {
    websocket.send(JSON.stringify(message));
  } else {
    messageQueue.push(message);
  }
}

export function storeConversation(userQuery, agentResponse) {
  const message = {
    type: 'store_conversation',
    user_query: userQuery,
    agent_response: agentResponse
  };
  
  sendWebSocketMessage(message);
}

export function closeWebSocket() {
  if (websocket) {
    websocket.close();
    websocket = null;
    isConnected = false;
  }
}