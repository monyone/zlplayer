import EventEmitter from '../event/eventemitter';
import { Events, EventTypes } from '../event/events';

import Decoder from './decoder';
import Worker from 'worker-loader?inline=no-fallback!./decoding.worker'

export default class WorkerDecoder extends Decoder{  
  private emitter: EventEmitter | null = null;
  private worker: Worker;

  private readonly onH264ArrivedHandler = this.onH264Arrived.bind(this);
  private readonly onAACArrivedHandler = this.onAACArrived.bind(this);

  static isSupported () {
    return window.isSecureContext && !!(window.VideoFrame) && !!(window.AudioData) && !!(window.VideoDecoder) && !!(window.AudioDecoder) && !!(window.EncodedVideoChunk) && !!(window.EncodedAudioChunk) && !!(window.Worker);
  }
  
  public constructor() {
    super();
    this.worker = new Worker();

    this.worker.onmessage = ((message) => {
      const { event } = message.data;

      switch(event) {
        case EventTypes.VIDEO_FRAME_DECODED: {
          this.emitter?.emit(EventTypes.VIDEO_FRAME_DECODED, {
            event: EventTypes.VIDEO_FRAME_DECODED,
            frame: message.data.frame
          });
          break;
        }
        case EventTypes.AUDIO_FRAME_DECODED: {
          this.emitter?.emit(EventTypes.AUDIO_FRAME_DECODED, {
            event: EventTypes.AUDIO_FRAME_DECODED,
            frame: message.data.frame
          });
          break;
        }
        case EventTypes.VIDEO_DECODE_ERROR: {
          const { error } = message.data;
          this.emitter?.emit(EventTypes.VIDEO_DECODE_ERROR, {
            event: EventTypes.VIDEO_DECODE_ERROR,
            error,
          });
          break;
        }
        case EventTypes.AUDIO_DECODE_ERROR: {
          const { error } = message.data;
          this.emitter?.emit(EventTypes.AUDIO_DECODE_ERROR, {
            event: EventTypes.AUDIO_DECODE_ERROR,
            error,
          });
          break;
        }
      }
    });
  }

  public setEmitter(emitter: EventEmitter) {
    if (this.emitter) {
      this.emitter.off(EventTypes.H264_ARRIVED, this.onH264ArrivedHandler);
      this.emitter.off(EventTypes.AAC_ARRIVED, this.onAACArrivedHandler);
    }

    this.emitter = emitter;
    this.emitter.on(EventTypes.H264_ARRIVED, this.onH264ArrivedHandler);
    this.emitter.on(EventTypes.AAC_ARRIVED, this.onAACArrivedHandler);
  }

  public async init(): Promise<void> {
    this.worker.postMessage({ event: EventTypes.DECODER_INITIALIZE });
  }

  private async onH264Arrived(payload: Events[typeof EventTypes.H264_ARRIVED]) {
    this.worker.postMessage(payload);
  }

  private async onAACArrived(payload: Events[typeof EventTypes.AAC_ARRIVED]) {
    this.worker.postMessage(payload);
  }
};