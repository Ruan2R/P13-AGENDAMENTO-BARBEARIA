const form = document.querySelector('#login-form');
const message = document.querySelector('#login-message');

const api = {
  async post(path, body) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Não foi possível entrar.');
      error.status = response.status;
      throw error;
    }
    return data;
  },
  async get(path) {
    const response = await fetch(path, { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Falha na consulta.');
    return data;
  }
};

(async function init() {
  try {
    await api.get('/api/admin/me');
    window.location.replace('/admin.html');
  } catch {
    // Ainda não autenticado; exibe o formulário.
  }
})();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.checkValidity()) return form.reportValidity();
  const button = form.querySelector('button');
  button.disabled = true;
  message.className = 'form-message';
  message.textContent = 'Entrando...';
  try {
    const data = new FormData(form);
    await api.post('/api/admin/login', Object.fromEntries(data.entries()));
    message.className = 'form-message success';
    message.textContent = `Bem-vindo, ${data.get('email')}.`;
    window.location.replace('/admin.html');
  } catch (error) {
    message.className = 'form-message error';
    message.textContent = error.message;
    button.disabled = false;
  }
});
