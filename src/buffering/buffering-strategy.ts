import EventEmitter from "../event/eventemitter";
export default abstract class BufferingStrategy {
  public abstract setEmitter(emitter: EventEmitter): void;
  public abstract start(): void;
  public abstract abort(): void;
  public abstract destroy(): void;
};