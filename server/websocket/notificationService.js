/**
 * 通知服务 - 统一管理通知的发送和频道订阅
 *
 * 支持的通知频道:
 *   - task:update      任务更新
 *   - task:create      任务创建
 *   - task:delete      任务删除
 *   - task:complete    任务完成状态变更
 *   - comment:create   新评论
 *   - comment:delete   评论删除
 *   - deadline:due     截止日期提醒
 */
class NotificationService {
  constructor() {
    // channel -> Set<userId>
    this.subscriptions = new Map();

    // 默认频道（所有用户自动订阅）
    this.defaultChannels = [
      'task:update',
      'task:create',
      'task:delete',
      'task:complete',
      'comment:create',
      'comment:delete',
      'deadline:due',
    ];

    this.allChannels = new Set(this.defaultChannels);
  }

  /**
   * 初始化用户的频道订阅（登录后自动订阅默认频道）
   */
  subscribeDefaults(userId, wsManager) {
    for (const channel of this.defaultChannels) {
      this.subscribe(channel, userId, wsManager);
    }
  }

  /**
   * 订阅指定频道
   */
  subscribe(channel, userId, wsManager) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel).add(userId);
    this.allChannels.add(channel);

    // 告知客户端订阅成功
    wsManager.sendToUser(userId, {
      type: 'channel:subscribed',
      channel,
      timestamp: Date.now(),
    });
  }

  /**
   * 取消订阅
   */
  unsubscribe(channel, userId) {
    if (this.subscriptions.has(channel)) {
      this.subscriptions.get(channel).delete(userId);
    }
  }

  /**
   * 移除用户的所有订阅（断开连接时）
   */
  removeAllForUser(userId) {
    for (const [channel, users] of this.subscriptions.entries()) {
      users.delete(userId);
    }
  }

  /**
   * 向频道发送通知
   * 会将消息推送给所有订阅该频道的在线用户，离线用户缓存到消息队列
   */
  broadcast(channel, payload, wsManager, messageQueue) {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers || subscribers.size === 0) return;

    const message = {
      type: 'notification',
      channel,
      data: payload,
      timestamp: Date.now(),
    };

    for (const userId of subscribers) {
      const sent = wsManager.sendToUser(userId, message);
      // 如果用户不在线，缓存到消息队列
      if (!sent && messageQueue) {
        messageQueue.enqueue(userId, message);
      }
    }
  }

  /**
   * 向单个用户发送定向通知
   */
  notify(userId, channel, payload, wsManager, messageQueue) {
    const message = {
      type: 'notification',
      channel,
      data: payload,
      timestamp: Date.now(),
    };

    const sent = wsManager.sendToUser(userId, message);
    if (!sent && messageQueue) {
      messageQueue.enqueue(userId, message);
    }
  }

  /**
   * 获取所有可用频道
   */
  getChannels() {
    return Array.from(this.allChannels);
  }

  /**
   * 获取频道订阅统计
   */
  getStats() {
    const stats = {};
    for (const [channel, users] of this.subscriptions.entries()) {
      stats[channel] = users.size;
    }
    return stats;
  }
}

module.exports = NotificationService;
