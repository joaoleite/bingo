// ============================================
// CONTROLE DO BINGO - celular de quem sorteia
// ============================================

const room = getRoomFromUrl();
const CREDENTIALS_KEY = 'bingo-admin';
// Chave do controle de um bingo criado em /novo (uma por sala, guardada neste aparelho)
const ROOM_KEY_STORE = `bingo-key:${room}`;
const PREFS_KEY = 'bingo-admin-prefs';

const els = {
  login: document.getElementById('login'),
  loginUser: document.getElementById('login-user'),
  loginPass: document.getElementById('login-pass'),
  loginError: document.getElementById('login-error'),
  loginOwned: document.getElementById('login-owned'),
  loginExpired: document.getElementById('login-expired'),
  share: document.getElementById('share'),
  shareRoom: document.getElementById('share-room'),
  btnShareDisplay: document.getElementById('btn-share-display'),
  btnShareAdmin: document.getElementById('btn-share-admin'),
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

let credentials = null; // { key } (bingo criado em /novo) ou { user, pass } (dono do servidor)
let socket = null;
let state = { drawnNumbers: [], currentNumber: null };
let speakerCount = 0;
let speakerDevices = []; // [{ id, name }] com som ligado agora
// Caixas escolhidas para tocar (vazio = todas). Guarda o nome para mostrar mesmo desconectada.
let selectedTargets = new Map();
const LOCAL_DEVICE_NAME = 'Celular do controle';
let padMode = 'mark'; // 'mark' marca o número; 'check' só responde se já saiu
const announcer = new Announcer({
  onBlocked: () => toast('🔇 O iPhone travou o som. Toque em qualquer lugar da tela', true),
  onLog: message => socket?.emit('client-log', { message })
});

// Toca neste celular o que o servidor anunciou (resposta do botão ou websocket; o id evita repetir)
// Diagnóstico temporário: cada passo do som do controle vai para o log do servidor
announcer.trace = message => socket?.emit('client-log', { message });

function playHere(event, via) {
  if (!event || event.room !== room || !els.optLocal.checked) return;
  const label = event.number ? `${event.kind} ${event.number}` : event.kind;
  announcer.trace(`recebeu ${label} via ${via} (som ${announcer.enabled ? 'ok' : 'off'}${announcer.seen.includes(event.id) ? ', repetido' : ''}, tela ${document.visibilityState})`);
  if (!announcer.enabled) {
    socket?.emit('client-log', { message: `anúncio ${event.kind} sem som liberado no controle` });
    return;
  }
  announcer.handle({ ...event, targets: null });
}
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

function authHeaders(creds) {
  return creds.key ? { 'X-Bingo-Key': creds.key } : { Authorization: authHeader(creds.user, creds.pass) };
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
      ...authHeaders(credentials)
    },
    body: isBlob ? body : JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    const usedKey = Boolean(credentials?.key);
    logout();
    // A chave parou de valer: o bingo foi apagado por ficar parado
    if (usedKey) showLoginNotes({ exists: false });
    throw new Error(usedKey ? 'Este bingo não existe mais' : 'Sessão expirada, entre de novo');
  }
  if (!response.ok || !data.success) throw new Error(data.error || 'Erro ao falar com o servidor');
  playHere(data.announce, 'resposta');
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
// O microfone é fechado logo depois de cada fala: aberto, o iPhone põe o bluetooth em modo
// "ligação" e o som do bingo pode sair mudo ou no alto-falante de ouvido
const MAX_TALK_MS = 30000;
const MIN_TALK_MS = 500;
const talk = { stream: null, media: null, chunks: [], startedAt: 0, wantStop: false, maxTimer: null };

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
  if (talk.stream?.getTracks().some(track => track.readyState === 'live')) return talk.stream;
  talk.stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
  });
  return talk.stream;
}

