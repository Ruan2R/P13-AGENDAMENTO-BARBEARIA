const serviceList = document.querySelector('#service-list');
const bookingFlow = document.querySelector('#booking-flow');
const professionalList = document.querySelector('#professional-list');
const dateList = document.querySelector('#date-list');
const timeList = document.querySelector('#time-list');
const summary = document.querySelector('#booking-summary');
const progressItems = [...document.querySelectorAll('.progress-item')];
const heroButtons = [...document.querySelectorAll('[data-start-booking]')];

const state = {
  step: 1,
  service: null,
  professional: null,
  date: null,
  time: null,
  customer: { name: '', whatsapp: '' },
  confirmed: false
};

const STORAGE_KEY = 'boss67-bookings-v1';

function loadBookings() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function isBookedForProfessional(professionalId, date, time, duration) {
  const candidateStart = timeToMinutes(time);
  const candidateEnd = candidateStart + duration;
  const day = dateKey(date);

  return loadBookings().some((booking) => {
    if (booking.date !== day || booking.professionalId !== professionalId) return false;
    const bookingStart = timeToMinutes(booking.time);
    const bookingEnd = bookingStart + Number(booking.duration || 0);
    return candidateStart < bookingEnd && candidateEnd > bookingStart;
  });
}

function professionalCanTakeSlot(professionalId, date, time) {
  return professionalId !== 'sem-preferencia' &&
    !isBlockedForProfessional(professionalId, date.getDay(), time) &&
    !isBookedForProfessional(professionalId, date, time, state.service.duration);
}

function findAvailableProfessional(date, time) {
  return professionals.find((person) => professionalCanTakeSlot(person.id, date, time)) || null;
}

function getDisplayProfessional() {
  return state.assignedProfessional || state.professional;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
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

function getNextDates(total = 8) {
  const dates = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let offset = 0; dates.length < total && offset < 16; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    if (!openingHours[date.getDay()]) continue;
    dates.push(date);
  }
  return dates;
}

function timeToMinutes(time) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function buildOpeningSlots(day, duration) {
  const hours = openingHours[day];
  if (!hours) return [];

  const slots = [];
  const closing = timeToMinutes(hours.close);
  for (let start = timeToMinutes(hours.open); start + duration <= closing; start += 30) {
    slots.push(minutesToTime(start));
  }
  return slots;
}

function availableTimesFor(date) {
  if (!date || !state.service || !state.professional) return [];

  const baseSlots = buildOpeningSlots(date.getDay(), state.service.duration);
  const professionalId = state.professional.id;

  if (professionalId === 'sem-preferencia') {
    return baseSlots.filter((time) => Boolean(findAvailableProfessional(date, time)));
  }

  return baseSlots.filter((time) => professionalCanTakeSlot(professionalId, date, time));
}

function isBlockedForProfessional(professionalId, day, time) {
  return Boolean(blockedSlotsByProfessional[professionalId]?.[day]?.includes(time));
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

function renderServices() {
  if (!serviceList) return;
  serviceList.innerHTML = services.map((service) => `
    <article class="service-card" data-service-id="${service.id}">
      <div>
        <h3 class="service-name">${service.name}</h3>
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
      <span class="person-avatar">${person.initials}</span>
      <span class="person-copy"><strong>${person.name}</strong><small>${person.role}</small></span>
      <span class="choice-arrow">→</span>
    </button>
  `).join('');
}

function renderDates() {
  if (!dateList) return;
  const dates = getNextDates();
  dateList.innerHTML = dates.map((date, index) => {
    const hasAvailability = availableTimesFor(date).length > 0;
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '');
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '');

    return `
      <button class="date-card ${index === 0 ? 'is-today' : ''}" type="button"
        data-action="select-date" data-date="${date.toISOString()}" ${hasAvailability ? '' : 'disabled'}>
        <span>${index === 0 ? 'Hoje' : weekday}</span>
        <strong>${date.getDate().toString().padStart(2, '0')}</strong>
        <small>${month}</small>
        <em>${hasAvailability ? 'Disponível' : 'Sem horários'}</em>
      </button>
    `;
  }).join('');
}

