const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, '..', 'data', 'boss67.sqlite');
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS professionals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    initials TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS opening_hours (
    weekday INTEGER PRIMARY KEY,
    open_time TEXT NOT NULL,
    close_time TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS professional_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    professional_id TEXT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0),
    reason TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL REFERENCES services(id),
    professional_id TEXT NOT NULL REFERENCES professionals(id),
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0),
    customer_name TEXT NOT NULL,
    customer_whatsapp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_prof_date
    ON bookings (professional_id, date, start_time);

  CREATE INDEX IF NOT EXISTS idx_blocks_prof_date
    ON professional_blocks (professional_id, date, start_time);
`);

function seed() {
  const services = [
    ['corte', 'Corte', 30, 5000],
    ['barba', 'Barba', 30, 4000],
    ['corte-barba', 'Corte e Barba', 60, 8500],
    ['fade-navalhado', 'Low Fade ou Navalhado', 60, 6000],
    ['barba-pigmentacao', 'Barba e Pigmentação', 45, 6500],
    ['pezinho', 'Pézinho', 15, 2000],
    ['sobrancelha', 'Sobrancelha', 15, 2000]
  ];

  const professionals = [
    ['felipe', 'Felipe', 'Barbeiro', 'FE'],
    ['vitoria', 'Vitória', 'Barbeira', 'VI']
  ];

  const openingHours = [
    [1, '13:30', '20:00'],
    [2, '09:00', '20:00'],
    [3, '09:00', '20:00'],
    [4, '09:00', '20:00'],
    [5, '09:00', '20:00'],
    [6, '09:00', '17:00']
  ];

  const insertService = db.prepare(`
    INSERT OR IGNORE INTO services (id, name, duration, price_cents)
    VALUES (?, ?, ?, ?)
  `);
  services.forEach((row) => insertService.run(...row));

  const insertProfessional = db.prepare(`
    INSERT OR IGNORE INTO professionals (id, name, role, initials)
    VALUES (?, ?, ?, ?)
  `);
  professionals.forEach((row) => insertProfessional.run(...row));

  const insertOpening = db.prepare(`
    INSERT OR IGNORE INTO opening_hours (weekday, open_time, close_time)
    VALUES (?, ?, ?)
  `);
  openingHours.forEach((row) => insertOpening.run(...row));

  // Bloqueios de demonstração: mantemos alguns exemplos do protótipo para validar regras do backend.
  const demoBlocks = [
    ['felipe', '2099-01-01', '18:30', 30, 'Demonstração'],
    ['vitoria', '2099-01-01', '16:00', 30, 'Demonstração']
  ];
  const insertBlock = db.prepare(`
    INSERT OR IGNORE INTO professional_blocks (professional_id, date, start_time, duration, reason)
    VALUES (?, ?, ?, ?, ?)
  `);
  demoBlocks.forEach((row) => insertBlock.run(...row));
}

seed();

module.exports = { db, dbPath };
