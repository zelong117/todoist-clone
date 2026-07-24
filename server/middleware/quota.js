/**
 * \u914d\u989d\u68c0\u67e5\u4e2d\u95f4\u4ef6
 * \u68c0\u67e5\u514d\u8d39\u7528\u6237\u7684\u8d44\u6e90\u4f7f\u7528\u662f\u5426\u8d85\u9650
 */

const { queryOne, queryAll } = require('../db');

// \u514d\u8d39\u7248\u914d\u989d\u9650\u5236
const FREE_LIMITS = {
  maxProjects: 5,
  maxAiPerDay: 3,
};

/**
 * \u68c0\u67e5\u9879\u76ee\u6570\u91cf\u914d\u989d
 */
function checkProjectQuota(req, res, next) {
  const user = req.user;
  if (user.plan === 'pro') return next();

  const count = queryOne(
    'SELECT COUNT(*) as count FROM projects WHERE user_id = ?',
    [user.id]
  );

  if (count && count.count >= FREE_LIMITS.maxProjects) {
    return res.status(403).json({
      error: 'quota_exceeded',
      message: '\u514d\u8d39\u7248\u6700\u591a\u521b\u5efa 5 \u4e2a\u9879\u76ee\uff0c\u8bf7\u5347\u7ea7\u5230 Pro',
      limit: FREE_LIMITS.maxProjects,
      upgradeRequired: true,
    });
  }

  next();
}

/**
 * \u68c0\u67e5 AI \u4f7f\u7528\u989d\u914d\u989d
 */
function checkAiQuota(req, res, next) {
  const user = req.user;
  if (user.plan === 'pro') return next();

  const today = new Date().toISOString().split('T')[0];
  const count = queryOne(
    `SELECT COUNT(*) as count FROM activity_logs
     WHERE user_id = ? AND type = 'ai_usage' AND created_at >= ?`,
    [user.id, today]
  );

  if (count && count.count >= FREE_LIMITS.maxAiPerDay) {
    return res.status(403).json({
      error: 'ai_quota_exceeded',
      message: '\u514d\u8d39\u7248\u6bcf\u5929\u6700\u591a\u4f7f\u7528 3 \u6b21 AI\uff0c\u660e\u5929\u518d\u6765\u6216\u5347\u7ea7\u5230 Pro',
      limit: FREE_LIMITS.maxAiPerDay,
      resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
      upgradeRequired: true,
    });
  }

  next();
}

module.exports = { checkProjectQuota, checkAiQuota, FREE_LIMITS };
