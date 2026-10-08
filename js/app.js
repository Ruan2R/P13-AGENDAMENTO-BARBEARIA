const serviceList = document.querySelector('#service-list');
const bookingFlow = document.querySelector('#booking-flow');
const professionalList = document.querySelector('#professional-list');
const dateList = document.querySelector('#date-list');
const timeList = document.querySelector('#time-list');
const bookingFeedback = document.querySelector('#booking-feedback');
const summary = document.querySelector('#booking-summary');
const progressItems = [...document.querySelectorAll('.progress-item')];
const heroButtons = [...document.querySelectorAll('[data-start-booking]')];
const procedureList = document.querySelector('#procedure-list');
const timeContinueButton = document.querySelector('#continue-to-customer');

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
  items: [],
  currentItemIndex: null,
  selectionMode: 'first',
  date: null,
  customer: { name: '', whatsapp: '' },
  confirmed: false,
  groupId: null,
  bookings: [],
  availabilityByKey: new Map()
};

let nextItemId = 1;
let services = [];
let professionals = [];

const API_BASE_URL = window.BOSS67_API_URL || (window.location.port === '3000' ? '' : 'http://localhost:3000');

function showBookingFeedback(message, type = 'info') {
  if (!bookingFeedback) return;
  bookingFeedback.textContent = message;
  bookingFeedback.className = `booking-feedback ${type}`;
  bookingFeedback.hidden = false;
}

function clearBookingFeedback() {
  if (!bookingFeedback) return;
  bookingFeedback.textContent = '';
  bookingFeedback.className = 'booking-feedback';
  bookingFeedback.hidden = true;
}

function formatWhatsAppInput(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);

  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

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

function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

function overlaps(startA, durationA, startB, durationB) {
  const aStart = timeToMinutes(startA);
  const bStart = timeToMinutes(startB);
  return aStart < bStart + Number(durationB) && aStart + Number(durationA) > bStart;
}

function getItemProfessional(item) {
  return item.assignedProfessional || item.professional;
}

function getCurrentItem() {
  return Number.isInteger(state.currentItemIndex) ? state.items[state.currentItemIndex] : null;
}

function resetSchedulingFromDate() {
  state.date = null;
  state.items.forEach((item) => {
    item.time = null;
    item.selectedSlot = null;
    item.assignedProfessional = null;
  });
  state.availabilityByKey.clear();
}

