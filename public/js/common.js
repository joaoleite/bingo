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

// Cada frase tem variações (<id>.mp3, <id>-2.mp3, ...); o servidor escolhe qual tocar
const PHRASES = [
  { id: 'sim-saiu', label: '✅ Sim, já saiu!', variants: 4 },
  { id: 'nao-saiu', label: '❌ Ainda não saiu', variants: 4 },
  { id: 'conferir', label: '🔎 Vamos conferir', variants: 4 },
  { id: 'vencedor', label: '🏆 Temos vencedor!', variants: 4 },
  { id: 'aguarde', label: '✋ Um momento', variants: 4 }
];

function phraseClip(id, variant) {
  return variant > 1 ? `${id}-${variant}` : id;
}

const EXTRA_CLIPS = [
  'recap-inicio', 'recap-fim', 'nenhum', 'novo-jogo', 'teste',
  ...PHRASES.flatMap(p => Array.from({ length: p.variants }, (_, i) => phraseClip(p.id, i + 1)))
];

// Versão dos áudios que o servidor põe na página: muda quando eles são gerados de novo
const AUDIO_VERSION = document.querySelector('meta[name="bingo-audio"]')?.content || '';

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
  return room && /^[a-zA-Z0-9_-]{1,50}$/.test(room) ? room : 'bingo';
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

// Troca só as classes da letra, sem apagar uma animação que esteja rodando na bola
function renderBall(el, number, emptyHtml = '<span class="ball-number">–</span>') {
  const letter = number ? letterFor(number) : '';
  COLUMNS.forEach(col => el.classList.toggle(`l-${col.letter}`, col.letter === letter));
  el.classList.toggle('empty', !letter);
  el.innerHTML = number
    ? `<span class="ball-letter">${letter}</span><span class="ball-number">${number}</span>`
    : emptyHtml;
}

// Recomeça uma animação CSS mesmo que a classe já esteja no elemento
function restartAnimation(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function setConnection(el, connected) {
  el.classList.toggle('connected', connected);
  el.classList.toggle('disconnected', !connected);
  el.title = connected ? 'Conectado' : 'Sem conexão com o servidor';
}

// ---------- Aparelho ----------
// Cada aparelho guarda um id fixo e um nome, para o controle escolher onde tocar
function deviceStore(key, make) {
  try {
    let value = localStorage.getItem(key);
    if (!value) { value = make(); localStorage.setItem(key, value); }
    return value;
  } catch (e) { return make(); }
}

function guessDeviceName() {
  const ua = navigator.userAgent;
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/TV|SmartTV|Tizen|Web0S|AFT/.test(ua)) return 'TV';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Celular Android' : 'Tablet';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Computador';
  return 'Caixa de som';
}

const DEVICE_ID = deviceStore('bingo-device-id', () =>
  (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36));

function getDeviceName() {
  return deviceStore('bingo-device-name', guessDeviceName);
}
function setDeviceName(name) {
  try { localStorage.setItem('bingo-device-name', name); } catch (e) { /* ignora */ }
}

// Mantém a tela acesa (só funciona em localhost/https; nos outros casos ignora)
let wakeLockSentinel = null;
async function keepScreenOn() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible' && (!wakeLockSentinel || wakeLockSentinel.released)) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
    }
  } catch (e) { /* sem suporte ou sem toque ainda */ }
}
// No iPhone o pedido pode precisar de um toque; tenta de novo a cada toque até conseguir
document.addEventListener('pointerdown', keepScreenOn);
document.addEventListener('visibilitychange', keepScreenOn);

// ============================================
// LOCUTOR - toca os MP3 em fila, um de cada vez
// ============================================
// Usa um único elemento <audio>: depois que ele toca uma vez por clique do usuário,
// o navegador (inclusive iPhone) libera trocar o arquivo e tocar de novo sem novo clique.
class Announcer {
  constructor({ onClip, onBlocked, onLog } = {}) {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.queue = [];
    this.timer = null;
    this.busy = false;
    this.enabled = false;
    this.voice = DEFAULT_VOICE;
    this.onClip = onClip;
    this.onBlocked = onBlocked; // o navegador bloqueou o som: precisa de um toque na tela
    this.onLog = onLog;
    this.blocked = false;
    this.seen = [];

    this.lastSoundAt = 0;
    this.watchdog = null;

    this.audio.addEventListener('ended', () => {
      this.trace?.(`terminou ${this.current} (${this.audio.duration?.toFixed(1)}s)`);
      this.lastSoundAt = Date.now();
      this.next();
    });
    this.audio.addEventListener('playing', () => this.trace?.(`tocando ${this.current}`));
    this.audio.addEventListener('error', () => {
      if (this.audio.getAttribute('src')) this.onLog?.(`erro no arquivo ${this.audio.getAttribute('src')}: código ${this.audio.error?.code}`);
      this.next();
    });
  }

