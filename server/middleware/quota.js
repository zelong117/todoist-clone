/**
 * \u914d\u989d\u68c0\u67e5\u4e2d\u95f4\u4ef6
 * \u68c0\u67e5\u514d\u8d39\u7528\u6237\u7684\u8d44\u6e90\u4f7f\u7528\u662f\u5426\u8d85\u9650
 */

const { queryOne } = require('../db');
const { PLANS, getUserPlan } = require('../services/plans');

const FREE_LIMITS = PLANS.free;

function resolveEntitlement(userId) {
  const user = getUserPlan(userId);
  return user ? { user, entitlement: user.entitlement } : null;
}

/**
 * \u68c0\u67e5\u9879\u76ee\u6570\u91cf\u914d\u989d
 */
function checkProjectQuota(req, res, next) {
  const user = req.user;
  if (!user?.id) return res.status(401).json({ error: 'Authentication required' });
  const resolved = resolveEntitlement(user.id);
  if (!resolved) return res.status(401).json({ error: 'Authentication required' });
  if (resolved.user.role === 'admin') return next();

  const count = queryOne(
    'SELECT COUNT(*) as count FROM projects WHERE user_id = ?',
    [user.id]
  );

  if (count && count.count >= resolved.entitlement.maxProjects) {
    return res.status(403).json({
      error: 'quota_exceeded',
      message: `The ${resolved.entitlement.name} plan project limit has been reached`,
      limit: resolved.entitlement.maxProjects,
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
  if (!user?.id) return res.status(401).json({ error: 'Authentication required' });
  const resolved = resolveEntitlement(user.id);
  if (!resolved) return res.status(401).json({ error: 'Authentication required' });
  if (resolved.user.role === 'admin') return next();

  const today = new Date().toISOString().split('T')[0];
  const count = queryOne(
    `SELECT COUNT(*) as count FROM activity_logs
     WHERE user_id = ? AND type = 'ai_usage' AND created_at >= ?`,
    [user.id, today]
  );

  if (count && count.count >= resolved.entitlement.maxAiPerDay) {
    return res.status(403).json({
      error: 'ai_quota_exceeded',
      message: `The ${resolved.entitlement.name} plan AI limit has been reached`,
      limit: resolved.entitlement.maxAiPerDay,
      resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
      upgradeRequired: true,
    });
  }

  next();
}

module.exports = { checkProjectQuota, checkAiQuota, FREE_LIMITS };