function releaseMicrophone() {
  talk.stream?.getTracks().forEach(track => track.stop());
  talk.stream = null;
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
    releaseMicrophone();
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
  releaseMicrophone();

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

// Som neste celular: precisa ser ligado dentro de um toque (regra do iPhone)
async function setLocalSound(on) {
  els.optLocal.checked = on;
  if (on) {
    try {
      await announcer.enable();
      toast('📱 Som ligado neste celular');
    } catch (e) {
      els.optLocal.checked = false;
      toast('O navegador bloqueou o som', true);
    }
  } else {
    announcer.disable();
  }
  socket?.emit('speaker', { on: announcer.enabled });
  savePrefs();
  renderSpeakers();
}

els.optLocal.addEventListener('change', () => setLocalSound(els.optLocal.checked));

// Som local salvo como ligado: o navegador só libera depois do primeiro toque
document.addEventListener('pointerdown', async event => {
  if (event.target.closest?.('.target-here')) return; // o próprio botão cuida disso
  if (els.optLocal.checked && (!announcer.enabled || announcer.blocked)) {
    try {
      await announcer.enable();
      socket?.emit('speaker', { on: true });
      renderSpeakers();
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
  const devices = speakerDevices.filter(d => d.id !== DEVICE_ID);
  selectedTargets.forEach((name, id) => {
    if (!devices.some(d => d.id === id)) devices.push({ id, name, offline: true });
  });
  els.targets.hidden = false;
  els.targetChips.innerHTML = '';

  // Este celular: liga/desliga o som aqui; quando ligado toca tudo, seja qual for a escolha
  const here = document.createElement('button');
  here.type = 'button';
  here.className = `target-chip target-here${announcer.enabled ? ' active' : ''}`;
  here.textContent = announcer.enabled ? '📱 Este celular'
    : els.optLocal.checked ? '📱 Este celular (toque na tela)' : '📱 Este celular (mudo)';
  here.addEventListener('click', () => setLocalSound(!announcer.enabled));
  els.targetChips.appendChild(here);
  if (!devices.length) return;

  const all = document.createElement('button');
  all.type = 'button';
  all.className = `target-chip${selectedTargets.size ? '' : ' active'}`;
  all.textContent = `🔊 Todas as caixas${devices.length > 1 ? ` (${devices.length})` : ''}`;
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
    chip.textContent = device.name;
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
    const version = document.querySelector('meta[name="bingo-version"]')?.content;
    const ios = navigator.userAgent.match(/OS (\d+_\d+)/)?.[1]?.replace('_', '.') || '';
    socket.emit('client-log', { message: `controle conectou: versão ${version}, som ${announcer.enabled ? 'ok' : els.optLocal.checked ? 'esperando toque' : 'off'}${ios ? `, iOS ${ios}` : ''}` });
  });
  socket.on('disconnect', () => setConnection(els.connection, false));

  socket.on('room-state', data => {
    if (data.name !== room) return;
    state = data;
    announcer.setVoice(data.voice);
    render();
  });

  // Voltou para o app depois de bloquear a tela ou trocar de app: reconecta na hora
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !socket.connected) socket.connect();
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
    // Este celular toca tudo, mesmo quando o envio é só para algumas caixas
    playHere(event, 'websocket');
  });
}

// ---------- Login ----------
async function checkAccess(creds) {
  const response = await fetch(`/api/rooms/${room}/check`, { headers: authHeaders(creds) });
  return response.ok;
}

function showController() {
  els.login.hidden = true;
  els.controller.hidden = false;
  // Bingo com chave: links para compartilhar; "Sair" não faz sentido (a chave é o acesso)
  els.share.hidden = !credentials.key;
  els.btnLogout.hidden = Boolean(credentials.key);
  els.shareRoom.textContent = room;
  connectSocket();
  keepScreenOn();
}

function logout() {
  if (credentials?.key) writeStore(ROOM_KEY_STORE, null);
  else writeStore(CREDENTIALS_KEY, null);
  credentials = null;
  els.controller.hidden = true;
  els.login.hidden = false;
}

// Explica por que pede senha: bingo de outra pessoa ou bingo que já foi apagado
function showLoginNotes(info) {
  els.loginOwned.hidden = !info?.owned;
  els.loginExpired.hidden = !(info && !info.exists && room !== 'bingo');
}

// Celular abre o menu de compartilhar (WhatsApp etc.); no computador, copia
async function shareLink(url, title) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('🔗 Link copiado');
  } catch (e) {
    toast(url);
  }
}

els.btnShareDisplay.addEventListener('click', () => shareLink(`${location.origin}/?sala=${room}`, 'Telão do bingo'));
els.btnShareAdmin.addEventListener('click', () => {
  if (credentials?.key) shareLink(`${location.origin}/admin?sala=${room}#chave=${credentials.key}`, 'Controle do bingo');
});

els.login.addEventListener('submit', async event => {
  event.preventDefault();
  const user = els.loginUser.value.trim();
  const pass = els.loginPass.value;
  els.loginError.hidden = true;

  try {
    if (!(await checkAccess({ user, pass }))) {
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
  const version = document.querySelector('meta[name="bingo-version"]')?.content;
  document.getElementById('version').textContent = `versão ${version || 'desconhecida'}`;
  renderSpeakers();

  // Link do controle traz a chave depois do #: guarda neste aparelho e tira da barra de endereço
  const fromLink = new URLSearchParams(location.hash.slice(1)).get('chave');
  if (fromLink) {
    writeStore(ROOM_KEY_STORE, fromLink);
    history.replaceState(null, '', location.pathname + location.search);
  }
  const key = readStore(ROOM_KEY_STORE);
  if (typeof key === 'string' && key) {
    try {
      if (await checkAccess({ key })) {
        credentials = { key };
        showController();
        return;
      }
      writeStore(ROOM_KEY_STORE, null);
    } catch (e) { /* sem conexão: cai no login */ }
  }

  const saved = readStore(CREDENTIALS_KEY);
  if (saved?.user && saved?.pass) {
    try {
      if (await checkAccess(saved)) {
        credentials = saved;
        showController();
        return;
      }
    } catch (e) { /* mostra o login */ }
    writeStore(CREDENTIALS_KEY, null);
  }
  els.loginUser.value = saved?.user || 'admin';
  els.loginPass.focus();
  fetch(`/api/rooms/${room}`).then(r => r.json()).then(showLoginNotes).catch(() => {});
})();
