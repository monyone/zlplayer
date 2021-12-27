export default class Chunks {
  private chunks: Uint8Array[] = [];
  private total = 0;
  private expected = 0;

  public constructor(expected: number) {
    this.expected = expected;
  }

  public push(buffer: Uint8Array): void {
    this.chunks.push(buffer);
    this.total += buffer.byteLength;
  }

  public length(): number {
    return this.total;
  }

  public expect(): number {
    return this.expected;
  }

  public concat(): Uint8Array {
    const result = new Uint8Array(this.total);
    for (let i = 0, offset = 0; i < this.chunks.length; i++) {
      result.set(this.chunks[i], offset);
      offset += this.chunks[i].byteLength;
    }
    return result;
  }

  public isOver(): boolean {
    return this.total > this.expected;
  }

  public isFull(): boolean {
    return this.total === this.expected;
  }
};