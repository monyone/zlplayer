export const PES_HEADER_SIZE = 6;

export const packet_start_code_prefix = (pes: Uint8Array): number => {
  return ((pes[0]) << 16) | ((pes[1]) << 8) | (pes[2]);
}

export const stream_id = (pes: Uint8Array): number => {
  return (pes[3]);
}

export const PES_packet_length = (pes: Uint8Array): number => {
  return ((pes[4]) << 8) | (pes[5])
}

export const has_optional_pes_header = (pes: Uint8Array): boolean => {
  switch (stream_id(pes)) {
    case 0b10111100: return false;
    case 0b10111111: return false;
    case 0b11110000: return false;
    case 0b11110001: return false;
    case 0b11110010: return false;
    case 0b11111000: return false;
    case 0b11111111: return false;
    case 0b10111110: return false;
    default: return true;
  }
}

export const has_pts = (pes: Uint8Array): boolean => {
  return has_optional_pes_header(pes) && (pes[PES_HEADER_SIZE + 1] & 0x80) !== 0;
}

export const has_dts = (pes: Uint8Array): boolean => {
  return has_optional_pes_header(pes) && (pes[PES_HEADER_SIZE + 1] & 0x40) !== 0;
}

export const optional_pes_header_length = (pes: Uint8Array): number => {
  if (has_optional_pes_header(pes)) {
    return pes[PES_HEADER_SIZE + 2];
  } else {
    return 0;
  }
}

export const pts = (pes: Uint8Array): number | null => {
  if (!has_pts(pes)) {
    return Number.NaN;
  }

  let value = 0;
  value *= (1 << 3); value += ((pes[PES_HEADER_SIZE + 3 + 0] & 0x0E) >> 1);
  value *= (1 << 8); value += ((pes[PES_HEADER_SIZE + 3 + 1] & 0xFF) >> 0);
  value *= (1 << 7); value += ((pes[PES_HEADER_SIZE + 3 + 2] & 0xFE) >> 1);
  value *= (1 << 8); value += ((pes[PES_HEADER_SIZE + 3 + 3] & 0xFF) >> 0);
  value *= (1 << 7); value += ((pes[PES_HEADER_SIZE + 3 + 4] & 0xFE) >> 1);

  return value;
}

export const dts = (pes: Uint8Array): number => {
  if (!has_dts(pes)) {
    return Number.NaN;
  }

  const offset = has_pts(pes) ? 5 : 0;
  let value = 0;
  value *= (1 << 3); value += ((pes[PES_HEADER_SIZE + 3 + offset + 0] & 0x0E) >> 1);
  value *= (1 << 8); value += ((pes[PES_HEADER_SIZE + 3 + offset + 1] & 0xFF) >> 0);
  value *= (1 << 7); value += ((pes[PES_HEADER_SIZE + 3 + offset + 2] & 0xFE) >> 1);
  value *= (1 << 8); value += ((pes[PES_HEADER_SIZE + 3 + offset + 3] & 0xFF) >> 0);
  value *= (1 << 7); value += ((pes[PES_HEADER_SIZE + 3 + offset + 4] & 0xFE) >> 1);

  return value;
}

export const PES_packet_data = (pes: Uint8Array) => {
  if (has_optional_pes_header(pes)) {
    return pes.slice(PES_HEADER_SIZE + 3 + optional_pes_header_length(pes));
  } else {
    return pes.slice(PES_HEADER_SIZE);
  }
}