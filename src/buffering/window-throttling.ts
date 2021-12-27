import EventEmitter from "../event/eventemitter";
import { Events, EventTypes } from '../event/events';
import BufferingStrategy from "./buffering-strategy";

const videoInterval = (1000 / 29.97);
const audioInterval = 1024 / 48000 * 1000;

type H264QueuePayload = Events[typeof EventTypes.H264_PARSED] & {
  timerId: number | null;
};
type AACQueuePayload = Events[typeof EventTypes.AAC_PARSED] & {
  timerId: number | null;
};
type MPEG2VideoQueuePayload = Events[typeof EventTypes.MPEG2VIDEO_PARSED] & {
  timerId: number | null;
};


export default class WindowThrottling extends BufferingStrategy{
  private emitter: EventEmitter | null = null;

  private readonly onH264ParsedHandler = this.onH264Parsed.bind(this);
  private readonly onAACParsedHandler = this.onAACParsed.bind(this);
  private readonly onMPEG2VideoParsedHandler = this.onMPEG2VideoParsed.bind(this);

  private readonly h264ThrottlingFunctionHandler = this.h264ThrottlingFunction.bind(this);
  private readonly aacThrottlingFunctionHandler = this.aacThrottlingFunction.bind(this);
  private readonly mpeg2videoThrottlingFunctionHandler = this.mpeg2videoThrottlingFunction.bind(this);

  private h264Queue: H264QueuePayload[] = [];
  private aacQueue: AACQueuePayload[] = [];
  private mpeg2videoQueue: MPEG2VideoQueuePayload[] = [];
  private lastH264OutputTimestamp: number | null = null;
  private lastAACOutputTimestamp: number | null = null;
  private lastMPEG2VideoOutputTimestamp: number | null = null;

  static isSupported () {
    return true;
  }

  public setEmitter(emitter: EventEmitter) {
    if (this.emitter) {
      this.emitter.off(EventTypes.H264_PARSED, this.onH264ParsedHandler);
      this.emitter.off(EventTypes.AAC_PARSED, this.onAACParsedHandler);
      this.emitter.off(EventTypes.MPEG2VIDEO_PARSED, this.onMPEG2VideoParsedHandler);
    }

    this.emitter = emitter;
    this.emitter.on(EventTypes.H264_PARSED, this.onH264ParsedHandler);
    this.emitter.on(EventTypes.AAC_PARSED, this.onAACParsedHandler);
    this.emitter.on(EventTypes.MPEG2VIDEO_PARSED, this.onMPEG2VideoParsedHandler);
  }

  public abort() {
    this.h264Queue.forEach((payload) => {
      if (payload.timerId == null) { return; }
      window.clearTimeout(payload.timerId);
    });
    this.aacQueue.forEach((payload) => {
      if (payload.timerId == null) { return; }
      window.clearTimeout(payload.timerId);
    });
    this.mpeg2videoQueue.forEach((payload) => {
      if (payload.timerId == null) { return; }
      window.clearTimeout(payload.timerId);
    });

    this.h264Queue = [];
    this.aacQueue = [];
    this.mpeg2videoQueue = [];

    this.lastH264OutputTimestamp = null;
    this.lastAACOutputTimestamp = null;
    this.lastMPEG2VideoOutputTimestamp = null;
  }

  private useH264ThrottlingNow(now: number): boolean {
    if (this.h264Queue.length > 0) {
      return true;
    } else if (this.lastH264OutputTimestamp == null) {
      return false;
    } else {
      return (now - this.lastH264OutputTimestamp) < videoInterval;
    }
  }

  private useAACThrottlingNow(now: number): boolean {
    if (this.aacQueue.length > 0) {
      return true;
    } else if (this.lastAACOutputTimestamp == null) {
      return false;
    } else {
      return (now - this.lastAACOutputTimestamp) < audioInterval;
    }
  }

  private useMPEG2VideoThrottlingNow(now: number): boolean {
    if (this.mpeg2videoQueue.length > 0) {
      return true;
    } else if (this.lastMPEG2VideoOutputTimestamp == null) {
      return false;
    } else {
      return (now - this.lastMPEG2VideoOutputTimestamp) < videoInterval;
    }
  }

