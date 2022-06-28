import BufferingStrategy from "./buffering-strategy";
import EventEmitter from "../event/eventemitter";
import { Events, EventTypes } from '../event/events';
import { Events as TickerEvents, EventTypes as TickerEventTypes } from '../ticker/ticker-events'
import Ticker from 'worker-loader?inline=no-fallback!../ticker/ticker.worker'

type TickBasedThrottlingOptions = {
  delay?: number;
  emitFirstFrameOnly?: boolean;
  hasAudioTrack?: boolean;
  tickHz?: number;
};

const AAC_SAMPLING_FREQ = new Map<number, number>([
  [0x00, 96000],
  [0x01, 88200],
  [0x02, 64000],
  [0x03, 48000],
  [0x04, 44100],
  [0x05, 32000],
  [0x06, 24000],
  [0x07, 22050],
  [0x08, 16000],
  [0x09, 12000],
  [0x0a, 11025],
  [0x0b, 8000]
]);

export default class TickBasedThrottling extends BufferingStrategy{
  private emitter: EventEmitter | null = null;
  private options: Required<TickBasedThrottlingOptions>;
  private ticker: Ticker = new Ticker();

  private readonly onH264ParsedHandler = this.onH264Parsed.bind(this);
  private readonly onAACParsedHandler = this.onAACParsed.bind(this);
  private readonly onMPEG2VideoParsedHandler = this.onMPEG2VideoParsed.bind(this);
  private readonly onTickerTickHandler = this.onTickerTick.bind(this);;

  private h264Queue: Events[typeof EventTypes.H264_PARSED][] = [];
  private aacQueue: Events[typeof EventTypes.AAC_PARSED][] = [];
  private mpeg2videoQueue: Events[typeof EventTypes.MPEG2VIDEO_PARSED][] = [];

  private soundBufferingTime: number = 0;
  private soundStalledTime: number = 0;

  private soundDelayTime: number = 0;
  private soundDelayEmitTimestamp : number | null = null;

  private startTimestamp: number = 0;
  private lastTimestamp : number | null = null;

  static isSupported () {
    return true;
  }

  public constructor(options?: TickBasedThrottlingOptions) {
    super();
    this.options = {
      delay: Math.max(options?.delay ?? 0, 0),
      emitFirstFrameOnly: options?.emitFirstFrameOnly ?? false,
      hasAudioTrack: options?.hasAudioTrack ?? true,
      tickHz: options?.tickHz ?? 60
    }
    this.soundDelayTime = this.options.delay;
  }

  public setEmitter(emitter: EventEmitter) {
    if (this.emitter) {
      this.emitter.off(EventTypes.H264_PARSED, this.onH264ParsedHandler);
      this.emitter.off(EventTypes.AAC_PARSED, this.onAACParsedHandler);
      this.emitter.off(EventTypes.MPEG2VIDEO_PARSED, this.onMPEG2VideoParsedHandler);
      this.ticker.removeEventListener('message', this.onTickerTickHandler);
    }

    this.emitter = emitter;
    this.emitter.on(EventTypes.H264_PARSED, this.onH264ParsedHandler);
    this.emitter.on(EventTypes.AAC_PARSED, this.onAACParsedHandler);
    this.emitter.on(EventTypes.MPEG2VIDEO_PARSED, this.onMPEG2VideoParsedHandler);
    this.ticker.addEventListener('message', this.onTickerTickHandler);
  }

  public start() {
    this.abort();
    this.ticker.postMessage({
      event: TickerEventTypes.TICKER_START,
      time: 1000 / this.options.tickHz
    } as TickerEvents[typeof TickerEventTypes.TICKER_START]);
    this.startTimestamp = performance.now();
  }

  public abort() {
    this.h264Queue = [];
    this.mpeg2videoQueue = [];
    this.ticker.postMessage({
      event: TickerEventTypes.TICKER_STOP
    } as TickerEvents[typeof TickerEventTypes.TICKER_STOP]);
  }

  public destroy() {
    this.abort();
    this.ticker.terminate();
  }

  private onH264Parsed(payload: Events[typeof EventTypes.H264_PARSED]) {
    this.h264Queue.push(payload);
  }

