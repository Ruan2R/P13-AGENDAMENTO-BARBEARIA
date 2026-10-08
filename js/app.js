const serviceList = document.querySelector('#service-list');
const bookingFlow = document.querySelector('#booking-flow');
const professionalList = document.querySelector('#professional-list');
const dateList = document.querySelector('#date-list');
const timeList = document.querySelector('#time-list');
const summary = document.querySelector('#booking-summary');
const progressItems = [...document.querySelectorAll('.progress-item')];
const heroButtons = [...document.querySelectorAll('[data-start-booking]')];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

const state = {
  step: 1,
  service: null,
  professional: null,
  assignedProfessional: null,
  date: null,
  time: null,
  customer: { name: '', whatsapp: '' },
  confirmed: false,
  selectedSlot: null,
  availabilityByDate: new Map()
};

let services = [];
let professionals = [];

const API_BASE_URL = window.BOSS67_API_URL || (window.location.port === '3000' ? '' : 'http://localhost:3000');

const api = {
  async get(path) {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível consultar o servidor.');
    return data;
  },

  async post(path, body) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Não foi possível concluir o agendamento.');
      error.status = response.status;
      throw error;
    }
    return data;
  }
};

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit'
  }).format(date).replace(/^./, (char) => char.toUpperCase());
}

function formatDateLong(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long'
  }).format(date).replace(/^./, (char) => char.toUpperCase());
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextDates(total = 8) {
  const dates = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let offset = 0; dates.length < total && offset < 20; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    if (date.getDay() === 0) continue;
    dates.push(date);
  }
  return dates;
}

function getDisplayProfessional() {
  return state.assignedProfessional || state.professional;
}

function setStep(step) {
  state.step = step;
  document.querySelectorAll('.booking-step').forEach((section) => {
    section.hidden = Number(section.dataset.step) !== step || state.confirmed;
  });
  progressItems.forEach((item) => {
    const itemStep = Number(item.dataset.progress);
    item.classList.toggle('is-active', itemStep === Math.min(step, 4));
    item.classList.toggle('is-done', itemStep < step);
  });
  bookingFlow?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setLoading(container, message = 'Carregando...') {
  if (container) container.innerHTML = `<p class="empty-state">${message}</p>`;
}

async function loadInitialData() {
  try {
    const [serviceData, professionalData] = await Promise.all([
      api.get('/api/services'),
      api.get('/api/professionals')
    ]);
    services = serviceData.services.map((service) => ({
      ...service,
      price: Number(service.priceCents) / 100
    }));
    professionals = [
      ...professionalData.professionals,
      { id: 'sem-preferencia', name: 'Sem preferência', role: 'Qualquer profissional', initials: '?' }
    ];
    renderServices();
    renderProfessionals();
    setStep(1);
  } catch (error) {
    if (serviceList) {
      serviceList.innerHTML = `
        <div class="connection-state">
          <strong>Não conseguimos conectar à agenda.</strong>
          <p>Confira se o servidor está rodando e abra <code>http://localhost:3000</code>.</p>
          <button class="secondary-button connection-retry" type="button">Tentar novamente</button>
        </div>
      `;
      serviceList.querySelector('.connection-retry')?.addEventListener('click', loadInitialData);
    }
    setLoading(professionalList, 'Conecte o servidor para continuar o agendamento.');
    console.error(error);
  }
}

function renderServices() {
  if (!serviceList) return;
  serviceList.innerHTML = services.map((service) => `
    <article class="service-card" data-service-id="${service.id}">
      <div>
        <h3 class="service-name">${escapeHtml(service.name)}</h3>
        <p class="service-meta">Aproximadamente ${service.duration} min.</p>
        <p class="service-price">${formatCurrency(service.price)}</p>
      </div>
      <button class="service-action" type="button" data-action="select-service" data-service-id="${service.id}">Escolher</button>
    </article>
  `).join('');
}

function renderProfessionals() {
  if (!professionalList) return;
  professionalList.innerHTML = professionals.map((person) => `
    <button class="person-card" type="button" data-action="select-professional" data-professional-id="${person.id}">
      <span class="person-avatar">${escapeHtml(person.initials)}</span>
      <span class="person-copy"><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.role)}</small></span>
      <span class="choice-arrow">→</span>
    </button>
  `).join('');
}

async function fetchAvailability(date) {
  const key = dateKey(date);
  const cached = state.availabilityByDate.get(key);
  if (cached) return cached;

  const data = await api.get(`/api/availability?date=${encodeURIComponent(key)}&serviceId=${encodeURIComponent(state.service.id)}&professionalId=${encodeURIComponent(state.professional.id)}`);
  const normalized = {
    slots: Array.isArray(data.slots) ? data.slots : [],
    date: key,
    service: data.service,
    professionalId: data.professionalId
  };
  state.availabilityByDate.set(key, normalized);
  return normalized;
}

async function renderDates() {
  if (!dateList || !state.service || !state.professional) return;
  setLoading(dateList, 'Consultando disponibilidade...');

  const dates = getNextDates();
  const results = await Promise.allSettled(dates.map((date) => fetchAvailability(date)));

  dateList.innerHTML = dates.map((date, index) => {
    const result = results[index];
    const availability = result.status === 'fulfilled' ? result.value : { slots: [] };
    const hasAvailability = availability.slots.length > 0;
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '');
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '');

    return `
      <button class="date-card ${index === 0 ? 'is-today' : ''}" type="button"
        data-action="select-date" data-date="${date.toISOString()}" ${hasAvailability ? '' : 'disabled'}>
        <span>${index === 0 ? 'Hoje' : weekday}</span>
        <strong>${String(date.getDate()).padStart(2, '0')}</strong>
        <small>${month}</small>
        <em>${hasAvailability ? `${availability.slots.length} horários` : 'Sem horários'}</em>
      </button>
    `;
  }).join('');
}

