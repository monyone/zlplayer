import EventEmitter from "../event/eventemitter";
export default abstract class BufferingStrategy {
  public abstract setEmitter(emitter: EventEmitter): void;
  public abstract abort(): void;
};