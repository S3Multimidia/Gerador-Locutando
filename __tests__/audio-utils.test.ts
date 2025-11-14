import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { decode, decodeAudioData } from '../audio-utils';

class MockAudioBuffer {
  public readonly numberOfChannels: number;
  public readonly length: number;
  public readonly sampleRate: number;
  private readonly channels: Float32Array[];

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    const data = this.channels[channel];
    if (!data) {
      throw new Error(`Channel ${channel} does not exist.`);
    }
    return data;
  }
}

class MockAudioContext {
  public lastBuffer: MockAudioBuffer | null = null;

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer {
    const buffer = new MockAudioBuffer(numberOfChannels, length, sampleRate);
    this.lastBuffer = buffer;
    return buffer as unknown as AudioBuffer;
  }
}

describe('audio-utils.decode', () => {
  it('converts a base64 string into the expected Uint8Array', () => {
    const base64 = 'AQID'; // [1, 2, 3]
    const result = decode(base64);
    assert.deepEqual(Array.from(result), [1, 2, 3]);
  });
});

describe('audio-utils.decodeAudioData', () => {
  it('normalizes PCM data into an AudioBuffer', async () => {
    const pcmSamples = new Int16Array([0, 32767, -32768, 16384]);
    const uint8Data = new Uint8Array(pcmSamples.buffer.slice(0));
    const ctx = new MockAudioContext();

    const buffer = await decodeAudioData(uint8Data, ctx as unknown as AudioContext, 24000, 1);
    assert.ok(buffer instanceof MockAudioBuffer);

    const typedBuffer = buffer as unknown as MockAudioBuffer;
    const channelData = typedBuffer.getChannelData(0);
    const expected = [0, 32767 / 32768, -1, 16384 / 32768];

    assert.equal(channelData.length, expected.length);
    channelData.forEach((value, index) => {
      assert.ok(Math.abs(value - expected[index]) < 1e-6, `Sample ${index} mismatch`);
    });
  });
});
