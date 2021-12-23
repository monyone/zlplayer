export const has_IDR = (annexb: Uint8Array) => {
  for (let offset = 0; offset < annexb.length - 2; offset++) {
    if (annexb[offset + 0] !== 0) { continue; }
    if (annexb[offset + 1] !== 0) { continue; }
    if (annexb[offset + 2] !== 1) { continue; }

    const nal_unit_type = annexb[offset + 2] & 0x1F;
    if (nal_unit_type === 0x05) { return true; }
  }
  return false;
}