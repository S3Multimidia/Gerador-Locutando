export const removeSilence = (
    buffer: AudioBuffer,
    threshold: number = -50, // dB
    minSilenceDuration: number = 0.5, // seconds
    maxAllowedSilence: number = 0 // seconds (0 = remove all)
): AudioBuffer => {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const thresholdAmplitude = Math.pow(10, threshold / 20);
    const minSilenceSamples = minSilenceDuration * sampleRate;
    const maxAllowedSamples = maxAllowedSilence * sampleRate;

    // Identify silence ranges to REMOVE (or shorten)
    const rangesToRemove: { start: number; end: number }[] = [];
    let silenceStart = -1;

    for (let i = 0; i < channelData.length; i++) {
        if (Math.abs(channelData[i]) < thresholdAmplitude) {
            if (silenceStart === -1) {
                silenceStart = i;
            }
        } else {
            if (silenceStart !== -1) {
                const silenceLength = i - silenceStart;
                if (silenceLength >= minSilenceSamples) {
                    // If we want to keep some silence, we adjust the range start
                    // remove from (silenceStart + maxAllowedSamples) to i
                    const removeStart = silenceStart + maxAllowedSamples;
                    if (removeStart < i) {
                        rangesToRemove.push({ start: removeStart, end: i });
                    }
                }
                silenceStart = -1;
            }
        }
    }

    // Check trailing silence
    if (silenceStart !== -1) {
        const silenceLength = channelData.length - silenceStart;
        if (silenceLength >= minSilenceSamples) {
            const removeStart = silenceStart + maxAllowedSamples;
            if (removeStart < channelData.length) {
                rangesToRemove.push({ start: removeStart, end: channelData.length });
            }
        }
    }

    if (rangesToRemove.length === 0) return buffer;

    // Calculate new length
    const totalRemovedSamples = rangesToRemove.reduce((acc, range) => acc + (range.end - range.start), 0);
    const newLength = buffer.length - totalRemovedSamples;

    if (newLength <= 0) {
        // Return empty buffer of 1 sample to avoid errors
        return new AudioBuffer({ length: 1, numberOfChannels: buffer.numberOfChannels, sampleRate });
    }

    const resultBuffer = new AudioBuffer({
        length: newLength,
        numberOfChannels: buffer.numberOfChannels,
        sampleRate: sampleRate
    });

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const inputData = buffer.getChannelData(channel);
        const outputData = resultBuffer.getChannelData(channel);

        let inputOffset = 0;
        let outputOffset = 0;

        for (const range of rangesToRemove) {
            // Copy data BEFORE this silence range
            const lengthToCopy = range.start - inputOffset;
            if (lengthToCopy > 0) {
                outputData.set(inputData.subarray(inputOffset, range.start), outputOffset);
                outputOffset += lengthToCopy;
            }
            inputOffset = range.end;
        }

        // Copy remaining data after last silence
        if (inputOffset < inputData.length) {
            outputData.set(inputData.subarray(inputOffset), outputOffset);
        }
    }

    return resultBuffer;
};

export const cutAudio = (
    buffer: AudioBuffer,
    startSec: number,
    endSec: number
): AudioBuffer => {
    if (startSec >= endSec) return buffer;

    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(Math.max(0, startSec) * sampleRate);
    const endSample = Math.floor(Math.min(buffer.duration, endSec) * sampleRate);

    if (startSample >= buffer.length || endSample <= 0 || startSample >= endSample) return buffer;

    const removeCount = endSample - startSample;
    const newLength = buffer.length - removeCount;

    if (newLength <= 0) {
        return new AudioBuffer({ length: 1, numberOfChannels: buffer.numberOfChannels, sampleRate });
    }

    const resultBuffer = new AudioBuffer({
        length: newLength,
        numberOfChannels: buffer.numberOfChannels,
        sampleRate: sampleRate
    });

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const inputData = buffer.getChannelData(channel);
        const outputData = resultBuffer.getChannelData(channel);

        // Part 1: Before cut
        if (startSample > 0) {
            outputData.set(inputData.subarray(0, startSample), 0);
        }

        // Part 2: After cut
        if (endSample < inputData.length) {
            outputData.set(inputData.subarray(endSample), startSample);
        }
    }

    return resultBuffer;
};

