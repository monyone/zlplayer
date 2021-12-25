import EventEmitter from "../event/eventemitter";
import { Events, EventTypes } from '../event/events';
import BufferingStrategy from "./buffering-strategy";

export default class PassThrough extends BufferingStrategy{
  private emitter: EventEmitter | null = null;

  private readonly onH264ParsedHandler = this.onH264Parsed.bind(this);
  private readonly onAACParsedHandler = this.onAACParsed.bind(this);
  private readonly onMPEG2VideoParsedHandler = this.onMPEG2VideoParsed.bind(this);
  
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

  public abort() {}

  private async onH264Parsed(payload: Events[typeof EventTypes.H264_PARSED]) {
    this.emitter?.emit(EventTypes.H264_EMITTED, { ... payload, event: EventTypes.H264_EMITTED });
  }

  private async onAACParsed(payload: Events[typeof EventTypes.AAC_PARSED]) {
    this.emitter?.emit(EventTypes.AAC_EMITTED, { ... payload, event: EventTypes.AAC_EMITTED });
  }
  
  private async onMPEG2VideoParsed(payload: Events[typeof EventTypes.MPEG2VIDEO_PARSED]) {
    this.emitter?.emit(EventTypes.MPEG2VIDEO_EMITTED, { ... payload, event: EventTypes.MPEG2VIDEO_EMITTED });
  }
};