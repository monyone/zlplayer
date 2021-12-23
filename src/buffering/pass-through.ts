export default class PassThrough {  
  private inputReader: ReadableStreamDefaultReader<Uint8Array>;
  private outputStream: ReadableStream<Uint8Array>;
  private outputController: ReadableStreamController<Uint8Array>; 

  public constructor (readbableStream: ReadableStream<Uint8Array>) {
    this.inputReader = readbableStream.getReader();
    this.outputStream = new ReadableStream<Uint8Array>({
      start (controller) {
        this.outputController = controller;
      }
    })
    this.pump();
  }

  static isSupported () {
    return !!(self.ReadableStream);
  }

  public getStream(): ReadableStream<Uint8Array> {
    return this.outputStream;
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
  }

  private pump(): void {
    this.inputReader.read().then(({ value, done }) => {
      if (done) {
        return;
      } else if (!this.outputController) {
        return;
      }

      this.outputController.enqueue(value);
      this.pump();
    })
  }
};