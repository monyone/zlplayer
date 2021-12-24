export const EventTypes = {
  H264_ARRIVED: 'H264_ARRIVED',
  AAC_ARRIVED: 'AAC_ARRIVED',
  ID3_ARRIVED: 'ID3_ARRIVED',
  MPEG2VIDEO_ARRIVED: 'MPEG2VIDEO_ARRIVED',

  DECODER_INITIALIZE: 'DECODER_INITIALIZE',

  VIDEO_FRAME_DECODED: 'VIDEO_FRAME_DECODED',
  AUDIO_FRAME_DECODED: 'AUDIO_FRAME_DECODED',

  VIDEO_DECODE_ERROR: 'VIDEO_DECODE_ERROR',
  AUDIO_DECODE_ERROR: 'AUDIO_DECODE_ERROR'
} as const;

export type H264_ARRIVED_PAYLOAD = {
  event: typeof EventTypes.H264_ARRIVED;
  initPTS: number;
  pts: number;
  begin: number;
  data: Uint8Array;
  has_IDR: boolean;
};

export type AAC_ARRIVED_PAYLOAD = {
  event: typeof EventTypes.AAC_ARRIVED;
  initPTS: number;
  pts: number;
  begin: number;
  data: Uint8Array;
};

export type ID3_ARRIVED_PAYLOAD = {
  event: typeof EventTypes.ID3_ARRIVED;
  initPTS: number;
  pts: number;
  begin: number;
  data: Uint8Array;
};

export type MPEG2VIDEO_ARRIVED_PAYLOAD = {
  event: typeof EventTypes.MPEG2VIDEO_ARRIVED;
  initPTS: number;
  pts: number;
  begin: number;
  data: Uint8Array;
}

export type DECODER_INITIALIZE_PAYLOAD = {
  event: typeof EventTypes.DECODER_INITIALIZE
}

export type VIDEO_FRAME_DECODED_PAYLOAD = {
  event: typeof EventTypes.VIDEO_FRAME_DECODED;
  frame: VideoFrame
}

export type AUDIO_FRAME_DECODED_PAYLOAD = {
  event: typeof EventTypes.AUDIO_FRAME_DECODED;
  frame: AudioData
}

export type VIDEO_DECODE_ERROR_PAYLOAD = {
  event: typeof EventTypes.VIDEO_DECODE_ERROR,
  error: unknown,
}

export type AUDIO_DECODE_ERROR_PAYLOAD = {
  event: typeof EventTypes.AUDIO_DECODE_ERROR,
  error: unknown,
}

export type Events = {
  [EventTypes.H264_ARRIVED]: H264_ARRIVED_PAYLOAD,
  [EventTypes.AAC_ARRIVED]: AAC_ARRIVED_PAYLOAD,
  [EventTypes.ID3_ARRIVED]: ID3_ARRIVED_PAYLOAD,
  [EventTypes.MPEG2VIDEO_ARRIVED]: MPEG2VIDEO_ARRIVED_PAYLOAD,

  [EventTypes.DECODER_INITIALIZE]: DECODER_INITIALIZE_PAYLOAD,

  [EventTypes.VIDEO_FRAME_DECODED]: VIDEO_FRAME_DECODED_PAYLOAD,
  [EventTypes.AUDIO_FRAME_DECODED]: AUDIO_FRAME_DECODED_PAYLOAD,

  [EventTypes.VIDEO_DECODE_ERROR]: VIDEO_DECODE_ERROR_PAYLOAD,
  [EventTypes.AUDIO_DECODE_ERROR]: AUDIO_DECODE_ERROR_PAYLOAD,
}