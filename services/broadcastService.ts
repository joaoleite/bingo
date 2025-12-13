import { BroadcastMessage, GameState } from '../types';

const CHANNEL_NAME = 'bingo_master_channel';

class BroadcastService {
  private channel: BroadcastChannel;
  private listeners: ((message: BroadcastMessage) => void)[] = [];

  constructor() {
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (event) => {
      this.notifyListeners(event.data);
    };
  }

  public subscribe(callback: (message: BroadcastMessage) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(message: BroadcastMessage) {
    this.listeners.forEach(listener => listener(message));
  }

  public sendMessage(message: BroadcastMessage) {
    this.channel.postMessage(message);
  }

  public close() {
    this.channel.close();
  }
}

export const broadcastService = new BroadcastService();