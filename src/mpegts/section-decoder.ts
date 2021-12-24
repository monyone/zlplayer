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

  public add(packet: Uint8Array): Uint8Array[] | null {
    if (this.pid !== pid(packet)) { return null; }
    if (transport_error_indicator(packet)) { return null; }

    let result: Uint8Array[] | null = null;

    if (payload_unit_start_indicator(packet)) {
      const offset = HEADER_LENGTH + (has_adaptation_field(packet) ? 1 : 0) + adaptation_field_length(packet);
      const pointer_field = packet[offset + 0];

      if (this.chunks) {
        this.chunks.push(packet.slice(offset + 1, offset + 1 + pointer_field));
        
        if (this.chunks.isFull()) {  
          if (result == null) { result = []; }      
          result.push(this.chunks.concat());
          this.chunks = null;
        } else {
          this.chunks = null;
        }
      }

      for (let begin = offset + 1 + pointer_field; begin < PACKET_LENGTH; ) {
        if (packet[begin + 0] === STUFFING_BYTE) { break; }

        const length: number = this.chunks?.expect() ?? (3 + section_length(packet.slice(begin)));
        if (this.chunks == null) {
          this.chunks = new Chunks(length);
        }
        const rest: number = length - this.chunks.length();

        this.chunks.push(packet.slice(begin, Math.min(begin + rest, PACKET_LENGTH)));
        if (this.chunks.isFull()) {  
          if (result == null) { result = []; }            
          result.push(this.chunks.concat());
          this.chunks = null;
        } else if (this.chunks.isOver()) {
          this.chunks = null;
        }

        begin += rest;
      }
    } else if (this.chunks == null) {
      return null;
    } else {
      const begin = HEADER_LENGTH + (has_adaptation_field(packet) ? 1 : 0) + adaptation_field_length(packet);
      const length: number = this.chunks.expect()
      const rest = length - this.chunks.length();
      this.chunks.push(packet.slice(begin, Math.min(begin + rest, PACKET_LENGTH)));

      if (this.chunks.isFull()) {      
        if (result == null) { result = []; }        
        result.push(this.chunks.concat());
        this.chunks = null;
      } else if (this.chunks.isOver()) {
        this.chunks = null;
      }
    }

    return result;
  }
};