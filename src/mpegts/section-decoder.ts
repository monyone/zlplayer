import Chunks from './chunks'
import {
  HEADER_LENGTH,
  pid,
  transport_error_indicator,
  payload_unit_start_indicator,
  has_adaptation_field,
  adaptation_field_length,
  PACKET_LENGTH,
  STUFFING_BYTE,
} from './packet'
import {
  section_length
} from './section'

export default class SectionDecoder {
  private readonly pid: number;
  private chunks: Chunks | null = null;

  public constructor(pid: number) {
    this.pid = pid;
  }

  public getPid(): number {
    return this.pid;
  }

  public add(packet: Uint8Array): Uint8Array[] {
    if (this.pid !== pid(packet)) { return []; }
    if (transport_error_indicator(packet)) { return []; }

    const result = [];

    if (payload_unit_start_indicator(packet)) {
      const offset = HEADER_LENGTH + (has_adaptation_field(packet) ? 1 : 0) + adaptation_field_length(packet);
      const pointer_field = packet[offset + 0];

      if (this.chunks) {
        this.chunks.push(packet.slice(offset + 1, offset + 1 + pointer_field));
        
        if (this.chunks.isFull()) {        
          result.push(this.chunks.concat());
          this.chunks = null;
        } else {
          this.chunks = null;
        }
      }

      for (let begin = offset + 1 + pointer_field; offset < PACKET_LENGTH; ) {
        if (packet[begin + 0] === STUFFING_BYTE) { break; }

        const seciton_length = this.chunks?.length() ?? section_length(packet);
        if (this.chunks == null) {
          this.chunks = new Chunks(seciton_length);
        }

        this.chunks.push(packet.slice(begin, Math.min(begin + seciton_length, PACKET_LENGTH)));
        if (this.chunks.isFull()) {        
          result.push(this.chunks.concat());
          this.chunks = null;
        } else if (this.chunks.isOver()) {
          this.chunks = null;
        }
      }
    } else if (this.chunks == null) {
      return [];
    } else {
      const begin = HEADER_LENGTH + (has_adaptation_field(packet) ? 1 : 0) + adaptation_field_length(packet);
      this.chunks.push(packet.slice(begin));

      if (this.chunks.isFull()) {        
        result.push(this.chunks.concat());
        this.chunks = null;
      } else if (this.chunks.isOver()) {
        this.chunks = null;
      }
    }

    return result;
  }
};