import EventEmitter from "../event/eventemitter";

export default abstract class Decoder {
  public abstract setEmitter(emitter: EventEmitter): void;
  public abstract init(): Promise<void>
};