  private onAACParsed(payload: Events[typeof EventTypes.AAC_PARSED]) {
    let bufferingTime = 0;
    // FIXME: it assume align adts in PES payload
    for (let index = 0; index < payload.data.byteLength; ) {
      const data = payload.data;
      const frequency_index = (data[index + 2] & 0b00111100) >> 2;
      const frame_length = (((data[index + 3] & 0x03) << 11) | (data[index + 4] << 3) | ((data[index + 5] & 0xE0) >> 5));
      const frames = (data[index + 6] & 0b00000011);

      bufferingTime += 1024 / (AAC_SAMPLING_FREQ.get(frequency_index) ?? 48000);
      index += (frame_length + 2 * frames);
    }

    // if delay not specified
    if (this.options.delay === 0) {
      this.emitter?.emit(EventTypes.AAC_EMITTED, {
        ... payload,
        event: EventTypes.AAC_EMITTED
      });
      this.soundBufferingTime += bufferingTime;
      this.onTick();
      return;
    }

    // if delay specified
    this.aacQueue.push(payload);
    if (this.soundDelayTime > 0) { 
      this.soundDelayTime -= bufferingTime;
      if (this.soundDelayTime > 0) { return; }
      this.soundDelayTime = 0;
    }

    const emit = this.aacQueue.shift()!;
    this.emitter?.emit(EventTypes.AAC_EMITTED, {
      ... emit,
      event: EventTypes.AAC_EMITTED
    });
    this.soundDelayEmitTimestamp = performance.now();
    this.soundBufferingTime += (1024 / 48000);
    this.onTick();
  }
  
  private onMPEG2VideoParsed(payload: Events[typeof EventTypes.MPEG2VIDEO_PARSED]) {
    this.mpeg2videoQueue.push(payload);
  }

  private onTickerTick(message: MessageEvent): void {
    const { event } = message.data;
    if (event !== TickerEventTypes.TICKER_TICK) { return; }
    if (this.soundDelayTime > 0) { return; }

    this.onTick();
  }

  private onTick(): void {
    const now = performance.now();

    // if delay specified
    if (this.soundDelayEmitTimestamp != null && this.options.hasAudioTrack) {
      const diff = (now - this.soundDelayEmitTimestamp) / 1000;
      if (this.aacQueue.length >= 1 && diff >= 1024 / 48000) { // TODO: refer ADTS header
        const emit = this.aacQueue.shift()!;

        this.emitter?.emit(EventTypes.AAC_EMITTED, {
          ... emit,
          event: EventTypes.AAC_EMITTED
        });
        this.soundBufferingTime += 1024 / 48000; // TODO: refer ADTS header
        this.soundDelayEmitTimestamp = now;
      }
    }

    if (this.lastTimestamp != null) {
      const elapse = (now - this.lastTimestamp) / 1000;
      const buffer = this.soundBufferingTime;

      if (buffer >= elapse) {
        this.soundBufferingTime -= elapse;
      } else {
        this.soundBufferingTime = 0;
        this.soundStalledTime += (elapse - buffer);
      }
    }
    this.lastTimestamp = now;

    const elapsedTime = ((now - this.startTimestamp) / 1000) - (this.options.hasAudioTrack ?  this.soundStalledTime : 0);

    let h264Emitted = false;
    this.h264Queue = this.h264Queue.filter((h264) => {
      if (elapsedTime >= h264.dts_timestamp) {
        if (!this.options.emitFirstFrameOnly || !h264Emitted) {
          this.emitter?.emit(EventTypes.H264_EMITTED, {
            ... h264,
            event: EventTypes.H264_EMITTED
          });
          h264Emitted = true;
          return false;
        } else {
          return true;
        }
      } else {
        return true;
      }
    });

    let mpeg2Emitted = false;
    this.mpeg2videoQueue = this.mpeg2videoQueue.filter((mpeg2video) => {
      if (elapsedTime >= mpeg2video.dts_timestamp) {
        if (!this.options.emitFirstFrameOnly || !mpeg2Emitted) {
          this.emitter?.emit(EventTypes.MPEG2VIDEO_EMITTED, {
            ... mpeg2video,
            event: EventTypes.MPEG2VIDEO_EMITTED
          });
          mpeg2Emitted = true;
          return false;
        } else {
          return true;
        }
      } else {
        return true;
      }
    });
  }
};
