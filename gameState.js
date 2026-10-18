const fs = require('fs');
const path = require('path');

// Em produção aponta para um volume (STATE_FILE=/data/game-state.json) para sobreviver ao redeploy
const STATE_FILE = process.env.STATE_FILE || path.join(__dirname, 'game-state.json');
fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });

// Mutex simples para evitar race conditions
class Mutex {
    constructor() {
        this.locked = false;
        this.queue = [];
    }

    async acquire() {
        if (!this.locked) {
            this.locked = true;
            return () => this.release();
        }

        return new Promise(resolve => {
            this.queue.push(resolve);
        });
    }

    release() {
        if (this.queue.length > 0) {
            // Passa a vez para o próximo da fila, entregando a função de liberar
            const resolve = this.queue.shift();
            resolve(() => this.release());
        } else {
            this.locked = false;
        }
    }
}

const mutex = new Mutex();

class GameState {
    constructor() {
        // Sem protótipo: uma sala chamada "__proto__" ou "constructor" vira só mais uma chave
        this.rooms = Object.create(null);
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(STATE_FILE)) {
                const data = fs.readFileSync(STATE_FILE, 'utf8');
                this.rooms = Object.assign(Object.create(null), JSON.parse(data));
            }
        } catch (error) {
            console.error('Erro ao carregar estado:', error);
            this.rooms = Object.create(null);
        }
    }

    save() {
        try {
            fs.writeFileSync(STATE_FILE, JSON.stringify(this.rooms, null, 2));
        } catch (error) {
            console.error('Erro ao salvar estado:', error);
        }
    }

    async saveAsync() {
        try {
            await fs.promises.writeFile(STATE_FILE, JSON.stringify(this.rooms, null, 2));
        } catch (error) {
            console.error('Erro ao salvar estado:', error);
        }
    }

    _newRoom() {
        return {
            currentNumber: null,
            drawnNumbers: [],
            isShowingAll: false,
            voicePreference: 'default',
            lastActivity: Date.now()
        };
    }

    _getRoomState(roomName) {
        if (!roomName) roomName = 'public';

        if (!this.rooms[roomName]) {
            this.rooms[roomName] = this._newRoom();
        }
        return this.rooms[roomName];
    }

    // Consulta sem criar: quem só está olhando não pode encher o arquivo de salas
    peek(roomName) {
        return Object.hasOwn(this.rooms, roomName) ? this.rooms[roomName] : null;
    }

    // Sala criada em /novo: tem dono (hash da chave do controle) e expira quando fica parada
    async createRoom(roomName, keyHash) {
        const release = await mutex.acquire();
        try {
            if (this.peek(roomName)) throw new Error('Sala já existe');
            this.rooms[roomName] = { ...this._newRoom(), keyHash, createdAt: Date.now() };
            this.save();
            return this.rooms[roomName];
        } finally {
            release();
        }
    }

    countOwned() {
        return Object.values(this.rooms).filter(room => room.keyHash).length;
    }

    // Apaga as salas paradas há mais de maxAgeMs
    async removeInactive(maxAgeMs, now = Date.now()) {
        const release = await mutex.acquire();
        try {
            const removed = Object.keys(this.rooms)
                .filter(name => now - (this.rooms[name].lastActivity || 0) > maxAgeMs);
            removed.forEach(name => delete this.rooms[name]);
            if (removed.length) this.save();
            return removed;
        } finally {
            release();
        }
    }

    async setVoicePreference(roomName, voiceName) {
        const release = await mutex.acquire();
        try {
            const state = this._getRoomState(roomName);
            state.voicePreference = voiceName;
            state.lastActivity = Date.now();
            this.save();
            return state;
        } finally {
            release();
        }
    }

    get(roomName) {
        return this._getRoomState(roomName);
    }

    async drawNumber(roomName, number) {
        const release = await mutex.acquire();
        try {
            const state = this._getRoomState(roomName);

            // Validar range 1-75
            if (number < 1 || number > 75 || !Number.isInteger(number)) {
                throw new Error('Número deve ser entre 1 e 75');
            }

            if (state.drawnNumbers.includes(number)) {
                throw new Error('Número já foi sorteado nesta sala');
            }

            state.currentNumber = number;
            state.drawnNumbers.push(number);
            state.isShowingAll = false;
            state.lastActivity = Date.now();

            this.save();
            return state;
        } finally {
            release();
        }
    }

    async undo(roomName) {
        const release = await mutex.acquire();
        try {
            const state = this._getRoomState(roomName);
            const removed = state.drawnNumbers.pop() || null;
            state.currentNumber = state.drawnNumbers[state.drawnNumbers.length - 1] || null;
            state.lastActivity = Date.now();
            this.save();
            return { state, removed };
        } finally {
            release();
        }
    }

    async reset(roomName) {
        const release = await mutex.acquire();
        try {
            const state = this._getRoomState(roomName);

            state.currentNumber = null;
            state.drawnNumbers = [];
            state.isShowingAll = false;
            state.lastActivity = Date.now();

            this.save();
            return state;
        } finally {
            release();
        }
    }

    async setShowAll(roomName, show) {
        const release = await mutex.acquire();
        try {
            const state = this._getRoomState(roomName);
            state.isShowingAll = show;
            state.lastActivity = Date.now();
            this.save();
            return state;
        } finally {
            release();
        }
    }

    async setShowLast(roomName) {
        const release = await mutex.acquire();
        try {
            const state = this._getRoomState(roomName);
            state.isShowingAll = false;
            state.lastActivity = Date.now();
            this.save();
            return state;
        } finally {
            release();
        }
    }
}

module.exports = new GameState();
