const agendaDate = document.querySelector('#agenda-date');
const agendaTitle = document.querySelector('#agenda-title');
const bookingList = document.querySelector('#booking-list');
const professionalFilter = document.querySelector('#professional-filter');
const statusFilter = document.querySelector('#status-filter');
const statsGrid = document.querySelector('#stats-grid');
const blockForm = document.querySelector('#block-form');
const blockDate = document.querySelector('#block-date');
const blockProfessional = document.querySelector('#block-professional');
const blockList = document.querySelector('#block-list');
const blockMessage = document.querySelector('#block-message');
const sessionUser = document.querySelector('#session-user');
const serviceList = document.querySelector('#service-list');
const professionalList = document.querySelector('#professional-list');
const hoursList = document.querySelector('#hours-list');
const serviceForm = document.querySelector('#service-form');
const professionalForm = document.querySelector('#professional-form');
const serviceMessage = document.querySelector('#service-message');
const professionalMessage = document.querySelector('#professional-message');

const state = {
  professionals: [], bookings: [], blocks: [], services: [], hours: []
};

const api = {
  async request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Não foi possível concluir a operação.');
      error.status = response.status;
      if (response.status === 401) window.location.replace('/login.html');
      throw error;
    }
    return data;
  },
  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); },
  put(path, body) { return this.request(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function todayKey() { const date = new Date(); date.setHours(12, 0, 0, 0); return dateKey(date); }
function parseLocalDate(value) { return new Date(`${value}T12:00:00`); }
function formatDateLong(value) { return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(parseLocalDate(value)).replace(/^./, (c) => c.toUpperCase()); }
function formatCurrency(cents) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents) / 100); }
function initials(name) { return String(name || '').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join(''); }

function boss67WhatsappNumber() {
  return String(window.BOSS67_CONFIG?.whatsapp || '').replace(/\D/g, '');
}

function formatWhatsappDisplay(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return value || '';
}

function formatCustomerFirstName(value) {
  const firstName = String(value || '').trim().split(/\s+/)[0] || 'cliente';
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

function buildConfirmationMessage(items) {
  const first = items[0];
  const dateLabel = formatDateLong(first.date);
  const confirmedItems = items.filter((item) => item.status === 'confirmed');
  const totalCents = confirmedItems.reduce((sum, item) => sum + Number(item.priceCents || 0), 0);
  const customerName = formatCustomerFirstName(first.customerName);
  const lines = confirmedItems.map((item) =>
    `- ${item.serviceName} — ${item.professionalName} — ${item.startTime}`
  );

  return [
    `Olá, ${customerName}!`,
    '',
    'Aqui é da Boss67 Barbearia.',
    '',
    `Seu agendamento está confirmado para ${dateLabel}.`,
    '',
    'Detalhes do agendamento:',
    ...lines,
    '',
    `Total: ${formatCurrency(totalCents)}`,
    '',
    'Qualquer dúvida ou observação, estamos à disposição. Até lá!'
  ].join('\n');
}

function openWhatsapp(phone, message = '') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return;

  const encodedMessage = message ? `&text=${encodeURIComponent(message)}` : '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const url = isMobile
    ? `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`
    : `https://web.whatsapp.com/send?phone=${digits}${encodedMessage}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}

function setSelectedDate(value) {
  agendaDate.value = value;
  blockDate.value = value;
  loadDay();
}

function renderStats(summary) {
  const cards = [
    ['Agendamentos', summary.total, 'no dia selecionado'],
    ['Confirmados', summary.confirmed, 'ocupando a agenda'],
    ['Horários livres', summary.availableSlots, 'considerando a escala'],
    ['Faturamento', formatCurrency(summary.revenueCents), 'serviços confirmados']
  ];
  statsGrid.innerHTML = cards.map(([label, value, hint]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>`).join('');
}

