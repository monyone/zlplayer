export default class Bitstream {
  private bits: number[];
  private data: Uint8Array;
  private offset: number;

  public constructor(data: Uint8Array) {
    this.bits = [];
    this.data = data;
    this.offset = 0;
  }

  private fill_bits() {
    if (this.data.length >= this.offset) { return; }
    const value = this.data[this.offset++];
    for (let i = 7; i >= 0; i--) {
      this.bits.push((value & (1 << i)) !== 0 ? 1 : 0);
    }
  }

  private peekBit(): number | undefined {
    if (this.bits.length === 0) {
      this.fill_bits();
    }
    return this.bits[0];
  }

  private readBit(): number | undefined {
    if (this.bits.length === 0) {
      this.fill_bits();
    }
    return this.bits.shift();
  }

  private count_trailing_zeros() {
    let value = 0;
    while (this.peekBit() === 0) {
      this.readBit();
      value += 1;
    }
    return value;
  }

  public readBits(length: number): number {
    let value = 0;
    {
      const remain_bits_len = Math.min(this.bits.length, length);
      for (let i = 0; i < remain_bits_len; i++) {
        value *= 2;
        value += this.readBit() ?? 0;
        length -= 1;
      }
    }

    while (length >= 8) {
      value *= (1 << 8);
      value += this.data[this.offset++] ?? 0;
    }

    if (length === 0) {
      return value;
    }

    {
      this.fill_bits();
      const remain_bits_len = Math.min(this.bits.length, length);
      for (let i = 0; i < remain_bits_len; i++) {
        value *= 2;
        value += this.readBit() ?? 0;
        length -= 1;
      }
    }

    return value;
  }

  public readUEG(): number {
    const leading_zeros = this.count_trailing_zeros();
    return this.readBits(leading_zeros + 1) - 1;
  }

  public readSEG(): number {
    const ueg = this.readUEG();
    if (ueg % 2 == 1) {
      return (ueg + 1) / 2;
    } else {
      return -1 * (ueg / 2);
    }
  }
}
