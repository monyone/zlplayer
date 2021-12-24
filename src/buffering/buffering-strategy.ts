export default abstract class BufferingStrategy {
  public abstract getStream(): ReadableStream<Uint8Array>;
  public abstract abort(): void;
};