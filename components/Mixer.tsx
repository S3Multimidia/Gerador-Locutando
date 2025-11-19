

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadIcon, MusicIcon, LoadingSpinner, PlayIcon, PauseIcon, DownloadIcon, Volume2Icon, VolumeXIcon, SlidersIcon, WandIcon } from './IconComponents';

// LameJS is loaded from a script tag in index.html
declare var lamejs: any;

// Helper function to convert an AudioBuffer to a MP3 file Blob
async function audioBufferToMp3(buffer: AudioBuffer): Promise<Blob> {
    const targetSampleRate = 44100;

    // 1. Resample and ensure stereo using OfflineAudioContext
    const offlineCtx = new OfflineAudioContext(2, buffer.duration * targetSampleRate, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    const resampledBuffer = await offlineCtx.startRendering();

    // 2. Get separate channel data
    const leftFloat = resampledBuffer.getChannelData(0);
    const rightFloat = resampledBuffer.getChannelData(1);

    // 3. Convert to 16-bit PCM
    const convert = (floatArray: Float32Array) => {
        const int16Array = new Int16Array(floatArray.length);
        for (let i = 0; i < floatArray.length; i++) {
            const sample = Math.max(-1, Math.min(1, floatArray[i]));
            int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }
        return int16Array;
    };
    const leftInt16 = convert(leftFloat);
    const rightInt16 = convert(rightFloat);

    // 4. Encode with LameJS
    const mp3encoder = new lamejs.Mp3Encoder(2, targetSampleRate, 128); // Stereo, 44.1kHz, 128kbps
    const mp3Data: Uint8Array[] = [];
    const sampleBlockSize = 1152;

    for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
        const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
        const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }

    return new Blob(mp3Data, { type: 'audio/mpeg' });
}


// #region High-Quality Time-Stretching (Phase Vocoder)
// Based on well-established algorithms, adapted for this project.

function fft(real: Float32Array, imag: Float32Array) {
    const n = real.length;
    if (n === 0) return;
    
    // Bit-reversal permutation
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j >= bit; bit >>= 1) j -= bit;
        j += bit;
        if (i < j) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
        }
    }

    // Cooley-Tukey main loops
    for (let len = 2; len <= n; len <<= 1) {
        const halfLen = len >> 1;
        const tReal = Math.cos(Math.PI / halfLen);
        const tImag = Math.sin(Math.PI / halfLen);
        for (let i = 0; i < n; i += len) {
            let wReal = 1;
            let wImag = 0;
            for (let j = 0; j < halfLen; j++) {
                const uReal = real[i + j];
                const uImag = imag[i + j];
                const vReal = real[i + j + halfLen] * wReal - imag[i + j + halfLen] * wImag;
                const vImag = real[i + j + halfLen] * wImag + imag[i + j + halfLen] * wReal;
                real[i + j] = uReal + vReal;
                imag[i + j] = uImag + vImag;
                real[i + j + halfLen] = uReal - vReal;
                imag[i + j + halfLen] = uImag - vImag;
                const temp = wReal * tReal - wImag * tImag;
                wImag = wReal * tImag + wImag * tReal;
                wReal = temp;
            }
        }
    }
}

function ifft(real: Float32Array, imag: Float32Array) {
    fft(imag, real);
    const n = real.length;
    if (n === 0) return;
    for (let i = 0; i < n; i++) {
        real[i] /= n;
        imag[i] /= n;
    }
}

/**
 * Time-stretches an AudioBuffer using a Phase Vocoder method
 * to change speed without changing the pitch, offering higher quality for voice.
 */