async function renderTimes(date) {
  if (!timeList || !date) return;
  setLoading(timeList, 'Consultando horários...');

  try {
    const availability = await fetchAvailability(date);
    const slots = availability.slots;
    if (!slots.length) {
      timeList.innerHTML = '<p class="empty-state">Nenhum horário disponível nesta data para esta combinação.</p>';
      return;
    }

    timeList.innerHTML = slots.map((slot) => `
      <button class="time-card" type="button"
        data-action="select-time"
        data-time="${slot.time}"
        data-professional-id="${escapeHtml(slot.professionalId)}"
        data-professional-name="${escapeHtml(slot.professionalName)}">
        ${escapeHtml(slot.time)}
      </button>
    `).join('');
  } catch (error) {
    timeList.innerHTML = `<p class="empty-state">${error.message}</p>`;
  }
}

function updateSummary() {
  if (!summary || !state.service || !state.professional || !state.date || !state.time) return;
  const displayProfessional = getDisplayProfessional();
  summary.innerHTML = `
    <div class="summary-main">
      <span class="eyebrow">RESUMO</span>
      <h3>${escapeHtml(state.service.name)}</h3>
      <p>${escapeHtml(displayProfessional?.name || 'A definir')} • ${escapeHtml(formatDate(state.date))} às ${escapeHtml(state.time)}</p>
    </div>
    <strong class="summary-price">${formatCurrency(state.service.price)}</strong>
  `;
}

function updateReview() {
  const professional = getDisplayProfessional();
  document.querySelector('#confirmation-service').textContent = state.service?.name || '—';
  document.querySelector('#confirmation-professional').textContent = professional?.name || '—';
  document.querySelector('#confirmation-date').textContent = state.date ? formatDateLong(state.date) : '—';
  document.querySelector('#confirmation-time').textContent = state.time || '—';
  document.querySelector('#customer-name').textContent = state.customer.name || '—';
  document.querySelector('#customer-whatsapp').textContent = state.customer.whatsapp || '—';
}

function updateConfirmation() {
  document.querySelector('#final-service').textContent = state.service?.name || '—';
  document.querySelector('#final-professional').textContent = getDisplayProfessional()?.name || '—';
  document.querySelector('#final-date').textContent = state.date ? formatDateLong(state.date) : '—';
  document.querySelector('#final-time').textContent = state.time || '—';
  document.querySelector('#final-name').textContent = state.customer.name || '—';
  document.querySelector('#final-whatsapp').textContent = state.customer.whatsapp || '—';
}

function normalizePhone(value) {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function openWhatsApp() {
  const phone = normalizePhone(state.customer.whatsapp);
  const message = [
    'Olá! Gostaria de falar sobre meu agendamento na Boss67.',
    `Serviço: ${state.service.name}`,
    `Profissional: ${getDisplayProfessional().name}`,
    `Data: ${formatDateLong(state.date)}`,
    `Horário: ${state.time}`
  ].join('\n');
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

function downloadCalendarEvent() {
  const start = new Date(state.date);
  const [hours, minutes] = state.time.split(':').map(Number);
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + state.service.duration * 60 * 1000);
  const formatICS = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boss67//Agendamento//PT-BR',
    'BEGIN:VEVENT',
    `UID:boss67-${Date.now()}@agendamento`,
    `DTSTART:${formatICS(start)}`,
    `DTEND:${formatICS(end)}`,
    `SUMMARY:${state.service.name} — Boss67`,
    `DESCRIPTION:Agendamento com ${getDisplayProfessional().name} na Boss67 Barbearia.`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'agendamento-boss67.ics';
  link.click();
  URL.revokeObjectURL(url);
}

function startBooking() {
  document.querySelector('#servicos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

heroButtons.forEach((button) => button.addEventListener('click', startBooking));

serviceList?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="select-service"]');
  if (!button) return;
  state.service = services.find((item) => item.id === button.dataset.serviceId) || null;
  if (!state.service) return;

  state.professional = null;
  state.assignedProfessional = null;
  state.date = null;
  state.time = null;
  state.selectedSlot = null;
  state.availabilityByDate.clear();
  state.confirmed = false;

  document.querySelector('#selected-service-name').textContent = state.service.name;
  document.querySelector('#selected-service-price').textContent = formatCurrency(state.service.price);
  setStep(2);
});

