const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001/api`;

function websocketUrl() {
  const base = API_URL.replace(/\/api\/?$/, '');
  return `${base.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')}/ws`;
}

export function connectRealtime(token: string, onDataChanged: () => void) {
  let socket: WebSocket | null = null;
  let stopped = false;
  let retryDelay = 1000;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleRefresh = () => {
    if (refreshTimer) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      onDataChanged();
    }, 180);
  };

  const shouldRefresh = (message: { type?: string; channel?: string; messages?: Array<{ channel?: string }> }) => {
    if (message.type === 'notification') return message.channel?.startsWith('task:') || message.channel?.startsWith('comment:');
    return message.type === 'offline_messages' && Boolean(message.messages?.some((item) => item.channel?.startsWith('task:') || item.channel?.startsWith('comment:')));
  };

  const connect = () => {
    if (stopped) return;
    socket = new WebSocket(websocketUrl());
    socket.onopen = () => {
      retryDelay = 1000;
      socket?.send(JSON.stringify({ type: 'authenticate', token }));
    };
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (shouldRefresh(message)) scheduleRefresh();
      } catch {
        // Ignore malformed real-time payloads and keep HTTP as the source of truth.
      }
    };
    socket.onclose = (event) => {
      if (stopped || event.code === 4001) return;
      retryTimer = setTimeout(connect, retryDelay);
      retryDelay = Math.min(10000, retryDelay * 2);
    };
  };

  connect();
  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (refreshTimer) clearTimeout(refreshTimer);
    socket?.close(1000, 'Workspace closed');
  };
}