function renderBookings() {
  const professionalId = professionalFilter.value;
  const status = statusFilter.value;
  const rows = state.bookings
    .filter((booking) => professionalId === 'all' || booking.professionalId === professionalId)
    .filter((booking) => status === 'all' || booking.status === status);

  if (!rows.length) {
    bookingList.innerHTML = '<div class="empty-state">Nenhum atendimento para os filtros selecionados.</div>';
    return;
  }

  const groups = new Map();
  rows.forEach((booking) => {
    const key = booking.groupId || booking.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(booking);
  });

  const sortedGroups = [...groups.values()].sort((a, b) => a[0].startTime.localeCompare(b[0].startTime));

  bookingList.innerHTML = sortedGroups.map((items) => {
    const first = items[0];
    const confirmedItems = items.filter((item) => item.status === 'confirmed');
    const totalCents = confirmedItems.reduce((sum, item) => sum + Number(item.priceCents || 0), 0);
    const allCancelled = items.every((item) => item.status === 'cancelled');
    const starts = items.map((item) => item.startTime).sort();
    const endMinutes = Math.max(...items.map((item) => {
      const [h, m] = item.startTime.split(':').map(Number);
      return h * 60 + m + Number(item.duration || 0);
    }));
    const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    const timeLabel = starts.length === 1 ? starts[0] : `${starts[0]} — ${end}`;
    const procedureLabel = `${items.length} ${items.length === 1 ? 'procedimento' : 'procedimentos'}`;
    const statusLabel = allCancelled ? 'Cancelado' : (items.some((item) => item.status === 'cancelled') ? 'Parcial' : 'Confirmado');
    const statusClass = allCancelled ? 'status-cancelled' : 'status-confirmed';
    const groupId = first.groupId || first.id;

    return `
      <article class="booking-group">
        <div class="booking-group-head">
          <div class="group-time">${escapeHtml(timeLabel)}</div>
          <div class="group-customer">
            <strong>${escapeHtml(first.customerName)}</strong>
            <span>${escapeHtml(first.customerWhatsapp)}</span>
            <div class="group-meta"><span>${procedureLabel}</span><span>•</span><span class="status-pill compact ${statusClass}">${statusLabel}</span></div>
          </div>
          <div class="group-total">${formatCurrency(totalCents)}</div>
        </div>
        <div class="group-items">
          ${items.map((item) => `
            <div class="group-item">
              <strong class="group-item-time">${escapeHtml(item.startTime)}</strong>
              <div class="group-item-main">
                <strong>${escapeHtml(item.serviceName)}</strong>
                <span>${escapeHtml(item.professionalName)} • ${Number(item.duration)} min</span>
              </div>
              <strong class="group-item-price">${formatCurrency(item.priceCents)}</strong>
            </div>
          `).join('')}
        </div>
        <div class="group-actions">
          ${!allCancelled && confirmedItems.length ? `<button class="action-button confirm" type="button" data-action="confirm-whatsapp" data-group-id="${escapeHtml(groupId)}">Confirmar via WhatsApp ↗</button>` : ''}
          <button class="action-button" type="button" data-action="open-whatsapp" data-phone="${escapeHtml(first.customerWhatsapp)}">WhatsApp ↗</button>
          ${!allCancelled ? `<button class="action-button danger" type="button" data-action="cancel-group" data-group-id="${escapeHtml(groupId)}">Cancelar atendimento</button>` : ''}
        </div>
      </article>`;
  }).join('');
}

function renderProfessionals() {
  const active = state.professionals.filter((person) => Number(person.active) === 1);
  professionalFilter.innerHTML = `<option value="all">Todos</option>${active.map((person) => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)}</option>`).join('')}`;
  blockProfessional.innerHTML = active.map((person) => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)}</option>`).join('');
  professionalList.innerHTML = state.professionals.length ? state.professionals.map((person) => `
    <details class="config-row ${Number(person.active) ? '' : 'is-inactive'}">
      <summary><span class="config-avatar">${escapeHtml(person.initials)}</span><span class="config-main"><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.role)}</small></span><span class="active-label ${Number(person.active) ? 'is-on' : 'is-off'}">${Number(person.active) ? 'Ativo' : 'Inativo'}</span><span class="config-chevron">⌄</span></summary>
      <form class="config-edit-form" data-type="professional-edit" data-id="${escapeHtml(person.id)}">
        <div class="form-row"><label>Nome<input name="name" maxlength="60" value="${escapeHtml(person.name)}" required /></label><label>Função<input name="role" maxlength="60" value="${escapeHtml(person.role)}" required /></label></div>
        <div class="config-edit-actions"><button class="secondary-button" type="submit">Salvar alterações</button><button class="action-button ${Number(person.active) ? 'danger' : ''}" type="button" data-action="toggle-professional" data-id="${escapeHtml(person.id)}" data-active="${Number(person.active) ? '0' : '1'}">${Number(person.active) ? 'Desativar' : 'Ativar'}</button></div>
      </form>
    </details>`).join('') : '<div class="empty-state">Nenhum profissional cadastrado.</div>';
}

