const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { queryOne } = require('../db');
const { findActiveSession } = require('../services/authSessions');

const HEARTBEAT_INTERVAL = 30 * 1000;
const AUTH_TIMEOUT = 5 * 1000;

class WebSocketManager {
  constructor() {
    this.clients = new Map();
    this.wss = null;
    this.heartbeatTimer = null;
    this.notificationService = null;
    this.messageQueue = null;
  }

  init(httpServer, notificationService, messageQueue) {
    this.notificationService = notificationService;
    this.messageQueue = messageQueue;
    this.wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    this.wss.on('connection', (ws) => this._onConnection(ws));
    this.wss.on('error', (error) => console.error('[WS] Server error:', error.message));
    this._startHeartbeat();
    setInterval(() => this.messageQueue?.cleanup(), 60 * 60 * 1000).unref?.();
    console.log('[WS] WebSocket server initialized on path /ws');
    return this;
  }

  _onConnection(ws) {
    let clientInfo = null;
    let userId = null;
    const timeout = setTimeout(() => {
      if (!clientInfo) ws.close(4001, 'Authentication timeout');
    }, AUTH_TIMEOUT);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (!clientInfo) {
          if (message.type !== 'authenticate' || typeof message.token !== 'string') return ws.close(4001, 'Authentication required');
          const user = jwt.verify(message.token, JWT_SECRET);
          const account = queryOne('SELECT id, is_frozen FROM users WHERE id = ?', [user.id]);
          if (!account || account.is_frozen || !findActiveSession(user.id, user.sid, user.jti)) return ws.close(4001, 'Session has expired or was revoked');
          clearTimeout(timeout);
          userId = user.id;
          clientInfo = this._registerClient(ws, user);
          return;
        }
        this._onMessage(userId, message);
      } catch {
        if (!clientInfo) ws.close(4001, 'Invalid authentication token');
        else this._send(ws, { type: 'error', message: 'Invalid JSON' });
      }
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      if (clientInfo) this._removeClient(userId, clientInfo);
    });
    ws.on('error', (error) => {
      console.error(`[WS] Client error${userId ? ` for ${userId}` : ''}:`, error.message);
      if (clientInfo) this._removeClient(userId, clientInfo);
    });
  }

  _registerClient(ws, user) {
    if (!this.clients.has(user.id)) this.clients.set(user.id, new Set());
    const clientInfo = { ws, sessionId: user.sid, lastPong: Date.now(), connectedAt: Date.now() };
    this.clients.get(user.id).add(clientInfo);
    ws.on('pong', () => { clientInfo.lastPong = Date.now(); });
    this._send(ws, { type: 'connected', userId: user.id, serverTime: Date.now() });
    this.notificationService?.subscribeDefaults(user.id, this);
    if (this.messageQueue?.hasMessages(user.id)) {
      const messages = this.messageQueue.flush(user.id);
      this._send(ws, { type: 'offline_messages', messages, count: messages.length });
    }
    return clientInfo;
  }

  _onMessage(userId, message) {
    switch (message.type) {
      case 'ping':
        this.sendToUser(userId, { type: 'pong', timestamp: Date.now() });
        break;
      case 'subscribe':
        if (typeof message.channel === 'string') this.notificationService?.subscribe(message.channel, userId, this);
        break;
      case 'unsubscribe':
        if (typeof message.channel === 'string') this.notificationService?.unsubscribe(message.channel, userId);
        break;
      case 'get_channels':
        this.sendToUser(userId, { type: 'channels', channels: this.notificationService?.getChannels() || [] });
        break;
      default:
        this.sendToUser(userId, { type: 'error', message: 'Unknown message type' });
    }
  }

  sendToUser(userId, message) {
    const connections = this.clients.get(userId);
    if (!connections?.size) return false;
    const payload = JSON.stringify(message);
    let sent = false;
    for (const client of connections) {
      if (client.ws.readyState === 1) {
        client.ws.send(payload);
        sent = true;
      }
    }
    return sent;
  }

  disconnectSession(sessionId, reason = 'Session revoked') {
    for (const [userId, connections] of this.clients.entries()) {
      for (const client of connections) {
        if (client.sessionId === sessionId) {
          client.ws.close(4001, reason);
          this._removeClient(userId, client);
        }
      }
    }
  }

  disconnectOtherUserSessions(userId, currentSessionId, reason = 'Sessions revoked') {
    const connections = this.clients.get(userId);
    if (!connections) return;
    for (const client of connections) {
      if (client.sessionId !== currentSessionId) {
        client.ws.close(4001, reason);
        this._removeClient(userId, client);
      }
    }
  }

  isOnline(userId) { return Boolean(this.clients.get(userId)?.size); }
  getOnlineCount() { return this.clients.size; }
  getOnlineUserIds() { return [...this.clients.keys()]; }

  _removeClient(userId, clientInfo) {
    const connections = this.clients.get(userId);
    if (!connections) return;
    connections.delete(clientInfo);
    if (!connections.size) {
      this.clients.delete(userId);
      this.notificationService?.removeAllForUser(userId);
    }
  }

  _startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const deadline = Date.now() - HEARTBEAT_INTERVAL - 10 * 1000;
      for (const [userId, connections] of this.clients.entries()) {
        for (const client of connections) {
          if (client.lastPong < deadline) {
            client.ws.terminate();
            this._removeClient(userId, client);
          } else if (client.ws.readyState === 1) client.ws.ping();
        }
      }
    }, HEARTBEAT_INTERVAL);
    this.heartbeatTimer.unref?.();
  }

  _send(ws, message) {
    if (ws.readyState === 1) ws.send(JSON.stringify(message));
  }

  close() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.wss?.close();
    this.clients.clear();
  }

  getStats() {
    const totalConnections = [...this.clients.values()].reduce((total, clients) => total + clients.size, 0);
    return { onlineUsers: this.clients.size, totalConnections, channels: this.notificationService?.getStats() || {}, messageQueue: this.messageQueue?.getStats() || null };
  }
}

module.exports = WebSocketManager;
