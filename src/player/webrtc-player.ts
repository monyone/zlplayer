import Player from './player'

import HTTPStreamingWorkerSource from '../source/http-streaming-worker-source';
import Demuxer from '../demux/demuxer';
import EventEmitter from '../event/eventemitter';
import { Events, EventTypes } from '../event/events';
import PacketChunker from '../mpegts/packet-chunker';
import BufferingStrategy from '../buffering/buffering-strategy';
import PassThrough from '../buffering/pass-through';
import Source from '../source/source';
import Decoder from '../decoder/decoder';
import WorkerDecoder from '../decoder/worker-decoder';

type WebRTCPlayerOptions = {
  source?: Source;
  decoder?: Decoder;
}

export default class WebRTCPlayer extends Player {  
  private emitter: EventEmitter;
  private options: Required<WebRTCPlayerOptions>;

  private source: Source; 
  private chunker: PacketChunker | null = null;
  private demuxer: Demuxer | null = null;
  private buffering: BufferingStrategy;
  private decoder: Decoder;

  private media: HTMLMediaElement | null = null;
  private videoTrackGeneratorWriter: WritableStreamDefaultWriter | null = null;
  private audioTrackGeneratorWriter: WritableStreamDefaultWriter | null = null;

  private sourcePeerConnection: RTCPeerConnection | null = null;
  private destinationPeerConnection: RTCPeerConnection | null = null;

  private readonly onVideoFrameDecodedHandler = this.onVideoFrameDecoded.bind(this);
  private readonly onAudioFrameDecodedHandler = this.onAudioFrameDecoded.bind(this);

  static isSupported () {
    return window.isSecureContext && !!(window.VideoFrame) && !!(window.AudioData) && !!(window.VideoDecoder) && !!(window.AudioDecoder) && !!(window.EncodedVideoChunk) && !!(window.EncodedAudioChunk);
  }
  
  public constructor(options?: WebRTCPlayerOptions) {
    super();

    this.emitter = new EventEmitter();
    this.options = {
      source: options?.source ?? new HTTPStreamingWorkerSource(),
      decoder: options?.decoder ?? new WorkerDecoder()
    };

    this.source = this.options.source;
    this.buffering = new PassThrough();
    this.buffering.setEmitter(this.emitter);
    this.decoder = this.options.decoder; 
    this.decoder.setEmitter(this.emitter);

    this.emitter.on(EventTypes.VIDEO_FRAME_DECODED, this.onVideoFrameDecodedHandler);
    this.emitter.on(EventTypes.AUDIO_FRAME_DECODED, this.onAudioFrameDecodedHandler);
  }

  public async load(url: string): Promise<boolean> {
    if (!(await this.source.load(url))) {
      return false;
    }

    this.chunker = new PacketChunker(this.source.getStream());
    this.demuxer = new Demuxer(this.chunker.getStream(), this.emitter);
    this.buffering.start();
    await this.decoder.init();

    return true;
  }
  
  public async attachMedia(media: HTMLMediaElement): Promise<void> {
    this.media = media;
    this.unload();

    const videoTrackGenerator = new MediaStreamTrackGenerator({ kind: 'video' });
    const audioTrackGenerator = new MediaStreamTrackGenerator({ kind: 'audio' });
    this.videoTrackGeneratorWriter = videoTrackGenerator.writable.getWriter();
    this.audioTrackGeneratorWriter = audioTrackGenerator.writable.getWriter();

    this.sourcePeerConnection = new RTCPeerConnection({ iceServers: [] });
    this.destinationPeerConnection = new RTCPeerConnection({ iceServers: [] });

    const sourceMediaStream = new MediaStream();
    sourceMediaStream.addTrack(videoTrackGenerator);
    sourceMediaStream.addTrack(audioTrackGenerator);
    this.sourcePeerConnection.addTrack(videoTrackGenerator, sourceMediaStream);
    this.sourcePeerConnection.addTrack(audioTrackGenerator, sourceMediaStream);

    const destinationMediaStream = new MediaStream();
    this.destinationPeerConnection.ontrack = (e) => {
      e.streams.flatMap((stream) => stream.getTracks()).forEach((track) => {
        destinationMediaStream.addTrack(track);
      })
    };
    this.media.srcObject = destinationMediaStream;

    this.sourcePeerConnection.onicecandidate = (e) => {
      if (e.candidate) { this.destinationPeerConnection?.addIceCandidate(e.candidate); }
    };
    this.destinationPeerConnection.onicecandidate = (e) => {
      if (e.candidate) { this.sourcePeerConnection?.addIceCandidate(e.candidate); }
    };

    const offer = await this.sourcePeerConnection.createOffer();
    await this.destinationPeerConnection.setRemoteDescription(offer);
    await this.sourcePeerConnection.setLocalDescription(offer);

    const answer = await this.destinationPeerConnection.createAnswer();
    await this.sourcePeerConnection.setRemoteDescription(answer);
    await this.destinationPeerConnection.setLocalDescription(answer);
  }

  private abort(): void {
    this.demuxer?.abort();
    this.chunker?.abort();
    this.buffering?.abort();
    this.source.abort();
  }

  private unload() {
    this.media?.removeAttribute('src');
    this.media?.load();
    this.sourcePeerConnection?.close();
    this.destinationPeerConnection?.close();
  }

  public stop(): void {
    this.abort();
    this.unload();
  }

  public on<T extends keyof Events>(type: T, handler: ((payload: Events[T]) => void)): void {
    this.emitter?.on(type, handler);
  }

  public off<T extends keyof Events>(type: T, handler: ((payload: Events[T]) => void)): void {
    this.emitter?.off(type, handler);
  }

  public pushVideoFrame(videoFrame: VideoFrame) {
    this.videoTrackGeneratorWriter?.write(videoFrame);
    videoFrame.close()
  }

  public pushAudioFrame(audioFrame: AudioData) {
    this.audioTrackGeneratorWriter?.write(audioFrame);
    audioFrame.close();
  }

  private async onVideoFrameDecoded({ frame }: Events[typeof EventTypes.VIDEO_FRAME_DECODED]) {
    this.pushVideoFrame(frame);
  }

  private async onAudioFrameDecoded({ frame }: Events[typeof EventTypes.AUDIO_FRAME_DECODED]) {
    this.pushAudioFrame(frame);
  }
};