async function timeStretch(
    audioContext: AudioContext, 
    buffer: AudioBuffer, 
    rate: number
): Promise<AudioBuffer> {
    return new Promise(resolve => {
        setTimeout(() => { // Keep UI responsive by running in a timeout
            if (Math.abs(rate - 1.0) < 0.01) {
                resolve(buffer);
                return;
            }

            const frameSize = 2048;
            const hopSize = frameSize / 4;

            const inputData = buffer.getChannelData(0);
            const inputLength = inputData.length;
            const outputLength = Math.floor(inputLength / rate);
            const outputData = new Float32Array(outputLength).fill(0);

            // Hanning window
            const window = new Float32Array(frameSize);
            for (let i = 0; i < frameSize; i++) {
                window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frameSize - 1)));
            }

            // Phase vocoder state
            const frameReal = new Float32Array(frameSize);
            const frameImag = new Float32Array(frameSize);
            const numBins = frameSize / 2 + 1;
            
            const prevInputPhases = new Float32Array(numBins).fill(0);
            const outputPhases = new Float32Array(numBins).fill(0);

            const twoPi = 2 * Math.PI;
            const sampleRate = buffer.sampleRate;
            
            let outputPos = 0;

            for (let inputPos = 0; inputPos + frameSize <= inputLength; inputPos += hopSize) {
                // 1. Analysis: Windowing and FFT
                for (let i = 0; i < frameSize; i++) {
                    frameReal[i] = inputData[inputPos + i] * window[i];
                    frameImag[i] = 0;
                }
                fft(frameReal, frameImag);

                // 2. Process each frequency bin
                for (let i = 0; i < numBins; i++) {
                    const real = frameReal[i];
                    const imag = frameImag[i];
                    const magnitude = Math.sqrt(real * real + imag * imag);
                    const inputPhase = Math.atan2(imag, real);

                    // Phase difference and frequency deviation
                    const phaseDiff = inputPhase - prevInputPhases[i];
                    prevInputPhases[i] = inputPhase;

                    const expectedPhase = twoPi * hopSize * i / frameSize;
                    let phaseDeviation = phaseDiff - expectedPhase;
                    
                    while (phaseDeviation > Math.PI) phaseDeviation -= twoPi;
                    while (phaseDeviation < -Math.PI) phaseDeviation += twoPi;

                    // True frequency for this bin
                    const freqDeviationInHz = phaseDeviation * sampleRate / (twoPi * hopSize);
                    const trueFreqInHz = (i * sampleRate / frameSize) + freqDeviationInHz;

                    // 3. Synthesis: Calculate new phase and create output spectrum
                    const newPhase = outputPhases[i] + (twoPi * (hopSize / rate) * trueFreqInHz) / sampleRate;
                    outputPhases[i] = newPhase;
                    
                    frameReal[i] = magnitude * Math.cos(newPhase);
                    frameImag[i] = magnitude * Math.sin(newPhase);

                    if (i > 0 && i < numBins - 1) {
                       frameReal[frameSize - i] = frameReal[i];
                       frameImag[frameSize - i] = -frameImag[i];
                    }
                }

                // 4. Inverse FFT and Overlap-Add
                ifft(frameReal, frameImag);
                
                for (let i = 0; i < frameSize; i++) {
                    const outIndex = Math.round(outputPos) + i;
                    if (outIndex < outputLength) {
                        outputData[outIndex] += frameReal[i] * window[i];
                    }
                }
                
                outputPos += hopSize / rate;
            }
            
            // Simple peak normalization to prevent clipping, which can be perceived as low quality.
            const maxAmplitude = outputData.reduce((max, val) => Math.max(max, Math.abs(val)), 0);
            if (maxAmplitude > 1.0) {
                const gain = 1.0 / maxAmplitude;
                for (let i = 0; i < outputLength; i++) {
                    outputData[i] *= gain;
                }
            }

            const newBuffer = audioContext.createBuffer(1, outputLength, sampleRate);
            newBuffer.copyToChannel(outputData, 0);
            
            resolve(newBuffer);
        }, 0);
    });
}
// #endregion

interface MixerProps {
  generatedAudio: AudioBuffer;
  audioContext: AudioContext;
  setGeneratedAudio: (audio: AudioBuffer | null) => void;
  preloadedTracks: { name: string, buffer: AudioBuffer }[];
  isDefaultTrackLoading: boolean;
}

type Track = { buffer: AudioBuffer; fileName: string };

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type TrackName = 'opening' | 'voice' | 'background' | 'closing';

