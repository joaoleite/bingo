const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'game-state.json');

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
            const resolve = this.queue.shift();
            resolve();
        } else {
            this.locked = false;
        }
    }
}

const mutex = new Mutex();

class GameState {
    constructor() {
        this.rooms = {};
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(STATE_FILE)) {
                const data = fs.readFileSync(STATE_FILE, 'utf8');
                this.rooms = JSON.parse(data);
            }
        } catch (error) {
            console.error('Erro ao carregar estado:', error);
            this.rooms = {};
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

    _getRoomState(roomName) {
        if (!roomName) roomName = 'public';

        if (!this.rooms[roomName]) {
            this.rooms[roomName] = {
                currentNumber: null,
                drawnNumbers: [],
                isShowingAll: false,
                voicePreference: 'default',
                lastActivity: Date.now()
            };
        }
        return this.rooms[roomName];
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
