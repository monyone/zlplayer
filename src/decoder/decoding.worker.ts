import { EventTypes } from '../event/events';

let videoDecoder: VideoDecoder | null = null;
let audioDecoder: AudioDecoder | null = null;
let videoKeyFrameArrived: boolean = false;

const resetVideoDecoder = async () => {
  videoDecoder = new VideoDecoder({
    output: (videoFrame) => {
      self.postMessage({
        event: EventTypes.VIDEO_FRAME_DECODED,
        frame: videoFrame
      });
      videoFrame.close();
    },
    error: (e) => {
      self.postMessage({
        event: EventTypes.VIDEO_DECODE_ERROR,
        error: e,
      });
    },
  })
  await videoDecoder.configure({
    codec: 'avc1.64001f', // TODO: refer sps
    hardwareAcceleration: "prefer-hardware",
  });
  videoKeyFrameArrived = false;
}

const resetAudioDecoder = async () => {
  audioDecoder = new AudioDecoder({
    output: (audioFrame) => {
      self.postMessage({
        event: EventTypes.AUDIO_FRAME_DECODED,
        frame: audioFrame
      });
      audioFrame.close();
    },
    error: (e) => {
      self.postMessage({
        event: EventTypes.AUDIO_DECODE_ERROR,
        error: e,
      });
    },
  });
  await audioDecoder.configure({
    codec: 'mp4a.40.2',
    sampleRate: 48000, // TODO: Refer ADTS Header
    numberOfChannels: 2,
  });
}

self.onmessage = async ({ data }) => {
  const { event } = data;
  switch(event) {
    case EventTypes.H264_ARRIVED: {
      const { begin, data: rawData, has_IDR } = data;
      
      videoKeyFrameArrived ||= has_IDR;
      if (!videoKeyFrameArrived) { return; }
  
      const encodedVideoChunk = new EncodedVideoChunk({
        type: has_IDR ? 'key' : 'delta',
        timestamp: begin * 1000000,
        data: rawData,
      });
  
      try {
        videoDecoder?.decode(encodedVideoChunk);
      } catch (e: unknown) {
        self.postMessage({
          event: EventTypes.VIDEO_DECODE_ERROR,
          error: e,
        });
        await resetVideoDecoder();
      }
      break;
    }
    case EventTypes.AAC_ARRIVED: {
      const { begin, data: rawData } = data;
    
      const encodedAudioChunk = new EncodedAudioChunk({
        type: 'key',
        timestamp: begin * 1000000,
        data: rawData,
      });

      try {
        audioDecoder?.decode(encodedAudioChunk);
      } catch (e: unknown) {
        self.postMessage({
          event: EventTypes.AUDIO_DECODE_ERROR,
          error: e,
        });
        await resetAudioDecoder();
      }
      break;
    }
    case EventTypes.DECODER_INITIALIZE: {
      await resetVideoDecoder();
      await resetAudioDecoder();
      break;
    }
  }
}