export const Mixer: React.FC<MixerProps> = ({ generatedAudio, audioContext, setGeneratedAudio, preloadedTracks, isDefaultTrackLoading }) => {
  const [openingTrack, setOpeningTrack] = useState<Track | null>(null);
  const [backgroundTrack, setBackgroundTrack] = useState<Track | null>(null);
  const [closingTrack, setClosingTrack] = useState<Track | null>(null);

  const [isLoading, setIsLoading] = useState({ opening: false, background: false, closing: false });
  const [error, setError] = useState<string | null>(null);
  
  const [volumes, setVolumes] = useState({ opening: 1, voice: 1, background: 0.5, closing: 1 });
  const [mutes, setMutes] = useState({ opening: false, voice: false, background: false, closing: false });
  const [voicePlaybackRate, setVoicePlaybackRate] = useState<number>(1.0);


  const [startPad, setStartPad] = useState<number>(2.5);
  const [endPad, setEndPad] = useState<number>(3.0);
  const [fadeInDuration, setFadeInDuration] = useState<number>(1.0);
  const [fadeOutDuration, setFadeOutDuration] = useState<number>(1.5);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMixing, setIsMixing] = useState<boolean>(false);
  const [isPreparingMix, setIsPreparingMix] = useState<boolean>(false);
  const [isStretching, setIsStretching] = useState<boolean>(false);

  const [treatments, setTreatments] = useState({
    noiseReduction: false,
    removeSilence: false,
    normalizeVolume: false,
    compressor: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Refs for full mix playback
  const sourceRefs = useRef<Record<TrackName, AudioBufferSourceNode | null>>({ opening: null, voice: null, background: null, closing: null });
  const playbackTimeoutRef = useRef<number | null>(null);
  
  // State and Refs for individual track previews
  const [previewingTrack, setPreviewingTrack] = useState<TrackName | null>(null);
  const previewSourceRef = useRef<{source: AudioBufferSourceNode, gain: GainNode} | null>(null);
  
  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (preloadedTracks.length > 0 && isInitialLoad.current) {
        setBackgroundTrack({
            buffer: preloadedTracks[0].buffer,
            fileName: preloadedTracks[0].name,
        });
        isInitialLoad.current = false;
    }
  }, [preloadedTracks]);

  const stopPreview = useCallback(() => {
    if (previewSourceRef.current) {
        previewSourceRef.current.source.onended = null;
        try { previewSourceRef.current.source.stop(); } catch(e) {}
        previewSourceRef.current = null;
    }
    setPreviewingTrack(null);
  }, []);
  
  const stopPlayback = useCallback(() => {
    if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
        playbackTimeoutRef.current = null;
    }
    Object.keys(sourceRefs.current).forEach(key => {
        const source = sourceRefs.current[key as TrackName];
        if (source) {
            source.onended = null;
            try { source.stop(); } catch (e) {}
        }
    });
    sourceRefs.current = { opening: null, voice: null, background: null, closing: null };
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    // Cleanup function that stops all audio when component unmounts or dependencies change
    return () => {
        stopPlayback();
        stopPreview();
    };
  }, [generatedAudio, openingTrack, backgroundTrack, closingTrack, stopPlayback, stopPreview]);

  const handleFileChange = async (
      event: React.ChangeEvent<HTMLInputElement>,
      trackType: 'opening' | 'background' | 'closing'
  ) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // Reset file input
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
        setError(`O arquivo é muito grande. O tamanho máximo é de ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
        return;
    }

    const setTrackMap = {
      opening: setOpeningTrack,
      background: setBackgroundTrack,
      closing: setClosingTrack,
    };

    setError(null);
    setIsLoading(prev => ({ ...prev, [trackType]: true }));
    setTrackMap[trackType](null);
    stopPlayback();
    stopPreview();

    try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        setTrackMap[trackType]({ buffer: audioBuffer, fileName: file.name });
    } catch (e) {
        console.error("Error decoding audio file:", e);
        setError("Não foi possível decodificar o arquivo de áudio. Verifique se o formato é suportado (MP3, WAV).");
    } finally {
        setIsLoading(prev => ({ ...prev, [trackType]: false }));
    }
  };

  const handleBackgroundSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    if (selectedName === 'custom') {
        setBackgroundTrack(null);
        // Trigger file input click
        const uploader = document.getElementById('background-upload-input');
        uploader?.click();
    } else {
        const selectedTrack = preloadedTracks.find(t => t.name === selectedName);
        if (selectedTrack) {
            setBackgroundTrack({
                buffer: selectedTrack.buffer,
                fileName: selectedTrack.name
            });
        }
    }
};
  
  const togglePreview = useCallback(async (track: TrackName) => {
    if (isPlaying) stopPlayback();
    if (previewingTrack === track) {
        stopPreview();
        return;
    }
    stopPreview();

    if (audioContext.state === 'suspended') audioContext.resume();

    let buffer: AudioBuffer | null = null, volume = 1, isMuted = false;

    switch(track) {
        case 'voice':
            buffer = generatedAudio; volume = volumes.voice; isMuted = mutes.voice;
            break;
        case 'opening':
            buffer = openingTrack?.buffer ?? null; volume = volumes.opening; isMuted = mutes.opening;
            break;
        case 'background':
            buffer = backgroundTrack?.buffer ?? null; volume = volumes.background; isMuted = mutes.background;
            break;
        case 'closing':
            buffer = closingTrack?.buffer ?? null; volume = volumes.closing; isMuted = mutes.closing;
            break;
    }
    if (!buffer) return;
    
    // Apply time-stretching for voice preview if needed
    if (track === 'voice' && Math.abs(voicePlaybackRate - 1.0) > 0.01) {
        setIsStretching(true);
        try {
            buffer = await timeStretch(audioContext, buffer, voicePlaybackRate);
        } catch(e) {
            console.error("Error time-stretching audio:", e);
            setError("Falha ao ajustar a velocidade da voz.");
            setIsStretching(false);
            return;
        } finally {
            setIsStretching(false);
        }
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioContext.createGain();
    gainNode.gain.value = isMuted ? 0 : volume;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    source.onended = () => {
        if (previewSourceRef.current?.source === source) stopPreview();
    };
    
    source.start(0);
    previewSourceRef.current = { source, gain: gainNode };
    setPreviewingTrack(track);

  }, [audioContext, generatedAudio, openingTrack, backgroundTrack, closingTrack, volumes, mutes, voicePlaybackRate, isPlaying, previewingTrack, stopPlayback, stopPreview]);

  // Effect to update volume in real-time during preview
  useEffect(() => {
    if (!previewingTrack || !previewSourceRef.current) return;
    
    const { gain } = previewSourceRef.current;
    let volume = 1, isMuted = false;

    switch(previewingTrack) {
        case 'voice': volume = volumes.voice; isMuted = mutes.voice; break;
        case 'opening': volume = volumes.opening; isMuted = mutes.opening; break;
        case 'background': volume = volumes.background; isMuted = mutes.background; break;
        case 'closing': volume = volumes.closing; isMuted = mutes.closing; break;
    }
    gain.gain.setTargetAtTime(isMuted ? 0 : volume, audioContext.currentTime, 0.015);

  }, [volumes, mutes, previewingTrack, audioContext]);

  const togglePlay = useCallback(async () => {
    if (previewingTrack) stopPreview();
    if (isPlaying) {
      stopPlayback();
      return;
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    
    setIsPreparingMix(true);
    let voiceBuffer = generatedAudio;
    try {
        if (Math.abs(voicePlaybackRate - 1.0) > 0.01) {
            voiceBuffer = await timeStretch(audioContext, generatedAudio, voicePlaybackRate);
        }
    } catch(e) {
        console.error("Error preparing mix:", e);
        setError("Falha ao ajustar a velocidade da voz para a mixagem.");
        setIsPreparingMix(false);
        return;
    }
    setIsPreparingMix(false);
    
    const openingDuration = openingTrack?.buffer.duration ?? 0;
    const voiceDuration = voiceBuffer.duration;
    const mixDuration = backgroundTrack ? startPad + voiceDuration + endPad : voiceDuration;
    const closingDuration = closingTrack?.buffer.duration ?? 0;
    const totalDuration = openingDuration + mixDuration + closingDuration;
    const startTime = audioContext.currentTime;

    const createSourceWithGain = (buffer: AudioBuffer, volume: number, muted: boolean) => {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      const gainNode = audioContext.createGain();
      gainNode.gain.value = muted ? 0 : volume;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      return { source, gainNode };
    };

    if (openingTrack) {
      const { source, gainNode } = createSourceWithGain(openingTrack.buffer, volumes.opening, mutes.opening);
      const targetVolume = mutes.opening ? 0 : volumes.opening;
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(targetVolume, startTime + Math.min(fadeInDuration, openingTrack.buffer.duration));
      source.start(startTime);
      sourceRefs.current.opening = source;
    }
    
    const { source: voiceSource } = createSourceWithGain(voiceBuffer, volumes.voice, mutes.voice);
    const voiceStartTime = startTime + openingDuration + (backgroundTrack ? startPad : 0);
    voiceSource.start(voiceStartTime);
    sourceRefs.current.voice = voiceSource;

    if (backgroundTrack) {
      const { source, gainNode } = createSourceWithGain(backgroundTrack.buffer, volumes.background, mutes.background);
      const trackStartTime = startTime + openingDuration;
      const fadeOutStartTime = trackStartTime + startPad + voiceDuration;
      const fadeOutEndTime = trackStartTime + mixDuration;
      
      gainNode.gain.setValueAtTime(gainNode.gain.value, trackStartTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, fadeOutStartTime);
      gainNode.gain.linearRampToValueAtTime(0.0001, fadeOutEndTime);
      
      source.start(trackStartTime);
      source.stop(fadeOutEndTime);
      sourceRefs.current.background = source;
    }

    if (closingTrack) {
      const { source, gainNode } = createSourceWithGain(closingTrack.buffer, volumes.closing, mutes.closing);
      const closingStartTime = startTime + openingDuration + mixDuration;
      const targetVolume = mutes.closing ? 0 : volumes.closing;
      const fadeOutStart = closingStartTime + closingTrack.buffer.duration - Math.min(fadeOutDuration, closingTrack.buffer.duration);
      gainNode.gain.setValueAtTime(targetVolume, closingStartTime);
      if(fadeOutStart > closingStartTime) {
          gainNode.gain.setValueAtTime(targetVolume, fadeOutStart);
          gainNode.gain.linearRampToValueAtTime(0.0001, closingStartTime + closingTrack.buffer.duration);
      }
      source.start(closingStartTime);
      sourceRefs.current.closing = source;
    }
    
    playbackTimeoutRef.current = window.setTimeout(() => {
        setIsPlaying(false);
        playbackTimeoutRef.current = null;
    }, totalDuration * 1000);
    
    setIsPlaying(true);
  }, [isPlaying, stopPlayback, audioContext, generatedAudio, openingTrack, backgroundTrack, closingTrack, volumes, mutes, startPad, endPad, fadeInDuration, fadeOutDuration, voicePlaybackRate, stopPreview, previewingTrack]);

  const handleDownload = async () => {
    if (isMixing) return;
    stopPlayback();
    stopPreview();
    
    setIsMixing(true);
    setError(null);

    try {
        let voiceBuffer = generatedAudio;
        if (Math.abs(voicePlaybackRate - 1.0) > 0.01) {
            voiceBuffer = await timeStretch(audioContext, generatedAudio, voicePlaybackRate);
        }
        
        const openingDuration = openingTrack?.buffer.duration ?? 0;
        const voiceDuration = voiceBuffer.duration;
        const mixDuration = backgroundTrack ? startPad + voiceDuration + endPad : voiceDuration;
        const closingDuration = closingTrack?.buffer.duration ?? 0;
        const outputDuration = openingDuration + mixDuration + closingDuration;

        if (backgroundTrack && backgroundTrack.buffer.duration < mixDuration) {
          console.warn("A trilha sonora é mais curta que a duração da mixagem final.");
        }

        const offlineCtx = new OfflineAudioContext(2, Math.ceil(audioContext.sampleRate * outputDuration), audioContext.sampleRate);
        
        const createOfflineSourceWithGain = (buffer: AudioBuffer, volume: number, muted: boolean) => {
            const source = offlineCtx.createBufferSource();
            source.buffer = buffer;
            const gainNode = offlineCtx.createGain();
            gainNode.gain.value = muted ? 0 : volume;
            source.connect(gainNode);
            gainNode.connect(offlineCtx.destination);
            return { source, gainNode };
        };

        if (openingTrack) {
          const { source, gainNode } = createOfflineSourceWithGain(openingTrack.buffer, volumes.opening, mutes.opening);
          const targetVolume = mutes.opening ? 0 : volumes.opening;
          gainNode.gain.setValueAtTime(0.0001, 0);
          gainNode.gain.linearRampToValueAtTime(targetVolume, Math.min(fadeInDuration, openingTrack.buffer.duration));
          source.start(0);
        }

        const { source: voiceSource } = createOfflineSourceWithGain(voiceBuffer, volumes.voice, mutes.voice);
        voiceSource.start(openingDuration + (backgroundTrack ? startPad : 0));

        if (backgroundTrack) {
            const { source, gainNode } = createOfflineSourceWithGain(backgroundTrack.buffer, volumes.background, mutes.background);
            const fadeOutStartTime = openingDuration + startPad + voiceDuration;
            const fadeOutEndTime = openingDuration + mixDuration;
            gainNode.gain.setValueAtTime(gainNode.gain.value, openingDuration);
            gainNode.gain.setValueAtTime(gainNode.gain.value, fadeOutStartTime);
            gainNode.gain.linearRampToValueAtTime(0.0001, fadeOutEndTime);
            source.start(openingDuration);
        }

        if (closingTrack) {
          const { source, gainNode } = createOfflineSourceWithGain(closingTrack.buffer, volumes.closing, mutes.closing);
          const closingStartTime = openingDuration + mixDuration;
          const targetVolume = mutes.closing ? 0 : volumes.closing;
          const fadeOutStart = closingStartTime + closingTrack.buffer.duration - Math.min(fadeOutDuration, closingTrack.buffer.duration);
          gainNode.gain.setValueAtTime(targetVolume, closingStartTime);
          if (fadeOutStart > closingStartTime) {
              gainNode.gain.setValueAtTime(targetVolume, fadeOutStart);
              gainNode.gain.linearRampToValueAtTime(0.0001, closingStartTime + closingTrack.buffer.duration);
          }
          source.start(closingStartTime);
        }

        const mixedBuffer = await offlineCtx.startRendering();
        const mp3Blob = await audioBufferToMp3(mixedBuffer);
        
        const url = URL.createObjectURL(mp3Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'locucao_mixada.mp3';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Error mixing audio:", e);
        setError("Ocorreu um erro ao mixar o áudio. A trilha sonora pode ser muito curta para os tempos definidos.");
    } finally {
        setIsMixing(false);
    }
  };
  
  const handleApplyTreatments = async () => {
    setIsProcessing(true);
    setError(null);
    try {
        let bufferToProcess = generatedAudio;

        // --- Remove Silence ---
        if (treatments.removeSilence) {
            const data = bufferToProcess.getChannelData(0);
            const sampleRate = bufferToProcess.sampleRate;

            const threshold = 0.01;
            const minSilenceDurationSec = 0.4;
            const paddingDurationSec = 0.1;

            const minSilenceSamples = Math.floor(minSilenceDurationSec * sampleRate);
            const paddingSamples = Math.floor(paddingDurationSec * sampleRate);

            const soundSegments = [];
            let segmentStart = 0;

            // Find first sound
            while (segmentStart < data.length && Math.abs(data[segmentStart]) < threshold) {
                segmentStart++;
            }

            let silenceStart = -1;
            for (let i = segmentStart; i < data.length; i++) {
                if (Math.abs(data[i]) < threshold && silenceStart === -1) {
                    silenceStart = i; // Potential start of a silent period
                } else if (Math.abs(data[i]) >= threshold && silenceStart !== -1) {
                    silenceStart = -1; // Sound again, was not a long silence
                }
                
                if (silenceStart !== -1 && (i - silenceStart) >= minSilenceSamples) {
                    // Confirmed long silence. End the current sound segment.
                    const segmentEnd = Math.max(segmentStart, silenceStart - paddingSamples);
                    if (segmentEnd > segmentStart) {
                        soundSegments.push(data.subarray(segmentStart, segmentEnd));
                    }

                    // Find start of next sound segment
                    segmentStart = i;
                    while(segmentStart < data.length && Math.abs(data[segmentStart]) < threshold) {
                        segmentStart++;
                    }
                    i = segmentStart - 1; // Adjust loop counter
                    silenceStart = -1;
                }
            }

            // Add the final segment, trimming any trailing silence
            if (segmentStart < data.length) {
                const finalSegment = data.subarray(segmentStart);
                let endOfSound = finalSegment.length - 1;
                while (endOfSound >= 0 && Math.abs(finalSegment[endOfSound]) < threshold) {
                    endOfSound--;
                }
                if (endOfSound >= 0) {
                    soundSegments.push(finalSegment.subarray(0, endOfSound + 1));
                }
            }
            
            if (soundSegments.length > 0) {
                const keepSilenceDurationSec = 0.15;
                const keepSilenceSamples = Math.floor(keepSilenceDurationSec * sampleRate);
                
                let totalLength = (soundSegments.length - 1) * keepSilenceSamples;
                soundSegments.forEach(segment => { totalLength += segment.length; });

                if (totalLength > 0) {
                    const result = new Float32Array(totalLength);
                    let offset = 0;
                    soundSegments.forEach((segment, index) => {
                        result.set(segment, offset);
                        offset += segment.length;
                        if (index < soundSegments.length - 1) {
                            offset += keepSilenceSamples;
                        }
                    });
                    
                    const newBuffer = audioContext.createBuffer(1, result.length, sampleRate);
                    newBuffer.copyToChannel(result, 0);
                    bufferToProcess = newBuffer;
                } else {
                     bufferToProcess = audioContext.createBuffer(1, 1, sampleRate);
                }
            } else {
                bufferToProcess = audioContext.createBuffer(1, 1, sampleRate);
            }
        }
        
        // --- Offline Context for other effects ---
        const offlineCtx = new OfflineAudioContext(bufferToProcess.numberOfChannels, bufferToProcess.length, bufferToProcess.sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = bufferToProcess;

        let lastNode: AudioNode = source;

        // --- Noise Reduction (Simple Low-pass filter) ---
        if (treatments.noiseReduction) {
            const lowpass = offlineCtx.createBiquadFilter();
            lowpass.type = "lowpass";
            lowpass.frequency.setValueAtTime(3500, 0); // Cut off high frequencies
            lastNode.connect(lowpass);
            lastNode = lowpass;
        }

        // --- Compressor ---
        if (treatments.compressor) {
            const compressor = offlineCtx.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(-24, 0);
            compressor.knee.setValueAtTime(30, 0);
            compressor.ratio.setValueAtTime(12, 0);
            compressor.attack.setValueAtTime(0.003, 0);
            compressor.release.setValueAtTime(0.25, 0);
            lastNode.connect(compressor);
            lastNode = compressor;
        }

        // --- Normalize Volume ---
        let processedBuffer: AudioBuffer;
        if (treatments.normalizeVolume) {
            lastNode.connect(offlineCtx.destination);
            source.start(0);
            processedBuffer = await offlineCtx.startRendering();
            
            const data = processedBuffer.getChannelData(0);
            let max = 0;
            for(let i = 0; i < data.length; i++) {
                if(Math.abs(data[i]) > max) max = Math.abs(data[i]);
            }
            if(max > 0) {
                const gain = 1.0 / max;
                for(let i = 0; i < data.length; i++) {
                    data[i] *= gain;
                }
            }
        } else {
             lastNode.connect(offlineCtx.destination);
             source.start(0);
             processedBuffer = await offlineCtx.startRendering();
        }

        setGeneratedAudio(processedBuffer);
    } catch (e) {
        console.error("Error applying audio treatments:", e);
        setError("Falha ao aplicar tratamentos de áudio.");
    } finally {
        setIsProcessing(false);
    }
  };

  const AudioUploader: React.FC<{
    id: string; title: string; track: Track | null; isLoading: boolean;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
  }> = ({ id, title, track, isLoading, onFileChange, onRemove }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{title}</label>
        {track ? (
            <div className="mt-2 flex items-center justify-between text-sm bg-gray-50 p-2 rounded-md">
              <div className="flex items-center truncate">
                <MusicIcon className="w-5 h-5 mr-2 text-red-600 flex-shrink-0" />
                <span className="font-medium text-gray-800 truncate" title={track.fileName}>{track.fileName}</span>
              </div>
              <button onClick={onRemove} className="ml-2 text-xs font-semibold text-red-600 hover:underline flex-shrink-0">Remover</button>
            </div>
        ) : (
            <div className="mt-2 relative p-4 border-2 border-dashed border-gray-300 rounded-lg text-center transition hover:border-red-400 hover:bg-red-50">
              <label htmlFor={id} className="cursor-pointer space-y-2 flex flex-col items-center justify-center">
                 {isLoading ? (
                     <>
                        <LoadingSpinner className="w-8 h-8 text-gray-400" />
                        <p className="font-semibold text-gray-600">Processando...</p>
                     </>
                 ) : (
                    <>
                        <UploadIcon className="w-8 h-8 text-gray-400" />
                        <div>
                            <span className="font-semibold text-red-600">Clique para fazer upload</span>
                        </div>
                        <p className="text-xs text-gray-500">MP3, WAV (Máx. 10MB)</p>
                    </>
                )}
                <input id={id} type="file" accept="audio/mpeg, audio/wav" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={onFileChange} disabled={isLoading} />
              </label>
            </div>
        )}
    </div>
  );
  
  const VolumeControl: React.FC<{
    label: string; volume: number; setVolume: (v: number) => void;
    isMuted: boolean; setIsMuted: () => void;
  }> = ({ label, volume, setVolume, isMuted, setIsMuted}) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="flex items-center space-x-3">
            <button onClick={setIsMuted} className="p-2 rounded-full hover:bg-gray-100 transition-colors focus-ring">
                {isMuted ? <VolumeXIcon className="w-5 h-5 text-gray-600" /> : <Volume2Icon className="w-5 h-5 text-gray-600" />}
            </button>
            <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500" disabled={isMuted} />
        </div>
    </div>
  );

  const PlaybackRateControl: React.FC<{
    label: string; value: number; setValue: (v: number) => void;
  }> = ({ label, value, setValue }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
          {value.toFixed(2)}x
        </span>
      </div>
      <input 
        type="range" 
        min="0.5" 
        max="2" 
        step="0.01" 
        value={value} 
        onChange={(e) => setValue(parseFloat(e.target.value))} 
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500" 
      />
      <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>Lenta</span>
          <span className="text-center">Normal</span>
          <span className="text-right">Rápida</span>
      </div>
    </div>
  );

  const TimingControl: React.FC<{
    label: string; value: number; setValue: (v: number) => void; max?: number;
  }> = ({ label, value, setValue, max = 10 }) => (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
          {value.toFixed(2).replace('.', ',')} s
        </span>
      </div>
      <input type="range" min="0" max={max} step="0.01" value={value} onChange={(e) => setValue(parseFloat(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500" />
    </div>
  );

  const TrackControlGroup: React.FC<React.PropsWithChildren<{
    title: string;
    trackName: TrackName;
    isPreviewLoading?: boolean;
  }>> = ({ title, trackName, children, isPreviewLoading }) => (
    <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <div className="flex justify-between items-center">
            <h4 className="font-semibold text-gray-800 text-base">{title}</h4>
            <button onClick={() => togglePreview(trackName)} disabled={isPlaying || isPreviewLoading} className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed w-28 justify-center">
                {isPreviewLoading ? (
                    <><LoadingSpinner className="w-4 h-4 mr-2" /> <span>Ajustando...</span></>
                ) : (
                    <>
                        {previewingTrack === trackName ? <PauseIcon className="w-4 h-4 text-red-600" /> : <PlayIcon className="w-4 h-4 text-gray-600" />}
                        <span>Ouvir</span>
                    </>
                )}
            </button>
        </div>
        <div className="space-y-4 pt-4 border-t border-gray-100">{children}</div>
    </div>
  );

  const hasAnyTrack = !!(openingTrack || backgroundTrack || closingTrack);
  const noTreatmentsSelected = Object.values(treatments).every(t => !t);
  
  const handleMuteToggle = (track: keyof typeof mutes) => setMutes(prev => ({...prev, [track]: !prev[track]}));
  const handleVolumeChange = (track: keyof typeof volumes, value: number) => setVolumes(prev => ({...prev, [track]: value}));

  return (
    <div className="space-y-6">
        <div className="p-4 border border-gray-200 rounded-lg space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center"><WandIcon className="w-5 h-5 mr-2 text-red-500" />Tratamento de Áudio</h3>
            <p className="text-sm text-gray-600">Aplique melhorias na sua locução com um clique. Os tratamentos são aplicados na locução principal.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.keys(treatments).map((key) => {
                    const treatmentKey = key as keyof typeof treatments;
                    const labels: Record<keyof typeof treatments, string> = {
                        noiseReduction: 'Redutor de Ruído',
                        removeSilence: 'Remover Silêncios',
                        normalizeVolume: 'Normalizar Volume',
                        compressor: 'Compressor'
                    };
                    return (
                        <button key={key} onClick={() => setTreatments(prev => ({ ...prev, [key]: !prev[key] }))}
                            className={`p-3 text-sm font-semibold rounded-lg border-2 transition-colors ${treatments[treatmentKey] ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-300 hover:border-gray-400 text-gray-700'}`}>
                            {labels[treatmentKey]}
                        </button>
                    );
                })}
            </div>
            <button onClick={handleApplyTreatments} disabled={isProcessing || noTreatmentsSelected} className="w-full flex items-center justify-center p-3 bg-gray-700 text-white font-bold rounded-lg shadow-md hover:bg-gray-800 transition-all transform hover:scale-105 focus-ring disabled:bg-gray-400 disabled:cursor-not-allowed">
                {isProcessing ? <><LoadingSpinner className="w-5 h-5 mr-2" /> Processando...</> : 'Aplicar Tratamentos'}
            </button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AudioUploader id="opening-upload" title="Abertura (Opcional)" track={openingTrack} isLoading={isLoading.opening} onFileChange={(e) => handleFileChange(e, 'opening')} onRemove={() => setOpeningTrack(null)} />
        <div>
            <label htmlFor="background-select" className="block text-sm font-medium text-gray-700">Trilha Sonora (Opcional)</label>
            {isDefaultTrackLoading ? (
                <div className="mt-2 flex items-center justify-center text-sm bg-gray-50 p-4 rounded-md h-[58px]">
                    <LoadingSpinner className="w-6 h-6 mr-2 text-gray-400" />
                    <span className="font-medium text-gray-600">Carregando trilhas...</span>
                </div>
            ) : (
                <div className="mt-2 space-y-2">
                    <select
                        id="background-select"
                        value={backgroundTrack ? preloadedTracks.find(t => t.name === backgroundTrack.fileName) ? backgroundTrack.fileName : 'custom' : ''}
                        onChange={handleBackgroundSelection}
                        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition duration-150 ease-in-out focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    >
                        <option value="" disabled>Selecione uma trilha</option>
                        {preloadedTracks.map(track => (
                            <option key={track.name} value={track.name}>{track.name}</option>
                        ))}
                        <option value="custom">Carregar do computador...</option>
                    </select>
                     {backgroundTrack && (
                        <div className="flex items-center justify-between text-sm bg-gray-100 p-2 rounded-md">
                            <div className="flex items-center truncate">
                                <MusicIcon className="w-5 h-5 mr-2 text-red-600 flex-shrink-0" />
                                <span className="font-medium text-gray-800 truncate" title={backgroundTrack.fileName}>{backgroundTrack.fileName}</span>
                            </div>
                            <button onClick={() => setBackgroundTrack(null)} className="ml-2 text-xs font-semibold text-red-600 hover:underline flex-shrink-0">Remover</button>
                        </div>
                    )}
                    <input id="background-upload-input" type="file" accept="audio/mpeg, audio/wav" className="hidden" onChange={(e) => handleFileChange(e, 'background')} disabled={isLoading.background} />
                </div>
            )}
        </div>
        <AudioUploader id="closing-upload" title="Fechamento (Opcional)" track={closingTrack} isLoading={isLoading.closing} onFileChange={(e) => handleFileChange(e, 'closing')} onRemove={() => setClosingTrack(null)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      
      <div className="p-4 border border-gray-200 rounded-lg space-y-6">
        <h3 className="text-lg font-bold text-gray-800 flex items-center"><SlidersIcon className="w-5 h-5 mr-2" />Controles de Mixagem</h3>
        <div className="space-y-4">
            <TrackControlGroup title="Locução Principal" trackName="voice" isPreviewLoading={isStretching}>
                <VolumeControl label="Volume" volume={volumes.voice} setVolume={(v) => handleVolumeChange('voice', v)} isMuted={mutes.voice} setIsMuted={() => handleMuteToggle('voice')} />
                <PlaybackRateControl label="Velocidade da Locução" value={voicePlaybackRate} setValue={setVoicePlaybackRate} />
            </TrackControlGroup>
            
            {openingTrack && (
                <TrackControlGroup title="Abertura" trackName="opening">
                    <VolumeControl label="Volume" volume={volumes.opening} setVolume={(v) => handleVolumeChange('opening', v)} isMuted={mutes.opening} setIsMuted={() => handleMuteToggle('opening')} />
                    <TimingControl label="Duração do Fade In" value={fadeInDuration} setValue={setFadeInDuration} max={Math.min(5, openingTrack.buffer.duration)} />
                </TrackControlGroup>
            )}
            
            {backgroundTrack && (
                <TrackControlGroup title="Trilha Sonora" trackName="background">
                    <VolumeControl label="Volume" volume={volumes.background} setVolume={(v) => handleVolumeChange('background', v)} isMuted={mutes.background} setIsMuted={() => handleMuteToggle('background')} />
                    <TimingControl label="Tempo da trilha no início" value={startPad} setValue={setStartPad} />
                    <TimingControl label="Tempo da trilha no final" value={endPad} setValue={setEndPad} />
                </TrackControlGroup>
            )}

            {closingTrack && (
                 <TrackControlGroup title="Fechamento" trackName="closing">
                    <VolumeControl label="Volume" volume={volumes.closing} setVolume={(v) => handleVolumeChange('closing', v)} isMuted={mutes.closing} setIsMuted={() => handleMuteToggle('closing')} />
                    <TimingControl label="Duração do Fade Out" value={fadeOutDuration} setValue={setFadeOutDuration} max={Math.min(5, closingTrack.buffer.duration)} />
                </TrackControlGroup>
            )}
        </div>

        {hasAnyTrack && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                <button
                    onClick={togglePlay}
                    disabled={isPreparingMix}
                    className="w-full flex items-center justify-center p-3 bg-gray-700 text-white font-bold rounded-lg shadow-md hover:bg-gray-800 transition-all transform hover:scale-105 focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPreparingMix ? <><LoadingSpinner className="w-5 h-5 mr-2" /> Preparando...</> : isPlaying ? <><PauseIcon className="w-5 h-5 mr-2" /> Parar Mix Completo</> : <><PlayIcon className="w-5 h-5 mr-2" /> Ouvir Mix Completo</>}
                </button>
                <button
                    onClick={handleDownload}
                    disabled={isMixing}
                    className="w-full flex items-center justify-center p-3 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all transform hover:scale-105 focus-ring disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                    {isMixing ? <><LoadingSpinner className="w-5 h-5 mr-2" /> Mixando...</> : <><DownloadIcon className="w-5 h-5 mr-2" /> Mixar e Baixar (.mp3)</>}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};