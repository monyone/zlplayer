import {
  EventTypes as PlayerEventTypes,
  Events as PlayerEvents
} from '../event/events'

export const EventTypes = {
  [PlayerEventTypes.H264_EMITTED]: PlayerEventTypes.H264_EMITTED,
  [PlayerEventTypes.AAC_EMITTED]: PlayerEventTypes.AAC_EMITTED,
  
  DECODER_INITIALIZE: 'DECODER_INITIALIZE',

  [PlayerEventTypes.VIDEO_FRAME_DECODED]: PlayerEventTypes.VIDEO_FRAME_DECODED,
  [PlayerEventTypes.AUDIO_FRAME_DECODED]: PlayerEventTypes.AUDIO_FRAME_DECODED,
  [PlayerEventTypes.VIDEO_DECODE_ERROR]: PlayerEventTypes.VIDEO_DECODE_ERROR,
  [PlayerEventTypes.AUDIO_DECODE_ERROR]: PlayerEventTypes.AUDIO_DECODE_ERROR
} as const;

export type H264_EMITTED_PAYLOAD = PlayerEvents[typeof PlayerEventTypes.H264_EMITTED];
export type AAC_EMITTED_PAYLOAD = PlayerEvents[typeof PlayerEventTypes.AAC_EMITTED];
export type DECODER_INITIALIZE_PAYLOAD = {
  event: typeof EventTypes.DECODER_INITIALIZE;
};
export type VIDEO_FRAME_DECODED_PAYLOAD = PlayerEvents[typeof PlayerEventTypes.VIDEO_FRAME_DECODED];
export type AUDIO_FRAME_DECODED_PAYLOAD = PlayerEvents[typeof PlayerEventTypes.AUDIO_FRAME_DECODED];
export type VIDEO_DECODE_ERROR_PAYLOAD = PlayerEvents[typeof PlayerEventTypes.VIDEO_DECODE_ERROR];
export type AUDIO_DECODE_ERROR_PAYLOAD = PlayerEvents[typeof PlayerEventTypes.AUDIO_DECODE_ERROR];

export type Events = {
  [EventTypes.H264_EMITTED]: H264_EMITTED_PAYLOAD,
  [EventTypes.AAC_EMITTED]: AAC_EMITTED_PAYLOAD,
  
  [EventTypes.DECODER_INITIALIZE]: DECODER_INITIALIZE_PAYLOAD,

  [EventTypes.VIDEO_FRAME_DECODED]: VIDEO_FRAME_DECODED_PAYLOAD,
  [EventTypes.AUDIO_FRAME_DECODED]: AUDIO_FRAME_DECODED_PAYLOAD,
  [EventTypes.VIDEO_DECODE_ERROR]: VIDEO_DECODE_ERROR_PAYLOAD,
  [EventTypes.AUDIO_DECODE_ERROR]: AUDIO_DECODE_ERROR_PAYLOAD
}