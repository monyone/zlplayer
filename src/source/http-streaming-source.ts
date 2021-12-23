export default class HTTPStreamingSource {  
  private fetchReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private abortController: AbortController | null = null;

  private outputStream: ReadableStream<Uint8Array>;
  private outputController: ReadableStreamController<Uint8Array>; 

  public constructor () {
    this.outputStream = new ReadableStream<Uint8Array>({
      start (controller) {
        this.outputController = controller;
      }
    })
  }

  static isSupported () {
    return !!(self.fetch) && !!(self.ReadableStream);
  }

  public abort() {
    try {
      this.outputStream?.cancel();
      this.outputStream = new ReadableStream<Uint8Array>({
        start (controller) {
          this.outputController = controller;
        }
      });
    } catch (e: unknown) {}
    try {
      this.fetchReader?.cancel();
    } catch (e: unknown) {}
    try {
      this.abortController?.abort();
    } catch (e: unknown) {}
  }

  public async load(url: string): Promise<boolean> {
    this.abort();

    if (self.AbortController) {
      this.abortController = new self.AbortController();
    }

    try {
      const result = await fetch(url, {
        signal: this.abortController?.signal
      });

      if (!(result.ok && 200 <= result.status && result.status < 300)) {
        return null;
      }

      this.fetchReader = result.body.getReader();
      this.pump();
      return true;
    } catch (e: unknown) {
      return false;
    }
  }

  public getStream(): ReadableStream<Uint8Array> {
    return this.outputStream;
  }

  private pump(): void {
    this.fetchReader.read().then(({ value, done }) => {
      if (done) {
        return;
      } else if (this.abortController?.signal.aborted) {
        return;
      } else if (!this.outputController) {
        return;
      }

      this.outputController.enqueue(value);
      this.pump();
    })
  }
};