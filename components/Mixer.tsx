import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadIcon, MusicIcon, LoadingSpinner, PlayIcon, PauseIcon, DownloadIcon, Volume2Icon, VolumeXIcon, SlidersIcon, WandIcon, TrashIcon } from './IconComponents';
import { BackgroundTrackCarousel } from './BackgroundTrackCarousel';
import { TrackChannel } from './TrackChannel';
import { FinalMixWaveform } from './FinalMixWaveform';

import { TrackInfo } from '../types';
import { timeStretchSOLA } from '../utils/timeStretching';
import { useMixerPersistence } from '../hooks/useMixerPersistence';

// LameJS is loaded from a script tag in index.html
declare var lamejs: any;

// #region Helper Functions

// Helper function to convert an AudioBuffer to a MP3 file Blob
async function audioBufferToMp3(buffer: AudioBuffer, startTime?: number, endTime?: number): Promise<Blob> {
    const targetSampleRate = 44100;

    const start = startTime || 0;
    const end = endTime || buffer.duration;
    const duration = Math.max(0, end - start);

    // 1. Resample and ensure stereo using OfflineAudioContext
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(duration * targetSampleRate), targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start(0, start, duration);
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

    return new Blob(mp3Data as any[], { type: 'audio/mpeg' });
}


// #region Time Stretching
async function timeStretch(
    buffer: AudioBuffer,
    rate: number,
    audioContext: AudioContext
): Promise<AudioBuffer> {
    return timeStretchSOLA(buffer, rate, audioContext);
}
// #endregion

interface MixerProps {
    generatedAudio: AudioBuffer;
    audioContext: AudioContext;
    setGeneratedAudio: (audio: AudioBuffer | null) => void;
    preloadedTracks: { name: string, buffer: AudioBuffer }[];
    backgroundTracks: TrackInfo[];
    isDefaultTrackLoading: boolean;
    cutStartSec: number;
    cutEndSec: number;
    setCutStartSec: (v: number) => void;
    setCutEndSec: (v: number) => void;
    belowTreatment?: React.ReactNode;
}

type Track = { buffer: AudioBuffer; fileName: string };
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
type TrackName = 'opening' | 'voice' | 'background' | 'closing';

