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
  targets: document.getElementById('targets'),
  targetChips: document.getElementById('target-chips'),
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
  btnTalk: document.getElementById('btn-talk'),
  btnTalkRepeat: document.getElementById('btn-talk-repeat'),
  phrases: document.getElementById('phrases'),
  modeMark: document.getElementById('mode-mark'),
  modeCheck: document.getElementById('mode-check'),
  hint: document.getElementById('hint'),
  displayLink: document.getElementById('display-link'),
  toast: document.getElementById('toast')
};

let credentials = null;
let socket = null;
let state = { drawnNumbers: [], currentNumber: null };
let speakerCount = 0;
let speakerDevices = []; // [{ id, name }] com som ligado agora
// Caixas escolhidas para tocar (vazio = todas). Guarda o nome para mostrar mesmo desconectada.
let selectedTargets = new Map();
const LOCAL_DEVICE_NAME = 'Celular do controle';
let padMode = 'mark'; // 'mark' marca o número; 'check' só responde se já saiu
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
  writeStore(PREFS_KEY, {
    repeat2: els.optRepeat.checked,
    local: els.optLocal.checked,
    targets: [...selectedTargets].map(([id, name]) => ({ id, name }))
  });
}

// ---------- API ----------
function authHeader(user, pass) {
  return 'Basic ' + btoa(unescape(encodeURIComponent(`${user}:${pass}`)));
}

// body pode ser objeto (vai como JSON) ou Blob (gravação de áudio)
async function api(action, body = {}) {
  const isBlob = body instanceof Blob;
  const targets = selectedTargets.size ? [...selectedTargets.keys()] : null;
  let url = `/api/rooms/${room}/${action}`;
  if (targets && isBlob) url += `?targets=${encodeURIComponent(targets.join(','))}`;
  else if (targets) body = { ...body, targets };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': isBlob ? (body.type.split(';')[0] || 'application/octet-stream') : 'application/json',
      Authorization: authHeader(credentials.user, credentials.pass)
    },
    body: isBlob ? body : JSON.stringify(body)
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
  if (padMode === 'check') {
    await run(cell, async () => {
      const data = await api('announce', { mode: 'check', number });
      toast(`${letterFor(number)} ${number}: ${data.drawn ? '✅ já saiu' : '❌ ainda não saiu'}`);
    });
  } else if (state.drawnNumbers.includes(number)) {
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

// ---------- Modo da grade: marcar ou conferir ----------
const HINTS = {
  mark: 'Toque no número que saiu do globo. Tocar num número já marcado fala ele de novo.',
  check: '🔎 Modo conferir: toque no número que perguntaram e a caixa responde se já saiu. Nada é marcado.'
};
function setPadMode(mode) {
  padMode = mode;
  els.modeMark.classList.toggle('active', mode === 'mark');
  els.modeCheck.classList.toggle('active', mode === 'check');
  els.pad.classList.toggle('checking', mode === 'check');
  els.hint.textContent = HINTS[mode];
  els.hint.classList.toggle('hint-check', mode === 'check');
}
els.modeMark.addEventListener('click', () => setPadMode('mark'));
els.modeCheck.addEventListener('click', () => setPadMode('check'));

// ---------- Respostas rápidas ----------
PHRASES.forEach(phrase => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-phrase';
  button.textContent = phrase.label;
  button.addEventListener('click', () => run(button, () => api('announce', { mode: 'phrase', phrase: phrase.id })));
  els.phrases.appendChild(button);
});

// ---------- Segure para falar ----------
// O microfone fica aberto por 1 minuto depois de usar, para a próxima fala começar na hora
const MAX_TALK_MS = 30000;
const MIN_TALK_MS = 500;
const talk = { stream: null, media: null, chunks: [], startedAt: 0, wantStop: false, releaseTimer: null, maxTimer: null };

function setTalkButton(stateName, label) {
  els.btnTalk.classList.toggle('arming', stateName === 'arming');
  els.btnTalk.classList.toggle('recording', stateName === 'recording');
  els.btnTalk.textContent = label;
}
function resetTalkButton() {
  els.btnTalk.disabled = false;
  setTalkButton('idle', '🎙️ Segure para falar');
}

function pickMimeType() {
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
    .find(type => MediaRecorder.isTypeSupported?.(type)) || '';
}

async function getMicrophone() {
  clearTimeout(talk.releaseTimer);
  if (talk.stream?.getTracks().some(track => track.readyState === 'live')) return talk.stream;
  talk.stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
  });
  return talk.stream;
}

function releaseMicrophoneLater() {
  clearTimeout(talk.releaseTimer);
  talk.releaseTimer = setTimeout(() => {
    talk.stream?.getTracks().forEach(track => track.stop());
    talk.stream = null;
  }, 60000);
}

