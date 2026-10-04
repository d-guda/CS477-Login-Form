const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 4174;
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'users.db');
const publicFiles = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8']
};

function validateCredentials(email, password) {
  const errors = [];

  if (typeof email !== 'string' || email.trim() === '') {
    errors.push('Email is required.');
  } else if (!email.includes('@')) {
    errors.push('Email must contain @.');
  }

  if (typeof password !== 'string' || password === '') {
    errors.push('Password is required.');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }

  return errors;
}

function hashPassword(password) {
  // Mirrors Juice Shop's intentionally weak MD5 password storage for this lab.
  return crypto.createHash('md5').update(password).digest('hex');
}

function validateLoginInput(email, password) {
  const errors = [];
  if (typeof email !== 'string' || email === '') errors.push('Email is required.');
  if (typeof password !== 'string' || password === '') errors.push('Password is required.');
  return errors;
}

function createDatabase(filename = DATABASE_PATH) {
  const database = new DatabaseSync(filename);
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);
  database.prepare('INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)')
    .run('demo@juice-sh.op', hashPassword('demo-password'));
  return database;
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function readJson(request, response, callback) {
  let body = '';

  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 10_000) request.destroy();
  });

  request.on('end', () => {
    try {
      callback(JSON.parse(body || '{}'));
    } catch {
      sendJson(response, 400, { ok: false, errors: ['Request must contain valid JSON.'] });
    }
  });
}

function handleRegister(request, response, database) {
  readJson(request, response, ({ email, password }) => {
    const errors = validateCredentials(email, password);
    if (errors.length > 0) {
      sendJson(response, 400, { ok: false, errors });
      return;
    }

    try {
      // Registration stays safe so the lab database remains usable.
      database.prepare('INSERT INTO users (email, password) VALUES (?, ?)')
        .run(email.trim(), hashPassword(password));
      sendJson(response, 201, { ok: true, message: 'Account created. You can now log in.' });
    } catch (error) {
      if (error.errcode === 2067) {
        sendJson(response, 409, { ok: false, errors: ['An account with that email already exists.'] });
        return;
      }
      sendJson(response, 500, { ok: false, errors: ['Unable to create the account.'] });
    }
  });
}

function handleLogin(request, response, database) {
  readJson(request, response, ({ email, password }) => {
    const errors = validateLoginInput(email, password);
    if (errors.length > 0) {
      sendJson(response, 400, { ok: false, errors });
      return;
    }

    // INTENTIONALLY VULNERABLE FOR A LOCAL SQL-INJECTION LAB.
    // Never copy this string-concatenation pattern into a real application.
    const query = `SELECT id, email FROM users WHERE email = '${email}' AND password = '${hashPassword(password)}' LIMIT 1`;

    try {
      const user = database.prepare(query).get();
      if (!user) {
        sendJson(response, 401, { ok: false, errors: ['Invalid email or password.'] });
        return;
      }

      sendJson(response, 200, {
        ok: true,
        message: `Logged in as ${user.email}.`,
        warning: 'Training mode: this login query is intentionally vulnerable to SQL injection.'
      });
    } catch {
      sendJson(response, 400, { ok: false, errors: ['The login query failed.'] });
    }
  });
}

function createServer(options = {}) {
  const database = options.database || createDatabase();

  return http.createServer((request, response) => {
    if (request.method === 'POST' && request.url === '/api/register') {
      handleRegister(request, response, database);
      return;
    }

    if (request.method === 'POST' && request.url === '/api/login') {
      handleLogin(request, response, database);
      return;
    }

    if (request.method === 'GET' && publicFiles[request.url]) {
      const [filename, contentType] = publicFiles[request.url];
      fs.readFile(path.join(__dirname, filename), (error, contents) => {
        if (error) {
          sendJson(response, 500, { ok: false, errors: ['Unable to load the page.'] });
          return;
        }

        response.writeHead(200, { 'Content-Type': contentType });
        response.end(contents);
      });
      return;
    }

    sendJson(response, 404, { ok: false, errors: ['Not found.'] });
  });
}

if (require.main === module) {
  createServer().listen(PORT, () => {
    console.log(`Vulnerable login lab running at http://localhost:${PORT}`);
  });
}

module.exports = { createDatabase, createServer, validateCredentials, validateLoginInput };
