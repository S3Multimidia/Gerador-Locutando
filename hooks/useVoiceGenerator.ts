import { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Voice, TrackInfo } from '../types';
import { removeSilence } from '../utils/audioProcessing';

// Helper functions (moved from App.tsx)
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
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

async function fetchWithRetry(url: string, retries = 3, delay = 500): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, { mode: 'cors', cache: 'no-cache' });
            if (response.ok) return response;
            if (response.status >= 400 && response.status < 500) throw new Error(`Client error: ${response.status}`);
            throw new Error(`Server error: ${response.status}`);
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(res => setTimeout(res, delay * (i + 1)));
        }
    }
    throw new Error(`Failed to fetch ${url}`);
}

export const useVoiceGenerator = (
    availableVoices: Voice[],
    backgroundTracks: TrackInfo[],
    ttsModel: string
) => {
    const [audioContext] = useState<AudioContext | null>(() => {
        if (typeof window !== 'undefined') {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            return Ctx ? new Ctx({ sampleRate: 24000 }) : null;
        }
        return null;
    });

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isTurboLoading, setIsTurboLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedAudio, setGeneratedAudio] = useState<AudioBuffer | null>(null);
    const [finalMixedAudio, setFinalMixedAudio] = useState<AudioBuffer | null>(null);

    const [preloadedTracks, setPreloadedTracks] = useState<{ name: string, buffer: AudioBuffer }[]>([]);
    const [defaultBackgroundTrack, setDefaultBackgroundTrack] = useState<AudioBuffer | null>(null);
    const [isDefaultTrackLoading, setIsDefaultTrackLoading] = useState<boolean>(true);

    const ALLOWED_VOICE_NAMES = [
        'achernar', 'achird', 'algenib', 'algieba', 'alnilam', 'aoede', 'autonoe', 'callirrhoe', 'charon', 'despina', 'enceladus', 'erinome', 'fenrir', 'gacrux', 'iapetus', 'kore', 'laomedeia', 'leda', 'orus', 'puck', 'pulcherrima', 'rasalgethi', 'sadachbia', 'sadaltager', 'schedar', 'sulafat', 'umbriel', 'vindemiatrix', 'zephyr', 'zubenelgenubi'
    ];

    const getVoiceName = (id: string) => {
        const base = id.trim().toLowerCase();
        if (ALLOWED_VOICE_NAMES.includes(base)) return base;
        const parts = base.split(/[-_]/);
        const candidate = parts[parts.length - 1].replace(/[^a-z]/g, '');
        if (ALLOWED_VOICE_NAMES.includes(candidate)) return candidate;
        return base;
    };

    // Load tracks
    useEffect(() => {
        if (!audioContext) return;
        const loadDefaultTracks = async () => {
            setIsDefaultTrackLoading(true);
            try {
                const trackPromises = backgroundTracks.map(async (track) => {
                    try {
                        if (track.url && track.url.startsWith('data:')) {
                            const base64 = track.url.split(',')[1] || '';
                            const binaryString = atob(base64);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
                            const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
                            return { name: track.name, buffer: audioBuffer };
                        } else {
                            const response = await fetchWithRetry(track.url);
                            const arrayBuffer = await response.arrayBuffer();
                            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                            return { name: track.name, buffer: audioBuffer };
                        }
                    } catch (e) {
                        console.warn(`Could not load track '${track.name}':`, e);
                        return null;
                    }
                });
                const loadedTracks = (await Promise.all(trackPromises)).filter(Boolean) as { name: string, buffer: AudioBuffer }[];
                setPreloadedTracks(loadedTracks);
                if (loadedTracks.length > 0) setDefaultBackgroundTrack(loadedTracks[0].buffer);
            } catch (e) {
                console.error("Error loading tracks", e);
            } finally {
                setIsDefaultTrackLoading(false);
            }
        };
        loadDefaultTracks();
    }, [audioContext, backgroundTracks]);

    const handleGenerateSpeech = useCallback(async (voiceToUse: Voice, textToUse: string) => {
        const apiKey = (typeof process !== 'undefined' && (process as any).env && (process as any).env.API_KEY)
            ? (process as any).env.API_KEY
            : (typeof window !== 'undefined' && (window as any).__API_KEY__)
                ? (window as any).__API_KEY__
                : (typeof window !== 'undefined' && localStorage.getItem('apiKey'))
                    ? localStorage.getItem('apiKey')!
                    : undefined;

        if (!apiKey) { setError("Chave de API não encontrada."); return null; }
        if (!audioContext) { setError("Web Audio API não suportada."); return null; }

        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: ttsModel,
                contents: [{ parts: [{ text: textToUse }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: getVoiceName(voiceToUse.id) },
                        },
                    },
                },
            });

            const part = response.candidates?.[0]?.content?.parts?.[0];
            const base64Audio = part?.inlineData?.data;

            if (base64Audio) {
                return await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
            } else {
                // Check if text was returned (error message from model)
                const textContent = part?.text;
                if (textContent) {
                    console.error("Model returned text instead of audio:", textContent);
                    throw new Error(`Model error: ${textContent.slice(0, 100)}...`);
                }
                throw new Error("API response missing audio data.");
            }
        } catch (err: any) {
            console.error("Generation error:", err);
            setError(`Falha ao gerar: ${err.message || 'Erro desconhecido'}`);
            return null;
        }
    }, [audioContext, ttsModel]);

    const generateExpert = async (voice: Voice | null, text: string) => {
        if (!voice) { setError("Selecione uma voz."); return; }
        setIsLoading(true);
        setError(null);
        setGeneratedAudio(null);
        setFinalMixedAudio(null);

        const buffer = await handleGenerateSpeech(voice, text);
        if (buffer) setGeneratedAudio(buffer);
        setIsLoading(false);
    };

    const loadTrack = async (url: string): Promise<AudioBuffer> => {
        if (!audioContext) throw new Error("AudioContext not initialized");
        if (url.startsWith('data:')) {
            const base64 = url.split(',')[1] || '';
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
            return await audioContext.decodeAudioData(bytes.buffer);
        } else {
            const response = await fetchWithRetry(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
        }
    };

    const generateTurbo = async (voice: Voice | null, text: string) => {
        if (!voice) { setError("Selecione uma voz."); return; }
        // Se não houver trilha padrão global e nem trilha específica da voz, erro.
        if (!defaultBackgroundTrack && !voice.defaultTrackUrl) { setError("Trilha sonora indisponível."); return; }

        setIsTurboLoading(true);
        setError(null);
        setGeneratedAudio(null);
        setFinalMixedAudio(null);

        try {
            // 1. Gerar Voz
            const voiceBuffer = await handleGenerateSpeech(voice, text);
            if (!voiceBuffer) { setIsTurboLoading(false); return; }

            // 2. Carregar Trilha de Fundo (Prioridade: Voz > Global)
            let bgBuffer = defaultBackgroundTrack;
            if (voice.defaultTrackUrl) {
                try {
                    bgBuffer = await loadTrack(voice.defaultTrackUrl);
                } catch (e) {
                    console.warn("Falha ao carregar trilha da voz, usando padrão.", e);
                    // Mantém bgBuffer como defaultBackgroundTrack se existir
                }
            }

            if (!bgBuffer) {
                setError("Falha ao carregar trilha sonora.");
                setIsTurboLoading(false);
                return;
            }

            // 3. Remove silences from voice for cleaner audio
            const cleanedVoiceBuffer = removeSilence(voiceBuffer, -50, 0.5);

            const startPad = 3.0; // Background track plays 3s before voice starts
            const endPad = 3.0;   // Background track continues 3s after voice ends
            const backgroundVolume = 0.15;
            const outputDuration = startPad + cleanedVoiceBuffer.duration + endPad;

            const offlineCtx = new OfflineAudioContext(2, Math.ceil(audioContext!.sampleRate * outputDuration), audioContext!.sampleRate);

            const voiceSource = offlineCtx.createBufferSource();
            voiceSource.buffer = cleanedVoiceBuffer;
            voiceSource.connect(offlineCtx.destination);
            voiceSource.start(startPad);

            const bgSource = offlineCtx.createBufferSource();
            bgSource.buffer = bgBuffer;
            const bgGain = offlineCtx.createGain();
            bgSource.connect(bgGain);
            bgGain.connect(offlineCtx.destination);

            bgGain.gain.setValueAtTime(0.0001, 0);
            bgGain.gain.linearRampToValueAtTime(backgroundVolume, 0.8);
            bgGain.gain.setValueAtTime(backgroundVolume, Math.max(0, outputDuration - 3));
            bgGain.gain.linearRampToValueAtTime(0.0001, outputDuration);
            bgSource.start(0);

            const mixed = await offlineCtx.startRendering();
            setFinalMixedAudio(mixed);
        } catch (e) {
            console.error("Mixing error:", e);
            setError("Erro na mixagem Turbo.");
        } finally {
            setIsTurboLoading(false);
        }
    };

    return {
        audioContext,
        isLoading,
        isTurboLoading,
        error,
        setError,
        generatedAudio,
        setGeneratedAudio,
        finalMixedAudio,
        setFinalMixedAudio,
        preloadedTracks,
        isDefaultTrackLoading,
        generateExpert,
        generateTurbo
    };
};