  // Precisa ser chamado dentro de um toque. Marca como ligado na hora, para um anúncio que
  // chegue enquanto o iPhone ainda libera o áudio não ser descartado.
  // Se havia fala pendente (bloqueio), ela continua quando o sinal terminar.
  async enable() {
    const wasEnabled = this.enabled;
    // Bloqueado: o item travado está no src e também no início da fila
    const resuming = this.blocked && this.queue.length > 0;
    if (resuming) this.queue.shift();
    this.enabled = true;
    if (!resuming) this.audio.src = this.clipUrl('sinal');
    try {
      await this.audio.play();
    } catch (error) {
      // AbortError = outro som começou no meio; o áudio já ficou liberado
      if (error.name !== 'AbortError') {
        this.enabled = wasEnabled;
        throw error;
      }
    }
    this.blocked = false;
    if (!wasEnabled) this.preloadAll();
    if (resuming) this.busy = true;
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
    if (clip.startsWith('/')) return clip; // gravação do celular
    const version = AUDIO_VERSION ? `?v=${AUDIO_VERSION}` : '';
    if (clip === 'sinal' || clip === 'silencio') return `/audio/${clip}.mp3${version}`;
    return `/audio/${this.voice}/${clip}.mp3${version}`;
  }

  preloadAll() {
    const clips = ['sinal', 'silencio', ...EXTRA_CLIPS];
    for (let n = 1; n <= 75; n++) clips.push(String(n));
    clips.forEach(clip => fetch(this.clipUrl(clip)).catch(() => {}));
  }

  stop() {
    this.queue = [];
    clearTimeout(this.timer);
    clearTimeout(this.watchdog);
    this.audio.pause();
    this.busy = false;
    this.onClip?.(null);
  }

  play(items) {
    if (!this.enabled) return;
    const idle = !this.busy && Date.now() - this.lastSoundAt > 4000;
    this.stop();
    // Caixa bluetooth parada há alguns segundos "come" o começo do som: um silêncio curto
    // antes dá tempo de ela acordar sem cortar o plim nem o número
    this.queue = idle ? ['silencio', ...items] : items;
    this.next();
  }

  next() {
    clearTimeout(this.timer);
    clearTimeout(this.watchdog);
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

    this.onClip?.(item === 'silencio' ? null : item);
    this.current = item;
    this.audio.src = this.clipUrl(item);
    // Se o iPhone nunca avisar que terminou, segue a fila em vez de travar para sempre
    this.watchdog = setTimeout(() => {
      this.onLog?.(`travou em ${item}, pulando`);
      this.next();
    }, item.startsWith('/') ? 35000 : 10000);
    this.audio.play().catch(error => {
      if (error.name === 'NotAllowedError') {
        // iPhone travou o som (tela bloqueada, ligação, outro app): guarda e espera um toque
        clearTimeout(this.watchdog);
        this.queue.unshift(item);
        this.busy = false;
        this.blocked = true;
        this.onLog?.(`som bloqueado: ${error.message}`);
        this.onBlocked?.();
        return;
      }
      if (error.name !== 'AbortError') this.onLog?.(`falha ao tocar ${item}: ${error.name} ${error.message}`);
      this.next();
    });
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

  // O controle pode mandar só para algumas caixas; 'stop' vale para todas
  isForMe(event) {
    return event.kind === 'stop' || !Array.isArray(event.targets) || event.targets.includes(DEVICE_ID);
  }

  handle(event) {
    if (!this.isForMe(event)) return;
    if (event.id) {
      if (this.seen.includes(event.id)) return;
      this.seen = [...this.seen.slice(-49), event.id];
    }
    if (event.kind === 'number') this.number(event.number, event.repeat);
    else if (event.kind === 'recap') this.recap(event.numbers || []);
    else if (event.kind === 'new-game') this.play(['novo-jogo']);
    else if (event.kind === 'voice-test') this.play(['teste']);
    else if (event.kind === 'phrase') this.play([phraseClip(event.phrase, event.variant)]);
    else if (event.kind === 'check') {
      const answer = phraseClip(event.drawn ? 'sim-saiu' : 'nao-saiu', event.variant);
      this.play(['sinal', { wait: 150 }, String(event.number), { wait: 300 }, answer]);
    } else if (event.kind === 'clip') this.play(['sinal', { wait: 150 }, event.url]);
    else if (event.kind === 'stop') this.stop();
  }
}
