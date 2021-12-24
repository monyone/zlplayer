import EventEmitter from '../event/eventemitter';
import { Events, EventTypes } from '../event/events';
import Decoder from './decoder';

export default class WindowDecoder extends Decoder {  
  private emitter: EventEmitter | null = null;

  private videoDecoder: VideoDecoder | null = null;
  private audioDecoder: AudioDecoder | null = null;
  private videoKeyFrameArrived: boolean = false;

  private readonly onH264ArrivedHandler = this.onH264Arrived.bind(this);
  private readonly onAACArrivedHandler = this.onAACArrived.bind(this);

  static isSupported () {
    return window.isSecureContext && !!(window.VideoFrame) && !!(window.AudioData) && !!(window.VideoDecoder) && !!(window.AudioDecoder) && !!(window.EncodedVideoChunk) && !!(window.EncodedAudioChunk);
  }
  
  public constructor() {
    super();
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

  private async onH264Arrived({ begin, data, has_IDR }: Events[typeof EventTypes.H264_ARRIVED]) {
    this.videoKeyFrameArrived ||= has_IDR;
    if (!this.videoKeyFrameArrived) { return; }

    const encodedVideoChunk = new EncodedVideoChunk({
      type: has_IDR ? 'key' : 'delta',
      timestamp: begin * 1000000,
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

  private async onAACArrived({ begin, data }: Events[typeof EventTypes.AAC_ARRIVED]) {
    const encodedAudioChunk = new EncodedAudioChunk({
      type: 'key',
      timestamp: begin * 1000000,
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