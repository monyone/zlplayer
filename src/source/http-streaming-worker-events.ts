export const EventTypes = {
  LOAD_REQUEST: 'LOAD_REQUEST',
  LOAD_ABORTED: 'LOAD_ABORTED',
  LOAD_SUCCEEDED: 'LOAD_SUCCEEDED',
  LOAD_FAILED: 'LOAD_FAILED',
  DATA_ARRIVED: 'DATA_ARRIVED',
} as const;

export type LOAD_REQUEST_PAYLOAD = {
  event: typeof EventTypes.LOAD_REQUEST,
  url: string,
  fetchOptions: RequestInit
}

export type LOAD_SUCCEEDED_PAYLOAD = {
  event: typeof EventTypes.LOAD_SUCCEEDED
}

export type LOAD_FAILED_PAYLOAD = {
  event: typeof EventTypes.LOAD_FAILED
}

export type LOAD_ABORTED_PAYLOAD = {
  event: typeof EventTypes.LOAD_ABORTED
}

export type DATA_ARRIVED_PAYLOAD = {
  event: typeof EventTypes.DATA_ARRIVED;
  data: Uint8Array,
};

export type Events = {
  [EventTypes.LOAD_REQUEST]: LOAD_REQUEST_PAYLOAD,
  [EventTypes.LOAD_ABORTED]: LOAD_ABORTED_PAYLOAD,
  [EventTypes.LOAD_SUCCEEDED]: LOAD_SUCCEEDED_PAYLOAD,
  [EventTypes.LOAD_FAILED]: LOAD_FAILED_PAYLOAD,
  [EventTypes.DATA_ARRIVED]: DATA_ARRIVED_PAYLOAD
}