const decodeBinaryString = (base64: string): string => {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(base64);
  }

  const bufferCtor = (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer;
  if (bufferCtor) {
    return bufferCtor.from(base64, 'base64').toString('binary');
  }

  throw new Error('No base64 decoder is available in the current environment.');
};

export function decode(base64: string): Uint8Array {
  const normalized = base64.replace(/\s+/g, '');
  const binaryString = decodeBinaryString(normalized);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }

  return buffer;
}
