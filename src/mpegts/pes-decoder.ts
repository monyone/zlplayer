import Chunks from './chunks'
import {
  HEADER_LENGTH,
  pid,
  transport_error_indicator,
  payload_unit_start_indicator,
  has_adaptation_field,
  adaptation_field_length,
  PACKET_LENGTH,
} from './packet'

export default class PESDecoder {
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
      if (this.chunks && this.chunks.length() === 0) {
        result.push(this.chunks.concat());
        this.chunks = null;
      }

      const offset = HEADER_LENGTH + (has_adaptation_field(packet) ? 1 : 0) + adaptation_field_length(packet);
      const pes_length = this.chunks?.length() ?? ((packet[offset + 4] << 8) | packet[offset + 5]);

      if (this.chunks == null) {
        this.chunks = new Chunks(pes_length);
      }

      this.chunks.push(packet.slice(offset, Math.min(pes_length === 0 ? PACKET_LENGTH : offset + pes_length, PACKET_LENGTH)));
      
      if (this.chunks.length() !== 0) {
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

      if (this.chunks.length() !== 0) {
        if (this.chunks.isFull()) {        
          result.push(this.chunks.concat());
          this.chunks = null;
        } else if (this.chunks.isOver()) {
          this.chunks = null;
        }
      }
    }

    return result;
  }
};