function renderServices() {
  serviceList.innerHTML = state.services.length ? state.services.map((service) => `
    <details class="config-row ${Number(service.active) ? '' : 'is-inactive'}">
      <summary><span class="service-config-mark">R$</span><span class="config-main"><strong>${escapeHtml(service.name)}</strong><small>${service.duration} min • ${formatCurrency(service.priceCents)}</small></span><span class="active-label ${Number(service.active) ? 'is-on' : 'is-off'}">${Number(service.active) ? 'Ativo' : 'Inativo'}</span><span class="config-chevron">⌄</span></summary>
      <form class="config-edit-form" data-type="service-edit" data-id="${escapeHtml(service.id)}">
        <label>Nome<input name="name" maxlength="60" value="${escapeHtml(service.name)}" required /></label>
        <div class="form-row"><label>Duração<select name="duration" required>${[15,30,45,60,90,120].map((v) => `<option value="${v}" ${Number(service.duration)===v?'selected':''}>${v} min</option>`).join('')}</select></label><label>Preço (R$)<input name="price" type="number" min="0" step="0.01" value="${(Number(service.priceCents)/100).toFixed(2)}" required /></label></div>
        <div class="config-edit-actions"><button class="secondary-button" type="submit">Salvar alterações</button><button class="action-button ${Number(service.active) ? 'danger' : ''}" type="button" data-action="toggle-service" data-id="${escapeHtml(service.id)}" data-active="${Number(service.active) ? '0' : '1'}">${Number(service.active) ? 'Desativar' : 'Ativar'}</button></div>
      </form>
    </details>`).join('') : '<div class="empty-state">Nenhum serviço cadastrado.</div>';
}

function renderHours() {
  hoursList.innerHTML = state.hours.map((day) => `
    <form class="hours-row ${day.closed ? 'is-closed' : ''}" data-weekday="${day.weekday}">
      <div class="hours-day"><strong>${escapeHtml(day.name)}</strong><small>${day.closed ? 'Fechado' : `${day.openTime} — ${day.closeTime}`}</small></div>
      <label class="switch-field"><input type="checkbox" name="closed" ${day.closed ? 'checked' : ''} data-role="closed"><span class="switch-ui"></span><span>Fechado</span></label>
      <div class="hours-fields"><input name="openTime" type="time" value="${day.openTime}" ${day.closed ? 'disabled' : ''} required><span>até</span><input name="closeTime" type="time" value="${day.closeTime}" ${day.closed ? 'disabled' : ''} required></div>
      <button class="secondary-button" type="submit">Salvar</button>
    </form>`).join('');
}

function renderBlocks() {
  if (!state.blocks.length) { blockList.innerHTML = '<div class="empty-state">Nenhum bloqueio nesta data.</div>'; return; }
  blockList.innerHTML = state.blocks.map((block) => `<div class="block-row"><strong class="block-time">${escapeHtml(block.startTime)}</strong><div><strong>${escapeHtml(block.professionalName)}</strong><span>${block.duration} min${block.reason ? ` • ${escapeHtml(block.reason)}` : ''}</span></div><button class="action-button danger" type="button" data-action="remove-block" data-block-id="${block.id}">Remover</button></div>`).join('');
}