function setStep(step) {
  state.step = step;
  document.querySelectorAll('.booking-step').forEach((section) => {
    section.hidden = Number(section.dataset.step) !== step || state.confirmed;
  });

  const progressStep = Math.min(step, 6);
  progressItems.forEach((item) => {
    const itemStep = Number(item.dataset.progress);
    item.classList.toggle('is-active', itemStep === progressStep);
    item.classList.toggle('is-done', itemStep < step);
  });

  bookingFlow?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setLoading(container, message = 'Carregando...') {
  if (container) container.innerHTML = `<p class="empty-state">${escapeHtml(message)}</p>`;
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
  const currentIds = new Set(state.items.map((item) => item.service.id));
  serviceList.innerHTML = services.map((service) => `
    <article class="service-card ${currentIds.has(service.id) ? 'is-in-cart' : ''}" data-service-id="${escapeHtml(service.id)}">
      <div>
        <h3 class="service-name">${escapeHtml(service.name)}</h3>
        <p class="service-meta">Aproximadamente ${service.duration} min.</p>
        <p class="service-price">${formatCurrency(service.price)}</p>
      </div>
      <button class="service-action" type="button" data-action="select-service" data-service-id="${escapeHtml(service.id)}">Escolher</button>
    </article>
  `).join('');

  const adding = state.selectionMode === 'adding';
  document.body.classList.toggle('is-adding-procedure', adding);
  document.querySelector('[data-action="back-to-procedures"]')?.toggleAttribute('hidden', !adding);
}

function renderProfessionals() {
  if (!professionalList) return;
  professionalList.innerHTML = professionals.map((person) => `
    <button class="person-card" type="button" data-action="select-professional" data-professional-id="${escapeHtml(person.id)}">
      <span class="person-avatar">${escapeHtml(person.initials)}</span>
      <span class="person-copy"><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.role)}</small></span>
      <span class="choice-arrow">→</span>
    </button>
  `).join('');
}

function renderProcedureReview() {
  if (!procedureList) return;

  procedureList.innerHTML = state.items.map((item, index) => {
    const professional = getItemProfessional(item);
    return `
      <article class="procedure-row">
        <div class="procedure-number">${String(index + 1).padStart(2, '0')}</div>
        <div class="procedure-copy">
          <strong>${escapeHtml(item.service.name)}</strong>
          <span>${escapeHtml(professional?.name || item.professional?.name || 'Profissional a definir')} • ${item.service.duration} min</span>
        </div>
        <strong class="procedure-price">${formatCurrency(item.service.price)}</strong>
        <div class="procedure-tools">
          <button class="procedure-edit" type="button" data-action="edit-procedure" data-index="${index}">Editar</button>
          ${state.items.length > 1 ? `<button class="procedure-remove" type="button" aria-label="Remover ${escapeHtml(item.service.name)}" data-action="remove-procedure" data-index="${index}">×</button>` : ''}
        </div>
      </article>
    `;
  }).join('');
}

function updateProfessionalHeading() {
  const item = getCurrentItem();
  const name = document.querySelector('#selected-service-name');
  const price = document.querySelector('#selected-service-price');
  if (!item) return;
  if (name) name.textContent = item.service.name;
  if (price) price.textContent = formatCurrency(item.service.price);
}

async function fetchAvailabilityForItem(item, date) {
  const key = `${item.id}:${dateKey(date)}`;
  const cached = state.availabilityByKey.get(key);
  if (cached) return cached;

  const data = await api.get(`/api/availability?date=${encodeURIComponent(dateKey(date))}&serviceId=${encodeURIComponent(item.service.id)}&professionalId=${encodeURIComponent(item.professional.id)}`);
  const normalized = {
    slots: Array.isArray(data.slots) ? data.slots : [],
    date: dateKey(date),
    service: data.service,
    professionalId: data.professionalId
  };
  state.availabilityByKey.set(key, normalized);
  return normalized;
}

async function renderDates() {
  if (!dateList || !state.items.length) return;
  setLoading(dateList, 'Consultando disponibilidade...');
  clearBookingFeedback();

  const dates = getNextDates();
  const results = await Promise.all(dates.map(async (date) => {
    const itemsResults = await Promise.allSettled(state.items.map((item) => fetchAvailabilityForItem(item, date)));
    const available = itemsResults.every((result) => result.status === 'fulfilled' && result.value.slots.length > 0);
    return { date, available, results: itemsResults };
  }));

  dateList.innerHTML = results.map(({ date, available }, index) => {
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '');
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '');

    return `
      <button class="date-card ${index === 0 ? 'is-today' : ''}" type="button"
        data-action="select-date" data-date="${date.toISOString()}" ${available ? '' : 'disabled'}>
        <span>${index === 0 ? 'Hoje' : weekday}</span>
        <strong>${String(date.getDate()).padStart(2, '0')}</strong>
        <small>${month}</small>
        <em>${available ? 'Disponível' : 'Sem horários'}</em>
      </button>
    `;
  }).join('');
}

function getSelectedTimesExcluding(index) {
  return state.items
    .filter((item, itemIndex) => itemIndex !== index && item.time)
    .map((item) => ({ time: item.time, duration: item.service.duration }));
}

async function getAvailableSlotsForItem(item, index) {
  const availability = await fetchAvailabilityForItem(item, state.date);
  const selectedTimes = getSelectedTimesExcluding(index);
  return availability.slots.filter((slot) => !selectedTimes.some((selected) => overlaps(slot.time, item.service.duration, selected.time, selected.duration)));
}

async function renderTimes() {
  if (!timeList || !state.date) return;
  setLoading(timeList, 'Consultando horários...');

  try {
    const rendered = await Promise.all(state.items.map(async (item, index) => {
      const slots = await getAvailableSlotsForItem(item, index);
      const selectedProfessional = getItemProfessional(item);

      return `
        <section class="multi-time-card">
          <div class="multi-time-heading">
            <div class="procedure-number">${String(index + 1).padStart(2, '0')}</div>
            <div>
              <strong>${escapeHtml(item.service.name)}</strong>
              <span>${escapeHtml(selectedProfessional?.name || item.professional.name)} • ${item.service.duration} min</span>
            </div>
            <span class="multi-time-selected">${item.time ? escapeHtml(item.time) : 'Escolha'}</span>
          </div>
          ${slots.length ? `
            <div class="time-grid">
              ${slots.map((slot) => `
                <button class="time-card ${item.time === slot.time ? 'is-selected' : ''}" type="button"
                  data-action="select-time" data-item-index="${index}" data-time="${escapeHtml(slot.time)}"
                  data-professional-id="${escapeHtml(slot.professionalId)}" data-professional-name="${escapeHtml(slot.professionalName)}">
                  ${escapeHtml(slot.time)}
                </button>
              `).join('')}
            </div>
          ` : '<p class="empty-state multi-time-empty">Nenhum horário disponível sem conflito com os outros procedimentos.</p>'}
        </section>
      `;
    }));

    timeList.innerHTML = rendered.join('');
    const allSelected = state.items.every((item) => item.time);
    if (timeContinueButton) timeContinueButton.disabled = !allSelected;
  } catch (error) {
    timeList.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
    showBookingFeedback(error.message, 'error');
  }
}

