# Juice Shop Login Form

A small OWASP Juice Shop-inspired login page built with HTML, CSS, client-side JavaScript, and a Node.js server. It demonstrates the same validation rules in two places:

- The browser blocks empty fields, emails without `@`, and passwords shorter than eight characters.
- The server repeats those checks because browser validation can be bypassed.

This is a validation demo. It does not store users, passwords, or authenticate real accounts.

## Requirements

- Node.js 18 or newer

## Run locally

1. Clone this repository and enter its folder.
2. Start the server:

   ```bash
   npm start
   ```

3. Open <http://localhost:4173>.

## Test

Run the automated server-validation tests:

```bash
npm test
```

## Validation flow

1. `app.js` checks the form before sending it.
2. Valid-looking input is sent as JSON to `POST /api/login`.
3. `server.js` independently checks the input and returns either status `400` with errors or status `200` for the demo success case.

## Security note

Client-side validation improves usability but does not provide security. A user can disable or bypass browser JavaScript, so the server must treat all incoming data as untrusted and validate it again.
