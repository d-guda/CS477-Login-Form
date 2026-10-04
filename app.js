const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');

function validateRegistration(email, password) {
  const errors = [];

  if (!email.trim()) {
    errors.push('Email is required.');
  } else if (!email.includes('@')) {
    errors.push('Email must contain @.');
  }

  if (!password) {
    errors.push('Password is required.');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }

  return errors;
}

function validateLogin(email, password) {
  const errors = [];
  if (!email) errors.push('Email is required.');
  if (!password) errors.push('Password is required.');
  return errors;
}

function showMessage(form, text, type) {
  const message = form.querySelector('.form-message');
  message.textContent = text;
  message.className = `form-message ${type}`;
}

async function submitCredentials(form, endpoint, validate) {
  const email = form.elements.email.value;
  const password = form.elements.password.value;
  const clientErrors = validate(email, password);

  if (clientErrors.length > 0) {
    showMessage(form, clientErrors.join(' '), 'error');
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await response.json();

    if (!response.ok) {
      showMessage(form, result.errors.join(' '), 'error');
      return;
    }

    const text = result.warning ? `${result.message} ${result.warning}` : result.message;
    showMessage(form, text, 'success');
    form.reset();
  } catch {
    showMessage(form, 'Unable to contact the server.', 'error');
  }
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitCredentials(loginForm, '/api/login', validateLogin);
});

registerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitCredentials(registerForm, '/api/register', validateRegistration);
});
