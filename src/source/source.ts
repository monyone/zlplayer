export default abstract class Source {  
  public abstract abort(): void;
  public abstract load(url: string): Promise<boolean>;
  public abstract getStream(): ReadableStream<Uint8Array>;
};