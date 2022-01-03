import { Events } from '../event/events';
export default abstract class Player {
  public abstract load(url: string): Promise<boolean>;
  public abstract attachMedia(media: HTMLMediaElement): void;
  public abstract stop(): void;

  public abstract on<T extends keyof Events>(type: T, handler: ((payload: Events[T]) => void)): void;
  public abstract off<T extends keyof Events>(type: T, handler: ((payload: Events[T]) => void)): void;
  
  public abstract pushVideoFrame(videoFrame: VideoFrame): void;
  public abstract pushAudioFrame(audioFrame: AudioData): void;
};