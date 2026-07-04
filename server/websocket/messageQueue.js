/**
 * 离线用户消息队列
 * 当用户不在线时，缓存通知消息，用户上线后批量推送
 */
class MessageQueue {
  constructor() {
    // userId -> [{ type, data, timestamp, channel }]
    this.queues = new Map();
    // 每个用户最多缓存的消息数
    this.maxMessagesPerUser = 200;
    // 消息过期时间 (24小时)
    this.messageTTL = 24 * 60 * 60 * 1000;
  }

  /**
   * 为离线用户缓存一条消息
   * @param {string} userId
   * @param {object} message - { type, data, channel }
   */
  enqueue(userId, message) {
    if (!this.queues.has(userId)) {
      this.queues.set(userId, []);
    }

    const queue = this.queues.get(userId);
    queue.push({
      ...message,
      timestamp: Date.now(),
    });

    // 超出上限时移除最旧的消息
    if (queue.length > this.maxMessagesPerUser) {
      queue.splice(0, queue.length - this.maxMessagesPerUser);
    }
  }

  /**
   * 获取并清空某个用户的所有缓存消息
   * @param {string} userId
   * @returns {Array} 缓存的消息列表
   */
  flush(userId) {
    const messages = this.queues.get(userId) || [];
    this.queues.delete(userId);

    // 过滤掉已过期的消息
    const now = Date.now();
    return messages.filter((msg) => now - msg.timestamp < this.messageTTL);
  }

  /**
   * 检查用户是否有缓存消息
   * @param {string} userId
   * @returns {boolean}
   */
  hasMessages(userId) {
    return this.queues.has(userId) && this.queues.get(userId).length > 0;
  }

  /**
   * 获取用户缓存消息数量
   * @param {string} userId
   * @returns {number}
   */
  count(userId) {
    return this.queues.has(userId) ? this.queues.get(userId).length : 0;
  }

  /**
   * 清除过期消息（定期维护）
   */
  cleanup() {
    const now = Date.now();
    for (const [userId, queue] of this.queues.entries()) {
      const filtered = queue.filter(
        (msg) => now - msg.timestamp < this.messageTTL
      );
      if (filtered.length === 0) {
        this.queues.delete(userId);
      } else {
        this.queues.set(userId, filtered);
      }
    }
  }

  /**
   * 获取队列状态统计
   */
  getStats() {
    let totalMessages = 0;
    for (const queue of this.queues.values()) {
      totalMessages += queue.length;
    }
    return {
      queuedUsers: this.queues.size,
      totalMessages,
    };
  }
}

module.exports = MessageQueue;