export const Mixer: React.FC<MixerProps> = ({
    generatedAudio,
    audioContext,
    setGeneratedAudio,
    preloadedTracks,
    backgroundTracks,
    isDefaultTrackLoading,
    cutStartSec,
    cutEndSec,
    setCutStartSec,
    setCutEndSec,
    belowTreatment
}) => {
    const [openingTrack, setOpeningTrack] = useState<Track | null>(null);
    const [backgroundTrack, setBackgroundTrack] = useState<Track | null>(null);
    const [closingTrack, setClosingTrack] = useState<Track | null>(null);

    // UI State
    const [selectedBackgroundName, setSelectedBackgroundName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState({ opening: false, background: false, closing: false });
    const [error, setError] = useState<string | null>(null);

    // Mixing State
    const [volumes, setVolumes] = useState({ opening: 1, voice: 1, background: 0.5, closing: 1 });
    const [mutes, setMutes] = useState({ opening: false, voice: false, background: false, closing: false });

    // Persistence
    const { savedMixerState, saveMixerState } = useMixerPersistence({ opening: 1, voice: 1, background: 0.5, closing: 1 });

    // Load persistence
    useEffect(() => {
        if (savedMixerState) {
            if (savedMixerState.volumes) setVolumes(savedMixerState.volumes);
            if (savedMixerState.selectedBackgroundName) {
                setSelectedBackgroundName(savedMixerState.selectedBackgroundName);
                // Trigger track selection if it matches a preloaded track
                const track = preloadedTracks.find(t => t.name === savedMixerState.selectedBackgroundName);
                if (track) {
                    setBackgroundTrack({ buffer: track.buffer, fileName: track.name });
                }
            }
        }
    }, [savedMixerState, preloadedTracks]);

    // Save persistence
    useEffect(() => {
        saveMixerState({ selectedBackgroundName, volumes });
    }, [selectedBackgroundName, volumes, saveMixerState]);

    // Voice Effects State
    const [voicePlaybackRate, setVoicePlaybackRate] = useState<number>(1.0);
    const [voiceCompression, setVoiceCompression] = useState<number>(0); // 0 to 1
    const [voiceEcho, setVoiceEcho] = useState<number>(0); // 0 to 1
    const [voiceFadeIn, setVoiceFadeIn] = useState<number>(0);
    const [voiceFadeOut, setVoiceFadeOut] = useState<number>(0);

    // Silence Removal State (Global for all tracks)
    const [silenceActive, setSilenceActive] = useState({ opening: false, voice: false, background: false, closing: false });
    const [silenceThresholds, setSilenceThresholds] = useState({ opening: 0.5, voice: 0.5, background: 0.5, closing: 0.5 });

    // Processed Voice Buffer (Base for voice track)
    const [processedVoiceBuffer, setProcessedVoiceBuffer] = useState<AudioBuffer>(generatedAudio);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);

    // Fades & Crossfade
    const [crossfadeInDuration, setCrossfadeInDuration] = useState<number>(0.05);
    const [crossfadeOutDuration, setCrossfadeOutDuration] = useState<number>(0.05);
    const [fadeInDuration, setFadeInDuration] = useState<number>(1.0);
    const [fadeOutDuration, setFadeOutDuration] = useState<number>(1.5);
    const [introDuration, setIntroDuration] = useState<number>(0);
    const [outroDuration, setOutroDuration] = useState<number>(0);

    // Editing State (Destructive)
    const [processedBuffers, setProcessedBuffers] = useState<Record<string, AudioBuffer>>({}); // Base buffers (Manual Edits)
    const [finalBuffers, setFinalBuffers] = useState<Record<string, AudioBuffer>>({}); // Display buffers (Base + Filters)
    const [undoStacks, setUndoStacks] = useState<Record<string, AudioBuffer[]>>({});

    // Global Mix Controls
    const [globalFadeIn, setGlobalFadeIn] = useState<number>(0);
    const [globalFadeOut, setGlobalFadeOut] = useState<number>(0);

    // Helper to get current buffer for a track (FINAL view)
    const getTrackBuffer = useCallback((trackName: string, originalBuffer: AudioBuffer | null) => {
        if (!originalBuffer) return null;
        // Check if we have a final buffer calculated
        if (finalBuffers[trackName]) return finalBuffers[trackName];

        // Fallback to processed (base) or original
        if (trackName === 'voice') return processedVoiceBuffer;
        return processedBuffers[trackName] || originalBuffer;
    }, [finalBuffers, processedBuffers, processedVoiceBuffer]);

    // Helper to push undo
    const pushUndo = (trackName: string, buffer: AudioBuffer) => {
        setUndoStacks(prev => ({
            ...prev,
            [trackName]: [...(prev[trackName] || []), buffer]
        }));
    };

    // Real-time Voice Processing Effect
    useEffect(() => {
        const processVoice = async () => {
            setIsProcessingVoice(true);
            try {
                // 1. Start with base audio (generatedAudio or edited version if we had destructive edits, but for now generatedAudio)
                // If we want to support "Cut" on voice, we should use a state that tracks the "cut" version as the base.
                // Let's assume generatedAudio is the base. If user cuts, we might need to update generatedAudio or a separate "baseVoiceBuffer".
                // For now, using generatedAudio.

                let buffer = generatedAudio;

                // If there are destructive edits (like Cut) stored in processedBuffers['voice'], use that as base
                if (processedBuffers['voice']) {
                    buffer = processedBuffers['voice'];
                }

                // 1.5 Silence Removal (Non-destructive toggle)
                // Handled by the pipeline effect now!
                // But wait, processVoice is for "Real-time Voice Processing Effect".
                // The pipeline effect runs AFTER this?
                // No, pipeline effect depends on processedVoiceBuffer.
                // So processVoice produces the "Base" for the pipeline.
                // Silence removal for voice is now in the pipeline.
                // So we REMOVE it from here.

                // 2. Time Stretch
                if (Math.abs(voicePlaybackRate - 1.0) > 0.01) {
                    buffer = await timeStretch(buffer, voicePlaybackRate, audioContext);
                }

                // 3. Apply Effects (Volume, Compression, Echo, Fades) using OfflineAudioContext
                const offlineCtx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
                const source = offlineCtx.createBufferSource();
                source.buffer = buffer;

                const gainNode = offlineCtx.createGain();
                // Apply Volume HERE so waveform reflects it
                gainNode.gain.value = volumes.voice;

                let lastNode: AudioNode = source;

                // Compression
                if (voiceCompression > 0) {
                    const compressor = offlineCtx.createDynamicsCompressor();
                    compressor.threshold.value = -24 - (voiceCompression * 30);
                    compressor.knee.value = 30;
                    compressor.ratio.value = 12 + (voiceCompression * 8);
                    compressor.attack.value = 0.003;
                    compressor.release.value = 0.25;
                    lastNode.connect(compressor);
                    lastNode = compressor;
                }

                // Echo
                if (voiceEcho > 0) {
                    const delay = offlineCtx.createDelay();
                    delay.delayTime.value = 0.3;
                    const feedback = offlineCtx.createGain();
                    feedback.gain.value = voiceEcho * 0.4;
                    const echoGain = offlineCtx.createGain();
                    echoGain.gain.value = voiceEcho * 0.5;

                    lastNode.connect(delay);
                    delay.connect(feedback);
                    feedback.connect(delay);
                    delay.connect(echoGain);
                    echoGain.connect(gainNode);
                }

                lastNode.connect(gainNode);
                gainNode.connect(offlineCtx.destination);

                // Apply Fades via Gain Automation
                if (voiceFadeIn > 0) {
                    gainNode.gain.setValueAtTime(0.0001, 0);
                    gainNode.gain.exponentialRampToValueAtTime(volumes.voice, voiceFadeIn);
                }
                if (voiceFadeOut > 0) {
                    const duration = buffer.duration;
                    gainNode.gain.setValueAtTime(volumes.voice, duration - voiceFadeOut);
                    gainNode.gain.exponentialRampToValueAtTime(0.0001, duration);
                }

                source.start(0);
                const processed = await offlineCtx.startRendering();
                setProcessedVoiceBuffer(processed);

            } catch (e) {
                console.error("Error processing voice:", e);
            } finally {
                setIsProcessingVoice(false);
            }
        };

        // Debounce processing to avoid freezing UI on sliders
        const timeoutId = setTimeout(processVoice, 50);
        return () => clearTimeout(timeoutId);

    }, [generatedAudio, processedBuffers, voicePlaybackRate, voiceCompression, voiceEcho, voiceFadeIn, voiceFadeOut, volumes.voice, audioContext]);

    // Pipeline Effect: Calculate Final Buffers (Silence Removal)
    useEffect(() => {
        const updateFinalBuffers = async () => {
            const newFinalBuffers: Record<string, AudioBuffer> = {};
            const { removeSilence } = await import('../utils/audioProcessing');

            const tracks = ['opening', 'voice', 'background', 'closing'];

            for (const track of tracks) {
                let base: AudioBuffer | null = null;

                if (track === 'voice') {
                    base = processedVoiceBuffer;
                } else {
                    const original = track === 'opening' ? openingTrack : track === 'background' ? backgroundTrack : closingTrack;
                    if (original) {
                        base = processedBuffers[track] || original.buffer;
                    }
                }

                if (base) {
                    // Apply Silence Removal if active
                    if (silenceActive[track as keyof typeof silenceActive]) {
                        const threshold = silenceThresholds[track as keyof typeof silenceThresholds];
                        // Map 0-1 to -60dB to -10dB
                        const dbThreshold = -60 + (threshold * 50);
                        try {
                            newFinalBuffers[track] = removeSilence(base, dbThreshold, 0.5);
                        } catch (e) {
                            console.error(`Error removing silence for ${track}:`, e);
                            newFinalBuffers[track] = base;
                        }
                    } else {
                        newFinalBuffers[track] = base;
                    }
                }
            }

            setFinalBuffers(newFinalBuffers);
        };

        const timeoutId = setTimeout(updateFinalBuffers, 50); // Debounce
        return () => clearTimeout(timeoutId);

    }, [processedVoiceBuffer, processedBuffers, openingTrack, backgroundTrack, closingTrack, silenceActive, silenceThresholds]);


    const handleCut = async (trackName: string, start: number, end: number) => {
        // We cut the FINAL buffer (what the user sees)
        const currentFinal = getTrackBuffer(trackName,
            trackName === 'voice' ? generatedAudio :
                trackName === 'opening' ? openingTrack?.buffer || null :
                    trackName === 'background' ? backgroundTrack?.buffer || null :
                        trackName === 'closing' ? closingTrack?.buffer || null : null
        );

        if (!currentFinal) return;

        pushUndo(trackName, currentFinal); // Save state BEFORE cut

        const { cutAudio } = await import('../utils/audioProcessing');
        const newBuffer = cutAudio(currentFinal, start, end);

        // Update BASE buffer with the result
        if (trackName === 'voice') {
            // For voice, we need to be careful. processedVoiceBuffer is derived.
            // If we cut, we are essentially creating a new "generatedAudio" base?
            // Or we just update processedBuffers['voice'] and let the pipeline pick it up?
            // The pipeline uses processedVoiceBuffer as base for voice.
            // processedVoiceBuffer is output of processVoice effect.
            // If we want to cut voice, we should probably update generatedAudio? 
            // OR update processedBuffers['voice'] and have processVoice use it.
            // processVoice ALREADY uses processedBuffers['voice'] if it exists!
            setProcessedBuffers(prev => ({ ...prev, [trackName]: newBuffer }));
        } else {
            setProcessedBuffers(prev => ({ ...prev, [trackName]: newBuffer }));
        }

        // Disable silence removal since it's baked in (or to avoid double application)
        setSilenceActive(prev => ({ ...prev, [trackName]: false }));
    };

    const handleSilenceToggle = (trackName: string) => {
        setSilenceActive(prev => ({ ...prev, [trackName]: !prev[trackName as keyof typeof silenceActive] }));
    };

    const handleSilenceThresholdChange = (trackName: string, value: number) => {
        setSilenceThresholds(prev => ({ ...prev, [trackName]: value }));
    };

    const handleUndo = (trackName: string) => {
        setUndoStacks(prev => {
            const stack = prev[trackName];
            if (!stack || stack.length === 0) return prev;

            const newStack = [...stack];
            const previousBuffer = newStack.pop();

            setProcessedBuffers(bufPrev => ({ ...bufPrev, [trackName]: previousBuffer! }));

            return { ...prev, [trackName]: newStack };
        });
    };

    // Playback State
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isMixing, setIsMixing] = useState<boolean>(false);
    const [isPreparingMix, setIsPreparingMix] = useState<boolean>(false);
    const [isStretching, setIsStretching] = useState<boolean>(false);

    // Preview
    const [previewingTrack, setPreviewingTrack] = useState<string | null>(null);
    const previewSourceRef = useRef<{ source: AudioBufferSourceNode, gain: GainNode } | null>(null);
    const [voicePlayhead, setVoicePlayhead] = useState<number>(0);
    const voiceRafRef = useRef<number | null>(null);
    const voiceStartTimeRef = useRef<number>(0);

    // Mix Preview
    const [mixedPreviewBuffer, setMixedPreviewBuffer] = useState<AudioBuffer | null>(null);
    const mixSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [mixIsPlaying, setMixIsPlaying] = useState<boolean>(false);
    const [mixPlayheadSec, setMixPlayheadSec] = useState<number>(0);
    const mixRafRef = useRef<number | null>(null);
    const mixPlayStartRef = useRef<number | null>(null);

    // Refs for full mix playback
    const sourceRefs = useRef<Record<TrackName, AudioBufferSourceNode | null>>({ opening: null, voice: null, background: null, closing: null });
    const playbackTimeoutRef = useRef<number | null>(null);

    const isInitialLoad = useRef(true);
    useEffect(() => {
        if (preloadedTracks.length > 0 && isInitialLoad.current) {
            // Only set default if we DON'T have a saved state
            if (!savedMixerState?.selectedBackgroundName) {
                const defaultTrack = preloadedTracks[0];
                setBackgroundTrack({
                    buffer: defaultTrack.buffer,
                    fileName: defaultTrack.name,
                });
                setSelectedBackgroundName(defaultTrack.name);
            }
            isInitialLoad.current = false;
        }
    }, [preloadedTracks, savedMixerState]);

    // Cleanup
    const stopPreview = useCallback(() => {
        if (previewSourceRef.current) {
            previewSourceRef.current.source.onended = null;
            try { previewSourceRef.current.source.stop(); } catch { }
            previewSourceRef.current = null;
        }
        if (voiceRafRef.current) cancelAnimationFrame(voiceRafRef.current);
        setPreviewingTrack(null);
        // setVoicePlayhead(0); // Removed to keep needle position
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
                try { source.stop(); } catch { }
            }
        });
        sourceRefs.current = { opening: null, voice: null, background: null, closing: null };
        setIsPlaying(false);
    }, []);

    const stopMixPlayback = useCallback(() => {
        if (mixSourceRef.current) {
            try { mixSourceRef.current.stop(); } catch { }
            mixSourceRef.current = null;
        }
        if (mixRafRef.current) cancelAnimationFrame(mixRafRef.current);
        setMixIsPlaying(false);
    }, []);

    useEffect(() => {
        return () => {
            stopPlayback();
            stopPreview();
            stopMixPlayback();
        };
    }, [stopPlayback, stopPreview, stopMixPlayback]);

    // File Handling
    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
        trackType: 'opening' | 'background' | 'closing'
    ) => {
        const file = event.target.files?.[0];
        event.target.value = '';
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
        stopMixPlayback();
        setMixedPreviewBuffer(null); // Reset mix when tracks change

        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            setTrackMap[trackType]({ buffer: audioBuffer, fileName: file.name });
            if (trackType === 'background') setSelectedBackgroundName('custom');
        } catch (e) {
            console.error("Error decoding audio file:", e);
            setError("Não foi possível decodificar o arquivo de áudio. Verifique se o formato é suportado (MP3, WAV).");
        } finally {
            setIsLoading(prev => ({ ...prev, [trackType]: false }));
        }
    };

    const handleBackgroundSelect = (trackName: string) => {
        const selectedTrack = preloadedTracks.find(t => t.name === trackName);
        if (selectedTrack) {
            setBackgroundTrack({
                buffer: selectedTrack.buffer,
                fileName: selectedTrack.name
            });
            setSelectedBackgroundName(trackName);
            setMixedPreviewBuffer(null);
        }
    };

    // Preview Logic
    const togglePreview = useCallback(async (trackName: string, bufferOverride?: AudioBuffer) => {
        if (isPlaying) stopPlayback();
        if (mixIsPlaying) stopMixPlayback();

        if (previewingTrack === trackName) {
            stopPreview();
            return;
        }
        stopPreview();

        if (audioContext.state === 'suspended') audioContext.resume();

        let buffer: AudioBuffer | null = bufferOverride || null;
        let volume = 1;
        let isVoice = false;

        // Determine buffer and volume based on trackName
        if (trackName === 'voice') {
            buffer = processedVoiceBuffer; // Use processed buffer
            volume = 1.0; // Volume is already baked into processed buffer
            isVoice = true;
        } else if (trackName === 'opening') {
            buffer = getTrackBuffer('opening', openingTrack?.buffer || null);
            volume = volumes.opening;
        } else if (trackName === 'closing') {
            buffer = getTrackBuffer('closing', closingTrack?.buffer || null);
            volume = volumes.closing;
        } else if (trackName === 'background') {
            buffer = getTrackBuffer('background', backgroundTrack?.buffer || null);
            volume = volumes.background;
        } else {
            // Check if it's a preloaded track name
            const preloaded = preloadedTracks.find(t => t.name === trackName);
            if (preloaded) {
                buffer = preloaded.buffer;
                volume = 0.8; // Default preview volume for carousel
            }
        }

        if (!buffer) return;

        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        source.onended = () => {
            stopPreview();
        };

        const startTime = audioContext.currentTime;
        // Start from voicePlayhead if it's voice track, else 0
        const offset = (isVoice && voicePlayhead < buffer.duration) ? voicePlayhead : 0;

        source.start(0, offset);
        voiceStartTimeRef.current = startTime - offset;

        previewSourceRef.current = { source, gain: gainNode };
        setPreviewingTrack(trackName);

        if (isVoice) {
            const tick = () => {
                if (!voiceStartTimeRef.current) return;
                const elapsed = audioContext.currentTime - voiceStartTimeRef.current;
                if (elapsed >= buffer!.duration) {
                    stopPreview();
                    return;
                }
                setVoicePlayhead(elapsed);
                voiceRafRef.current = requestAnimationFrame(tick);
            };
            voiceRafRef.current = requestAnimationFrame(tick);
        }

    }, [audioContext, processedVoiceBuffer, openingTrack, backgroundTrack, closingTrack, volumes, isPlaying, mixIsPlaying, previewingTrack, stopPlayback, stopPreview, stopMixPlayback, preloadedTracks, voicePlayhead]);

    const handleVoiceSeek = (position: number) => {
        // position is 0-1
        if (processedVoiceBuffer) {
            const time = position * processedVoiceBuffer.duration;
            setVoicePlayhead(time);
            if (previewingTrack === 'voice') {
                // Restart playback from new position
                togglePreview('voice');
            }
        }
    };

    // Real-time Mixing Effect
    useEffect(() => {
        const runMix = async () => {
            // Only mix if we have at least one track
            if (!processedVoiceBuffer && !openingTrack && !backgroundTrack && !closingTrack) return;

            await generateMix();
        };

        const timeoutId = setTimeout(runMix, 300); // Debounce mix generation
        return () => clearTimeout(timeoutId);
    }, [
        // Dependencies that affect the mix
        finalBuffers, // Use final buffers (with silence removed)
        volumes,
        mutes,
        crossfadeInDuration,
        crossfadeOutDuration,
        fadeInDuration,
        fadeOutDuration,
        introDuration,
        outroDuration,
        globalFadeIn,
        globalFadeOut,
        openingTrack, // Need these for existence checks
        backgroundTrack,
        closingTrack,
        processedVoiceBuffer // Fallback if not in finalBuffers yet
    ]);

    // Mixing Logic (Generate Mix Buffer)
    const generateMix = async () => {
        // setIsPreparingMix(true); // Don't show loading spinner for real-time updates, it flickers too much
        setError(null);
        try {
            // Use FINAL buffers
            const voiceBuffer = getTrackBuffer('voice', processedVoiceBuffer);
            if (!voiceBuffer) return; // Can happen during init

            const openingBuffer = getTrackBuffer('opening', openingTrack?.buffer || null);
            const backgroundBuffer = getTrackBuffer('background', backgroundTrack?.buffer || null);
            const closingBuffer = getTrackBuffer('closing', closingTrack?.buffer || null);

            const openingDuration = openingBuffer?.duration ?? 0;
            const voiceDuration = voiceBuffer.duration;
            const closingDuration = closingBuffer?.duration ?? 0;

            // Calculate Start Times with Crossfade and Intro/Outro
            const baseStart = openingTrack ? Math.max(0, openingDuration - crossfadeInDuration) : 0;
            const backgroundStart = baseStart; // Background starts after opening (or at 0)
            const voiceStart = baseStart + introDuration; // Voice starts after intro duration relative to background start

            // Calculate Mix End Time (before closing)
            const voiceEnd = voiceStart + voiceDuration;

            // Closing starts after voice ends + outro duration (minus crossfade if closing exists)
            const closingStart = Math.max(0, voiceEnd + outroDuration - crossfadeOutDuration);

            const totalDuration = Math.max(
                (openingTrack ? 0 + openingDuration : 0),
                (closingTrack ? closingStart + closingDuration : 0),
                voiceEnd + outroDuration // Ensure we capture the full outro if no closing track
            );

            const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * audioContext.sampleRate), audioContext.sampleRate);

            const createSource = (buffer: AudioBuffer, vol: number, muted: boolean) => {
                const src = offlineCtx.createBufferSource();
                src.buffer = buffer;
                const gain = offlineCtx.createGain();
                gain.gain.value = muted ? 0 : vol;
                src.connect(gain);
                gain.connect(offlineCtx.destination);
                return { src, gain };
            };

            // 1. Opening
            if (openingBuffer) {
                const { src, gain } = createSource(openingBuffer, volumes.opening, mutes.opening);

                // Fade In
                gain.gain.setValueAtTime(0.0001, 0);
                gain.gain.linearRampToValueAtTime(volumes.opening, Math.min(fadeInDuration, openingDuration));

                // Crossfade Out (if overlapping with voice or background start)
                if (backgroundStart < openingDuration) {
                    gain.gain.setValueAtTime(volumes.opening, backgroundStart);
                    gain.gain.linearRampToValueAtTime(0.0001, openingDuration);
                }

                src.start(0);
            }

            // 2. Voice
            // Voice buffer is already processed with volume, effects, fades.
            // Just play it at the right time.
            const voiceSrc = offlineCtx.createBufferSource();
            voiceSrc.buffer = voiceBuffer;
            // No extra gain needed, it's baked in. But we need a node to connect.
            // Mute check:
            const voiceGain = offlineCtx.createGain();
            voiceGain.gain.value = mutes.voice ? 0 : 1.0;
            voiceSrc.connect(voiceGain);
            voiceGain.connect(offlineCtx.destination);
            voiceSrc.start(voiceStart);

            // 3. Background
            if (backgroundBuffer) {
                const { src, gain } = createSource(backgroundBuffer, volumes.background, mutes.background);

                // Fade In (if starting after opening)
                if (openingTrack) {
                    gain.gain.setValueAtTime(0.0001, backgroundStart);
                    gain.gain.linearRampToValueAtTime(volumes.background, backgroundStart + crossfadeInDuration);
                } else {
                    gain.gain.setValueAtTime(0.0001, 0);
                    gain.gain.linearRampToValueAtTime(volumes.background, fadeInDuration);
                }

                // Fade Out (at closing start or end of outro)
                const bgEnd = closingTrack ? closingStart + crossfadeOutDuration : voiceEnd + outroDuration + fadeOutDuration;

                // Loop background if needed
                src.loop = true;

                const fadeOutBegin = closingTrack ? closingStart : voiceEnd + outroDuration;

                gain.gain.setValueAtTime(volumes.background, fadeOutBegin);
                gain.gain.linearRampToValueAtTime(0.0001, bgEnd);

                src.start(backgroundStart);
                src.stop(bgEnd);
            }

            // 4. Closing
            if (closingBuffer) {
                const { src, gain } = createSource(closingBuffer, volumes.closing, mutes.closing);

                // Crossfade In
                gain.gain.setValueAtTime(0.0001, closingStart);
                gain.gain.linearRampToValueAtTime(volumes.closing, closingStart + crossfadeOutDuration);

                // Fade Out
                const fadeOutStart = closingStart + closingDuration - fadeOutDuration;
                if (fadeOutStart > closingStart) {
                    gain.gain.setValueAtTime(volumes.closing, fadeOutStart);
                    gain.gain.linearRampToValueAtTime(0.0001, closingStart + closingDuration);
                }

                src.start(closingStart);
            }

            const renderedBuffer = await offlineCtx.startRendering();

            // Apply Global Fades to the Mix
            const { applyFade } = await import('../utils/audioProcessing');
            const finalBuffer = applyFade(renderedBuffer, globalFadeIn, globalFadeOut);

            setMixedPreviewBuffer(finalBuffer);
            return finalBuffer;

        } catch (e) {
            console.error("Error generating mix:", e);
            setError("Erro ao gerar a mixagem.");
            return null;
        } finally {
            setIsPreparingMix(false);
        }
    };

    const toggleMixPlayPause = async () => {
        if (mixIsPlaying) {
            stopMixPlayback();
        } else {
            let buffer = mixedPreviewBuffer;
            if (!buffer) {
                buffer = await generateMix();
            }
            if (!buffer) return;

            if (audioContext.state === 'suspended') audioContext.resume();

            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);

            const startTime = audioContext.currentTime;
            // Support seeking (play from mixPlayheadSec)
            const offset = mixPlayheadSec >= buffer.duration ? 0 : mixPlayheadSec;

            mixPlayStartRef.current = startTime - offset;

            const tick = () => {
                if (!mixPlayStartRef.current) return;
                const elapsed = audioContext.currentTime - mixPlayStartRef.current;
                if (elapsed >= buffer!.duration) {
                    stopMixPlayback();
                    setMixPlayheadSec(0);
                    return;
                }
                setMixPlayheadSec(elapsed);
                mixRafRef.current = requestAnimationFrame(tick);
            };

            source.onended = () => {
                stopMixPlayback();
                setMixPlayheadSec(0);
            };

            source.start(0, offset);
            mixSourceRef.current = source;
            setMixIsPlaying(true);
            mixRafRef.current = requestAnimationFrame(tick);
        }
    };

    const handleSeek = (time: number) => {
        if (mixIsPlaying) stopMixPlayback();
        setMixPlayheadSec(time);
    };

    const handleDownload = async () => {
        let buffer = mixedPreviewBuffer;
        if (!buffer) {
            buffer = await generateMix();
        }
        if (!buffer) return;

        const mp3Blob = await audioBufferToMp3(buffer);
        const url = URL.createObjectURL(mp3Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'locucao_mixada.mp3';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadVoice = async () => {
        // Prefer edited buffer (if cut) or original generated
        const bufferToDownload = processedBuffers['voice'] || generatedAudio;

        if (!bufferToDownload) return;

        try {
            const mp3Blob = await audioBufferToMp3(bufferToDownload);
            const url = URL.createObjectURL(mp3Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'locucao_off_original.mp3';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Error downloading voice:", e);
            setError("Erro ao baixar áudio off.");
        }
    };

    useEffect(() => {
        setMixedPreviewBuffer(null);
        if (mixIsPlaying) stopMixPlayback();
    }, [volumes, mutes, crossfadeInDuration, crossfadeOutDuration, introDuration, outroDuration, openingTrack, backgroundTrack, closingTrack, voicePlaybackRate, voiceCompression, voiceEcho, generatedAudio, processedBuffers, globalFadeIn, globalFadeOut]);

    return (
        <div className="space-y-8">


            {/* Track Uploaders (Opening/Closing) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Opening */}
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Abertura</h3>
                        {openingTrack && (
                            <button onClick={() => setOpeningTrack(null)} className="text-red-400 hover:text-red-300">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {openingTrack ? (
                        <div className="flex items-center p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                            <MusicIcon className="w-8 h-8 text-indigo-400 mr-3" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{openingTrack.fileName}</p>
                                <p className="text-xs text-indigo-300">{openingTrack.buffer.duration.toFixed(1)}s</p>
                            </div>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-700 rounded-xl hover:border-indigo-500 hover:bg-slate-800 transition-all cursor-pointer group">
                            <UploadIcon className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 mb-2" />
                            <span className="text-xs text-slate-500 group-hover:text-slate-300">Carregar Abertura</span>
                            <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileChange(e, 'opening')} />
                        </label>
                    )}
                </div>

                {/* Closing */}
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Fechamento</h3>
                        {closingTrack && (
                            <button onClick={() => setClosingTrack(null)} className="text-red-400 hover:text-red-300">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {closingTrack ? (
                        <div className="flex items-center p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                            <MusicIcon className="w-8 h-8 text-indigo-400 mr-3" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{closingTrack.fileName}</p>
                                <p className="text-xs text-indigo-300">{closingTrack.buffer.duration.toFixed(1)}s</p>
                            </div>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-700 rounded-xl hover:border-indigo-500 hover:bg-slate-800 transition-all cursor-pointer group">
                            <UploadIcon className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 mb-2" />
                            <span className="text-xs text-slate-500 group-hover:text-slate-300">Carregar Fechamento</span>
                            <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileChange(e, 'closing')} />
                        </label>
                    )}
                </div>
            </div>

            {/* Mixer Controls */}
            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                    <SlidersIcon className="w-5 h-5 mr-2 text-indigo-500" />
                    Mixagem Profissional
                </h3>

                <div className="space-y-4">
                    {/* 1. Voice Track (Moved to Top) */}
                    <div className="space-y-4">
                        <TrackChannel
                            title="Voz (Locução)"
                            track={{ buffer: processedVoiceBuffer, fileName: 'Locução Gerada' }}
                            volume={volumes.voice}
                            isMuted={mutes.voice}
                            onVolumeChange={(v) => setVolumes(prev => ({ ...prev, voice: v }))}
                            onMuteToggle={() => setMutes(prev => ({ ...prev, voice: !prev.voice }))}
                            color="#6366f1" // Indigo
                            onPreviewToggle={() => togglePreview('voice')}
                            isPreviewing={previewingTrack === 'voice'}
                            onCut={(s, e) => handleCut('voice', s, e)}
                            onSilenceRemovalToggle={() => handleSilenceToggle('voice')}
                            isSilenceRemovalActive={silenceActive.voice}
                            silenceThreshold={silenceThresholds.voice}
                            onSilenceThresholdChange={(v) => handleSilenceThresholdChange('voice', v)}
                            fadeIn={voiceFadeIn}
                            fadeOut={voiceFadeOut}
                            onFadeInChange={setVoiceFadeIn}
                            onFadeOutChange={setVoiceFadeOut}
                            playheadPosition={processedVoiceBuffer ? voicePlayhead / processedVoiceBuffer.duration : 0}
                            isPlaying={previewingTrack === 'voice'}
                            onSeek={handleVoiceSeek}
                            onUndo={() => handleUndo('voice')}
                            canUndo={!!undoStacks['voice']?.length}
                            onDownload={handleDownloadVoice}
                            downloadLabel="Baixar Off"
                        />

                        {/* Voice Effects Panel */}
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 ml-4 space-y-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                <WandIcon className="w-3 h-3 mr-2" />
                                Efeitos Locução
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Speed */}
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Velocidade ({voicePlaybackRate.toFixed(1)}x)</label>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={voicePlaybackRate}
                                        onChange={(e) => setVoicePlaybackRate(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                                {/* Compression */}
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Compressão ({(voiceCompression * 100).toFixed(0)}%)</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={voiceCompression}
                                        onChange={(e) => setVoiceCompression(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                                {/* Echo */}
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Eco ({(voiceEcho * 100).toFixed(0)}%)</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={voiceEcho}
                                        onChange={(e) => setVoiceEcho(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Background Track Selection Carousel */}
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                        {console.log("DEBUG: Mixer Component Rendered - VERSION NEW")}
                        <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                            <MusicIcon className="w-5 h-5 mr-2 text-emerald-500" />
                            Seleção de Trilha
                        </h4>
                        <BackgroundTrackCarousel
                            tracks={backgroundTracks}
                            selectedTrackName={selectedBackgroundName}
                            onSelect={handleBackgroundSelect}
                            onUploadClick={() => document.getElementById('background-upload-input')?.click()}
                            isPlayingPreview={!!previewingTrack}
                            previewingTrackName={previewingTrack}
                            onPreview={(name) => togglePreview(name)}
                        />
                        <input
                            id="background-upload-input"
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, 'background')}
                        />
                    </div>

                    {/* 3. Background Track Channel (only if selected and not 'none') */}
                    {selectedBackgroundName && selectedBackgroundName !== 'none' && backgroundTrack && (
                        <TrackChannel
                            title="Volume da Trilha"
                            track={{ ...backgroundTrack, buffer: getTrackBuffer('background', backgroundTrack.buffer)! }}
                            volume={volumes.background}
                            isMuted={mutes.background}
                            onVolumeChange={(v) => setVolumes(prev => ({ ...prev, background: v }))}
                            onMuteToggle={() => setMutes(prev => ({ ...prev, background: !prev.background }))}
                            color="#10b981"
                            onPreviewToggle={() => togglePreview('background')}
                            isPreviewing={previewingTrack === 'background'}
                            onCut={(s, e) => handleCut('background', s, e)}
                            onSilenceRemovalToggle={() => handleSilenceToggle('background')}
                            isSilenceRemovalActive={silenceActive.background}
                            silenceThreshold={silenceThresholds.background}
                            onSilenceThresholdChange={(v) => handleSilenceThresholdChange('background', v)}
                            markers={backgroundTrack ? [
                                { time: introDuration, color: '#a855f7', label: 'Intro' },
                                { time: backgroundTrack.buffer.duration - outroDuration, color: '#f43f5e', label: 'Outro' }
                            ] : []}
                            onUndo={() => handleUndo('background')}
                            canUndo={!!undoStacks['background']?.length}
                        />
                    )}

                    {/* 4. Opening Track */}
                    <TrackChannel
                        title="Abertura"
                        track={openingTrack ? { ...openingTrack, buffer: getTrackBuffer('opening', openingTrack.buffer)! } : null}
                        volume={volumes.opening}
                        isMuted={mutes.opening}
                        onVolumeChange={(v) => setVolumes(prev => ({ ...prev, opening: v }))}
                        onMuteToggle={() => setMutes(prev => ({ ...prev, opening: !prev.opening }))}
                        color="#a855f7"
                        onPreviewToggle={() => togglePreview('opening')}
                        isPreviewing={previewingTrack === 'opening'}
                        onCut={(s, e) => handleCut('opening', s, e)}
                        onSilenceRemovalToggle={() => handleSilenceToggle('opening')}
                        isSilenceRemovalActive={silenceActive.opening}
                        silenceThreshold={silenceThresholds.opening}
                        onSilenceThresholdChange={(v) => handleSilenceThresholdChange('opening', v)}
                        onUndo={() => handleUndo('opening')}
                        canUndo={!!undoStacks['opening']?.length}
                    />

                    {/* 5. Closing Track */}
                    <TrackChannel
                        title="Fechamento"
                        track={closingTrack ? { ...closingTrack, buffer: getTrackBuffer('closing', closingTrack.buffer)! } : null}
                        volume={volumes.closing}
                        isMuted={mutes.closing}
                        onVolumeChange={(v) => setVolumes(prev => ({ ...prev, closing: v }))}
                        onMuteToggle={() => setMutes(prev => ({ ...prev, closing: !prev.closing }))}
                        color="#f43f5e" // Rose
                        onPreviewToggle={() => togglePreview('closing')}
                        isPreviewing={previewingTrack === 'closing'}
                        onCut={(s, e) => handleCut('closing', s, e)}
                        onSilenceRemovalToggle={() => handleSilenceToggle('closing')}
                        isSilenceRemovalActive={silenceActive.closing}
                        silenceThreshold={silenceThresholds.closing}
                        onSilenceThresholdChange={(v) => handleSilenceThresholdChange('closing', v)}
                        onUndo={() => handleUndo('closing')}
                        canUndo={!!undoStacks['closing']?.length}
                    />
                </div>

                {/* Global Controls (Crossfade & Timing) */}
                <div className="mt-8 p-4 bg-slate-900/50 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label className="flex justify-between text-sm font-bold text-slate-400 mb-2">
                            <span>Crossfade Entrada</span>
                            <span className="text-indigo-400">{crossfadeInDuration}s</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={crossfadeInDuration}
                            onChange={(e) => setCrossfadeInDuration(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">Transição da abertura.</p>
                    </div>
                    <div>
                        <label className="flex justify-between text-sm font-bold text-slate-400 mb-2">
                            <span>Crossfade Saída</span>
                            <span className="text-indigo-400">{crossfadeOutDuration}s</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={crossfadeOutDuration}
                            onChange={(e) => setCrossfadeOutDuration(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">Transição para o fechamento.</p>
                    </div>
                    <div>
                        <label className="flex justify-between text-sm font-bold text-slate-400 mb-2">
                            <span>Intro da Trilha</span>
                            <span className="text-indigo-400">{introDuration}s</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={introDuration}
                            onChange={(e) => setIntroDuration(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">Tempo de trilha antes da voz.</p>
                    </div>
                    <div>
                        <label className="flex justify-between text-sm font-bold text-slate-400 mb-2">
                            <span>Outro da Trilha</span>
                            <span className="text-indigo-400">{outroDuration}s</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={outroDuration}
                            onChange={(e) => setOutroDuration(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">Tempo de trilha após a voz.</p>
                    </div>
                </div>

                {/* Global Mix Fades */}
                <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="flex justify-between text-sm font-bold text-slate-400 mb-2">
                            <span>Fade In (Mix Final)</span>
                            <span className="text-indigo-400">{globalFadeIn}s</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.5"
                            value={globalFadeIn}
                            onChange={(e) => setGlobalFadeIn(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="flex justify-between text-sm font-bold text-slate-400 mb-2">
                            <span>Fade Out (Mix Final)</span>
                            <span className="text-indigo-400">{globalFadeOut}s</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.5"
                            value={globalFadeOut}
                            onChange={(e) => setGlobalFadeOut(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Final Mix Visualization */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center">
                        <WandIcon className="w-5 h-5 mr-2 text-indigo-500" />
                        Resultado Final
                    </h3>
                    <div className="flex gap-3">
                        <button
                            onClick={toggleMixPlayPause}
                            disabled={isPreparingMix}
                            className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20"
                        >
                            {isPreparingMix ? <LoadingSpinner className="w-4 h-4 mr-2" /> : mixIsPlaying ? <PauseIcon className="w-4 h-4 mr-2" /> : <PlayIcon className="w-4 h-4 mr-2" />}
                            {mixIsPlaying ? 'Pausar' : 'Ouvir Resultado'}
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isPreparingMix}
                            className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
                        >
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Baixar MP3
                        </button>
                    </div>
                </div>

                <div className="h-48 bg-black/50 rounded-xl border border-slate-800 overflow-hidden relative">
                    {isPreparingMix ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <LoadingSpinner className="w-8 h-8 text-indigo-500" />
                        </div>
                    ) : (
                        <FinalMixWaveform
                            buffer={mixedPreviewBuffer}
                            playheadSec={mixPlayheadSec}
                            isPlaying={mixIsPlaying}
                            onSeek={handleSeek}
                            height={192}
                        />
                    )}
                </div>


            </div>

            {
                error && (
                    <div className="p-4 bg-red-900/30 text-red-200 border-l-4 border-red-500 rounded-r-lg animate-fade-in">
                        <p className="font-bold">Erro</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )
            }
        </div >
    );
};
