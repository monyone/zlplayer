import EventEmitter from '../event/eventemitter';
import { Events, EventTypes } from '../event/events';
import Decoder from './decoder';

export default class WindowDecoder extends Decoder {  
  private emitter: EventEmitter | null = null;

  private videoDecoder: VideoDecoder | null = null;
  private audioDecoder: AudioDecoder | null = null;
  private videoKeyFrameArrived: boolean = false;

  private readonly onH264EmittedHandler = this.onH264Emitted.bind(this);
  private readonly onAACEmittedHandler = this.onAACEmitted.bind(this);

  static isSupported () {
    return window.isSecureContext && !!(window.VideoFrame) && !!(window.AudioData) && !!(window.VideoDecoder) && !!(window.AudioDecoder) && !!(window.EncodedVideoChunk) && !!(window.EncodedAudioChunk);
  }
  
  public constructor() {
    super();
  }

  public setEmitter(emitter: EventEmitter) {
    if (this.emitter) {
      this.emitter.off(EventTypes.H264_EMITTED, this.onH264EmittedHandler);
      this.emitter.off(EventTypes.AAC_EMITTED, this.onAACEmittedHandler);
    }

    this.emitter = emitter;
    this.emitter.on(EventTypes.H264_EMITTED, this.onH264EmittedHandler);
    this.emitter.on(EventTypes.AAC_EMITTED, this.onAACEmittedHandler);
  }

  public async init(): Promise<void> {
    await this.resetVideoDecoder();
    await this.resetAudioDecoder();
  }

  private async resetVideoDecoder() {
    this.videoDecoder = new VideoDecoder({
      output: (videoFrame) => {
        this.emitter?.emit(EventTypes.VIDEO_FRAME_DECODED, {
          event: EventTypes.VIDEO_FRAME_DECODED,
          frame: videoFrame
        })
      },
      error: (e) => {
        this.emitter?.emit(EventTypes.VIDEO_DECODE_ERROR, {
          event: EventTypes.VIDEO_DECODE_ERROR,
          error: e,
        });
      },
    })
    await this.videoDecoder.configure({
      codec: 'avc1.64001f', // TODO: refer sps
      hardwareAcceleration: "prefer-hardware",
    });
    this.videoKeyFrameArrived = false;
  }

  private async resetAudioDecoder() {
    this.audioDecoder = new AudioDecoder({
      output: (audioFrame) => {
        this.emitter?.emit(EventTypes.AUDIO_FRAME_DECODED, {
          event: EventTypes.AUDIO_FRAME_DECODED,
          frame: audioFrame
        })
      },
      error: (e) => {
        this.emitter?.emit(EventTypes.AUDIO_DECODE_ERROR, {
          event: EventTypes.AUDIO_DECODE_ERROR,
          error: e,
        });
      },
    });
    await this.audioDecoder.configure({
      codec: 'mp4a.40.2',
      sampleRate: 48000, // TODO: Refer ADTS Header
      numberOfChannels: 2,
    });
  }

  private async onH264Emitted({ timestamp, data, has_IDR }: Events[typeof EventTypes.H264_EMITTED]) {
    this.videoKeyFrameArrived ||= has_IDR;
    if (!this.videoKeyFrameArrived) { return; }

    const encodedVideoChunk = new EncodedVideoChunk({
      type: has_IDR ? 'key' : 'delta',
      timestamp: timestamp * 1000000,
      data: data,
    });

    try {
      this.videoDecoder?.decode(encodedVideoChunk);
    } catch (e: unknown) {
      this.emitter?.emit(EventTypes.VIDEO_DECODE_ERROR, {
        event: EventTypes.VIDEO_DECODE_ERROR,
        error: e,
      });
      await this.resetVideoDecoder();
    }
  }

  private async onAACEmitted({ timestamp, data }: Events[typeof EventTypes.AAC_EMITTED]) {
    const encodedAudioChunk = new EncodedAudioChunk({
      type: 'key',
      timestamp: timestamp * 1000000,
      data: data,
    });

    try {
      this.audioDecoder?.decode(encodedAudioChunk);
    } catch (e: unknown) {
      this.emitter?.emit(EventTypes.AUDIO_DECODE_ERROR, {
        event: EventTypes.AUDIO_DECODE_ERROR,
        error: e,
      });
      this.resetAudioDecoder();
    }
  }
};