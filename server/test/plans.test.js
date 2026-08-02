const assert = require('assert');
const os = require('os');
const path = require('path');

process.env.DB_PATH = path.join(os.tmpdir(), `taskflow-plans-${process.pid}-${Date.now()}.db`);

const { initDB, queryOne, run } = require('../db');
const { PLANS, assignPlan, getUserPlan } = require('../services/plans');

async function main() {
  await initDB();
  run('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', [
    'plan-test-user',
    'plan-test@example.test',
    'Plan Test',
    'not-used-by-this-test',
  ]);

  assert.equal(getUserPlan('plan-test-user').entitlement.maxProjects, PLANS.free.maxProjects);

  const assignment = assignPlan({
    userId: 'plan-test-user',
    plan: 'pro',
    actorId: 'plan-test-user',
  });
  assert.equal(assignment.plan, 'pro');
  assert.equal(getUserPlan('plan-test-user').entitlement.maxAiPerDay, PLANS.pro.maxAiPerDay);
  assert.equal(queryOne('SELECT COUNT(*) AS count FROM subscriptions WHERE user_id = ?', ['plan-test-user']).count, 1);

  assert.throws(() => assignPlan({ userId: 'plan-test-user', plan: 'enterprise', actorId: 'plan-test-user' }));
  console.log('plans.test.js: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
