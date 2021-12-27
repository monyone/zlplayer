import EventEmitter from "../event/eventemitter";

import PESDecoder from "../mpegts/pes-decoder";
import SectionDecoder from "../mpegts/section-decoder";

import { 
  pid,
  has_pcr,
  pcr,
  PCR_CYCLES,
  HZ
} from "../mpegts/packet";

import { 
  CRC_SIZE,
  EXTENDED_HEADER_SIZE
} from "../mpegts/section";

import { 
  has_pts,
  pts,
  PES_packet_data,
} from "../mpegts/pes";

import { 
  EventTypes,
} from "../event/events";
import { has_IDR } from "../mpegts/h264";

const StreamType = {
  MPEG2: 0x02,
  AVC1: 0x1B,
  AAC: 0x0F,
  PRIVATE_DATA: 0x06,
  ID3: 0x15
} as const;

export default class Demuxer {  
  private inputReader: ReadableStreamDefaultReader<Uint8Array>;
  private emitter: EventEmitter;

  private PATDecoder: SectionDecoder = new SectionDecoder(0);
  private PMTDecoder: SectionDecoder | null = null;
  private VideoDecoder: PESDecoder | null = null; // H264
  private SoundDecoder: PESDecoder | null = null; // AAC
  private ID3Decoder: PESDecoder | null = null; // TIMED-ID3
  private ARIBCaptionDecoder: PESDecoder | null = null; // ARIB-CAPTION
  private MPEG2Decoder: PESDecoder | null = null; // MPEG2

  private PCR_PID: number | null = null;
  private initPTS: number | null = null;
  private isFirstAAC: boolean;;

  public constructor (reader: ReadableStream<Uint8Array>, emitter: EventEmitter) {
    this.inputReader = reader.getReader();
    this.emitter = emitter;
    this.isFirstAAC = true;
    this.pump();
  }

  static isSupported () {
    return !!(self.ReadableStream) && !!(self.EventTarget);
  }

  public abort() {
    this.reset();
    try {
      this.inputReader?.cancel();
    } catch (e: unknown) {}
  }

  private reset(): void {
    this.PMTDecoder = null;
    this.VideoDecoder = null;
    this.SoundDecoder = null;
    this.ID3Decoder = null;
    this.MPEG2Decoder = null;
    
    this.PCR_PID = null;
    this.initPTS = null;
  }

