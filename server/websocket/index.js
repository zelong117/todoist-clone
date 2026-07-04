/**
 * WebSocket 服务器管理器
 *
 * 功能:
 *   - 基于 ws 库的 WebSocket 服务器
 *   - JWT 认证中间件
 *   - 心跳检测（30秒间隔）
 *   - 用户连接管理（同一用户多设备支持）
 *   - 在线状态追踪
 */
const { WebSocketServer } = require('ws');
const url = require('url');
const { JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// 心跳间隔 30 秒
const HEARTBEAT_INTERVAL = 30 * 1000;
// 心跳超时 10 秒（客户端必须在此时间内响应 pong）
const HEARTBEAT_TIMEOUT = 10 * 1000;

class WebSocketManager {
  constructor() {
    // userId -> Set<{ ws, lastPong, connectedAt }>
    this.clients = new Map();
    this.wss = null;
    this.heartbeatTimer = null;
    this.notificationService = null;
    this.messageQueue = null;
  }

  /**
   * 初始化 WebSocket 服务器，挂载到 HTTP 服务器
   */
  init(httpServer, notificationService, messageQueue) {
    this.notificationService = notificationService;
    this.messageQueue = messageQueue;

    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
      // 验证连接: 从 query string 或第一个消息中获取 token
      verifyClient: (info, callback) => {
        try {
          const parsed = url.parse(info.req.url, true);
          const token = parsed.query.token;
          if (!token) {
            callback(false, 401, 'Missing token');
            return;
          }
          const decoded = jwt.verify(token, JWT_SECRET);
          info.req.user = decoded;
          callback(true);
        } catch (err) {
          console.log('[WS] Auth failed:', err.message);
          callback(false, 401, 'Invalid token');
        }
      },
    });

    this.wss.on('connection', (ws, req) => this._onConnection(ws, req));
    this.wss.on('error', (err) => console.error('[WS] Server error:', err.message));

    // 启动心跳检测
    this._startHeartbeat();

    // 定期清理消息队列 (每小时)
    setInterval(() => {
      if (this.messageQueue) this.messageQueue.cleanup();
    }, 60 * 60 * 1000);

    console.log('[WS] WebSocket server initialized on path /ws');
    return this;
  }

  /**
   * 处理新连接
   */
  _onConnection(ws, req) {
    const user = req.user;
    const userId = user.id;

    // 记录连接
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    const clientInfo = { ws, lastPong: Date.now(), connectedAt: Date.now() };
    this.clients.get(userId).add(clientInfo);

    console.log(`[WS] User connected: ${userId} (devices: ${this.clients.get(userId).size})`);

    // 发送欢迎消息 + 在线用户信息
    this._send(ws, {
      type: 'connected',
      userId,
      serverTime: Date.now(),
      message: 'WebSocket connection established',
    });

    // 注册默认频道订阅
    if (this.notificationService) {
      this.notificationService.subscribeDefaults(userId, this);
    }

    // 推送离线缓存消息
    if (this.messageQueue && this.messageQueue.hasMessages(userId)) {
      const pending = this.messageQueue.flush(userId);
      this._send(ws, {
        type: 'offline_messages',
        messages: pending,
        count: pending.length,
      });
    }

    // 处理客户端消息
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this._onMessage(userId, msg);
      } catch (e) {
        this._send(ws, { type: 'error', message: 'Invalid JSON' });
      }
    });

    // 处理 pong 响应（心跳）
    ws.on('pong', () => {
      clientInfo.lastPong = Date.now();
    });

    // 连接关闭
    ws.on('close', () => {
      this._removeClient(userId, clientInfo);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Client error for ${userId}:`, err.message);
      this._removeClient(userId, clientInfo);
    });
  }

  /**
   * 处理客户端消息
   */
  _onMessage(userId, msg) {
    switch (msg.type) {
      case 'ping':
        this.sendToUser(userId, { type: 'pong', timestamp: Date.now() });
        break;

      case 'subscribe':
        if (msg.channel && this.notificationService) {
          this.notificationService.subscribe(msg.channel, userId, this);
        }
        break;

      case 'unsubscribe':
        if (msg.channel && this.notificationService) {
          this.notificationService.unsubscribe(msg.channel, userId);
        }
        break;

      case 'get_channels':
        this.sendToUser(userId, {
          type: 'channels',
          channels: this.notificationService
            ? this.notificationService.getChannels()
            : [],
        });
        break;

      case 'get_online_users':
        this.sendToUser(userId, {
          type: 'online_users',
          users: this.getOnlineUserIds(),
          count: this.clients.size,
        });
        break;

      default:
        this.sendToUser(userId, {
          type: 'error',
          message: `Unknown message type: ${msg.type}`,
        });
    }
  }

  /**
   * 发送消息给指定用户（支持多设备）
   * @returns {boolean} 是否至少有一个设备在线
   */
  sendToUser(userId, message) {
    const connections = this.clients.get(userId);
    if (!connections || connections.size === 0) return false;

    const payload = JSON.stringify(message);
    let sent = false;

    for (const client of connections) {
      if (client.ws.readyState === 1) {
        // WebSocket.OPEN
        client.ws.send(payload);
        sent = true;
      }
    }

    return sent;
  }

  /**
   * 广播消息给所有在线用户
   */
  broadcast(message) {
    const payload = JSON.stringify(message);
    for (const [, connections] of this.clients.entries()) {
      for (const client of connections) {
        if (client.ws.readyState === 1) {
          client.ws.send(payload);
        }
      }
    }
  }

  /**
   * 获取在线用户ID列表
   */
  getOnlineUserIds() {
    return Array.from(this.clients.keys());
  }

  /**
   * 检查用户是否在线
   */
  isOnline(userId) {
    return this.clients.has(userId) && this.clients.get(userId).size > 0;
  }

  /**
   * 获取在线用户数
   */
  getOnlineCount() {
    return this.clients.size;
  }

  /**
   * 移除客户端连接
   */
  _removeClient(userId, clientInfo) {
    const connections = this.clients.get(userId);
    if (!connections) return;

    connections.delete(clientInfo);

    if (connections.size === 0) {
      this.clients.delete(userId);
      // 清除该用户的频道订阅
      if (this.notificationService) {
        this.notificationService.removeAllForUser(userId);
      }
      console.log(`[WS] User disconnected: ${userId}`);
    }
  }

  /**
   * 启动心跳检测
   * 每 30 秒向所有客户端发送 ping，如果超过 10 秒没收到 pong 则断开
   */
  _startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();

      for (const [userId, connections] of this.clients.entries()) {
        for (const client of connections) {
          // 检查上次 pong 是否超时
          if (now - client.lastPong > HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT) {
            console.log(`[WS] Heartbeat timeout for user ${userId}`);
            client.ws.terminate();
            this._removeClient(userId, client);
            continue;
          }

          // 发送 ping
          if (client.ws.readyState === 1) {
            client.ws.ping();
          }
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * 安全发送 JSON 消息
   */
  _send(ws, data) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * 关闭 WebSocket 服务器
   */
  close() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.wss) {
      this.wss.close();
    }
    this.clients.clear();
    console.log('[WS] WebSocket server shut down');
  }

  /**
   * 获取状态统计
   */
  getStats() {
    let totalConnections = 0;
    for (const connections of this.clients.values()) {
      totalConnections += connections.size;
    }
    return {
      onlineUsers: this.clients.size,
      totalConnections,
      channels: this.notificationService
        ? this.notificationService.getStats()
        : {},
      messageQueue: this.messageQueue ? this.messageQueue.getStats() : null,
    };
  }
}

module.exports = WebSocketManager;