  private async onH264Parsed(payload: Events[typeof EventTypes.H264_PARSED]) {
    const now = Date.now();
    if (!this.useH264ThrottlingNow(now)) {
      console.log(now, now - (this.lastH264OutputTimestamp ?? 0), this.h264Queue.length)
      this.lastH264OutputTimestamp = now;
      this.emitter?.emit(EventTypes.H264_EMITTED, { ... payload, event: EventTypes.H264_EMITTED });
    } else if (this.h264Queue.length === 0) {
      const diff = ((this.lastH264OutputTimestamp! + videoInterval) - now);
      const timerId = window.setTimeout(this.h264ThrottlingFunctionHandler, diff);
      this.h264Queue.push({ ... payload, timerId });
    } else {
      this.h264Queue.push({ ... payload, timerId: null });
    }
  }

  private async onAACParsed(payload: Events[typeof EventTypes.AAC_PARSED]) {
    const now = Date.now();
    if (!this.useAACThrottlingNow(now)) {
      this.lastAACOutputTimestamp = now;
      this.emitter?.emit(EventTypes.AAC_EMITTED, { ... payload, event: EventTypes.AAC_EMITTED });
    } else if (this.aacQueue.length === 0) {
      const diff = ((this.lastAACOutputTimestamp! + audioInterval) - now);
      const timerId = window.setTimeout(this.aacThrottlingFunctionHandler, diff);
      this.aacQueue.push({ ... payload, timerId });
    } else {
      this.aacQueue.push({ ... payload, timerId: null });
    }
  }
  
  private async onMPEG2VideoParsed(payload: Events[typeof EventTypes.MPEG2VIDEO_PARSED]) {
    const now = Date.now();
    if (!this.useMPEG2VideoThrottlingNow(now)) {
      this.lastMPEG2VideoOutputTimestamp = now;
      this.emitter?.emit(EventTypes.MPEG2VIDEO_EMITTED, { ... payload, event: EventTypes.MPEG2VIDEO_EMITTED });
    } else if (this.mpeg2videoQueue.length === 0) {
      const diff = ((this.lastMPEG2VideoOutputTimestamp! + videoInterval) - now);
      const timerId = window.setTimeout(this.mpeg2videoThrottlingFunctionHandler, diff);
      this.mpeg2videoQueue.push({ ... payload, timerId });
    } else {
      this.mpeg2videoQueue.push({ ... payload, timerId: null })
    }
  }

  private h264ThrottlingFunction() {
    const now = Date.now();
    const emit = this.h264Queue.shift();
    if (emit == null) { return; }
    
    console.log(now, now - (this.lastH264OutputTimestamp ?? 0), this.h264Queue.length)
    this.emitter?.emit(EventTypes.H264_EMITTED, { ... emit, event: EventTypes.H264_EMITTED });
    this.lastH264OutputTimestamp = now;

    const front = this.h264Queue[0];
    if (front == null) { return; }
    front.timerId = window.setTimeout(this.h264ThrottlingFunctionHandler, videoInterval);
  }

  private aacThrottlingFunction() {
    const now = Date.now();
    const emit = this.aacQueue.shift();
    if (emit == null) { return; }
    
    this.emitter?.emit(EventTypes.AAC_EMITTED, { ... emit, event: EventTypes.AAC_EMITTED });
    this.lastAACOutputTimestamp = now;

    const front = this.aacQueue[0];
    if (front == null) { return; }
    front.timerId = window.setTimeout(this.aacThrottlingFunctionHandler, audioInterval);
  }

  private mpeg2videoThrottlingFunction() {
    const now = Date.now();
    const emit = this.mpeg2videoQueue.shift();
    if (emit == null) { return; }
    
    this.emitter?.emit(EventTypes.MPEG2VIDEO_EMITTED, { ... emit, event: EventTypes.MPEG2VIDEO_EMITTED });
    this.lastMPEG2VideoOutputTimestamp = now;

    const front = this.mpeg2videoQueue[0];
    if (front == null) { return; }
    front.timerId = window.setTimeout(this.mpeg2videoThrottlingFunctionHandler, videoInterval);
  }
};