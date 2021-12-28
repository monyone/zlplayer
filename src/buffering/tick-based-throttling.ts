import BufferingStrategy from "./buffering-strategy";
import EventEmitter from "../event/eventemitter";
import { Events, EventTypes } from '../event/events';
import { Events as TickerEvents, EventTypes as TickerEventTypes } from '../ticker/ticker-events'
import Ticker from 'worker-loader?inline=no-fallback!../ticker/ticker.worker'

type TickBasedThrottlingOptions = {
  delay?: number;
  emitFirstFrameOnly?: boolean;
  audioThrottling?: boolean;
  tickHz?: number;
};

export default class TickBasedThrottling extends BufferingStrategy{
  private emitter: EventEmitter | null = null;
  private bufferingEnabled: boolean = true;
  private options: Required<TickBasedThrottlingOptions>;
  private ticker: Ticker = new Ticker();

  private readonly onH264ParsedHandler = this.onH264Parsed.bind(this);
  private readonly onAACParsedHandler = this.onAACParsed.bind(this);
  private readonly onMPEG2VideoParsedHandler = this.onMPEG2VideoParsed.bind(this);
  private readonly onTickerTickHandler = this.onTickerTick.bind(this);;

  private h264Queue: Events[typeof EventTypes.H264_PARSED][] = [];
  private aacQueue: Events[typeof EventTypes.AAC_PARSED][] = [];
  private mpeg2videoQueue: Events[typeof EventTypes.MPEG2VIDEO_PARSED][] = [];

  private firstSoundArrived = false;
  private elapsedTime;
  private lastTimestamp : number | null = null;

  static isSupported () {
    return true;
  }

  public constructor(options?: TickBasedThrottlingOptions) {
    super();
    this.options = {
      delay: Math.max(options?.delay ?? 0, 0),
      emitFirstFrameOnly: options?.emitFirstFrameOnly ?? false,
      audioThrottling: options?.audioThrottling ?? true,
      tickHz: options?.tickHz ?? 60
    }
    this.elapsedTime = -this.options.delay;

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
    if (this.bufferingEnabled) {
      this.h264Queue.push(payload);
    } else {
      this.emitter?.emit(EventTypes.H264_EMITTED, {
        ... payload,
        event: EventTypes.H264_EMITTED
      });
    }
  }

  private onAACParsed(payload: Events[typeof EventTypes.AAC_PARSED]) {
    if (!this.firstSoundArrived) {
      this.firstSoundArrived = true;
    }

    if (this.options.audioThrottling) {
      this.aacQueue.push(payload); 
    } else {
      this.emitter?.emit(EventTypes.AAC_EMITTED, { ... payload, event: EventTypes.AAC_EMITTED });
    }
  }
  
  private onMPEG2VideoParsed(payload: Events[typeof EventTypes.MPEG2VIDEO_PARSED]) {
    this.mpeg2videoQueue.push(payload);
  }

  private onTickerTick(message: MessageEvent) {
    const { event } = message.data;
    if (event !== TickerEventTypes.TICKER_TICK) { return; }

    if (!this.firstSoundArrived) { return; }

    if (this.lastTimestamp != null) {
      this.elapsedTime += (Date.now() - this.lastTimestamp) / 1000;
    }
    this.lastTimestamp = Date.now();

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

    let aacEmitted = false;
    this.aacQueue = this.aacQueue.filter((aac) => {
      if (this.elapsedTime >= aac.dts_timestamp) {
        if (!this.options.emitFirstFrameOnly || !h264Emitted) {
          this.emitter?.emit(EventTypes.AAC_EMITTED, {
            ... aac,
            event: EventTypes.AAC_EMITTED
          });
          aacEmitted = false;
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