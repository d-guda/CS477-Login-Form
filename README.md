# CSCE 477 Login Form Lab

A local OWASP Juice Shop-inspired login lab built with HTML, CSS, browser-side JavaScript, Node.js, and SQLite. Users can create accounts, and the database persists them between runs.


## Requirements

- Node.js 22.5 or newer (uses the built-in `node:sqlite` module)

## Run locally

1. Clone the repository and enter its folder.
2. Start the server:

   ```bash
   npm start
   ```

3. Open <http://localhost:4174>.
4. Create a test account, then log in with the same email and password. A built-in `demo@juice-sh.op` account also guarantees that the injection exercise has a row to return.

Accounts are stored locally in `users.db`. That file is ignored by Git and should not be committed. Passwords are stored as weak MD5 hashes to mirror Juice Shop's training design; never enter a real password.

## Demonstrate the SQL injection

1. In the login form, enter this email:

   ```text
   ' OR 1=1 -- @
   ```

2. Enter any non-empty password.
3. Select **Log in**. The query's `OR 1=1` condition becomes true, while `--` comments out the password check. The seeded demo account ensures SQLite has a user row to return.

The vulnerable query is intentionally isolated in `handleLogin()` in `server.js`:

```js
const query = `SELECT id, email FROM users WHERE email = '${email}' AND password = '${hashPassword(password)}' LIMIT 1`;
```

## Why the vulnerability works

The server joins the untrusted email directly into SQL code. SQLite treats part of the supplied email as SQL syntax instead of plain data. Client-side validation does not stop the attack because the payload contains `@`, and an attacker can bypass browser checks anyway.

## Connection to OWASP Juice Shop

This lab copies the essential teaching pattern from Juice Shop's login backend: an email is concatenated into a SQL query, and the password is MD5-hashed before comparison. It intentionally leaves out Juice Shop's unrelated baskets, JWTs, roles, two-factor authentication, and challenge tracking.

## Secure fix

Real applications must use a parameterized query and a modern password-hashing algorithm:

```js
database.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email);
```

Then compare the submitted password against an Argon2id, scrypt, or bcrypt hash. Never use MD5 for production passwords.

## Test

```bash
npm test
```

The automated tests prove that registration persists, duplicate registration is rejected, normal login rejects a wrong password, normal login accepts correct credentials, and the intentional SQL-injection bypass succeeds.