  private pump(): void {
    this.inputReader.read().then(({ value, done }) => {
      if (done) {
        return;
      }

      const packet = value!;
      const packet_pid = pid(packet);

      if (packet_pid === this.PCR_PID) {
        if (has_pcr(packet) && this.initPTS == null) {
          this.initPTS = pcr(packet);
        }
      }

      if (packet_pid === this.PATDecoder.getPid()) {
        const result = this.PATDecoder.add(packet);
        for (let i = 0; result && i < result.length; i++){
          const PAT = result[i];
          
          for (let offset = EXTENDED_HEADER_SIZE; offset < PAT.length - CRC_SIZE; offset += 4) {
            const program_number = (PAT[offset + 0] << 8) | (PAT[offset + 1]);
            const PID = ((PAT[offset + 2] & 0x1F) << 8) | (PAT[offset + 3]);

            if (program_number === 0) { continue; }
            if (this.PMTDecoder == null) {
              this.PMTDecoder = new SectionDecoder(PID);
            }
          }
        }
      }else if(packet_pid === this.PMTDecoder?.getPid()) {
        const result = this.PMTDecoder!.add(packet);
        for (let i = 0; result && i < result.length; i++){
          const PMT = result[i];

          if (this.PCR_PID == null) {
            this.PCR_PID = ((PMT[EXTENDED_HEADER_SIZE + 0] & 0x1F) << 8) | (PMT[EXTENDED_HEADER_SIZE + 1]);
          }

          const program_info_length = ((PMT[EXTENDED_HEADER_SIZE + 2] & 0x0F) << 8) | (PMT[EXTENDED_HEADER_SIZE + 3]);
          for (let offset = EXTENDED_HEADER_SIZE + 4 + program_info_length; offset < PMT.length - CRC_SIZE; ) {
            const stream_type = PMT[offset + 0];
            const elementary_PID = ((PMT[offset + 1] & 0x1F) << 8) | (PMT[offset + 2]);
            const ES_info_length = ((PMT[offset + 3] & 0x0F) << 8) | (PMT[offset + 4]);

            if (stream_type === StreamType.AVC1 && this.VideoDecoder == null) {
              this.VideoDecoder = new PESDecoder(elementary_PID);
            } else if (stream_type === StreamType.AAC && this.SoundDecoder == null) {
              this.SoundDecoder = new PESDecoder(elementary_PID);
            } else if (stream_type === StreamType.ID3 && this.ID3Decoder == null) {
              this.ID3Decoder = new PESDecoder(elementary_PID);
            } else if (stream_type === StreamType.MPEG2 && this.MPEG2Decoder == null) {
              this.MPEG2Decoder = new PESDecoder(elementary_PID);
            } else if (stream_type === StreamType.PRIVATE_DATA) {
              for (let descriptor = offset + 5; descriptor < offset + 5 + ES_info_length; ) {
                const descriptor_tag = PMT[descriptor + 0];
                const descriptor_length = PMT[descriptor + 1];

                if (descriptor_tag === 0x52) {
                  const component_tag = PMT[descriptor + 2];

                  if (0x30 <= component_tag && component_tag <= 0x37 && this.ARIBCaptionDecoder == null) {
                    this.ARIBCaptionDecoder = new PESDecoder(elementary_PID);
                  }
                }

                descriptor += 2 + descriptor_length;
              }
            }

            offset += 5 + ES_info_length;
          }
        } 
      } else if(packet_pid === this.VideoDecoder?.getPid()) {
        const result = this.VideoDecoder!.add(packet);
        for (let i = 0; result && i < result.length; i++){
          const video = result[i];

          if (this.initPTS == null) { continue; }
          if (!has_pts(video)) { continue; }

          const video_pts: number = pts(video)!;
          const video_elapsed_seconds: number = ((video_pts - this.initPTS + PCR_CYCLES) % PCR_CYCLES) / HZ;

          this.emitter.emit(EventTypes.H264_PARSED, {
            event: EventTypes.H264_PARSED,
            initPTS: this.initPTS,
            pts: video_pts,
            timestamp: video_elapsed_seconds,
            data: PES_packet_data(video),
            has_IDR: has_IDR(video)
          });
        }
      } else if(packet_pid === this.SoundDecoder?.getPid()) {
        const result = this.SoundDecoder!.add(packet);
        for (let i = 0; result && i < result.length; i++){
          const sound = result[i];

          if (this.initPTS == null) { continue; }
          if (!has_pts(sound)) { continue; }

          const sound_pts: number = pts(sound)!;
          const sound_elapsed_seconds: number = ((sound_pts - this.initPTS + PCR_CYCLES) % PCR_CYCLES) / HZ;

          this.emitter.emit(EventTypes.AAC_PARSED, {
            event: EventTypes.AAC_PARSED,
            initPTS: this.initPTS,
            pts: sound_pts,
            timestamp: this.isFirstAAC ? 0 : sound_elapsed_seconds,
            data: PES_packet_data(sound)
          });

          this.isFirstAAC = false;
        }
      } else if(packet_pid === this.ID3Decoder?.getPid()) {
        const result = this.ID3Decoder!.add(packet);
        for (let i = 0; result && i < result.length; i++){
          const id3 = result[i];

          if (this.initPTS == null) { continue; }
          if (!has_pts(id3)) { continue; }

          const id3_pts: number = pts(id3)!;
          const id3_elapsed_seconds: number = ((id3_pts - this.initPTS + PCR_CYCLES) % PCR_CYCLES) / HZ;

          this.emitter.emit(EventTypes.ID3_PARSED, {
            event: EventTypes.ID3_PARSED,
            initPTS: this.initPTS,
            pts: id3_pts,
            timestamp: id3_elapsed_seconds,
            data: PES_packet_data(id3)
          });
        }
      } else if(packet_pid === this.ARIBCaptionDecoder?.getPid()) {
        const result = this.ARIBCaptionDecoder!.add(packet);
        for (let i = 0; result && i < result.length; i++){
          const arib_caption = result[i];

          if (this.initPTS == null) { continue; }
          if (!has_pts(arib_caption)) { continue; }

          const arib_caption_pts: number = pts(arib_caption)!;
          const arib_caption_elapsed_seconds: number = ((arib_caption_pts - this.initPTS + PCR_CYCLES) % PCR_CYCLES) / HZ;

          this.emitter.emit(EventTypes.ARIB_CAPTION_PARSED, {
            event: EventTypes.ARIB_CAPTION_PARSED,
            initPTS: this.initPTS,
            pts: arib_caption_pts,
            timestamp: arib_caption_elapsed_seconds,
            data: PES_packet_data(arib_caption)
          });
        }
      } else if(packet_pid === this.MPEG2Decoder?.getPid()) {
        const result = this.MPEG2Decoder!.add(packet);
        for (let i = 0; result && i < result.length; i++){
          const mpeg2 = result[i];

          if (this.initPTS == null) { continue; }
          if (!has_pts(mpeg2)) { continue; }
          
          const mpeg2_pts: number = pts(mpeg2)!;
          const mpeg2_elapsed_seconds: number = ((mpeg2_pts - this.initPTS + PCR_CYCLES) % PCR_CYCLES) / HZ;
          this.emitter.emit(EventTypes.MPEG2VIDEO_PARSED, {
            event: EventTypes.MPEG2VIDEO_PARSED,
            initPTS: this.initPTS,
            pts: mpeg2_pts,
            timestamp: mpeg2_elapsed_seconds,
            data: PES_packet_data(mpeg2)
          });
        }
      }
      
      this.pump();
    })
  }
};