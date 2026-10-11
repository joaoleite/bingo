// ============================================
// CONTROLE DO BINGO - celular de quem sorteia
// ============================================

const room = getRoomFromUrl();
const CREDENTIALS_KEY = 'bingo-admin';
const PREFS_KEY = 'bingo-admin-prefs';

const els = {
  login: document.getElementById('login'),
  loginUser: document.getElementById('login-user'),
  loginPass: document.getElementById('login-pass'),
  loginError: document.getElementById('login-error'),
  controller: document.getElementById('controller'),
  connection: document.getElementById('connection'),
  drawnCount: document.getElementById('drawn-count'),
  speakers: document.getElementById('speakers'),
  ball: document.getElementById('ball'),
  pad: document.getElementById('pad'),
  btnDraw: document.getElementById('btn-draw'),
  btnRepeat: document.getElementById('btn-repeat'),
  btnUndo: document.getElementById('btn-undo'),
  btnRecap: document.getElementById('btn-recap'),
  btnStop: document.getElementById('btn-stop'),
  btnReset: document.getElementById('btn-reset'),
  btnLogout: document.getElementById('btn-logout'),
  optRepeat: document.getElementById('opt-repeat'),
  optLocal: document.getElementById('opt-local'),
  optVoice: document.getElementById('opt-voice'),
  displayLink: document.getElementById('display-link'),
  toast: document.getElementById('toast')
};

let credentials = null;
let socket = null;
let state = { drawnNumbers: [], currentNumber: null };
let speakerCount = 0;
const announcer = new Announcer();
const cells = buildBoard(els.pad, { asButtons: true, onSelect: selectNumber });

// ---------- Armazenamento local (pode falhar em aba anônima) ----------
function readStore(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}
function writeStore(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { /* ignora */ }
}

function savePrefs() {
  writeStore(PREFS_KEY, { repeat2: els.optRepeat.checked, local: els.optLocal.checked });
}

// ---------- API ----------
function authHeader(user, pass) {
  return 'Basic ' + btoa(unescape(encodeURIComponent(`${user}:${pass}`)));
}

