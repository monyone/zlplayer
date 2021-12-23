export const EventTypes = {
  H264_ARRIVED: 'H264_ARRIVED',
  AAC_ARRIVED: 'AAC_ARRIVED',
  ID3_ARRIVED: 'ID3_ARRIVED',
  MPEG2VIDEO_ARRIVED: 'MPEG2VIDEO_ARRIVED'
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

export type Events = {
  [EventTypes.H264_ARRIVED]: H264_ARRIVED_PAYLOAD,
  [EventTypes.AAC_ARRIVED]: AAC_ARRIVED_PAYLOAD,
  [EventTypes.ID3_ARRIVED]: ID3_ARRIVED_PAYLOAD,
  [EventTypes.MPEG2VIDEO_ARRIVED]: MPEG2VIDEO_ARRIVED_PAYLOAD
}