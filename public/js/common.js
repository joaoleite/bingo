// ============================================
// BINGO - código compartilhado entre a tela e o controle
// ============================================

const COLUMNS = [
  { letter: 'B', min: 1, max: 15 },
  { letter: 'I', min: 16, max: 30 },
  { letter: 'N', min: 31, max: 45 },
  { letter: 'G', min: 46, max: 60 },
  { letter: 'O', min: 61, max: 75 }
];

const EXTRA_CLIPS = ['recap-inicio', 'recap-fim', 'nenhum', 'novo-jogo', 'teste'];

// Vozes disponíveis (pastas em public/audio/, geradas por scripts/gerar-audios.sh)
const VOICES = [
  { id: 'francisca', label: 'Francisca (feminina)' },
  { id: 'antonio', label: 'Antônio (masculina)' },
  { id: 'thalita', label: 'Thalita (feminina)' }
];
const DEFAULT_VOICE = 'francisca';

function letterFor(number) {
  return COLUMNS.find(col => number >= col.min && number <= col.max)?.letter || '';
}

function getRoomFromUrl() {
  const room = new URLSearchParams(window.location.search).get('sala');
  return room && /^[a-zA-Z0-9_]{1,50}$/.test(room) ? room : 'bingo';
}

// Monta a cartela com os 75 números agrupados por letra.
// A ordem no DOM é [B, 1..15, I, 16..30, ...]; o CSS decide se cada letra vira linha ou coluna.
function buildBoard(container, { asButtons = false, onSelect } = {}) {
  container.innerHTML = '';
  const cells = {};

  COLUMNS.forEach(col => {
    const head = document.createElement('div');
    head.className = `board-letter l-${col.letter}`;
    head.textContent = col.letter;
    container.appendChild(head);

    for (let n = col.min; n <= col.max; n++) {
      const cell = document.createElement(asButtons ? 'button' : 'div');
      cell.className = `board-cell l-${col.letter}`;
      cell.dataset.number = n;
      cell.textContent = n;
      if (asButtons) {
        cell.type = 'button';
        cell.setAttribute('aria-label', `${col.letter} ${n}`);
        cell.addEventListener('click', () => onSelect?.(n));
      }
      container.appendChild(cell);
      cells[n] = cell;
    }
  });

  return cells;
}

function updateBoard(cells, drawnNumbers, currentNumber) {
  const drawn = new Set(drawnNumbers);
  Object.entries(cells).forEach(([n, cell]) => {
    const number = Number(n);
    cell.classList.toggle('drawn', drawn.has(number));
    cell.classList.toggle('current', number === currentNumber);
  });
}

function renderBall(el, number) {
  const letter = number ? letterFor(number) : '';
  el.className = `ball ${el.classList.contains('ball-small') ? 'ball-small' : ''} ${letter ? `l-${letter}` : 'empty'}`;
  el.innerHTML = number
    ? `<span class="ball-letter">${letter}</span><span class="ball-number">${number}</span>`
    : '<span class="ball-number">–</span>';
}

function setConnection(el, connected) {
  el.classList.toggle('connected', connected);
  el.classList.toggle('disconnected', !connected);
  el.title = connected ? 'Conectado' : 'Sem conexão com o servidor';
}

// Mantém a tela acesa (só funciona em localhost/https; nos outros casos ignora)
async function keepScreenOn() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      await navigator.wakeLock.request('screen');
    }
  } catch (e) { /* sem suporte */ }
}
document.addEventListener('visibilitychange', keepScreenOn);

// ============================================
// LOCUTOR - toca os MP3 em fila, um de cada vez
// ============================================
// Usa um único elemento <audio>: depois que ele toca uma vez por clique do usuário,
// o navegador (inclusive iPhone) libera trocar o arquivo e tocar de novo sem novo clique.
class Announcer {
  constructor({ onClip } = {}) {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.queue = [];
    this.timer = null;
    this.busy = false;
    this.enabled = false;
    this.voice = DEFAULT_VOICE;
    this.onClip = onClip;

    this.audio.addEventListener('ended', () => this.next());
    this.audio.addEventListener('error', () => this.next());
  }

  // Precisa ser chamado dentro de um clique/toque
  async enable() {
    this.audio.src = '/audio/sinal.mp3';
    await this.audio.play();
    this.enabled = true;
    this.preloadAll();
  }

  disable() {
    this.stop();
    this.enabled = false;
  }

  setVoice(voice) {
    const valid = VOICES.some(v => v.id === voice) ? voice : DEFAULT_VOICE;
    if (valid === this.voice) return;
    this.voice = valid;
    if (this.enabled) this.preloadAll();
  }

  clipUrl(clip) {
    return clip === 'sinal' ? '/audio/sinal.mp3' : `/audio/${this.voice}/${clip}.mp3`;
  }

  preloadAll() {
    const clips = ['sinal', ...EXTRA_CLIPS];
    for (let n = 1; n <= 75; n++) clips.push(String(n));
    clips.forEach(clip => fetch(this.clipUrl(clip)).catch(() => {}));
  }

  stop() {
    this.queue = [];
    clearTimeout(this.timer);
    this.audio.pause();
    this.busy = false;
    this.onClip?.(null);
  }

  play(items) {
    if (!this.enabled) return;
    this.stop();
    this.queue = items;
    this.next();
  }

  next() {
    clearTimeout(this.timer);
    const item = this.queue.shift();

    if (item === undefined) {
      this.busy = false;
      this.onClip?.(null);
      return;
    }

    this.busy = true;
    if (typeof item === 'object') {
      this.timer = setTimeout(() => this.next(), item.wait);
      return;
    }

    this.onClip?.(item);
    this.audio.src = this.clipUrl(item);
    this.audio.play().catch(() => this.next());
  }

  // "Letra B. Número 10." — com sinal antes e repetição opcional
  number(number, repeat = 1) {
    const items = ['sinal', { wait: 150 }, String(number)];
    for (let i = 1; i < repeat; i++) items.push({ wait: 1300 }, String(number));
    this.play(items);
  }

  recap(numbers) {
    if (!numbers.length) return this.play(['nenhum']);
    const items = ['recap-inicio', { wait: 600 }];
    numbers.forEach(n => items.push(String(n), { wait: 500 }));
    items.push('recap-fim');
    this.play(items);
  }

  handle(event) {
    if (event.kind === 'number') this.number(event.number, event.repeat);
    else if (event.kind === 'recap') this.recap(event.numbers || []);
    else if (event.kind === 'new-game') this.play(['novo-jogo']);
    else if (event.kind === 'voice-test') this.play(['teste']);
    else if (event.kind === 'stop') this.stop();
  }
}
