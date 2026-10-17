// Servidor de verdade numa porta livre: rotas do controle, senha, frases e CORS
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const AUTH = `Basic ${Buffer.from('admin:admin').toString('base64')}`;
let child;
let base;

function freePort() {
  return new Promise(resolve => {
    const probe = net.createServer().listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// Sobe o server.js e devolve o processo; resolve quando /health responde
async function startServer(env) {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-server-'));
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), STATE_FILE: path.join(dir, 'state.json'), NODE_ENV: 'test', ...env },
    stdio: 'ignore'
  });
  const url = `http://localhost:${port}`;
  for (let i = 0; i < 50; i++) {
    if (proc.exitCode !== null) break;
    try {
      if ((await fetch(`${url}/health`)).ok) return { proc, url };
    } catch { /* ainda subindo */ }
    await new Promise(r => setTimeout(r, 100));
  }
  proc.kill();
  throw new Error('servidor não subiu');
}

const api = (route, body) => fetch(`${base}/api/rooms/bingo/${route}`, {
  method: 'POST',
  headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
  body: JSON.stringify(body || {})
});

before(async () => {
  ({ proc: child, url: base } = await startServer());
});
after(() => child?.kill());

test('health responde', async () => {
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');
});

test('telão sai com a versão dos arquivos e dos áudios', async () => {
  const html = await (await fetch(base)).text();
  assert.match(html, /<meta name="bingo-version" content="[0-9a-f]{10}">/);
  assert.match(html, /<meta name="bingo-audio" content="[0-9a-f]{10}">/);
  assert.match(html, /\/js\/display\.js\?v=[0-9a-f]{10}/);
});

test('controle exige senha', async () => {
  assert.equal((await fetch(`${base}/api/admin/check`)).status, 401);
  const semSenha = await fetch(`${base}/api/rooms/bingo/mark`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"number":5}'
  });
  assert.equal(semSenha.status, 401);
  assert.equal((await fetch(`${base}/api/admin/check`, { headers: { Authorization: AUTH } })).status, 200);
});

test('marcar, repetir, desfazer, sortear e novo jogo', async () => {
  let data = await (await api('mark', { number: 44 })).json();
  assert.equal(data.success, true);
  assert.equal(data.currentNumber, 44);

  assert.equal((await api('mark', { number: 44 })).status, 409, 'aceitou número repetido');
  assert.equal((await api('mark', { number: 99 })).status, 409, 'aceitou número fora da cartela');

  data = await (await api('draw')).json();
  assert.ok(data.number >= 1 && data.number <= 75 && data.number !== 44);
  assert.deepEqual(data.drawnNumbers, [44, data.number]);

  data = await (await api('undo')).json();
  assert.deepEqual(data.drawnNumbers, [44]);

  data = await (await api('reset')).json();
  assert.deepEqual(data.drawnNumbers, []);
});

test('respostas rápidas variam sem repetir a anterior', async () => {
  const variants = [];
  for (let i = 0; i < 12; i++) {
    const data = await (await api('announce', { mode: 'phrase', phrase: 'vencedor' })).json();
    variants.push(data.announce.variant);
  }
  variants.forEach(v => assert.ok(v >= 1 && v <= 4, `variação ${v} fora de 1..4`));
  for (let i = 1; i < variants.length; i++) assert.notEqual(variants[i], variants[i - 1], `repetiu: ${variants}`);
  assert.ok(new Set(variants).size >= 3, `pouca variação: ${variants}`);
});

test('frase que não existe é recusada', async () => {
  for (const phrase of ['nada', '__proto__', 'constructor']) {
    assert.equal((await api('announce', { mode: 'phrase', phrase })).status, 400, phrase);
  }
});

test('conferir responde se já saiu, com variação', async () => {
  await api('mark', { number: 12 });
  let data = await (await api('announce', { mode: 'check', number: 12 })).json();
  assert.equal(data.drawn, true);
  assert.ok(data.announce.variant >= 1);
  data = await (await api('announce', { mode: 'check', number: 13 })).json();
  assert.equal(data.drawn, false);
  await api('reset');
});

test('outro site não consegue abrir o websocket (sem CORS)', async () => {
  const response = await fetch(`${base}/socket.io/?EIO=4&transport=polling`, {
    headers: { Origin: 'https://outro-site.example' }
  });
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('em produção não sobe com senha fraca', async () => {
  const port = await freePort();
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production', ADMIN_PASS: 'admin' },
    stdio: 'ignore'
  });
  const code = await new Promise(resolve => {
    const timer = setTimeout(() => { proc.kill(); resolve('ficou de pé'); }, 3000);
    proc.on('exit', exitCode => { clearTimeout(timer); resolve(exitCode); });
  });
  assert.equal(code, 1);
});
