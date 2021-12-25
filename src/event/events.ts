export const EventTypes = {
  H264_PARSED: 'H264_PARSED',
  AAC_PARSED: 'AAC_PARSED',
  ID3_PARSED: 'ID3_PARSED',
  MPEG2VIDEO_PARSED: 'MPEG2VIDEO_PARSED',

  H264_EMITTED: 'H264_EMITTED',
  AAC_EMITTED: 'AAC_EMITTED',
  MPEG2VIDEO_EMITTED: 'MPEG2VIDEO_EMITTED',

  VIDEO_FRAME_DECODED: 'VIDEO_FRAME_DECODED',
  AUDIO_FRAME_DECODED: 'AUDIO_FRAME_DECODED',

  VIDEO_DECODE_ERROR: 'VIDEO_DECODE_ERROR',
  AUDIO_DECODE_ERROR: 'AUDIO_DECODE_ERROR'
} as const;

export type H264_PARSED_PAYLOAD = {
  event: typeof EventTypes.H264_PARSED;
  initPTS: number;
  pts: number;
  begin: number;
  data: Uint8Array;
  has_IDR: boolean;
};

export type AAC_PARSED_PAYLOAD = {
  event: typeof EventTypes.AAC_PARSED;
  initPTS: number;
  pts: number;
  begin: number;
  data: Uint8Array;
};

export type ID3_PARSED_PAYLOAD = {
  event: typeof EventTypes.ID3_PARSED;
  initPTS: number;
  pts: number;
  begin: number;
  data: Uint8Array;
};

export type MPEG2VIDEO_PARSED_PAYLOAD = {
  event: typeof EventTypes.MPEG2VIDEO_PARSED;
  initPTS: number;
  pts: number;
  begin: number;
  data: Uint8Array;
}

export type H264_EMITTED_PAYLOAD = {
  event: typeof EventTypes.H264_EMITTED;
  initPTS: number;
  pts: number;
  begin: number;
  data: Uint8Array;
  has_IDR: boolean;
};

export type AAC_EMITTED_PAYLOAD = {
  event: typeof EventTypes.AAC_EMITTED;
  initPTS: number;
  pts: number;
  begin: number;
  data: Uint8Array;
};

export type MPEG2VIDEO_EMITTED_PAYLOAD = {
  event: typeof EventTypes.MPEG2VIDEO_EMITTED;
  initPTS: number;
  pts: number;
  begin: number;
  data: Uint8Array;
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
  [EventTypes.H264_PARSED]: H264_PARSED_PAYLOAD,
  [EventTypes.AAC_PARSED]: AAC_PARSED_PAYLOAD,
  [EventTypes.ID3_PARSED]: ID3_PARSED_PAYLOAD,
  [EventTypes.MPEG2VIDEO_PARSED]: MPEG2VIDEO_PARSED_PAYLOAD,

  [EventTypes.H264_EMITTED]: H264_EMITTED_PAYLOAD,
  [EventTypes.AAC_EMITTED]: AAC_EMITTED_PAYLOAD,
  [EventTypes.MPEG2VIDEO_EMITTED]: MPEG2VIDEO_EMITTED_PAYLOAD,

  [EventTypes.VIDEO_FRAME_DECODED]: VIDEO_FRAME_DECODED_PAYLOAD,
  [EventTypes.AUDIO_FRAME_DECODED]: AUDIO_FRAME_DECODED_PAYLOAD,

  [EventTypes.VIDEO_DECODE_ERROR]: VIDEO_DECODE_ERROR_PAYLOAD,
  [EventTypes.AUDIO_DECODE_ERROR]: AUDIO_DECODE_ERROR_PAYLOAD,
}