export const applyFade = (
    buffer: AudioBuffer,
    fadeInDuration: number,
    fadeOutDuration: number
): AudioBuffer => {
    // Returns a COPY with fades applied
    const newBuffer = new AudioBuffer({
        length: buffer.length,
        numberOfChannels: buffer.numberOfChannels,
        sampleRate: buffer.sampleRate
    });

    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const inputData = buffer.getChannelData(ch);
        const outputData = newBuffer.getChannelData(ch);
        outputData.set(inputData);

        const fadeInSamples = Math.floor(fadeInDuration * buffer.sampleRate);
        const fadeOutSamples = Math.floor(fadeOutDuration * buffer.sampleRate);

        // Apply Fade In
        for (let i = 0; i < fadeInSamples && i < outputData.length; i++) {
            // Linear fade
            outputData[i] *= (i / fadeInSamples);
        }

        // Apply Fade Out
        for (let i = 0; i < fadeOutSamples && i < outputData.length; i++) {
            const index = outputData.length - 1 - i;
            if (index >= 0) {
                outputData[index] *= (i / fadeOutSamples);
            }
        }
    }

    return newBuffer;
};

export const applyCompressor = (
    buffer: AudioBuffer,
    threshold: number, // dB, e.g., -24
    ratio: number // e.g., 4 (4:1)
): AudioBuffer => {
    // Simple offline compressor implementation
    // Note: A true high-quality compressor is complex. This is a basic implementation.
    // For better results, we might want to use the Web Audio API's DynamicsCompressorNode in an OfflineAudioContext.

    const newBuffer = new AudioBuffer({
        length: buffer.length,
        numberOfChannels: buffer.numberOfChannels,
        sampleRate: buffer.sampleRate
    });

    // Basic hard-knee compressor
    const thresholdLinear = Math.pow(10, threshold / 20);

    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const inputData = buffer.getChannelData(ch);
        const outputData = newBuffer.getChannelData(ch);

        for (let i = 0; i < inputData.length; i++) {
            let sample = inputData[i];
            const absSample = Math.abs(sample);

            if (absSample > thresholdLinear) {
                // Apply compression
                // Output = Threshold + (Input - Threshold) / Ratio
                // In linear domain:
                const over = absSample - thresholdLinear;
                const compressedOver = over / ratio;
                const newAbs = thresholdLinear + compressedOver;

                // Preserve sign
                outputData[i] = (sample > 0 ? 1 : -1) * newAbs;
            } else {
                outputData[i] = sample;
            }
        }
    }

    return newBuffer;
};

export const applyEcho = (
    buffer: AudioBuffer,
    delayTime: number, // seconds
    feedback: number // 0 to 1
): AudioBuffer => {
    // Simple delay/echo implementation
    const sampleRate = buffer.sampleRate;
    const delaySamples = Math.floor(delayTime * sampleRate);

    // The output buffer needs to be longer to accommodate the echo tail
    // Let's add enough space for the echo to decay to negligible levels (-60dB)
    // Decay time ~= delayTime * ( -60dB / (20 * log10(feedback)) )
    // For simplicity, let's just add 2-3 seconds or a fixed multiple of delay
    const tailSeconds = delayTime * 5; // Rough estimate
    const newLength = buffer.length + Math.floor(tailSeconds * sampleRate);

    const newBuffer = new AudioBuffer({
        length: newLength,
        numberOfChannels: buffer.numberOfChannels,
        sampleRate: sampleRate
    });

    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const inputData = buffer.getChannelData(ch);
        const outputData = newBuffer.getChannelData(ch);

        // Copy original
        outputData.set(inputData);

        // Apply echo
        for (let i = 0; i < newLength; i++) {
            const delayIndex = i - delaySamples;
            if (delayIndex >= 0 && delayIndex < newLength) {
                // Add delayed signal * feedback
                // We need to be careful not to read from outputData if we haven't written yet,
                // but here we are iterating forward.
                // Actually, we should read from the *already processed* output to support multiple repeats (feedback)

                const delayedSample = outputData[delayIndex];
                outputData[i] += delayedSample * feedback;
            }
        }
    }

    return newBuffer;
};
