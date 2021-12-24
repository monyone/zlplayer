import {
  EventTypes as PlayerEventTypes,
  Events as PlayerEvents
} from '../event/events'

export const EventTypes = {
  [PlayerEventTypes.H264_ARRIVED]: PlayerEventTypes.H264_ARRIVED,
  [PlayerEventTypes.AAC_ARRIVED]: PlayerEventTypes.AAC_ARRIVED,
  
  DECODER_INITIALIZE: 'DECODER_INITIALIZE',

  [PlayerEventTypes.VIDEO_FRAME_DECODED]: PlayerEventTypes.VIDEO_FRAME_DECODED,
  [PlayerEventTypes.AUDIO_FRAME_DECODED]: PlayerEventTypes.AUDIO_FRAME_DECODED,
  [PlayerEventTypes.VIDEO_DECODE_ERROR]: PlayerEventTypes.VIDEO_DECODE_ERROR,
  [PlayerEventTypes.AUDIO_DECODE_ERROR]: PlayerEventTypes.AUDIO_DECODE_ERROR
} as const;

export type H264_ARRIVED_PAYLOAD = PlayerEvents[typeof PlayerEventTypes.H264_ARRIVED];
export type AAC_ARRIVED_PAYLOAD = PlayerEvents[typeof PlayerEventTypes.AAC_ARRIVED];
export type DECODER_INITIALIZE_PAYLOAD = {
  event: typeof EventTypes.DECODER_INITIALIZE;
};
export type VIDEO_FRAME_DECODED_PAYLOAD = PlayerEvents[typeof PlayerEventTypes.VIDEO_FRAME_DECODED];
export type AUDIO_FRAME_DECODED_PAYLOAD = PlayerEvents[typeof PlayerEventTypes.AUDIO_FRAME_DECODED];
export type VIDEO_DECODE_ERROR_PAYLOAD = PlayerEvents[typeof PlayerEventTypes.VIDEO_DECODE_ERROR];
export type AUDIO_DECODE_ERROR_PAYLOAD = PlayerEvents[typeof PlayerEventTypes.AUDIO_DECODE_ERROR];

export type Events = {
  [EventTypes.H264_ARRIVED]: H264_ARRIVED_PAYLOAD,
  [EventTypes.AAC_ARRIVED]: AAC_ARRIVED_PAYLOAD,
  
  [EventTypes.DECODER_INITIALIZE]: DECODER_INITIALIZE_PAYLOAD,

  [EventTypes.VIDEO_FRAME_DECODED]: VIDEO_FRAME_DECODED_PAYLOAD,
  [EventTypes.AUDIO_FRAME_DECODED]: AUDIO_FRAME_DECODED_PAYLOAD,
  [EventTypes.VIDEO_DECODE_ERROR]: VIDEO_DECODE_ERROR_PAYLOAD,
  [EventTypes.AUDIO_DECODE_ERROR]: AUDIO_DECODE_ERROR_PAYLOAD
}