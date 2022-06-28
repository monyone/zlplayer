import { EventTypes, Events } from './http-streaming-worker-events';

let fetchReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let abortController: AbortController | null = null;

self.onmessage = async ({ data }) => {
  const { event } = data;
  switch (event) {
    case EventTypes.LOAD_REQUEST: {
      const { url, options } = data as Events[typeof EventTypes.LOAD_REQUEST]
      if (self.AbortController) {
        abortController = new self.AbortController();
      }

      try {
        const result = await fetch(url, {
          signal: abortController?.signal,
          ... options?.fetchOptions
        });
  
        if (!(result.ok && 200 <= result.status && result.status < 300)) {
          self.postMessage({ event: EventTypes.LOAD_FAILED });
          return;
        }
  
        if (!(result.body)) {
          self.postMessage({ event: EventTypes.LOAD_FAILED });
          return;
        }
  
        fetchReader = result.body.getReader();
        self.postMessage({ event: EventTypes.LOAD_SUCCEEDED });
        pump();
      } catch (e: unknown) {
        self.postMessage({ event: EventTypes.LOAD_FAILED });
        return;
      }
      break;
    };
    case EventTypes.LOAD_ABORTED: {
      try {
        fetchReader?.cancel();
      } catch (e: unknown) {}
      try {
        abortController?.abort();
      } catch (e: unknown) {}
      break;
    }
  }
}

const pump = () => {
  if (fetchReader == null) { return; }
  fetchReader.read().then(({ value, done }) => {
    if (done) {
      return;
    } else if (abortController?.signal.aborted) {
      return;
    }

    self.postMessage({ event: EventTypes.DATA_ARRIVED, data: value })
    return pump();
  })
}