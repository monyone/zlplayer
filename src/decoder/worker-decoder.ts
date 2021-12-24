import EventEmitter from '../event/eventemitter';
import { Events as PlayerEvents, EventTypes as PlayerEventTypes } from '../event/events';
import { Events, EventTypes } from './worker-decoder-events';

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
          this.emitter?.emit(PlayerEventTypes.VIDEO_FRAME_DECODED, {
            event: PlayerEventTypes.VIDEO_FRAME_DECODED,
            frame: message.data.frame
          });
          break;
        }
        case EventTypes.AUDIO_FRAME_DECODED: {
          this.emitter?.emit(PlayerEventTypes.AUDIO_FRAME_DECODED, {
            event: PlayerEventTypes.AUDIO_FRAME_DECODED,
            frame: message.data.frame
          });
          break;
        }
        case EventTypes.VIDEO_DECODE_ERROR: {
          const { error } = message.data;
          this.emitter?.emit(PlayerEventTypes.VIDEO_DECODE_ERROR, {
            event: PlayerEventTypes.VIDEO_DECODE_ERROR,
            error,
          });
          break;
        }
        case EventTypes.AUDIO_DECODE_ERROR: {
          const { error } = message.data;
          this.emitter?.emit(PlayerEventTypes.AUDIO_DECODE_ERROR, {
            event: PlayerEventTypes.AUDIO_DECODE_ERROR,
            error,
          });
          break;
        }
      }
    });
  }

  public setEmitter(emitter: EventEmitter) {
    if (this.emitter) {
      this.emitter.off(PlayerEventTypes.H264_ARRIVED, this.onH264ArrivedHandler);
      this.emitter.off(PlayerEventTypes.AAC_ARRIVED, this.onAACArrivedHandler);
    }

    this.emitter = emitter;
    this.emitter.on(PlayerEventTypes.H264_ARRIVED, this.onH264ArrivedHandler);
    this.emitter.on(PlayerEventTypes.AAC_ARRIVED, this.onAACArrivedHandler);
  }

  public async init(): Promise<void> {
    this.worker.postMessage({ event: EventTypes.DECODER_INITIALIZE });
  }

  private async onH264Arrived(payload: PlayerEvents[typeof PlayerEventTypes.H264_ARRIVED]) {
    this.worker.postMessage(payload as Events[typeof EventTypes.H264_ARRIVED]);
  }

  private async onAACArrived(payload: PlayerEvents[typeof PlayerEventTypes.AAC_ARRIVED]) {
    this.worker.postMessage(payload as Events[typeof EventTypes.AAC_ARRIVED]);
  }
};