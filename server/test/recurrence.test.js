const assert = require('assert');
const { getNextDueDate, getNextReminderAt, parseRule } = require('../services/recurrence');

assert.deepEqual(parseRule('weekly:1,3,5'), { type: 'weekly', days: [1, 3, 5] });
assert.equal(parseRule('custom:0:d'), null);
assert.equal(getNextDueDate('daily', new Date('2026-08-02T09:00:00Z'), '2026-08-02'), '2026-08-03');
assert.equal(getNextDueDate('weekly:1,3,5', new Date('2026-08-02T09:00:00Z'), '2026-08-02'), '2026-08-03');
assert.equal(getNextDueDate('monthly:31', new Date('2026-01-31T09:00:00Z'), '2026-01-31'), '2026-02-28');
assert.equal(getNextDueDate('custom:2:w', new Date('2026-08-02T09:00:00Z'), '2026-08-02'), '2026-08-16');
assert.equal(getNextReminderAt('2026-01-31T09:30:00.000Z', '2026-01-31', '2026-02-28'), '2026-02-28T09:30:00.000Z');
assert.equal(getNextReminderAt(null, '2026-01-31', '2026-02-28'), null);
console.log('recurrence.test.js: PASS');
