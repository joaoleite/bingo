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

test('dois toques ao mesmo tempo no mesmo número marcam uma vez só', async () => {
  const results = await Promise.allSettled([
    gameState.drawNumber(ROOM, 50),
    gameState.drawNumber(ROOM, 50),
    gameState.drawNumber(ROOM, 50)
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.deepEqual(gameState.get(ROOM).drawnNumbers, [50]);
});
