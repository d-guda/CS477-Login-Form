const form = document.querySelector('#login-form');
const message = document.querySelector('#form-message');

function validateForm(email, password) {
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

function showMessage(text, type) {
  message.textContent = text;
  message.className = type;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = form.email.value;
  const password = form.password.value;
  const clientErrors = validateForm(email, password);

  if (clientErrors.length > 0) {
    showMessage(clientErrors.join(' '), 'error');
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await response.json();

    if (!response.ok) {
      showMessage(result.errors.join(' '), 'error');
      return;
    }

    showMessage(result.message, 'success');
    form.reset();
  } catch {
    showMessage('Unable to contact the server.', 'error');
  }
});
