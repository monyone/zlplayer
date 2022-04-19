import Source from "./source";
import Worker from "worker-loader?inline=no-fallback!./http-streaming.worker"

import { EventTypes } from './http-streaming-worker-events'

export default class HTTPStreamingWorkerSource extends Source{  
  private outputStream: ReadableStream<Uint8Array>;
  private outputController: ReadableStreamController<Uint8Array> | null = null;
  private worker: Worker;

  public constructor () {
    super();
    const global = this;
    this.outputStream = new ReadableStream<Uint8Array>({      
      start (controller) {
        global.outputController = controller;
      }
    })
    this.worker = new Worker();
    this.worker.addEventListener('message', (message) => {
      const { event } = message.data;
      switch (event) {
        case EventTypes.DATA_ARRIVED: {
          const { data } = message.data;
          this.outputController?.enqueue(data);
          break;
        }
      }
    });
  }

  static isSupported () {
    return !!(self.fetch) && !!(self.ReadableStream) && !!(self.Worker);
  }

  public abort() {
    try {
      if (!this.outputStream.locked){
        this.outputStream?.cancel();
      }

      const global = this;
      this.outputStream = new ReadableStream<Uint8Array>({
        start (controller) {
          global.outputController = controller;
        }
      });
    } catch (e: unknown) {}
    this.worker.postMessage({event: EventTypes.LOAD_ABORTED});
  }

  public async load(url: string, fetchOptions: RequestInit = {}): Promise<boolean> {
    this.abort();
    return new Promise((resolve: (arg0: boolean) => void) => {
      const request_handler = (message: MessageEvent) => {
        const { event } = message.data;
        switch(event) {
          case EventTypes.LOAD_FAILED: {
            resolve(false);
            this.worker.removeEventListener('message', request_handler);
            break;
          }
          case EventTypes.LOAD_SUCCEEDED: {
            resolve(true);
            this.worker.removeEventListener('message', request_handler);
            break;
          }
        }
      };
      this.worker.addEventListener('message', request_handler);
    
      this.worker.postMessage({
        event: EventTypes.LOAD_REQUEST,
        url,
        fetchOptions
      });  
    })
  }

  public getStream(): ReadableStream<Uint8Array> {
    return this.outputStream;
  }
};
