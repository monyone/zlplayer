export type LoadOption = {
  fetchOptions?: RequestInit
}

export default abstract class Source {  
  public abstract abort(): void;
  public abstract load(url: string, options?: LoadOption): Promise<boolean>;
  public abstract getStream(): ReadableStream<Uint8Array>;
};