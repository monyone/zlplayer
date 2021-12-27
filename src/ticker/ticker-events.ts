import {
  EventTypes as PlayerEventTypes,
  Events as PlayerEvents
} from '../event/events'

export const EventTypes = {
  TICKER_START: 'TICKER_START',
  TICKER_TICK: 'TICKER_TICK',
  TICKER_STOP: 'TICKER_STOP'
} as const;

export type TICKER_START_PAYLOAD = {
  event: typeof EventTypes.TICKER_START;
  time: number;
}

export type TICKER_TICK_PAYLOAD = {
  event: typeof EventTypes.TICKER_TICK;
}

export type TICKER_STOP_PAYLOAD = {
  event: typeof EventTypes.TICKER_STOP;
}


export type Events = {
  [EventTypes.TICKER_START]: TICKER_START_PAYLOAD,
  [EventTypes.TICKER_TICK]: TICKER_TICK_PAYLOAD,
  [EventTypes.TICKER_STOP]: TICKER_STOP_PAYLOAD
}