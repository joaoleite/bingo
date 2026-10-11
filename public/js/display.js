// ============================================
// TELA DO BINGO - fica no aparelho ligado à caixa de som
// ============================================

const room = getRoomFromUrl();
const socket = io();
const els = {
  ball: document.getElementById('ball'),
  recent: document.getElementById('recent'),
  board: document.getElementById('board'),
  drawnCount: document.getElementById('drawn-count'),
  connection: document.getElementById('connection'),
  btnSound: document.getElementById('btn-sound'),
  btnName: document.getElementById('btn-name'),
  btnFullscreen: document.getElementById('btn-fullscreen'),
  overlay: document.getElementById('sound-overlay'),
  btnEnableSound: document.getElementById('btn-enable-sound'),
  btnNoSound: document.getElementById('btn-no-sound'),
  deviceName: document.getElementById('device-name'),
  connect: document.getElementById('connect'),
  adminQr: document.getElementById('admin-qr'),
  adminUrl: document.getElementById('admin-url')
};

const cells = buildBoard(els.board);
let state = { drawnNumbers: [], currentNumber: null };

// Destaca na cartela o número que está sendo falado (útil na recapitulação)
const announcer = new Announcer({
  onClip: clip => {
    els.board.querySelector('.speaking')?.classList.remove('speaking');
    if (clip && cells[clip]) cells[clip].classList.add('speaking');
  }
});

function render() {
  const { drawnNumbers, currentNumber } = state;
  els.drawnCount.textContent = drawnNumbers.length;
  renderBall(els.ball, currentNumber);
  updateBoard(cells, drawnNumbers, currentNumber);

  els.recent.innerHTML = '';
  drawnNumbers.slice(0, -1).slice(-6).reverse().forEach(n => {
    const chip = document.createElement('span');
    chip.className = `chip l-${letterFor(n)}`;
    chip.textContent = `${letterFor(n)} ${n}`;
    els.recent.appendChild(chip);
  });
}

function renderName() {
  els.btnName.textContent = `📍 ${getDeviceName()}`;
}

// Nome que aparece no controle, para escolher em qual caixa tocar
function renameDevice() {
  const name = prompt('Nome desta caixa de som (aparece no controle):', getDeviceName());
  if (!name || !name.trim()) return;
  setDeviceName(name.trim().slice(0, 30));
  renderName();
  socket.emit('speaker', { on: announcer.enabled, deviceName: getDeviceName() });
}

function renderSoundButton() {
  els.btnSound.textContent = announcer.enabled ? '🔊 Som ligado' : '🔇 Som desligado';
  els.btnSound.classList.toggle('btn-warning', !announcer.enabled);
}

async function enableSound() {
  const typed = els.deviceName.value.trim();
  if (typed && typed !== getDeviceName()) {
    setDeviceName(typed.slice(0, 30));
    renderName();
  }
  try {
    await announcer.enable();
    socket.emit('speaker', { on: true, deviceName: getDeviceName() });
    els.overlay.hidden = true;
    keepScreenOn();
  } catch (e) {
    alert('O navegador bloqueou o som. Clique de novo em "Ativar som".');
  }
  renderSoundButton();
}

function disableSound() {
  announcer.disable();
  socket.emit('speaker', { on: false });
  renderSoundButton();
}

// ---------- Socket ----------
socket.on('connect', () => {
  setConnection(els.connection, true);
  socket.emit('join-room', { roomName: room, speaker: announcer.enabled, deviceId: DEVICE_ID, deviceName: getDeviceName() });
});
socket.on('disconnect', () => setConnection(els.connection, false));

socket.on('room-state', data => {
  if (data.name !== room) return;
  state = data;
  announcer.setVoice(data.voice);
  render();
});

socket.on('announce', event => {
  if (event.room !== room) return;
  if (event.kind === 'number' && announcer.isForMe(event)) {
    els.ball.classList.remove('pop');
    void els.ball.offsetWidth; // reinicia a animação
    els.ball.classList.add('pop');
  }
  announcer.handle(event);
});

// ---------- Botões ----------
els.btnEnableSound.addEventListener('click', enableSound);
els.btnNoSound.addEventListener('click', () => { els.overlay.hidden = true; });
els.btnSound.addEventListener('click', () => (announcer.enabled ? disableSound() : enableSound()));
els.btnName.addEventListener('click', renameDevice);
els.btnFullscreen.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
});

// Endereço + QR code para abrir o controle no celular
fetch(`/api/info?sala=${room}`)
  .then(r => r.json())
  .then(info => {
    els.adminQr.src = info.adminQr;
    els.adminUrl.textContent = info.adminUrl.replace(/^http:\/\//, '');
    els.connect.hidden = false;
  })
  .catch(() => {});

renderSoundButton();
renderName();
els.deviceName.value = getDeviceName();