async function loadDay() {
  const date = agendaDate.value;
  if (!date) return;
  agendaTitle.textContent = formatDateLong(date);
  bookingList.innerHTML = '<div class="empty-state">Carregando agenda...</div>';
  blockList.innerHTML = '<div class="empty-state">Carregando bloqueios...</div>';
  try {
    const [overview, bookings, blocks] = await Promise.all([
      api.get(`/api/admin/overview?date=${encodeURIComponent(date)}`),
      api.get(`/api/admin/bookings?date=${encodeURIComponent(date)}`),
      api.get(`/api/admin/blocks?date=${encodeURIComponent(date)}`)
    ]);
    state.bookings = bookings.bookings;
    state.blocks = blocks.blocks;
    renderStats(overview.summary); renderBookings(); renderBlocks();
  } catch (error) {
    bookingList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    blockList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

async function loadSettings() {
  const [professionals, services, hours] = await Promise.all([
    api.get('/api/admin/professionals'), api.get('/api/admin/services'), api.get('/api/admin/opening-hours')
  ]);
  state.professionals = professionals.professionals;
  state.services = services.services;
  state.hours = hours.days;
  renderProfessionals(); renderServices(); renderHours();
}

async function cancelBooking(id, button) {
  if (!window.confirm('Cancelar este agendamento?')) return;
  button.disabled = true;
  try { await api.post(`/api/admin/bookings/${encodeURIComponent(id)}/cancel`, {}); await loadDay(); }
  catch (error) { alert(error.message); button.disabled = false; }
}
async function cancelBookingGroup(groupId, button) {
  if (!window.confirm('Cancelar todo este atendimento?')) return;
  button.disabled = true;
  try { await api.post(`/api/admin/booking-groups/${encodeURIComponent(groupId)}/cancel`, {}); await loadDay(); }
  catch (error) { alert(error.message); button.disabled = false; }
}
async function removeBlock(id, button) {
  if (!window.confirm('Remover este bloqueio?')) return;
  button.disabled = true;
  try { await api.post(`/api/admin/blocks/${encodeURIComponent(id)}/remove`, {}); await loadDay(); }
  catch (error) { alert(error.message); button.disabled = false; }
}

bookingList.addEventListener('click', (event) => {
  const cancelGroupButton = event.target.closest('[data-action="cancel-group"]');
  if (cancelGroupButton) return cancelBookingGroup(cancelGroupButton.dataset.groupId, cancelGroupButton);
  const cancelButton = event.target.closest('[data-action="cancel-booking"]');
  if (cancelButton) return cancelBooking(cancelButton.dataset.bookingId, cancelButton);
  const confirmWhatsappButton = event.target.closest('[data-action="confirm-whatsapp"]');
  if (confirmWhatsappButton) {
    const groupId = confirmWhatsappButton.dataset.groupId;
    const items = state.bookings.filter((booking) => (booking.groupId || booking.id) === groupId);
    const confirmedItems = items.filter((item) => item.status === 'confirmed');
    const first = confirmedItems[0];
    if (!first) return;

    const whatsapp = String(first.customerWhatsapp || '').replace(/\D/g, '');
    const message = buildConfirmationMessage(confirmedItems);
    openWhatsapp(whatsapp, message);
    return;
  }
  const waButton = event.target.closest('[data-action="open-whatsapp"]');
  if (waButton) openWhatsapp(waButton.dataset.phone);
});
blockList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="remove-block"]');
  if (button) removeBlock(button.dataset.blockId, button);
});

blockForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!blockForm.checkValidity()) return blockForm.reportValidity();
  const payload = Object.fromEntries(new FormData(blockForm).entries());
  payload.duration = Number(payload.duration);
  blockMessage.className = 'form-message'; blockMessage.textContent = 'Salvando bloqueio...';
  try {
    await api.post('/api/admin/blocks', payload);
    blockMessage.className = 'form-message success'; blockMessage.textContent = 'Horário bloqueado com sucesso.';
    blockForm.reset(); blockDate.value = agendaDate.value; await loadDay();
  } catch (error) { blockMessage.className = 'form-message error'; blockMessage.textContent = error.message; }
});

serviceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!serviceForm.checkValidity()) return serviceForm.reportValidity();
  serviceMessage.className = 'form-message'; serviceMessage.textContent = 'Cadastrando...';
  try {
    const payload = Object.fromEntries(new FormData(serviceForm).entries());
    await api.post('/api/admin/services', { name: payload.name, duration: Number(payload.duration), price: Number(payload.price) });
    serviceMessage.className = 'form-message success'; serviceMessage.textContent = 'Serviço cadastrado.';
    serviceForm.reset(); await loadSettings();
  } catch (error) { serviceMessage.className = 'form-message error'; serviceMessage.textContent = error.message; }
});

professionalForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!professionalForm.checkValidity()) return professionalForm.reportValidity();
  professionalMessage.className = 'form-message'; professionalMessage.textContent = 'Cadastrando...';
  try {
    const payload = Object.fromEntries(new FormData(professionalForm).entries());
    await api.post('/api/admin/professionals', payload);
    professionalMessage.className = 'form-message success'; professionalMessage.textContent = 'Profissional cadastrado.';
    professionalForm.reset(); await loadSettings();
  } catch (error) { professionalMessage.className = 'form-message error'; professionalMessage.textContent = error.message; }
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (form.matches('.config-edit-form')) {
    event.preventDefault();
    if (!form.checkValidity()) return form.reportValidity();
    const id = form.dataset.id;
    try {
      if (form.dataset.type === 'service-edit') {
        const data = Object.fromEntries(new FormData(form).entries());
        await api.put(`/api/admin/services/${encodeURIComponent(id)}`, { name: data.name, duration: Number(data.duration), price: Number(data.price) });
      } else {
        const data = Object.fromEntries(new FormData(form).entries());
        await api.put(`/api/admin/professionals/${encodeURIComponent(id)}`, { name: data.name, role: data.role });
      }
      await loadSettings();
    } catch (error) { alert(error.message); }
  }
  if (form.matches('.hours-row')) {
    event.preventDefault();
    const data = new FormData(form);
    try {
      const closed = data.get('closed') === 'on';
      await api.put(`/api/admin/opening-hours/${form.dataset.weekday}`, { closed, openTime: data.get('openTime'), closeTime: data.get('closeTime') });
      await loadSettings();
    } catch (error) { alert(error.message); }
  }
});

document.addEventListener('change', (event) => {
  if (event.target.matches('.hours-row [data-role="closed"]')) {
    const form = event.target.closest('.hours-row');
    const fields = form.querySelectorAll('.hours-fields input');
    fields.forEach((input) => { input.disabled = event.target.checked; input.required = !event.target.checked; });
    form.classList.toggle('is-closed', event.target.checked);
  }
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="toggle-service"], [data-action="toggle-professional"]');
  if (!button) return;
  const isService = button.dataset.action === 'toggle-service';
  const active = button.dataset.active === '1';
  if (!active && !window.confirm(`Ativar este ${isService ? 'serviço' : 'profissional'}?`)) return;
  if (active && !window.confirm(`Desativar este ${isService ? 'serviço' : 'profissional'}?`)) return;
  button.disabled = true;
  try {
    await api.post(`/api/admin/${isService ? 'services' : 'professionals'}/${encodeURIComponent(button.dataset.id)}/toggle`, { active });
    await loadSettings();
  } catch (error) { alert(error.message); button.disabled = false; }
});

agendaDate.addEventListener('change', loadDay);
professionalFilter.addEventListener('change', renderBookings);
statusFilter.addEventListener('change', renderBookings);
document.querySelector('#refresh-button').addEventListener('click', loadDay);
document.querySelector('#today-button').addEventListener('click', () => setSelectedDate(todayKey()));
document.querySelector('#previous-day').addEventListener('click', () => { const date = parseLocalDate(agendaDate.value); date.setDate(date.getDate() - 1); setSelectedDate(dateKey(date)); });
document.querySelector('#next-day').addEventListener('click', () => { const date = parseLocalDate(agendaDate.value); date.setDate(date.getDate() + 1); setSelectedDate(dateKey(date)); });
document.querySelector('#logout-button').addEventListener('click', async () => { try { await api.post('/api/admin/logout', {}); } finally { window.location.replace('/login.html'); } });

document.querySelectorAll('.admin-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.admin-tab').forEach((item) => item.classList.toggle('is-active', item === tab));
    document.querySelectorAll('.admin-view').forEach((view) => {
      const active = view.dataset.view === target;
      view.classList.toggle('is-active', active);
      view.hidden = !active;
    });
  });
});

(async function init() {
  const current = todayKey(); agendaDate.value = current; blockDate.value = current;
  try {
    const me = await api.get('/api/admin/me'); sessionUser.textContent = me.user.name || me.user.email;
    await Promise.all([loadDay(), loadSettings()]);
  } catch (error) {
    if (error.status !== 401) bookingList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
})();

