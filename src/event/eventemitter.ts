import { Events } from './events'

export default class EventEmitter {  

  private listeners = new Map<keyof Events, ((payload: unknown) => void)[]>();

  public on<T extends keyof Events>(type: T, handler: ((payload: Events[T]) => void)): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(handler as ((payload: unknown) => void));
  }

  public off<T extends keyof Events>(type: T, handler: ((payload: Events[T]) => void)): void {
    if (!this.listeners.has(type)) { return; }
    const index = this.listeners.get(type).indexOf(handler as ((payload: unknown) => void));
    if (index >= 0) {
      this.listeners.get(type)!.splice(index, 1);
    }
  }

  public emit<T extends keyof Events>(type: T, payload: Events[T]) {
    this.listeners.get(type).forEach((func) => {
      func.call(this, payload);
    })
  }
};