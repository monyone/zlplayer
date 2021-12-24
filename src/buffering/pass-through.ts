import BufferingStrategy from "./buffering-strategy";

export default class PassThrough extends BufferingStrategy{
  private inputReader: ReadableStreamDefaultReader<Uint8Array>;
  private outputStream: ReadableStream<Uint8Array>;
  private outputController: ReadableStreamController<Uint8Array> | null = null; 

  public constructor (readbableStream: ReadableStream<Uint8Array>) {
    super();
    this.inputReader = readbableStream.getReader();

    const object = this;
    this.outputStream = new ReadableStream<Uint8Array>({
      start (controller) {
        object.outputController = controller;
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

      const object = this;
      this.outputStream = new ReadableStream<Uint8Array>({
        start (controller) {
          object.outputController = controller;
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