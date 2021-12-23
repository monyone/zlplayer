export const BASIC_HEADER_SIZE = 3;
export const EXTENDED_HEADER_SIZE = 8;
export const CRC_SIZE = 4;

export const table_id = (section: Uint8Array): number => {
  return section[0];
}

export const section_length = (section: Uint8Array): number => {
  return ((section[1] & 0x0F) << 8 | (section[2]));
}

export const table_id_extension = (section: Uint8Array): number => {
  return ((section[3] << 8) | (section[4]))
}

export const version_number = (section: Uint8Array): number => {
  return ((section[5]) & 0x3E);
}

export const current_next_indicator = (section: Uint8Array): boolean => {
  return ((section[5]) & 0x01) !== 0;
}

export const section_number = (section: Uint8Array): number => {
  return (section[6]);
}

export const last_section_number = (section: Uint8Array): number => {
  return (section[7]);
}

export const CRC32 = (section: Uint8Array): number => {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < section.length; i++) {
    const byte = section[i];

    for (let j = 7; j >= 0; j--) {
      const bit = (byte & (1 << j)) >> j;
      const c = crc & 0x80000000 ? 1 : 0;
      crc <<= 1
      if ((c ^ bit) !== 0) {
        crc ^= 0x04c11db7
      }
      crc &= 0xFFFFFFFF
    }
  };
  return crc;
}

