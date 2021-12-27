import { EventTypes } from './ticker-events';

let timerId: number | null = null;

const tick_function = () => {
  self.postMessage({ event: EventTypes.TICKER_TICK });
};

self.onmessage = async ({ data }) => {
  const { event } = data;
  switch(event) {
    case EventTypes.TICKER_START: {
      const { time } = data;
      if (timerId != null) {
        self.clearInterval(timerId);
        timerId = null;
      }
      timerId = self.setInterval(tick_function, time);
      break;
    }
    case EventTypes.TICKER_STOP: {
      if (timerId != null) {
        self.clearInterval(timerId);
        timerId = null;
      }
      break;
    }
  }
}