function updateCustomerSummary() {
  if (!summary) return;
  const total = state.items.reduce((sum, item) => sum + item.service.price, 0);
  const duration = state.items.reduce((sum, item) => sum + item.service.duration, 0);

  summary.innerHTML = `
    <div class="summary-main">
      <span class="eyebrow">RESUMO</span>
      <h3>${state.items.length} ${state.items.length === 1 ? 'procedimento' : 'procedimentos'}</h3>
      <p>${escapeHtml(formatDateLong(state.date))} • ${state.items.length > 1 ? `${duration} min de serviços` : `${duration} min`}</p>
    </div>
    <strong class="summary-price">${formatCurrency(total)}</strong>
  `;
}

function updateReview() {
  const reviewList = document.querySelector('#confirmation-items');
  if (reviewList) {
    reviewList.innerHTML = state.items.map((item, index) => {
      const professional = getItemProfessional(item);
      return `
        <div class="review-item">
          <div class="review-item-number">${String(index + 1).padStart(2, '0')}</div>
          <div>
            <strong>${escapeHtml(item.service.name)}</strong>
            <span>${escapeHtml(professional?.name || 'A definir')} • ${escapeHtml(item.time)}</span>
          </div>
          <strong>${formatCurrency(item.service.price)}</strong>
        </div>
      `;
    }).join('');
  }
  document.querySelector('#confirmation-date').textContent = state.date ? formatDateLong(state.date) : '—';
  document.querySelector('#customer-name').textContent = state.customer.name || '—';
  document.querySelector('#customer-whatsapp').textContent = state.customer.whatsapp || '—';
  const total = state.items.reduce((sum, item) => sum + item.service.price, 0);
  document.querySelector('#confirmation-total').textContent = formatCurrency(total);
}