professionalList?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="select-professional"]');
  if (!button) return;
  state.professional = professionals.find((item) => item.id === button.dataset.professionalId) || null;
  state.assignedProfessional = null;
  state.date = null;
  state.time = null;
  state.selectedSlot = null;
  state.availabilityByDate.clear();
  if (!state.professional) return;

  setStep(3);
  await renderDates();
});

dateList?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="select-date"]');
  if (!button || button.disabled) return;
  state.date = new Date(button.dataset.date);
  state.time = null;
  state.assignedProfessional = null;
  state.selectedSlot = null;

  document.querySelectorAll('.date-card').forEach((card) => card.classList.remove('is-selected'));
  button.classList.add('is-selected');
  document.querySelector('#selected-date-label').textContent = formatDate(state.date);
  await renderTimes(state.date);
});

timeList?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="select-time"]');
  if (!button) return;

  state.time = button.dataset.time;
  state.selectedSlot = {
    time: button.dataset.time,
    professionalId: button.dataset.professionalId,
    professionalName: button.dataset.professionalName
  };

  state.assignedProfessional = professionals.find((item) => item.id === button.dataset.professionalId) || {
    id: button.dataset.professionalId,
    name: button.dataset.professionalName,
    role: 'Profissional'
  };

  document.querySelectorAll('.time-card').forEach((card) => card.classList.remove('is-selected'));
  button.classList.add('is-selected');
  updateSummary();
  setStep(4);
});

document.querySelector('[data-action="back-professional"]')?.addEventListener('click', () => setStep(1));
document.querySelector('[data-action="back-date"]')?.addEventListener('click', () => setStep(2));
document.querySelector('[data-action="back-time"]')?.addEventListener('click', () => setStep(3));

document.querySelector('#customer-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  state.customer.name = form.elements.name.value.trim();
  state.customer.whatsapp = form.elements.whatsapp.value.trim();
  updateReview();
  setStep(5);
});

document.querySelector('[data-action="back-customer"]')?.addEventListener('click', () => setStep(4));

document.querySelector('#confirm-booking')?.addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const requestedProfessional = state.professional?.id;
  if (!state.service || !requestedProfessional || !state.date || !state.time) return;

  button.disabled = true;
  button.innerHTML = 'Confirmando... <span>↻</span>';

  try {
    const result = await api.post('/api/bookings', {
      serviceId: state.service.id,
      professionalId: requestedProfessional,
      date: dateKey(state.date),
      time: state.time,
      customerName: state.customer.name,
      customerWhatsapp: state.customer.whatsapp
    });

    const booking = result.booking;
    state.assignedProfessional = professionals.find((item) => item.id === booking.professionalId) || {
      id: booking.professionalId,
      name: booking.professionalName,
      role: 'Profissional'
    };
    state.confirmed = true;
    updateConfirmation();
    state.availabilityByDate.delete(dateKey(state.date));

    const review = document.querySelector('.booking-step[data-step="5"]');
    if (review) review.hidden = true;
    document.querySelector('#confirmation')?.removeAttribute('hidden');
    document.querySelector('.progress-item[data-progress="4"]')?.classList.add('is-done');
    document.querySelector('#confirmation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    alert(error.message);
    if (error.status === 409) {
      state.time = null;
      state.assignedProfessional = null;
      state.selectedSlot = null;
      state.availabilityByDate.delete(dateKey(state.date));
      setStep(3);
      await renderDates();
      await renderTimes(state.date);
    }
  } finally {
    button.disabled = false;
    button.innerHTML = 'Confirmar agendamento <span>✓</span>';
  }
});

document.querySelector('#calendar-button')?.addEventListener('click', downloadCalendarEvent);
document.querySelector('#whatsapp-button')?.addEventListener('click', openWhatsApp);

loadInitialData();
