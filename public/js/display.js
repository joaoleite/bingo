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
  adminUrl: document.getElementById('admin-url'),
  celebration: document.getElementById('celebration')
};

const cells = buildBoard(els.board);
let state = { drawnNumbers: [], currentNumber: null };

// Destaca na cartela o número que está sendo falado (útil na recapitulação)
const announcer = new Announcer({
  onClip: clip => {
    els.board.querySelector('.speaking')?.classList.remove('speaking');
    if (clip && cells[clip]) cells[clip].classList.add('speaking');
  },
  // Navegador travou o som: mostra de novo o botão "Ativar som"
  onBlocked: () => { els.overlay.hidden = false; },
  onLog: message => socket.emit('client-log', { message })
});

const WAITING_HTML = '<span class="ball-wait">Aguardando<br>o primeiro<br>número…</span>';
// undefined até chegar o primeiro estado: abrir a tela não anima a bola
let shownNumber;

function render() {
  const { drawnNumbers, currentNumber } = state;
  els.drawnCount.textContent = drawnNumbers.length;
  renderBall(els.ball, currentNumber, WAITING_HTML);
  // Anima quando o número muda na tela, com ou sem som nesta caixa
  if (shownNumber !== undefined && currentNumber && currentNumber !== shownNumber) {
    restartAnimation(els.ball, 'arrive');
  }
  shownNumber = currentNumber;
  // Fundo da tela tingido com a cor da letra do número atual
  document.body.dataset.letter = currentNumber ? letterFor(currentNumber) : '';
  updateBoard(cells, drawnNumbers, currentNumber);

  els.recent.innerHTML = '';
  drawnNumbers.slice(0, -1).slice(-10).reverse().forEach(n => {
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
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !socket.connected) socket.connect();
});

socket.on('room-state', data => {
  if (data.name !== room) return;
  state = data;
  announcer.setVoice(data.voice);
  render();
});

socket.on('announce', event => {
  if (event.room !== room) return;
  // A festa é só visual: aparece em todas as telas da sala, mesmo as que não vão falar
  if (event.kind === 'phrase' && event.phrase === 'vencedor') celebrate(event.id);
  announcer.handle(event);
});

// ---------- "BINGO!" com confete ----------
const CONFETTI_COLORS = ['--B', '--I', '--N', '--G', '--O', '--primary'];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let celebrationTimer = null;
let celebratedId = null;

function celebrate(id) {
  if (id && id === celebratedId) return; // mesmo anúncio recebido de novo
  celebratedId = id;
  clearTimeout(celebrationTimer);
  els.celebration.querySelectorAll('.confetti').forEach(piece => piece.remove());
  if (!reduceMotion.matches) {
    for (let i = 0; i < 140; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti';
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.cssText = [
        `left: ${Math.random() * 100}%`,
        `background: var(${color})`,
        `--w: ${8 + Math.random() * 10}px`,
        `--drift: ${(Math.random() - 0.5) * 30}vw`,
        `--spin: ${(Math.random() - 0.5) * 1440}deg`,
        `--dur: ${2.8 + Math.random() * 2.4}s`,
        `--delay: ${Math.random() * 1.2}s`
      ].join(';');
      els.celebration.appendChild(piece);
    }
  }
  els.celebration.hidden = false;
  els.celebration.querySelectorAll('.celebration-text span').forEach(letter => restartAnimation(letter, 'jump'));
  celebrationTimer = setTimeout(endCelebration, 7000);
}

function endCelebration() {
  clearTimeout(celebrationTimer);
  els.celebration.hidden = true;
  els.celebration.querySelectorAll('.confetti').forEach(piece => piece.remove());
}

// ---------- Botões ----------
els.btnEnableSound.addEventListener('click', enableSound);
els.btnNoSound.addEventListener('click', () => { els.overlay.hidden = true; });
els.btnSound.addEventListener('click', () => (announcer.enabled ? disableSound() : enableSound()));
els.btnName.addEventListener('click', renameDevice);
els.celebration.addEventListener('click', endCelebration);
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
