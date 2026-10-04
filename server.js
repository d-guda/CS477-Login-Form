const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 4173;
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

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function handleLogin(request, response) {
  let body = '';

  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 10_000) request.destroy();
  });

  request.on('end', () => {
    try {
      const { email, password } = JSON.parse(body || '{}');
      const errors = validateCredentials(email, password);

      if (errors.length > 0) {
        sendJson(response, 400, { ok: false, errors });
        return;
      }

      sendJson(response, 200, {
        ok: true,
        message: 'Validation passed. Demo login accepted.'
      });
    } catch {
      sendJson(response, 400, { ok: false, errors: ['Request must contain valid JSON.'] });
    }
  });
}

function createServer() {
  return http.createServer((request, response) => {
    if (request.method === 'POST' && request.url === '/api/login') {
      handleLogin(request, response);
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
    console.log(`Login form running at http://localhost:${PORT}`);
  });
}

module.exports = { createServer, validateCredentials };
