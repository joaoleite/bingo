// Estado do jogo: sorteio, desfazer, novo jogo e o arquivo salvo em disco
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// O módulo lê STATE_FILE ao ser carregado: aponta para uma pasta temporária antes do require
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bingo-state-'));
const STATE_FILE = path.join(dir, 'game-state.json');
process.env.STATE_FILE = STATE_FILE;
const gameState = require('../gameState');

const ROOM = 'teste';
const saved = () => JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))[ROOM];

beforeEach(() => gameState.reset(ROOM));

test('marca o número e ele vira o atual', async () => {
  await gameState.drawNumber(ROOM, 10);
  await gameState.drawNumber(ROOM, 44);
  const room = gameState.get(ROOM);
  assert.equal(room.currentNumber, 44);
  assert.deepEqual(room.drawnNumbers, [10, 44]);
});

test('recusa número repetido', async () => {
  await gameState.drawNumber(ROOM, 7);
  await assert.rejects(gameState.drawNumber(ROOM, 7), /já foi sorteado/);
  assert.deepEqual(gameState.get(ROOM).drawnNumbers, [7]);
});

test('recusa número fora de 1 a 75', async () => {
  for (const number of [0, 76, -3, 1.5, NaN]) {
    await assert.rejects(gameState.drawNumber(ROOM, number), /entre 1 e 75/, `aceitou ${number}`);
  }
  assert.deepEqual(gameState.get(ROOM).drawnNumbers, []);
});

test('desfazer tira o último e volta o anterior como atual', async () => {
  await gameState.drawNumber(ROOM, 3);
  await gameState.drawNumber(ROOM, 61);
  const { removed, state } = await gameState.undo(ROOM);
  assert.equal(removed, 61);
  assert.equal(state.currentNumber, 3);
  assert.deepEqual(state.drawnNumbers, [3]);
});

test('desfazer sem números não quebra', async () => {
  const { removed, state } = await gameState.undo(ROOM);
  assert.equal(removed, null);
  assert.equal(state.currentNumber, null);
});

test('novo jogo apaga os números', async () => {
  await gameState.drawNumber(ROOM, 20);
  await gameState.reset(ROOM);
  const room = gameState.get(ROOM);
  assert.deepEqual(room.drawnNumbers, []);
  assert.equal(room.currentNumber, null);
});

test('salva em disco a cada mudança', async () => {
  await gameState.drawNumber(ROOM, 15);
  await gameState.drawNumber(ROOM, 30);
  assert.deepEqual(saved().drawnNumbers, [15, 30]);
  await gameState.undo(ROOM);
  assert.deepEqual(saved().drawnNumbers, [15]);
});

test('consultar com peek não cria a sala', () => {
  assert.equal(gameState.peek('nao-existe-0000'), null);
  assert.equal(gameState.peek('nao-existe-0000'), null);
  assert.equal('nao-existe-0000' in gameState.rooms, false);
});

test('bingo criado guarda o hash da chave e não pode ser criado duas vezes', async () => {
  await gameState.createRoom('pipoca-azul-0001', 'a'.repeat(64));
  assert.equal(gameState.peek('pipoca-azul-0001').keyHash, 'a'.repeat(64));
  await assert.rejects(gameState.createRoom('pipoca-azul-0001', 'b'.repeat(64)), /já existe/);
});

test('faxina apaga só os bingos com dono parados há muito tempo', async () => {
  const now = Date.now();
  const hours = h => h * 60 * 60 * 1000;
  await gameState.createRoom('velho-azul-0002', 'c'.repeat(64));
  await gameState.createRoom('novo-azul-0003', 'd'.repeat(64));
  await gameState.drawNumber('familia_antiga', 5);
  gameState.peek('velho-azul-0002').lastActivity = now - hours(49);
  gameState.peek('novo-azul-0003').lastActivity = now - hours(1);
  gameState.peek('familia_antiga').lastActivity = now - hours(500);

  const removed = await gameState.removeInactive(hours(48), now);
  assert.deepEqual(removed, ['velho-azul-0002']);
  assert.equal(gameState.peek('velho-azul-0002'), null);
  assert.ok(gameState.peek('novo-azul-0003'));
  assert.ok(gameState.peek('familia_antiga'), 'apagou sala sem dono');
  assert.equal('velho-azul-0002' in JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')), false);
});

test('dois toques ao mesmo tempo no mesmo número marcam uma vez só', async () => {
  const results = await Promise.allSettled([
    gameState.drawNumber(ROOM, 50),
    gameState.drawNumber(ROOM, 50),
    gameState.drawNumber(ROOM, 50)
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.deepEqual(gameState.get(ROOM).drawnNumbers, [50]);
});
