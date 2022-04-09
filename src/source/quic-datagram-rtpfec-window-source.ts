import Source from "./source";

const rtp = (packet: Uint8Array) => {
  return {
    payload_type: (packet[1] & 0x7F),
    sequence_number: (packet[2] << 8) | packet[3],
    payload: packet.slice(12)
  };
}

type FEC = {
  SNBase_low_bits: number,
  length_recovery: number,
  Offset: number,
  NA: number,
  payload: Uint8Array
};
const fec = (packet: Uint8Array): FEC => {
  return {
    SNBase_low_bits: (packet[0] << 8) | packet[1],
    length_recovery: (packet[2] << 8) | packet[3],
    Offset: packet[13],
    NA: packet[14],
    payload: packet.slice(16)
  }; 
}

export default class HTTPStreamingWindowSource extends Source{  
  private webTransport: any | null = null;
  private datagramReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private abortController: AbortController | null = null;

  private outputStream: ReadableStream<Uint8Array>;
  private outputController: ReadableStreamController<Uint8Array> | null = null; 

  private ringBuffer: (Uint8Array | null)[] = [];
  private head: number = 0;
  private tail: number = 0;
  private length: number;
  private baseSN: number | null = null;
  private fecs: FEC[] = [];
 
  public constructor (length: number) {
    super();
    this.length = Math.max(length, 2);
    for (let i = 0; i < this.length; i++){ this.ringBuffer.push(null); }

    const global = this;
    this.outputStream = new ReadableStream<Uint8Array>({      
      start (controller) {
        global.outputController = controller;
      }
    })
  }

  static isSupported () {
    return !!((self as any).WebTransport)
  }

  public abort() {
    try {
      if (!this.outputStream.locked){
        this.outputStream?.cancel();
      }

      const global = this;
      this.outputStream = new ReadableStream<Uint8Array>({
        start (controller) {
          global.outputController = controller;
        }
      });
    } catch (e: unknown) {}
    try {
      this.datagramReader?.cancel();
    } catch (e: unknown) {}
    try {
      this.abortController?.abort();
    } catch (e: unknown) {}
  }

  public async load(url: string): Promise<boolean> {
    this.abort();

    if (self.AbortController) {
      this.abortController = new self.AbortController();
    }

    try {
      this.webTransport = new (self as any).WebTransport(url);
      await this.webTransport.ready;

      this.datagramReader = this.webTransport.datagrams.readable.getReader();
      this.pump();
      return true;
    } catch (e: unknown) {
      return false;
    }
  }

  public getStream(): ReadableStream<Uint8Array> {
    return this.outputStream;
  }

  private after(sequence_number: number): boolean {
    if (this.baseSN == null) { return false; }
    return (2 ** 15) > ((sequence_number - this.baseSN + 2 ** 16) % (2 ** 16))
  }
  private has(sequence_number: number): boolean {
    if (this.baseSN == null) { return false; }
    if (!this.after(sequence_number)) { return false; }
    const size = (this.tail - this.head + this.length) % this.length;
    const index = (sequence_number - this.baseSN + 2 ** 16) % (2 ** 16);

    return index < size;
  }
  private get(sequence_number: number): Uint8Array | null {
    if (this.baseSN == null) { return null; }
    if (!this.has(sequence_number)) { return null; }

    const index = (sequence_number - this.baseSN + 2 ** 16) % (2 ** 16);
    return this.ringBuffer[index];
  }

  private push(payload: Uint8Array, sequence_number: number): (Uint8Array | null)[] {
    if (this.baseSN == null) { return []; }
    if (!this.after(sequence_number)) { return []; }
    const slide: (Uint8Array | null)[] = [];
    
    let size = ((this.tail - this.head + this.length) % this.length);
    let index = ((sequence_number - this.baseSN) + 2 ** 16) % (2 ** 16);
    while (index >= (this.length - 1)) {
      slide.push(this.ringBuffer[this.head]);
      this.ringBuffer[this.head] = null;
      this.head = (this.head + 1) % this.length;
      this.baseSN = (this.baseSN + 1) % (2 ** 16);
      size = (((this.tail - this.head) + this.length) % this.length);
      index = ((sequence_number - this.baseSN) + 2 ** 16) % (2 ** 16);
    }

    this.ringBuffer[(this.head + index) % this.length] = payload;
    this.tail = (this.head + Math.max(index + 1, size)) % this.length;
    return slide;
 }

  private pump(): void {
    if (this.datagramReader == null) { return; }
    this.datagramReader.read().then(({ value, done }) => {
      if (done) {
        return;
      } else if (this.abortController?.signal.aborted) {
        return;
      } else if (!this.outputController) {
        return;
      }

      const { payload_type, sequence_number, payload: rtp_payload } = rtp(value!);
      if (payload_type === 33) { // MP2T
        if (this.baseSN == null) {
          this.baseSN = sequence_number;
        }
        
        const emits = this.push(rtp_payload, sequence_number);
        for (const packet of emits) {
          if (packet === null) { // DROP
            continue;
          }
          this.outputController.enqueue(packet);
        }

        while (true) {
          let recovered = false;
          const next_fecs: FEC[] = [];

          for (const fec of this.fecs) {
            const { SNBase_low_bits, Offset, NA, payload: fec_payload } = fec;
            const SNBase_high_bits = (SNBase_low_bits + Offset * (NA - 1)) % (2 ** 16);

            if (!this.after(SNBase_low_bits)) {
              continue;
            }

            if (!this.has(SNBase_high_bits)) {
              next_fecs.push(fec);
              continue;
            }

            let dropped = 0;
            let drop_sequence_number: number | null = null;
            for (let index = 0; index < Offset * NA; index += Offset) {
              const sequence_number = (SNBase_low_bits + index + 2 ** 16) % (2 ** 16);

              if (this.get(sequence_number) == null) {
                dropped += 1;
                drop_sequence_number = sequence_number;
              }
            }

            if (dropped >= 2) {
              continue;
            } else if (dropped === 0) {
              next_fecs.push(fec);
              continue;
            }

            const xor = new Uint8Array(fec_payload);
            for (let index = 0; index < Offset * NA; index += Offset) {
              const sequence_number = (SNBase_low_bits + index + 2 ** 16) % (2 ** 16);
              const packet = this.get(sequence_number);
              if (packet == null) { continue; }

              for (let i = 0; i < packet.byteLength; i++) {
                xor[i] = xor[i] ^ packet[i];
              }
            }
            this.push(xor, drop_sequence_number!);
            recovered = true;
          }

          this.fecs = next_fecs;
          if (!recovered) {
            break;
          }
        }

      } else { // FEC
        this.fecs.push(fec(rtp_payload));
      }

      return this.pump();
    })
  }
};
