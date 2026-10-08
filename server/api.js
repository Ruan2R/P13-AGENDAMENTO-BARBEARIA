const crypto = require('node:crypto');
const { db } = require('./db');
const { ensureAdminUser, login, logout, requireAdmin } = require('./auth');

const BUSINESS_TIME_ZONE = process.env.BOSS67_TIMEZONE || 'America/Campo_Grande';

ensureAdminUser();

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS'
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 100_000) {
        req.destroy();
        reject(new Error('Payload muito grande.'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(total) {
  const hours = Math.floor(total / 60).toString().padStart(2, '0');
  const minutes = (total % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function isValidDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isValidTime(time) {
  if (!/^\d{2}:\d{2}$/.test(String(time))) return false;
  const [hours, minutes] = String(time).split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function getWeekday(date) {
  return new Date(`${date}T12:00:00`).getDay();
}

function getBusinessClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute)
  };
}

function isPastSlot(date, startTime) {
  const now = getBusinessClock();
  const slotMinutes = timeToMinutes(startTime);

  return date < now.date || (date === now.date && slotMinutes <= now.minutes);
}

function openingForDate(date) {
  return db.prepare(`SELECT open_time AS open, close_time AS close FROM opening_hours WHERE weekday = ?`).get(getWeekday(date));
}

function getService(serviceId) {
  return db.prepare(`SELECT id, name, duration, price_cents FROM services WHERE id = ? AND active = 1`).get(serviceId);
}

function getProfessional(professionalId) {
  return db.prepare(`SELECT id, name, role, initials FROM professionals WHERE id = ? AND active = 1`).get(professionalId);
}

function overlaps(startA, durationA, startB, durationB) {
  const aStart = timeToMinutes(startA);
  const aEnd = aStart + Number(durationA);
  const bStart = timeToMinutes(startB);
  const bEnd = bStart + Number(durationB);
  return aStart < bEnd && aEnd > bStart;
}

function isWithinOpening(date, startTime, duration) {
  const opening = openingForDate(date);
  if (!opening) return false;
  const start = timeToMinutes(startTime);
  const end = start + Number(duration);
  return start >= timeToMinutes(opening.open) && end <= timeToMinutes(opening.close);
}

function isBlocked(professionalId, date, startTime, duration) {
  const rows = db.prepare(`SELECT start_time, duration FROM professional_blocks WHERE professional_id = ? AND date = ?`).all(professionalId, date);
  return rows.some((block) => overlaps(startTime, duration, block.start_time, block.duration));
}

function isBooked(professionalId, date, startTime, duration) {
  const rows = db.prepare(`
    SELECT start_time, duration
    FROM bookings
    WHERE professional_id = ? AND date = ? AND status IN ('confirmed', 'pending')
  `).all(professionalId, date);
  return rows.some((booking) => overlaps(startTime, duration, booking.start_time, booking.duration));
}

function buildSlots(date, service, professionalId) {
  const opening = openingForDate(date);
  if (!opening) return [];
  const slots = [];
  const open = timeToMinutes(opening.open);
  const close = timeToMinutes(opening.close);
  for (let start = open; start + service.duration <= close; start += 30) {
    const time = minutesToTime(start);
    if (isPastSlot(date, time)) continue;
    if (isBlocked(professionalId, date, time, service.duration)) continue;
    if (isBooked(professionalId, date, time, service.duration)) continue;
    slots.push(time);
  }
  return slots;
}

function getAvailability(searchParams) {
  const date = searchParams.get('date');
  const serviceId = searchParams.get('serviceId');
  const professionalId = searchParams.get('professionalId');
  if (!date || !serviceId || !professionalId || !isValidDate(date)) {
    return { status: 400, body: { error: 'date, serviceId e professionalId são obrigatórios.' } };
  }
  const service = getService(serviceId);
  if (!service) return { status: 404, body: { error: 'Serviço não encontrado.' } };

  if (professionalId === 'sem-preferencia') {
    const candidates = db.prepare(`SELECT id, name, role FROM professionals WHERE active = 1 ORDER BY rowid`).all();
    const merged = new Map();
    candidates.forEach((person) => {
      buildSlots(date, service, person.id).forEach((time) => {
        if (!merged.has(time)) merged.set(time, { time, professionalId: person.id, professionalName: person.name });
      });
    });
    return { status: 200, body: { date, service, professionalId, slots: [...merged.values()].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)) } };
  }

  const professional = getProfessional(professionalId);
  if (!professional) return { status: 404, body: { error: 'Profissional não encontrado.' } };
  return {
    status: 200,
    body: {
      date,
      service,
      professionalId,
      professionalName: professional.name,
      slots: buildSlots(date, service, professionalId).map((time) => ({ time, professionalId, professionalName: professional.name }))
    }
  };
}

function createBooking(payload) {
  const { serviceId, professionalId, date, time, customerName, customerWhatsapp } = payload;
  const name = String(customerName || '').trim();
  const whatsappDigits = String(customerWhatsapp || '').replace(/\D/g, '');
  if (!serviceId || !professionalId || !date || !time || !name || !whatsappDigits) {
    return { status: 400, body: { error: 'Preencha serviço, profissional, data, horário, nome e WhatsApp.' } };
  }
  if (!isValidDate(date) || !isValidTime(time)) return { status: 400, body: { error: 'Data ou horário inválido.' } };

  if (name.length < 2 || name.length > 80) {
    return { status: 400, body: { error: 'Informe um nome válido.' } };
  }

  if (!/^\d{10,13}$/.test(whatsappDigits)) {
    return { status: 400, body: { error: 'Informe um WhatsApp válido.' } };
  }

  const whatsapp = whatsappDigits.startsWith('55') ? whatsappDigits : `55${whatsappDigits}`;

  if (isPastSlot(date, time)) {
    return { status: 409, body: { error: 'Esse horário já passou. Escolha outro horário.' } };
  }

  const service = getService(serviceId);
  if (!service) return { status: 404, body: { error: 'Serviço não encontrado.' } };

  let assigned = getProfessional(professionalId);
  const requestedProfessionalId = professionalId;
  if (professionalId === 'sem-preferencia') {
    const candidates = db.prepare(`SELECT id, name, role FROM professionals WHERE active = 1 ORDER BY id`).all();
    assigned = candidates.find((person) => isWithinOpening(date, time, service.duration) && !isBlocked(person.id, date, time, service.duration) && !isBooked(person.id, date, time, service.duration)) || null;
    if (!assigned) return { status: 409, body: { error: 'Esse horário não está mais disponível.' } };
  } else if (!assigned) {
    return { status: 404, body: { error: 'Profissional não encontrado.' } };
  }

  if (!isWithinOpening(date, time, service.duration)) return { status: 409, body: { error: 'Esse horário está fora do horário de funcionamento.' } };

  db.exec('BEGIN IMMEDIATE');
  try {
    if (isBlocked(assigned.id, date, time, service.duration) || isBooked(assigned.id, date, time, service.duration)) {
      db.exec('ROLLBACK');
      return { status: 409, body: { error: 'Esse horário acabou de ser reservado. Escolha outro horário.' } };
    }

    const booking = {
      id: crypto.randomUUID(),
      serviceId: service.id,
      serviceName: service.name,
      priceCents: service.price_cents,
      duration: service.duration,
      requestedProfessionalId,
      professionalId: assigned.id,
      professionalName: assigned.name,
      date,
      time,
      customerName: name,
      customerWhatsapp: whatsapp,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    db.prepare(`
      INSERT INTO bookings (
        id, service_id, professional_id, date, start_time, duration,
        customer_name, customer_whatsapp, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(booking.id, booking.serviceId, booking.professionalId, booking.date, booking.time, booking.duration, booking.customerName, booking.customerWhatsapp, booking.status, booking.createdAt);

    db.exec('COMMIT');
    return { status: 201, body: { booking } };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function getAdminBookings(searchParams) {
  const date = searchParams.get('date');
  if (!date || !isValidDate(date)) return { status: 400, body: { error: 'date válido é obrigatório.' } };
  const professionalId = searchParams.get('professionalId');
  const status = searchParams.get('status');
  const params = [date];
  const where = ['b.date = ?'];
  if (professionalId && professionalId !== 'all') { where.push('b.professional_id = ?'); params.push(professionalId); }
  if (status && status !== 'all') { where.push('b.status = ?'); params.push(status); }
  const bookings = db.prepare(`
    SELECT b.id, b.service_id AS serviceId, s.name AS serviceName, s.price_cents AS priceCents,
      b.professional_id AS professionalId, p.name AS professionalName, p.initials AS professionalInitials,
      b.date, b.start_time AS startTime, b.duration, b.customer_name AS customerName,
      b.customer_whatsapp AS customerWhatsapp, b.status, b.created_at AS createdAt
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    JOIN professionals p ON p.id = b.professional_id
    WHERE ${where.join(' AND ')}
    ORDER BY b.start_time ASC
  `).all(...params);
  return { status: 200, body: { date, bookings } };
}

function countFreeHalfHourSlots(date) {
  const opening = openingForDate(date);
  if (!opening) return 0;
  const open = timeToMinutes(opening.open);
  const close = timeToMinutes(opening.close);
  const professionals = db.prepare(`SELECT id FROM professionals WHERE active = 1`).all();
  let free = 0;
  for (const person of professionals) {
    for (let start = open; start + 30 <= close; start += 30) {
      const time = minutesToTime(start);
      if (!isBlocked(person.id, date, time, 30) && !isBooked(person.id, date, time, 30)) free += 1;
    }
  }
  return free;
}

function getAdminOverview(searchParams) {
  const date = searchParams.get('date');
  if (!date || !isValidDate(date)) return { status: 400, body: { error: 'date válido é obrigatório.' } };
  const row = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
      COALESCE(SUM(CASE WHEN status = 'confirmed' THEN s.price_cents ELSE 0 END), 0) AS revenueCents
    FROM bookings b JOIN services s ON s.id = b.service_id WHERE b.date = ?
  `).get(date);
  return { status: 200, body: { date, summary: {
    total: Number(row.total || 0), confirmed: Number(row.confirmed || 0), cancelled: Number(row.cancelled || 0),
    revenueCents: Number(row.revenueCents || 0), availableSlots: countFreeHalfHourSlots(date)
  } } };
}

function getAdminBlocks(searchParams) {
  const date = searchParams.get('date');
  if (!date || !isValidDate(date)) return { status: 400, body: { error: 'date válido é obrigatório.' } };
  const blocks = db.prepare(`
    SELECT b.id, b.professional_id AS professionalId, p.name AS professionalName, b.date,
      b.start_time AS startTime, b.duration, b.reason
    FROM professional_blocks b JOIN professionals p ON p.id = b.professional_id
    WHERE b.date = ? ORDER BY b.start_time ASC, p.name ASC
  `).all(date);
  return { status: 200, body: { date, blocks } };
}

function cancelAdminBooking(bookingId) {
  if (!bookingId) return { status: 400, body: { error: 'ID do agendamento é obrigatório.' } };
  const booking = db.prepare(`SELECT id, status FROM bookings WHERE id = ?`).get(bookingId);
  if (!booking) return { status: 404, body: { error: 'Agendamento não encontrado.' } };
  if (booking.status === 'cancelled') return { status: 200, body: { message: 'Agendamento já estava cancelado.' } };
  db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(bookingId);
  return { status: 200, body: { message: 'Agendamento cancelado com sucesso.', bookingId } };
}

function createAdminBlock(payload) {
  const { professionalId, date, startTime, duration, reason = '' } = payload || {};
  const numericDuration = Number(duration);
  if (!professionalId || !date || !startTime || !numericDuration) return { status: 400, body: { error: 'Preencha profissional, data, início e duração.' } };
  if (professionalId === 'sem-preferencia' || !isValidDate(date) || !isValidTime(startTime)) return { status: 400, body: { error: 'Profissional, data ou horário inválido.' } };
  const professional = getProfessional(professionalId);
  if (!professional) return { status: 404, body: { error: 'Profissional não encontrado.' } };
  if (!isWithinOpening(date, startTime, numericDuration)) return { status: 409, body: { error: 'O bloqueio precisa estar dentro do horário de funcionamento.' } };
  if (isBooked(professionalId, date, startTime, numericDuration)) return { status: 409, body: { error: 'Esse período já possui um agendamento confirmado.' } };
  if (isBlocked(professionalId, date, startTime, numericDuration)) return { status: 409, body: { error: 'Esse período já está bloqueado.' } };
  const result = db.prepare(`INSERT INTO professional_blocks (professional_id, date, start_time, duration, reason) VALUES (?, ?, ?, ?, ?)`).run(professionalId, date, startTime, numericDuration, String(reason).trim());
  return { status: 201, body: { block: { id: Number(result.lastInsertRowid), professionalId, professionalName: professional.name, date, startTime, duration: numericDuration, reason: String(reason).trim() } } };
}

function removeAdminBlock(blockId) {
  if (!blockId) return { status: 400, body: { error: 'ID do bloqueio é obrigatório.' } };
  const block = db.prepare(`SELECT id FROM professional_blocks WHERE id = ?`).get(blockId);
  if (!block) return { status: 404, body: { error: 'Bloqueio não encontrado.' } };
  db.prepare(`DELETE FROM professional_blocks WHERE id = ?`).run(blockId);
  return { status: 200, body: { message: 'Bloqueio removido com sucesso.', blockId: Number(blockId) } };
}

function slugify(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
}

function makeUniqueId(table, base) {
  let id = base;
  let counter = 2;
  while (db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id)) id = `${base}-${counter++}`;
  return id;
}

function toInitials(name) {
  return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?';
}

function getAdminServices() {
  return { status: 200, body: { services: db.prepare(`SELECT id, name, duration, price_cents AS priceCents, active FROM services ORDER BY rowid`).all() } };
}

function validateServicePayload(payload) {
  const name = String(payload.name || '').trim();
  const duration = Number(payload.duration);
  const priceCents = payload.priceCents !== undefined ? Number(payload.priceCents) : Math.round(Number(payload.price || 0) * 100);
  if (!name) return { error: 'Nome do serviço é obrigatório.' };
  if (!Number.isInteger(duration) || duration < 5 || duration > 240) return { error: 'A duração deve estar entre 5 e 240 minutos.' };
  if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 1000000) return { error: 'Preço inválido.' };
  return { name, duration, priceCents };
}

function createAdminService(payload) {
  const data = validateServicePayload(payload);
  if (data.error) return { status: 400, body: { error: data.error } };
  const id = makeUniqueId('services', slugify(data.name));
  db.prepare(`INSERT INTO services (id, name, duration, price_cents, active) VALUES (?, ?, ?, ?, 1)`).run(id, data.name, data.duration, data.priceCents);
  return { status: 201, body: { service: { id, ...data, active: 1 } } };
}

function updateAdminService(id, payload) {
  const existing = db.prepare(`SELECT id FROM services WHERE id = ?`).get(id);
  if (!existing) return { status: 404, body: { error: 'Serviço não encontrado.' } };
  const data = validateServicePayload(payload);
  if (data.error) return { status: 400, body: { error: data.error } };
  db.prepare(`UPDATE services SET name = ?, duration = ?, price_cents = ? WHERE id = ?`).run(data.name, data.duration, data.priceCents, id);
  return { status: 200, body: { service: { id, ...data } } };
}

function toggleAdminService(id, active) {
  const existing = db.prepare(`SELECT id FROM services WHERE id = ?`).get(id);
  if (!existing) return { status: 404, body: { error: 'Serviço não encontrado.' } };
  const current = Boolean(db.prepare('SELECT active FROM services WHERE id = ?').get(id).active);
  const next = active === undefined ? !current : Boolean(active);
  if (!next && current) {
    const activeCount = Number(db.prepare('SELECT COUNT(*) AS count FROM services WHERE active = 1').get().count);
    if (activeCount <= 1) return { status: 409, body: { error: 'Mantenha pelo menos um serviço ativo.' } };
  }
  db.prepare(`UPDATE services SET active = ? WHERE id = ?`).run(next ? 1 : 0, id);
  return { status: 200, body: { id, active: next ? 1 : 0 } };
}

function getAdminProfessionals() {
  return { status: 200, body: { professionals: db.prepare(`SELECT id, name, role, initials, active FROM professionals ORDER BY rowid`).all() } };
}

function validateProfessionalPayload(payload) {
  const name = String(payload.name || '').trim();
  const role = String(payload.role || '').trim();
  if (!name || !role) return { error: 'Nome e função são obrigatórios.' };
  if (name.length > 60 || role.length > 60) return { error: 'Nome ou função muito longos.' };
  return { name, role, initials: toInitials(name) };
}

function createAdminProfessional(payload) {
  const data = validateProfessionalPayload(payload);
  if (data.error) return { status: 400, body: { error: data.error } };
  const id = makeUniqueId('professionals', slugify(data.name));
  db.prepare(`INSERT INTO professionals (id, name, role, initials, active) VALUES (?, ?, ?, ?, 1)`).run(id, data.name, data.role, data.initials);
  return { status: 201, body: { professional: { id, ...data, active: 1 } } };
}

function updateAdminProfessional(id, payload) {
  const existing = db.prepare(`SELECT id FROM professionals WHERE id = ?`).get(id);
  if (!existing) return { status: 404, body: { error: 'Profissional não encontrado.' } };
  const data = validateProfessionalPayload(payload);
  if (data.error) return { status: 400, body: { error: data.error } };
  db.prepare(`UPDATE professionals SET name = ?, role = ?, initials = ? WHERE id = ?`).run(data.name, data.role, data.initials, id);
  return { status: 200, body: { professional: { id, ...data } } };
}

function toggleAdminProfessional(id, active) {
  const row = db.prepare(`SELECT active FROM professionals WHERE id = ?`).get(id);
  if (!row) return { status: 404, body: { error: 'Profissional não encontrado.' } };
  const current = Boolean(row.active);
  const next = active === undefined ? !current : Boolean(active);
  if (!next && current) {
    const activeCount = Number(db.prepare('SELECT COUNT(*) AS count FROM professionals WHERE active = 1').get().count);
    if (activeCount <= 1) return { status: 409, body: { error: 'Mantenha pelo menos um profissional ativo.' } };
  }
  db.prepare(`UPDATE professionals SET active = ? WHERE id = ?`).run(next ? 1 : 0, id);
  return { status: 200, body: { id, active: next ? 1 : 0 } };
}

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
function getAdminOpeningHours() {
  const rows = db.prepare(`SELECT weekday, open_time AS openTime, close_time AS closeTime FROM opening_hours ORDER BY weekday`).all();
  const byDay = new Map(rows.map((row) => [Number(row.weekday), row]));
  const days = WEEKDAYS.map((name, weekday) => ({ weekday, name, closed: !byDay.has(weekday), openTime: byDay.get(weekday)?.openTime || '09:00', closeTime: byDay.get(weekday)?.closeTime || '18:00' }));
  return { status: 200, body: { days } };
}

function updateAdminOpeningHours(weekday, payload) {
  const numericWeekday = Number(weekday);
  if (!Number.isInteger(numericWeekday) || numericWeekday < 0 || numericWeekday > 6) return { status: 400, body: { error: 'Dia da semana inválido.' } };
  if (payload.closed) {
    db.prepare(`DELETE FROM opening_hours WHERE weekday = ?`).run(numericWeekday);
    return { status: 200, body: { weekday: numericWeekday, closed: true } };
  }
  const openTime = String(payload.openTime || '');
  const closeTime = String(payload.closeTime || '');
  if (!isValidTime(openTime) || !isValidTime(closeTime) || timeToMinutes(openTime) >= timeToMinutes(closeTime)) {
    return { status: 400, body: { error: 'Horário de abertura/fechamento inválido.' } };
  }
  db.prepare(`
    INSERT INTO opening_hours (weekday, open_time, close_time)
    VALUES (?, ?, ?)
    ON CONFLICT(weekday) DO UPDATE SET open_time = excluded.open_time, close_time = excluded.close_time
  `).run(numericWeekday, openTime, closeTime);
  return { status: 200, body: { weekday: numericWeekday, closed: false, openTime, closeTime } };
}

function requireAdminRoute(req, res) {
  const guard = requireAdmin(req, res);
  if (!guard.ok) sendJson(res, guard.status, guard.body);
  return guard;
}

async function handleApi(req, res, pathname, searchParams) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS'
    });
    return res.end();
  }

  try {
    if (req.method === 'GET' && pathname === '/api/health') return sendJson(res, 200, { status: 'ok', service: 'boss67-api' });

    if (req.method === 'GET' && pathname === '/api/services') {
      const services = db.prepare(`SELECT id, name, duration, price_cents AS priceCents FROM services WHERE active = 1 ORDER BY rowid`).all();
      return sendJson(res, 200, { services });
    }

    if (req.method === 'GET' && pathname === '/api/professionals') {
      const professionals = db.prepare(`SELECT id, name, role, initials FROM professionals WHERE active = 1 ORDER BY rowid`).all();
      return sendJson(res, 200, { professionals });
    }

    if (req.method === 'GET' && pathname === '/api/availability') { const result = getAvailability(searchParams); return sendJson(res, result.status, result.body); }

    if (req.method === 'POST' && pathname === '/api/bookings') {
      const result = createBooking(await parseJsonBody(req));
      return sendJson(res, result.status, result.body);
    }

    if (req.method === 'POST' && pathname === '/api/admin/login') {
      const result = login(req, res, await parseJsonBody(req));
      return sendJson(res, result.status, result.body);
    }

    if (req.method === 'POST' && pathname === '/api/admin/logout') {
      const result = logout(req, res);
      return sendJson(res, result.status, result.body);
    }

    if (req.method === 'GET' && pathname === '/api/admin/me') {
      const guard = requireAdmin(req, res);
      if (!guard.ok) return sendJson(res, guard.status, guard.body);
      return sendJson(res, 200, { user: { email: guard.user.email, name: guard.user.name } });
    }

    if (pathname.startsWith('/api/admin/')) {
      const guard = requireAdminRoute(req, res);
      if (!guard.ok) return;
    }

    if (req.method === 'GET' && pathname === '/api/admin/bookings') { const result = getAdminBookings(searchParams); return sendJson(res, result.status, result.body); }
    if (req.method === 'GET' && pathname === '/api/admin/overview') { const result = getAdminOverview(searchParams); return sendJson(res, result.status, result.body); }
    if (req.method === 'GET' && pathname === '/api/admin/blocks') { const result = getAdminBlocks(searchParams); return sendJson(res, result.status, result.body); }
    if (req.method === 'GET' && pathname === '/api/admin/services') { const result = getAdminServices(); return sendJson(res, result.status, result.body); }
    if (req.method === 'GET' && pathname === '/api/admin/professionals') { const result = getAdminProfessionals(); return sendJson(res, result.status, result.body); }
    if (req.method === 'GET' && pathname === '/api/admin/opening-hours') { const result = getAdminOpeningHours(); return sendJson(res, result.status, result.body); }

    const cancelMatch = pathname.match(/^\/api\/admin\/bookings\/([^/]+)\/cancel$/);
    if (req.method === 'POST' && cancelMatch) {
      const result = cancelAdminBooking(decodeURIComponent(cancelMatch[1]));
      return sendJson(res, result.status, result.body);
    }

    if (req.method === 'POST' && pathname === '/api/admin/blocks') {
      const result = createAdminBlock(await parseJsonBody(req));
      return sendJson(res, result.status, result.body);
    }

    const removeBlockMatch = pathname.match(/^\/api\/admin\/blocks\/(\d+)\/remove$/);
    if (req.method === 'POST' && removeBlockMatch) {
      const result = removeAdminBlock(removeBlockMatch[1]);
      return sendJson(res, result.status, result.body);
    }

    if (req.method === 'POST' && pathname === '/api/admin/services') { const result = createAdminService(await parseJsonBody(req)); return sendJson(res, result.status, result.body); }
    const serviceUpdateMatch = pathname.match(/^\/api\/admin\/services\/([^/]+)$/);
    if (req.method === 'PUT' && serviceUpdateMatch) { const result = updateAdminService(decodeURIComponent(serviceUpdateMatch[1]), await parseJsonBody(req)); return sendJson(res, result.status, result.body); }
    const serviceToggleMatch = pathname.match(/^\/api\/admin\/services\/([^/]+)\/toggle$/);
    if (req.method === 'POST' && serviceToggleMatch) { const result = toggleAdminService(decodeURIComponent(serviceToggleMatch[1]), (await parseJsonBody(req)).active); return sendJson(res, result.status, result.body); }

    if (req.method === 'POST' && pathname === '/api/admin/professionals') { const result = createAdminProfessional(await parseJsonBody(req)); return sendJson(res, result.status, result.body); }
    const professionalUpdateMatch = pathname.match(/^\/api\/admin\/professionals\/([^/]+)$/);
    if (req.method === 'PUT' && professionalUpdateMatch) { const result = updateAdminProfessional(decodeURIComponent(professionalUpdateMatch[1]), await parseJsonBody(req)); return sendJson(res, result.status, result.body); }
    const professionalToggleMatch = pathname.match(/^\/api\/admin\/professionals\/([^/]+)\/toggle$/);
    if (req.method === 'POST' && professionalToggleMatch) { const result = toggleAdminProfessional(decodeURIComponent(professionalToggleMatch[1]), (await parseJsonBody(req)).active); return sendJson(res, result.status, result.body); }

    const hoursMatch = pathname.match(/^\/api\/admin\/opening-hours\/(\d+)$/);
    if (req.method === 'PUT' && hoursMatch) { const result = updateAdminOpeningHours(hoursMatch[1], await parseJsonBody(req)); return sendJson(res, result.status, result.body); }

    return sendJson(res, 404, { error: 'Endpoint não encontrado.' });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: 'Erro interno no servidor.' });
  }
}

module.exports = { handleApi };
