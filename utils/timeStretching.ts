/**
 * SOLA (Synchronized Overlap-Add) Time Stretching Implementation
 * Optimized for Speech Signals to avoid robotic artifacts.
 */

// Helper to find the best overlap position (Cross-Correlation)
function findBestOffset(
    input: Float32Array,
    output: Float32Array,
    inputOffset: number,
    outputOffset: number,
    windowSize: number,
    seekWindow: number
): number {
    let bestOffset = 0;
    let maxCorrelation = -Infinity;

    // Search within the seek window for the best alignment
    for (let i = 0; i < seekWindow; i++) {
        let correlation = 0;

        // Simple cross-correlation
        for (let j = 0; j < windowSize; j++) {
            if (outputOffset + j < output.length && inputOffset + i + j < input.length) {
                correlation += output[outputOffset + j] * input[inputOffset + i + j];
            }
        }

        if (correlation > maxCorrelation) {
            maxCorrelation = correlation;
            bestOffset = i;
        }
    }

    return bestOffset;
}

export async function timeStretchSOLA(
    buffer: AudioBuffer,
    rate: number,
    audioContext: AudioContext
): Promise<AudioBuffer> {
    if (Math.abs(rate - 1.0) < 0.01) return buffer;

    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const inputLength = buffer.length;
    // Estimated output length
    const outputLength = Math.ceil(inputLength / rate);

    // SOLA Parameters
    // Window size around 20-30ms is good for speech
    const windowSizeMs = 25;
    const windowSize = Math.floor((windowSizeMs * sampleRate) / 1000);
    // Overlap around 50%
    const overlap = Math.floor(windowSize * 0.5);
    // Seek window for alignment (how far to search for matching phase)
    const seekWindowMs = 15;
    const seekWindow = Math.floor((seekWindowMs * sampleRate) / 1000);

    const outputBuffer = audioContext.createBuffer(numChannels, outputLength + windowSize, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const inputData = buffer.getChannelData(channel);
        const outputData = outputBuffer.getChannelData(channel);

        // Analysis step (hop size in input)
        // Rate < 1 (slower): Input hop < Output hop
        // Rate > 1 (faster): Input hop > Output hop
        // Let's fix output hop (synthesis step) and vary input hop (analysis step)

        // SOLA Logic:
        // We want to place segments such that they overlap coherently.
        // Sa (Analysis Hop) = Ss (Synthesis Hop) * rate

        const Ss = outputLength > inputLength ? Math.floor(windowSize * 0.8) : Math.floor(windowSize * 0.5);
        // Adapting hop size based on stretch can help quality, but fixed synthesis hop is standard SOLA.
        // Let's stick to standard SOLA definition.

        // Actually, a simpler OLA approach for variable time stretch:
        // WSOLA (Waveform Similarity Overlap-Add) is better but strictly standard SOLA finds best overlap.

        let analysisPtr = 0;
        let synthesisPtr = 0;

        // Prepare first frame
        outputData.set(inputData.subarray(0, windowSize), 0);
        analysisPtr = Math.floor(Ss * rate);
        synthesisPtr = Ss;

        while (analysisPtr + windowSize + seekWindow < inputData.length && synthesisPtr + windowSize < outputData.length) {
            // Find best match in input for the current synthesis overlap region
            // The "natural" next segment starts at analysisPtr.
            // But we search around analysisPtr to find a segment that matches the tail of the output.

            // We are looking for an offset 'delta' such that input[analysisPtr + delta] matches output[synthesisPtr]

            // Wait, typical SOLA aligns the *next* input frame to the *existing* output tail.
            // Range to match in output: [synthesisPtr, synthesisPtr + overlap]
            // We search in input around analysisPtr to find best correlation with that output range.

            let bestDelta = 0;
            let bestScore = -1;

            // Search range in input: from analysisPtr to analysisPtr + seekWindow
            // Optimisation: We only check one channel for alignment (usually channel 0) and apply to others?
            // Or do strictly per channel? Speech usually mono-correlated, but let's do per channel for safety.

            // Cross-correlation loop
            // Compare output[synthesisPtr ... synthesisPtr+overlap] 
            // with input[analysisPtr+k ... analysisPtr+k+overlap]

            for (let k = 0; k < seekWindow; k++) {
                let score = 0;
                for (let j = 0; j < overlap; j += 4) { // downsample for speed
                    const v1 = outputData[synthesisPtr + j];
                    const v2 = inputData[analysisPtr + k + j];
                    score += v1 * v2;
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestDelta = k;
                }
            }

            const actualInputStart = analysisPtr + bestDelta;

            // Cross-fade (Overlap-Add)
            // Fade out old (already in output), Fade in new (from input)
            for (let j = 0; j < overlap; j++) {
                const fadeWait = j / overlap; // 0 to 1
                const oldVal = outputData[synthesisPtr + j];
                const newVal = inputData[actualInputStart + j];

                // Linear Crossfade
                outputData[synthesisPtr + j] = (oldVal * (1 - fadeWait)) + (newVal * fadeWait);
            }

            // Copy the rest of the window (non-overlapping part)
            const remaining = windowSize - overlap;
            if (synthesisPtr + overlap + remaining < outputData.length) {
                outputData.set(inputData.subarray(actualInputStart + overlap, actualInputStart + windowSize), synthesisPtr + overlap);
            }

            // Advance pointers
            synthesisPtr += Ss;
            analysisPtr += Math.floor(Ss * rate); // Nominal advance
        }
    }

    return outputBuffer;
}