async function startTalk(event) {
  event.preventDefault();
  if (talk.media || els.btnTalk.disabled) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    toast('Este navegador não grava áudio aqui (precisa abrir pelo https)', true);
    return;
  }
  els.btnTalk.setPointerCapture?.(event.pointerId);
  talk.wantStop = false;
  setTalkButton('arming', '⏳ Preparando…');

  let stream;
  try {
    stream = await getMicrophone();
  } catch (error) {
    resetTalkButton();
    toast('Microfone bloqueado. Libere nas configurações do navegador', true);
    return;
  }

  // Soltou antes de o microfone ficar pronto (ex.: durante o pedido de permissão)
  if (talk.wantStop) {
    resetTalkButton();
    releaseMicrophoneLater();
    toast('🎙️ Microfone liberado! Agora segure o botão enquanto fala');
    return;
  }

  const mimeType = pickMimeType();
  const media = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  talk.media = media;
  talk.chunks = [];
  talk.startedAt = 0;
  media.ondataavailable = e => { if (e.data.size) talk.chunks.push(e.data); };
  media.onstart = () => {
    talk.startedAt = Date.now();
    setTalkButton('recording', '🔴 Gravando… solte para enviar');
  };
  media.onstop = () => sendTalk(media.mimeType || mimeType);
  media.start();
  talk.maxTimer = setTimeout(stopTalk, MAX_TALK_MS);
}

function stopTalk() {
  talk.wantStop = true;
  clearTimeout(talk.maxTimer);
  if (talk.media && talk.media.state !== 'inactive') talk.media.stop();
}

async function sendTalk(mimeType) {
  const duration = talk.startedAt ? Date.now() - talk.startedAt : 0;
  const blob = new Blob(talk.chunks, { type: mimeType || 'audio/mp4' });
  talk.media = null;
  talk.chunks = [];
  releaseMicrophoneLater();

  if (duration < MIN_TALK_MS) {
    resetTalkButton();
    toast('Segure o botão enquanto fala', true);
    return;
  }

  els.btnTalk.disabled = true;
  setTalkButton('idle', '📤 Enviando…');
  try {
    await api('clip', blob);
    toast('📢 Sua fala está tocando para todos');
  } catch (error) {
    toast(error.message, true);
  } finally {
    resetTalkButton();
  }
}

els.btnTalk.addEventListener('pointerdown', startTalk);
els.btnTalk.addEventListener('pointerup', stopTalk);
els.btnTalk.addEventListener('pointercancel', stopTalk);
els.btnTalk.addEventListener('contextmenu', e => e.preventDefault());
els.btnTalkRepeat.addEventListener('click', () => run(els.btnTalkRepeat, () => api('announce', { mode: 'last-clip' })));

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
  const online = new Set(speakerDevices.map(d => d.id));
  const chosenOnline = [...selectedTargets.keys()].filter(id => online.has(id)).length;
  if (selectedTargets.size && !chosenOnline && speakerCount > 0) {
    els.speakers.className = 'pill pill-warn';
    els.speakers.textContent = '⚠️ caixa escolhida desligada';
    els.speakers.title = 'Escolha outra caixa em "Tocar em" ou toque em "Todas"';
    renderTargets();
    return;
  }
  renderTargets();
  const ok = speakerCount > 0;
  els.speakers.className = `pill ${ok ? 'pill-ok' : 'pill-warn'}`;
  els.speakers.textContent = ok
    ? `🔊 ${speakerCount} ${speakerCount === 1 ? 'caixa de som' : 'caixas de som'}`
    : '🔇 nenhuma caixa de som';
  els.speakers.title = ok ? '' : 'Abra a tela do bingo no aparelho da caixa de som e clique em "Ativar som"';
}

// Fileira "Tocar em": Todas + cada caixa ligada (e as escolhidas que caíram, apagadas)
function renderTargets() {
  const devices = [...speakerDevices];
  selectedTargets.forEach((name, id) => {
    if (!devices.some(d => d.id === id)) devices.push({ id, name, offline: true });
  });
  els.targets.hidden = devices.length === 0;
  els.targetChips.innerHTML = '';

  const all = document.createElement('button');
  all.type = 'button';
  all.className = `target-chip${selectedTargets.size ? '' : ' active'}`;
  all.textContent = `🔊 Todas${speakerDevices.length > 1 ? ` (${speakerDevices.length})` : ''}`;
  all.addEventListener('click', () => {
    selectedTargets.clear();
    savePrefs();
    renderSpeakers();
  });
  els.targetChips.appendChild(all);

  devices.forEach(device => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `target-chip${selectedTargets.has(device.id) ? ' active' : ''}${device.offline ? ' offline' : ''}`;
    chip.textContent = device.id === DEVICE_ID ? `📱 ${device.name}` : device.name;
    if (device.offline) chip.title = 'Desconectada';
    chip.addEventListener('click', () => {
      if (selectedTargets.has(device.id)) selectedTargets.delete(device.id);
      else selectedTargets.set(device.id, device.name);
      savePrefs();
      renderSpeakers();
    });
    els.targetChips.appendChild(chip);
  });
}

// ---------- Socket ----------
function connectSocket() {
  if (socket) return;
  socket = io();

  socket.on('connect', () => {
    setConnection(els.connection, true);
    socket.emit('join-room', { roomName: room, speaker: announcer.enabled, deviceId: DEVICE_ID, deviceName: LOCAL_DEVICE_NAME });
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
    speakerDevices = data.devices || [];
    // Atualiza o nome guardado se a caixa foi renomeada
    speakerDevices.forEach(d => { if (selectedTargets.has(d.id)) selectedTargets.set(d.id, d.name); });
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
    (prefs.targets || []).forEach(t => { if (t?.id) selectedTargets.set(t.id, t.name || 'Caixa'); });
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
