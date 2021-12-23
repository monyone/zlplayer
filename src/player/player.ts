import HTTPStreamingSource from '../source/http-streaming-source';
import PassThrough from '../buffering/pass-through'
import Demuxer from '../demux/demuxer';
import EventEmitter from '../event/eventemitter';
import { Events, EventTypes } from '../event/events';
import PacketChunker from '../mpegts/packet-chunker';

export default class Player {  
  private source: HTTPStreamingSource; 
  private buffering: PassThrough | null;
  private chunker: PacketChunker | null;
  private demuxer: Demuxer | null;
  private emitter: EventEmitter;

  private media: HTMLMediaElement | null;
  private videoTrackGeneratorWriter: WritableStreamDefaultWriter;
  private audioTrackGeneratorWriter: WritableStreamDefaultWriter;
  private videoDecoder: VideoDecoder;
  private audioDecoder: AudioDecoder;

  private readonly onH264ArrivedHandler = this.onH264Arrived.bind(this);
  private readonly onAACArrivedHandler = this.onAACArrived.bind(this);

  static isSupported () {
    return true;
  }
  
  public constructor() {
    this.emitter = new EventEmitter();

    this.source = new HTTPStreamingSource();

    this.emitter.on(EventTypes.H264_ARRIVED, this.onH264ArrivedHandler);
    this.emitter.on(EventTypes.AAC_ARRIVED, this.onAACArrivedHandler);
  }

  public async load(url) {
    if (this.videoDecoder == null) {
      this.videoDecoder = new VideoDecoder({
        output: (videoFrame) => {
          this.pushVideoFrame(videoFrame);
        },
        error: () => {},
      })
      await this.videoDecoder.configure({
        codec: 'avc1.64001f',
        hardwareAcceleration: "prefer-hardware",
      });
    }

    if (this.audioDecoder == null) {
      const audioDecoder = new AudioDecoder({
        output: (audioFrame) => {
          this.pushAudioFrame(audioFrame)
        },
        error: () => {},
      });
      await audioDecoder.configure({
        codec: 'mp4a.40.2',
        sampleRate: 48000,
        numberOfChannels: 2,
      });
    }

    await this.source.load(url);
    this.buffering = new PassThrough(this.source.getStream());
    this.chunker = new PacketChunker(this.buffering.getStream());
    this.demuxer = new Demuxer(this.buffering.getStream(), this.emitter);
  }
  
  public attachMedia(media: HTMLMediaElement): void {
    this.media = media;

    const videoTrackGenerator = new MediaStreamTrackGenerator({ kind: 'video' });
    const audioTrackGenerator = new MediaStreamTrackGenerator({ kind: 'audio' });
    this.videoTrackGeneratorWriter = videoTrackGenerator.writable.getWriter();
    this.audioTrackGeneratorWriter = audioTrackGenerator.writable.getWriter();
    
    const mediaStream = new MediaStream();
    mediaStream.addTrack(videoTrackGenerator);
    mediaStream.addTrack(audioTrackGenerator);
    media.srcObject = mediaStream;
  }

  public on<T extends keyof Events>(type: T, handler: ((payload: Events[T]) => void)): void {
    this.emitter?.on(type, handler);
  }

  public off<T extends keyof Events>(type: T, handler: ((payload: Events[T]) => void)): void {
    this.emitter?.off(type, handler);
  }

  pushVideoFrame(videoFrame: VideoFrame) {
    this.videoTrackGeneratorWriter?.write(videoFrame);
    videoFrame.close()
  }

  pushAudioFrame(audioFrame: AudioFrame) {
    this.audioTrackGeneratorWriter?.write(audioFrame);
    audioFrame.close();
  }

  private onH264Arrived({ begin, data, has_IDR }: Events[typeof EventTypes.H264_ARRIVED]) {
    const encodedVideoChunk = new EncodedVideoChunk({
      key: has_IDR,
      timestamp: begin * 1000,
      data: data,
    });

    this.videoDecoder?.decode(encodedVideoChunk);
  }

  private onAACArrived({ begin, data}: Events[typeof EventTypes.AAC_ARRIVED]) {
    const encodedAudioChunk = new EncodedAudioChunk({
      type: 'key',
      timestamp: begin * 1000,
      data: data,
    });

    this.audioDecoder?.decode(encodedAudioChunk);
  }

};