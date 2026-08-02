const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbPath = path.join(os.tmpdir(), `taskflow-persistence-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = dbPath;
process.env.DB_WRITE_FLUSH_MS = '50';

const { flushPendingWrites, getPersistenceStats, initDB, queryOne, run, transaction } = require('../db');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  await initDB();
  const initialFlushes = getPersistenceStats().flushes;

  for (let index = 0; index < 3; index += 1) {
    run('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', [`queued-${index}`, `queued-${index}@example.com`, 'Queued write', 'not-used']);
  }

  assert.equal(getPersistenceStats().dirty, true);
  assert.equal(getPersistenceStats().scheduled, true);
  await delay(100);
  assert.equal(getPersistenceStats().dirty, false);
  assert.equal(getPersistenceStats().flushes, initialFlushes + 1);

  run('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', ['forced', 'forced@example.com', 'Forced flush', 'not-used']);
  assert.equal(flushPendingWrites(), true);
  assert.equal(getPersistenceStats().dirty, false);

  const beforeTransaction = getPersistenceStats().flushes;
  transaction(() => {
    run('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', ['transaction-a', 'transaction-a@example.com', 'Transaction A', 'not-used']);
    run('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', ['transaction-b', 'transaction-b@example.com', 'Transaction B', 'not-used']);
  });
  assert.equal(getPersistenceStats().flushes, beforeTransaction + 1);
  assert.equal(fs.existsSync(dbPath), true);
  assert.equal(queryOne('SELECT COUNT(*) AS count FROM users').count, 6);
  console.log('db-persistence.test.js: PASS');
}

main()
  .finally(() => {
    for (const file of [dbPath, `${dbPath}.tmp`]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