function renderTimes(date) {
  if (!timeList || !date) return;
  const times = availableTimesFor(date);
  timeList.innerHTML = times.length
    ? times.map((time) => `<button class="time-card" type="button" data-action="select-time" data-time="${time}">${time}</button>`).join('')
    : '<p class="empty-state">Nenhum horário disponível nesta data para esta combinação.</p>';
}

function updateSummary() {
  if (!summary || !state.service || !state.professional || !state.date || !state.time) return;

  const displayProfessional = getDisplayProfessional();
  summary.innerHTML = `
    <div class="summary-main">
      <span class="eyebrow">RESUMO</span>
      <h3>${state.service.name}</h3>
      <p>${displayProfessional?.name || 'A definir'} • ${formatDate(state.date)} às ${state.time}</p>
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
    `Profissional: ${state.professional.name}`,
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
    `DESCRIPTION:Agendamento com ${state.professional.name} na Boss67 Barbearia.`,
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
  state.confirmed = false;
  document.querySelector('#selected-service-name').textContent = state.service.name;
  document.querySelector('#selected-service-price').textContent = formatCurrency(state.service.price);
  setStep(2);
});

professionalList?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="select-professional"]');
  if (!button) return;
  state.professional = professionals.find((item) => item.id === button.dataset.professionalId) || null;
  state.assignedProfessional = null;
  state.date = null;
  state.time = null;
  renderDates();
  setStep(3);
});

dateList?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="select-date"]');
  if (!button || button.disabled) return;
  state.date = new Date(button.dataset.date);
  state.time = null;
  document.querySelectorAll('.date-card').forEach((card) => card.classList.remove('is-selected'));
  button.classList.add('is-selected');
  renderTimes(state.date);
  document.querySelector('#selected-date-label').textContent = formatDate(state.date);
});

timeList?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="select-time"]');
  if (!button) return;
  state.time = button.dataset.time;
  state.assignedProfessional = state.professional?.id === 'sem-preferencia'
    ? findAvailableProfessional(state.date, state.time)
    : state.professional;
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

document.querySelector('#confirm-booking')?.addEventListener('click', () => {
  const professional = getDisplayProfessional();
  if (!state.service || !professional || !state.date || !state.time) return;

  if (!professionalCanTakeSlot(professional.id, state.date, state.time)) {
    alert('Esse horário acabou de ser reservado. Escolha outro horário disponível.');
    state.time = null;
    renderDates();
    document.querySelector('#selected-date-label').textContent = formatDate(state.date);
    renderTimes(state.date);
    setStep(3);
    return;
  }

  const bookings = loadBookings();
  bookings.push({
    id: `boss67-${Date.now()}`,
    serviceId: state.service.id,
    serviceName: state.service.name,
    duration: state.service.duration,
    professionalId: professional.id,
    professionalName: professional.name,
    date: dateKey(state.date),
    time: state.time,
    customerName: state.customer.name,
    customerWhatsapp: state.customer.whatsapp,
    createdAt: new Date().toISOString()
  });
  saveBookings(bookings);

  state.confirmed = true;
  updateConfirmation();
  const review = document.querySelector('.booking-step[data-step="5"]');
  if (review) review.hidden = true;
  document.querySelector('#confirmation')?.removeAttribute('hidden');
  document.querySelector('.progress-item[data-progress="4"]')?.classList.add('is-done');
  document.querySelector('#confirmation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('#calendar-button')?.addEventListener('click', downloadCalendarEvent);
document.querySelector('#whatsapp-button')?.addEventListener('click', openWhatsApp);

window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY || !state.date || state.confirmed) return;
  renderDates();
  renderTimes(state.date);
});

renderServices();
renderProfessionals();
setStep(1);