function updateConfirmation() {
  document.querySelector('#final-name').textContent = state.customer.name || '—';
  document.querySelector('#final-whatsapp').textContent = state.customer.whatsapp || '—';
  const finalList = document.querySelector('#final-items');
  if (!finalList) return;
  finalList.innerHTML = state.bookings.map((booking) => `
    <div class="review-item">
      <div class="review-item-number">✓</div>
      <div>
        <strong>${escapeHtml(booking.serviceName)}</strong>
        <span>${escapeHtml(booking.professionalName)} • ${escapeHtml(formatDateLong(new Date(`${booking.date}T12:00:00`)))} • ${escapeHtml(booking.time)}</span>
      </div>
      <strong>${formatCurrency(Number(booking.priceCents) / 100)}</strong>
    </div>
  `).join('');
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function getBusinessWhatsApp() {
  return normalizePhone(window.BOSS67_CONFIG?.whatsapp || '5567998114192');
}

function getBookingTotal() {
  return state.bookings.reduce((sum, booking) => sum + Number(booking.priceCents || 0), 0) / 100;
}

function openWhatsApp() {
  const phone = getBusinessWhatsApp();
  const message = 'Olá, Boss67! Gostaria de falar sobre meu agendamento.';
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

function escapeICS(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function downloadCalendarEvent() {
  const events = state.bookings.map((booking) => {
    const start = new Date(`${booking.date}T${booking.time}:00`);
    const end = new Date(start.getTime() + Number(booking.duration) * 60 * 1000);
    const formatICSDate = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    return [
      'BEGIN:VEVENT',
      `UID:${escapeICS(`boss67-${booking.id}@agendamento`)}`,
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:${escapeICS(`${booking.serviceName} — Boss67`)}`,
      `DESCRIPTION:${escapeICS(`Agendamento com ${booking.professionalName} na Boss67 Barbearia.`)}`,
      'END:VEVENT'
    ].join('\r\n');
  });

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boss67//Agendamento//PT-BR',
    'CALSCALE:GREGORIAN',
    ...events,
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

  const service = services.find((item) => item.id === button.dataset.serviceId);
  if (!service) return;

  if (state.selectionMode === 'editing' && Number.isInteger(state.currentItemIndex) && state.items[state.currentItemIndex]) {
    const item = state.items[state.currentItemIndex];
    item.service = service;
    item.professional = null;
    item.assignedProfessional = null;
    item.date = null;
    item.time = null;
    item.selectedSlot = null;
  } else {
    const item = {
      id: nextItemId++,
      service,
      professional: null,
      assignedProfessional: null,
      date: null,
      time: null,
      selectedSlot: null
    };

    state.items.push(item);
    state.currentItemIndex = state.items.length - 1;
  }

  state.confirmed = false;
  resetSchedulingFromDate();
  clearBookingFeedback();
  renderServices();
  updateProfessionalHeading();
  setStep(2);
});

professionalList?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="select-professional"]');
  if (!button) return;

  const item = getCurrentItem();
  const professional = professionals.find((person) => person.id === button.dataset.professionalId);
  if (!item || !professional) return;

  item.professional = professional;
  item.assignedProfessional = null;
  state.selectionMode = 'first';
  resetSchedulingFromDate();
  renderProcedureReview();
  setStep(3);
});

document.querySelector('[data-action="back-professional"]')?.addEventListener('click', () => {
  const index = state.currentItemIndex;

  if (state.selectionMode === 'editing') {
    state.currentItemIndex = null;
    state.selectionMode = 'first';
    renderProcedureReview();
    renderServices();
    setStep(3);
    return;
  }

  if (Number.isInteger(index) && state.items[index] && !state.items[index].professional) {
    state.items.splice(index, 1);
  }

  state.currentItemIndex = null;
  state.selectionMode = 'first';
  renderServices();
  setStep(1);
});

document.querySelector('[data-action="back-to-procedures"]')?.addEventListener('click', () => {
  state.currentItemIndex = null;
  state.selectionMode = 'first';
  renderProcedureReview();
  renderServices();
  setStep(3);
});

document.querySelector('[data-action="back-from-procedure-review"]')?.addEventListener('click', () => {
  if (!state.items.length) {
    state.currentItemIndex = null;
    renderServices();
    setStep(1);
    return;
  }

  state.currentItemIndex = state.items.length - 1;
  state.selectionMode = 'first';
  updateProfessionalHeading();
  setStep(2);
});

procedureList?.addEventListener('click', (event) => {
  const edit = event.target.closest('[data-action="edit-procedure"]');
  if (edit) {
    const index = Number(edit.dataset.index);
    if (!Number.isInteger(index) || !state.items[index]) return;

    state.currentItemIndex = index;
    state.selectionMode = 'editing';
    clearBookingFeedback();
    renderServices();
    updateProfessionalHeading();
    setStep(1);
    return;
  }

  const remove = event.target.closest('[data-action="remove-procedure"]');
  if (!remove) return;
  const index = Number(remove.dataset.index);
  if (!Number.isInteger(index) || state.items.length <= 1) return;

  const removedName = state.items[index].service.name;
  state.items.splice(index, 1);
  state.currentItemIndex = null;
  state.selectionMode = 'first';
  resetSchedulingFromDate();
  renderProcedureReview();
  renderServices();
  showBookingFeedback(`${removedName} removido. Você pode adicionar outro ou continuar.`, 'success');
});

document.querySelector('[data-action="add-procedure"]')?.addEventListener('click', () => {
  state.selectionMode = 'adding';
  state.currentItemIndex = null;
  renderServices();
  setStep(1);
});

document.querySelector('[data-action="continue-to-date"]')?.addEventListener('click', async () => {
  if (!state.items.length || state.items.some((item) => !item.professional)) return;
  state.selectionMode = 'first';
  setStep(4);
  await renderDates();
});

dateList?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="select-date"]');
  if (!button || button.disabled) return;

  state.date = new Date(button.dataset.date);
  state.items.forEach((item) => {
    item.date = state.date;
    item.time = null;
    item.selectedSlot = null;
    item.assignedProfessional = null;
  });
  state.availabilityByKey.clear();

  document.querySelectorAll('.date-card').forEach((card) => card.classList.remove('is-selected'));
  button.classList.add('is-selected');
  document.querySelector('#selected-date-label').textContent = formatDate(state.date);
  setStep(5);
  await renderTimes();
});

timeList?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="select-time"]');
  if (!button) return;

  const index = Number(button.dataset.itemIndex);
  const item = state.items[index];
  if (!item || !state.date) return;

  item.time = button.dataset.time;
  item.selectedSlot = {
    time: button.dataset.time,
    professionalId: button.dataset.professionalId,
    professionalName: button.dataset.professionalName
  };
  item.assignedProfessional = professionals.find((person) => person.id === button.dataset.professionalId) || {
    id: button.dataset.professionalId,
    name: button.dataset.professionalName,
    role: 'Profissional'
  };

  clearBookingFeedback();
  await renderTimes();
});

document.querySelector('[data-action="back-date"]')?.addEventListener('click', () => {
  renderProcedureReview();
  setStep(3);
});

document.querySelector('[data-action="back-time"]')?.addEventListener('click', () => {
  setStep(4);
  renderDates();
});

timeContinueButton?.addEventListener('click', () => {
  if (!state.items.every((item) => item.time)) {
    showBookingFeedback('Escolha um horário para cada procedimento.', 'error');
    return;
  }
  updateCustomerSummary();
  setStep(6);
});

document.querySelector('#customer-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  state.customer.name = form.elements.name.value.trim();
  state.customer.whatsapp = form.elements.whatsapp.value.trim();
  clearBookingFeedback();
  updateReview();
  setStep(7);
});

document.querySelector('[data-action="back-customer"]')?.addEventListener('click', () => setStep(5));

document.querySelector('[data-action="back-review-customer"]')?.addEventListener('click', () => setStep(6));

document.querySelector('[data-action="back-to-procedure-review"]')?.addEventListener('click', () => {
  state.currentItemIndex = null;
  state.selectionMode = 'first';
  renderProcedureReview();
  renderServices();
  setStep(3);
});

document.querySelector('#confirm-booking')?.addEventListener('click', async (event) => {
  const button = event.currentTarget;
  if (!state.items.length || !state.date || !state.items.every((item) => item.time) || !state.customer.name || !state.customer.whatsapp) return;

  button.disabled = true;
  button.innerHTML = 'Confirmando... <span>↻</span>';

  try {
    const result = await api.post('/api/bookings/batch', {
      date: dateKey(state.date),
      customerName: state.customer.name,
      customerWhatsapp: state.customer.whatsapp,
      bookings: state.items.map((item) => ({
        serviceId: item.service.id,
        professionalId: item.professional.id,
        date: dateKey(state.date),
        time: item.time
      }))
    });

    state.bookings = result.bookings || [];
    state.groupId = result.groupId || null;
    state.bookings.forEach((booking, index) => {
      const item = state.items[index];
      if (!item) return;
      item.assignedProfessional = professionals.find((person) => person.id === booking.professionalId) || {
        id: booking.professionalId,
        name: booking.professionalName,
        role: 'Profissional'
      };
      item.professional = item.professional.id === 'sem-preferencia' ? item.professional : item.professional;
    });

    state.confirmed = true;
    state.availabilityByKey.clear();
    updateConfirmation();
    document.querySelector('#confirmation')?.removeAttribute('hidden');
    document.querySelector('.progress-item[data-progress="6"]')?.classList.add('is-done');
    document.querySelector('#confirmation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    if (error.status === 409) {
      showBookingFeedback(error.message || 'Um dos horários acabou de ser ocupado. Atualize a disponibilidade e escolha novamente.', 'error');
      setStep(5);
      await renderTimes();
    } else {
      showBookingFeedback(error.message || 'Não foi possível confirmar o agendamento. Tente novamente.', 'error');
    }
  } finally {
    button.disabled = false;
    button.innerHTML = 'Confirmar agendamento <span>✓</span>';
  }
});

document.querySelector('#calendar-button')?.addEventListener('click', downloadCalendarEvent);
document.querySelector('#whatsapp-button')?.addEventListener('click', openWhatsApp);

const whatsappInput = document.querySelector('#customer-form input[name="whatsapp"]');
whatsappInput?.addEventListener('input', () => {
  whatsappInput.value = formatWhatsAppInput(whatsappInput.value);
});

loadInitialData();
