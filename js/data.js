const services = [
  { id: 'corte', name: 'Corte', duration: 30, price: 50 },
  { id: 'barba', name: 'Barba', duration: 30, price: 40 },
  { id: 'corte-barba', name: 'Corte e Barba', duration: 60, price: 85 },
  { id: 'fade-navalhado', name: 'Low Fade ou Navalhado', duration: 60, price: 60 },
  { id: 'barba-pigmentacao', name: 'Barba e Pigmentação', duration: 45, price: 65 },
  { id: 'pezinho', name: 'Pézinho', duration: 15, price: 20 },
  { id: 'sobrancelha', name: 'Sobrancelha', duration: 15, price: 20 }
];

const professionals = [
  { id: 'felipe', name: 'Felipe', role: 'Barbeiro', initials: 'FE' },
  { id: 'vitoria', name: 'Vitória', role: 'Barbeira', initials: 'VI' },
  { id: 'sem-preferencia', name: 'Sem preferência', role: 'Qualquer profissional', initials: '?' }
];

// Horários públicos informados pela barbearia / referência atual do protótipo.
const openingHours = {
  1: { open: '13:30', close: '20:00' },
  2: { open: '09:00', close: '20:00' },
  3: { open: '09:00', close: '20:00' },
  4: { open: '09:00', close: '20:00' },
  5: { open: '09:00', close: '20:00' },
  6: { open: '09:00', close: '17:00' }
};

// Dados de protótipo: bloqueios diferentes por profissional para demonstrar disponibilidade dinâmica.
const blockedSlotsByProfessional = {
  felipe: {
    1: ['14:30', '18:30'],
    2: ['10:00', '15:30', '19:00'],
    3: ['11:00', '16:00'],
    4: ['09:30', '13:00', '18:00'],
    5: ['10:30', '14:30', '19:30'],
    6: ['11:00', '15:00']
  },
  vitoria: {
    1: ['16:00', '19:00'],
    2: ['09:30', '14:00', '18:00'],
    3: ['10:30', '15:30'],
    4: ['11:00', '16:30'],
    5: ['09:00', '13:30', '18:30'],
    6: ['10:00', '14:00']
  }
};
