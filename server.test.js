const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createServer, validateCredentials } = require('./server');

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

test('server validation accepts valid-shaped credentials', () => {
  assert.deepEqual(validateCredentials('student@example.com', 'password123'), []);
});

test('POST /api/login enforces validation and accepts valid input', async (context) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  context.after(() => server.close());
  const { port } = server.address();

  const invalidResponse = await fetch(`http://127.0.0.1:${port}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'invalid', password: 'tiny' })
  });
  assert.equal(invalidResponse.status, 400);

  const validResponse = await fetch(`http://127.0.0.1:${port}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@example.com', password: 'password123' })
  });
  assert.equal(validResponse.status, 200);
  assert.equal((await validResponse.json()).ok, true);
});
