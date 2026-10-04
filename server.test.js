const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDatabase, createServer, validateCredentials, validateLoginInput } = require('./server');

async function post(baseUrl, endpoint, body) {
  return fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('server validation rejects missing or malformed credentials', () => {
  assert.deepEqual(validateCredentials('', ''), [
    'Email is required.',
    'Password is required.'
  ]);
  assert.deepEqual(validateCredentials('student.example.com', 'short'), [
    'Email must contain @.',
    'Password must be at least 8 characters.'
  ]);
});

test('login allows SQL-shaped input and a short non-empty password', () => {
  assert.deepEqual(validateLoginInput("' OR 1=1 -- @", 'x'), []);
});

test('accounts persist after the database is closed and reopened', (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cs477-login-'));
  const filename = path.join(directory, 'users.db');
  context.after(() => fs.rmSync(directory, { recursive: true }));

  const firstConnection = createDatabase(filename);
  firstConnection.prepare('INSERT INTO users (email, password) VALUES (?, ?)')
    .run('persistent@example.com', 'test-hash');
  firstConnection.close();

  const secondConnection = createDatabase(filename);
  const savedUser = secondConnection.prepare('SELECT email FROM users WHERE email = ?')
    .get('persistent@example.com');
  secondConnection.close();

  assert.equal(savedUser.email, 'persistent@example.com');
});

test('registration persists an account and login checks its credentials', async (context) => {
  const database = createDatabase(':memory:');
  const server = createServer({ database });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => {
    server.close();
    database.close();
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const registerResponse = await post(baseUrl, '/api/register', {
    email: 'student@example.com',
    password: 'correct-password'
  });
  assert.equal(registerResponse.status, 201);

  const duplicateResponse = await post(baseUrl, '/api/register', {
    email: 'student@example.com',
    password: 'another-password'
  });
  assert.equal(duplicateResponse.status, 409);

  const wrongPasswordResponse = await post(baseUrl, '/api/login', {
    email: 'student@example.com',
    password: 'wrong-password'
  });
  assert.equal(wrongPasswordResponse.status, 401);

  const loginResponse = await post(baseUrl, '/api/login', {
    email: 'student@example.com',
    password: 'correct-password'
  });
  assert.equal(loginResponse.status, 200);
});

test('the training login can be bypassed with SQL injection', async (context) => {
  const database = createDatabase(':memory:');
  const server = createServer({ database });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => {
    server.close();
    database.close();
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await post(baseUrl, '/api/login', {
    email: "' OR 1=1 -- @",
    password: 'x'
  });
  assert.equal(response.status, 200);
  assert.match((await response.json()).warning, /intentionally vulnerable/i);
});
