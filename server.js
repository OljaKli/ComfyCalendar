const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data', 'state.json');

const NAMES = [
  'Nastirka',
  'Majja (not a bee)',
  'Max',
  'Sasha',
  'Denis',
  'Marina (hates double standards)',
  'Marina Shamarina',
  'Olja (renaissance person)',
  'Ivanchei',
  'Roos',
  'Asia',
];

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь',
];

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load state:', e.message);
  }
  return { assignments: {} };
}

function saveState(state) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Returns names and their assigned status — no months revealed
app.get('/api/state', (req, res) => {
  const state = loadState();
  const names = NAMES.map(name => ({
    name,
    assigned: !!state.assignments[name],
  }));
  res.json({ names });
});

// Assigns a random available month to the given name
app.post('/api/assign', (req, res) => {
  const { name } = req.body;

  if (!name || !NAMES.includes(name)) {
    return res.status(400).json({ error: 'Неизвестное имя.' });
  }

  const state = loadState();

  if (state.assignments[name]) {
    return res.json({ month: state.assignments[name], alreadyAssigned: true });
  }

  const assignedMonths = new Set(Object.values(state.assignments));
  const available = MONTHS.filter(m => !assignedMonths.has(m));

  if (available.length === 0) {
    return res.status(409).json({ error: 'Все месяцы уже разобраны!' });
  }

  const month = available[Math.floor(Math.random() * available.length)];
  state.assignments[name] = month;
  saveState(state);

  console.log(`Assigned: ${name} → ${month}`);
  res.json({ month, alreadyAssigned: false });
});

// Returns all assignments — only if the requesting name is already assigned
app.get('/api/assignments', (req, res) => {
  const name = req.query.name;
  if (!name || !NAMES.includes(name)) {
    return res.status(400).json({ error: 'Неизвестное имя.' });
  }
  const state = loadState();
  if (!state.assignments[name]) {
    return res.status(403).json({ error: 'Сначала получи свой месяц!' });
  }
  const list = NAMES.map(n => ({
    name: n,
    month: state.assignments[n] || null,
  }));
  res.json({ assignments: list });
});

// Admin view — shows all assignments (share URL only with yourself)
app.get('/admin', (req, res) => {
  const state = loadState();
  const rows = NAMES.map(name => {
    const month = state.assignments[name] || '—';
    return `<tr><td>${name}</td><td>${month}</td></tr>`;
  }).join('');

  const total = Object.keys(state.assignments).length;

  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Админка — ComfyCalendar 2027</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #faf8f4; color: #1e1a14; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    p { color: #8b7a5e; margin-bottom: 1.5rem; }
    table { border-collapse: collapse; width: 100%; max-width: 480px; background: #fff;
            border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    th { background: #1e1a14; color: #d4a96a; text-align: left; padding: 0.75rem 1rem; font-size: 0.8rem; letter-spacing: .08em; text-transform: uppercase; }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid #f0ebe3; }
    tr:last-child td { border-bottom: none; }
    td:last-child { color: #b8924a; font-weight: 600; }
    .progress { margin-top: 1.5rem; color: #8b7a5e; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>ComfyCalendar 2027 — Админка</h1>
  <p>Эта страница только для тебя.</p>
  <table>
    <tr><th>Имя</th><th>Месяц</th></tr>
    ${rows}
  </table>
  <p class="progress">${total} из ${NAMES.length} распределено</p>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`\nComfyCalendar 2027 is running!`);
  console.log(`  App:   http://localhost:${PORT}`);
  console.log(`  Admin: http://localhost:${PORT}/admin  (keep to yourself)\n`);
});
