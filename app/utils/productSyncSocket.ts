import { API } from "../constants/api.constants";

export interface ProductSyncSocketOptions {
  taskId: string;
  shop: string;
  onProgress: (data: any) => void;
  onComplete: () => void;
  onFailure: (message?: string) => void;
  isMountedRef: React.MutableRefObject<boolean>;
}

export const createProductSyncSocket = ({
  taskId,
  shop,
  onProgress,
  onComplete,
  onFailure,
  isMountedRef,
}: ProductSyncSocketOptions) => {
  let reconnectAttempts = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let manualClose = false;
  let socket: WebSocket | null = null;

  const connect = () => {
    const backendUrl = new URL(API.BACKEND_URL);
    const wsProtocol = backendUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${backendUrl.host}/products_router/ws/${taskId}?shop=${shop}`;

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      reconnectAttempts = 0;
    };

    socket.onmessage = (event) => {
      if (!isMountedRef.current) return;

      const data = JSON.parse(event.data);
      
      if (data.status === "completed") {
        onProgress(data);
        manualClose = true;

        setTimeout(() => {
          if (isMountedRef.current) {
            onComplete();
          }
          socket?.close();
        }, 500);
      
        return;
      }

      if (data.status === "failed") {
        manualClose = true;
        onFailure(data.message);
        socket?.close();
        return;
      }

      onProgress(data);
    };

    socket.onclose = () => {
      if (!isMountedRef.current) return;

      if (manualClose) {
        manualClose = false;
        return;
      }

      if (reconnectAttempts < 5) {
        reconnectAttempts++;
        reconnectTimeout = setTimeout(connect, 2000);
      } else {
        onFailure("Connection lost. Please retry.");
      }
    };

    socket.onerror = () => {
      socket?.close();
    };
  };

  connect();

  return {
    close: () => {
      manualClose = true;
      socket?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    },
  };
};