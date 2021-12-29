import BufferingStrategy from "./buffering-strategy";
import EventEmitter from "../event/eventemitter";
import { Events, EventTypes } from '../event/events';
import { Events as TickerEvents, EventTypes as TickerEventTypes } from '../ticker/ticker-events'
import Ticker from 'worker-loader?inline=no-fallback!../ticker/ticker.worker'

type TickBasedThrottlingOptions = {
  delay?: number;
  emitFirstFrameOnly?: boolean;
  tickHz?: number;
};

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
  private soundDelayTime: number = 0;
  private soundDelayEmitTimestamp : number | null = null;

  private elapsedTime: number = 0;
  private lastTimestamp : number | null = null;

  static isSupported () {
    return true;
  }

  public constructor(options?: TickBasedThrottlingOptions) {
    super();
    this.options = {
      delay: Math.max(options?.delay ?? 0, 0),
      emitFirstFrameOnly: options?.emitFirstFrameOnly ?? false,
      tickHz: options?.tickHz ?? 60
    }
    this.soundDelayTime = this.options.delay;

    this.ticker.postMessage({
      event: TickerEventTypes.TICKER_START,
      time: 1000 / this.options.tickHz
    } as TickerEvents[typeof TickerEventTypes.TICKER_START]);
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

  public abort() {
    this.h264Queue = [];
    this.mpeg2videoQueue = [];
  }

  private onH264Parsed(payload: Events[typeof EventTypes.H264_PARSED]) {
    this.h264Queue.push(payload);
  }

  private onAACParsed(payload: Events[typeof EventTypes.AAC_PARSED]) {
    // if delay not specified
    if (this.options.delay === 0) {
      this.emitter?.emit(EventTypes.AAC_EMITTED, {
        ... payload,
        event: EventTypes.AAC_EMITTED
      });
      this.soundBufferingTime += (1024 / 48000);
      this.onTick();
      return;
    }

    // if delay specified
    this.aacQueue.push(payload);
    if (this.soundDelayTime > 0) { 
      const time = (this.aacQueue.length * 1024 / 48000); // TODO: refer ADTS header
      if (this.soundDelayTime > time) { return; }

      this.soundDelayTime = 0;
    }

    const emit = this.aacQueue.shift()!;

    this.emitter?.emit(EventTypes.AAC_EMITTED, {
      ... emit,
      event: EventTypes.AAC_EMITTED
    });
    this.soundDelayEmitTimestamp = Date.now();
    this.soundBufferingTime += (1024 / 48000); // TODO: refer ADTS header
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
    const now = Date.now();

    // if delay specified
    if (this.soundDelayEmitTimestamp != null) {
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
      const diff = Math.min(this.soundBufferingTime, (now - this.lastTimestamp) / 1000);
      this.elapsedTime += diff;
      this.soundBufferingTime -= diff;
    }
    this.lastTimestamp = now;
    console.log(this.soundBufferingTime, this.aacQueue.length);

    let h264Emitted = false;
    this.h264Queue = this.h264Queue.filter((h264) => {
      if (this.elapsedTime >= h264.dts_timestamp) {
        if (!this.options.emitFirstFrameOnly || !h264Emitted) {
          this.emitter?.emit(EventTypes.H264_EMITTED, {
            ... h264,
            event: EventTypes.H264_EMITTED
          });
          h264Emitted = false;
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
      if (this.elapsedTime >= mpeg2video.dts_timestamp) {
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