async function api(action, body = {}) {
  const response = await fetch(`/api/rooms/${room}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(credentials.user, credentials.pass)
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    logout();
    throw new Error('Sessão expirada, entre de novo');
  }
  if (!response.ok || !data.success) throw new Error(data.error || 'Erro ao falar com o servidor');
  return data;
}

function repeatCount() {
  return els.optRepeat.checked ? 2 : 1;
}

let toastTimer = null;
function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.toggle('toast-error', isError);
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2500);
}

// Evita toques duplos enquanto o servidor responde
async function run(button, task) {
  if (button?.disabled) return;
  if (button) button.disabled = true;
  try {
    await task();
  } catch (error) {
    toast(error.message, true);
  } finally {
    if (button) button.disabled = false;
  }
}

// ---------- Ações ----------
async function selectNumber(number) {
  const cell = cells[number];
  if (state.drawnNumbers.includes(number)) {
    await run(cell, async () => {
      await api('announce', { mode: 'number', number, repeat: 1 });
      toast(`🔁 Falando ${letterFor(number)} ${number}`);
    });
  } else {
    await run(cell, async () => {
      await api('mark', { number, repeat: repeatCount() });
      toast(`✅ ${letterFor(number)} ${number} marcado`);
    });
  }
}

els.btnDraw.addEventListener('click', () => run(els.btnDraw, async () => {
  const data = await api('draw', { repeat: repeatCount() });
  toast(`🎲 Saiu ${letterFor(data.number)} ${data.number}`);
}));

els.btnRepeat.addEventListener('click', () => run(els.btnRepeat, () => {
  if (!state.currentNumber) throw new Error('Nenhum número sorteado ainda');
  return api('announce', { mode: 'last', repeat: 1 });
}));

els.btnUndo.addEventListener('click', () => run(els.btnUndo, async () => {
  if (!state.currentNumber) throw new Error('Nada para desfazer');
  const data = await api('undo');
  toast(`↩️ ${letterFor(data.removed)} ${data.removed} desmarcado`);
}));

els.btnRecap.addEventListener('click', () => run(els.btnRecap, () => api('announce', { mode: 'all' })));
els.btnStop.addEventListener('click', () => run(els.btnStop, () => api('announce', { mode: 'stop' })));

els.btnReset.addEventListener('click', () => run(els.btnReset, async () => {
  if (!confirm('Começar um novo jogo? Todos os números sorteados serão apagados.')) return;
  await api('reset');
  toast('🔄 Novo jogo começou');
}));

els.btnLogout.addEventListener('click', logout);

VOICES.forEach(voice => els.optVoice.add(new Option(voice.label, voice.id)));
els.optVoice.addEventListener('change', () => run(els.optVoice, async () => {
  await api('voice', { voiceName: els.optVoice.value });
  toast('🗣️ Voz trocada, ouça o exemplo');
}));
els.optRepeat.addEventListener('change', savePrefs);

els.optLocal.addEventListener('change', async () => {
  if (els.optLocal.checked) {
    try {
      await announcer.enable();
    } catch (e) {
      els.optLocal.checked = false;
      toast('O navegador bloqueou o som', true);
    }
  } else {
    announcer.disable();
  }
  socket?.emit('speaker', { on: announcer.enabled });
  savePrefs();
});

// Som local salvo como ligado: o navegador só libera depois do primeiro toque
document.addEventListener('pointerdown', async () => {
  if (els.optLocal.checked && !announcer.enabled) {
    try {
      await announcer.enable();
      socket?.emit('speaker', { on: true });
    } catch (e) { /* tenta de novo no próximo toque */ }
  }
});

// ---------- Tela ----------
function render() {
  els.drawnCount.textContent = state.drawnNumbers.length;
  renderBall(els.ball, state.currentNumber);
  updateBoard(cells, state.drawnNumbers, state.currentNumber);
  els.btnDraw.disabled = state.drawnNumbers.length >= 75;
  if (state.voice) els.optVoice.value = state.voice;
}

function renderSpeakers() {
  const ok = speakerCount > 0;
  els.speakers.className = `pill ${ok ? 'pill-ok' : 'pill-warn'}`;
  els.speakers.textContent = ok
    ? `🔊 ${speakerCount} ${speakerCount === 1 ? 'caixa de som' : 'caixas de som'}`
    : '🔇 nenhuma caixa de som';
  els.speakers.title = ok ? '' : 'Abra a tela do bingo no aparelho da caixa de som e clique em "Ativar som"';
}

// ---------- Socket ----------
function connectSocket() {
  if (socket) return;
  socket = io();

  socket.on('connect', () => {
    setConnection(els.connection, true);
    socket.emit('join-room', { roomName: room, speaker: announcer.enabled });
  });
  socket.on('disconnect', () => setConnection(els.connection, false));

  socket.on('room-state', data => {
    if (data.name !== room) return;
    state = data;
    announcer.setVoice(data.voice);
    render();
  });

  socket.on('speakers', data => {
    if (data.room !== room) return;
    speakerCount = data.count;
    renderSpeakers();
  });

  socket.on('announce', event => {
    if (event.room === room && announcer.enabled) announcer.handle(event);
  });
}

// ---------- Login ----------
async function checkCredentials(user, pass) {
  const response = await fetch('/api/admin/check', { headers: { Authorization: authHeader(user, pass) } });
  return response.ok;
}

function showController() {
  els.login.hidden = true;
  els.controller.hidden = false;
  connectSocket();
  keepScreenOn();
}

function logout() {
  credentials = null;
  writeStore(CREDENTIALS_KEY, null);
  els.controller.hidden = true;
  els.login.hidden = false;
}

els.login.addEventListener('submit', async event => {
  event.preventDefault();
  const user = els.loginUser.value.trim();
  const pass = els.loginPass.value;
  els.loginError.hidden = true;

  try {
    if (!(await checkCredentials(user, pass))) {
      els.loginError.textContent = 'Usuário ou senha incorretos';
      els.loginError.hidden = false;
      return;
    }
    credentials = { user, pass };
    writeStore(CREDENTIALS_KEY, credentials);
    showController();
  } catch (e) {
    els.loginError.textContent = 'Sem conexão com o servidor';
    els.loginError.hidden = false;
  }
});

// ---------- Início ----------
(async function init() {
  const prefs = readStore(PREFS_KEY);
  if (prefs) {
    els.optRepeat.checked = prefs.repeat2 !== false;
    els.optLocal.checked = Boolean(prefs.local);
  }
  if (room !== 'bingo') els.displayLink.href = `/?sala=${room}`;
  renderSpeakers();

  const saved = readStore(CREDENTIALS_KEY);
  if (saved?.user && saved?.pass) {
    try {
      if (await checkCredentials(saved.user, saved.pass)) {
        credentials = saved;
        showController();
        return;
      }
    } catch (e) { /* mostra o login */ }
    writeStore(CREDENTIALS_KEY, null);
  }
  els.loginUser.value = saved?.user || 'admin';
  els.loginPass.focus();
})();
