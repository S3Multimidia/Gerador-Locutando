import { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Voice, TrackInfo } from '../types';
import { removeSilence } from '../utils/audioProcessing';
import { useSiteConfig } from '../contexts/SiteConfigContext';

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

    const { config } = useSiteConfig();

    const handleGenerateSpeech = useCallback(async (voiceToUse: Voice, textToUse: string) => {
        // Priority: Context (Supabase) > LocalStorage > Env
        let apiKey = config.apiKeys?.googleApiKey;

        if (!apiKey && typeof window !== 'undefined') {
            apiKey = localStorage.getItem('apiKey') || undefined;
        }

        if (!apiKey && typeof process !== 'undefined') {
            apiKey = (process as any).env?.API_KEY;
        }

        if (!apiKey) { setError("Chave de API não encontrada."); return null; }
        if (!audioContext) { setError("Web Audio API não suportada."); return null; }

        try {
            const ai = new GoogleGenAI({ apiKey });
            console.log(`[TTS] Generating audio with model: ${ttsModel}, Voice: ${getVoiceName(voiceToUse.id)}`);

            // INCORPORATE PROMPT INTO TEXT content to avoid systemInstruction conflict with AUDIO modality
            let finalPromptText = textToUse;
            if (voiceToUse.prompt && voiceToUse.prompt.trim()) {
                console.log(`[TTS] Applying style prompt: ${voiceToUse.prompt}`);
                // We add the instruction at the beginning, but ask it to ONLY speak the text.
                // Note: Generative Audio is sensitive. Too much instruction might be spoken.
                // We format it as a context wrapper.
                finalPromptText = `(Contexto de atuação: ${voiceToUse.prompt}) ${textToUse}`;
            }

            const response = await ai.models.generateContent({
                model: ttsModel,
                // Removed systemInstruction to fix "Model does not support requested modality: AUDIO"
                contents: [{ parts: [{ text: finalPromptText }] }],
                config: {
                    responseModalities: [Modality.AUDIO], // REQUIRED for TTS models
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

            // CONFIGURAÇÃO DE MIXAGEM (Rádio Profissional)
            const INTRO_DURATION = 2.5; // Tempo de trilha antes da voz
            const OUTRO_DURATION = 2.5; // Tempo de trilha após a voz
            const FADE_IN_DURATION = 1.0; // Fade In inicial
            const FADE_OUT_DURATION = 1.0; // Fade Out final
            const DUCKING_TRANSITION = 1.0; // Tempo para abaixar (100% -> 20%)
            const RECOVERY_TRANSITION = 1.0; // Tempo para subir (20% -> 100%) pós-voz

            // VOLUMES
            const MUSIC_HIGH = 1.0; // 100% (Intro/Outro)
            const MUSIC_LOW = 0.2;  // 20% (Durante a Voz)

            const voiceDuration = cleanedVoiceBuffer.duration;
            const outputDuration = INTRO_DURATION + voiceDuration + OUTRO_DURATION;

            const offlineCtx = new OfflineAudioContext(2, Math.ceil(audioContext!.sampleRate * outputDuration), audioContext!.sampleRate);

            // 1. CANAL DE VOZ
            const voiceSource = offlineCtx.createBufferSource();
            voiceSource.buffer = cleanedVoiceBuffer;
            voiceSource.connect(offlineCtx.destination);
            voiceSource.start(INTRO_DURATION);

            // 2. CANAL DE TRILHA
            const bgSource = offlineCtx.createBufferSource();
            bgSource.buffer = bgBuffer;
            const bgGain = offlineCtx.createGain();
            bgSource.connect(bgGain);
            bgGain.connect(offlineCtx.destination);

            // LINHA DO TEMPO DA AUTOMAÇÃO
            const now = 0;
            const voiceStart = INTRO_DURATION;
            const voiceEnd = INTRO_DURATION + voiceDuration;
            const end = outputDuration;

            // Começa zerado
            bgGain.gain.setValueAtTime(0.0001, now);

            // Fade In (0 -> 100%)
            bgGain.gain.linearRampToValueAtTime(MUSIC_HIGH, now + FADE_IN_DURATION);

            // Mantém 100% até a voz entrar
            bgGain.gain.setValueAtTime(MUSIC_HIGH, voiceStart);

            // Duck Down (100% -> 20%) assim que a voz entra
            bgGain.gain.linearRampToValueAtTime(MUSIC_LOW, voiceStart + DUCKING_TRANSITION);

            // Mantém 20% durante toda a fala
            bgGain.gain.setValueAtTime(MUSIC_LOW, voiceEnd);

            // Recupera (20% -> 100%) assim que a voz termina
            bgGain.gain.linearRampToValueAtTime(MUSIC_HIGH, voiceEnd + RECOVERY_TRANSITION);

            // Mantém 100% na saída (Intro) até o Fade Out final
            bgGain.gain.setValueAtTime(MUSIC_HIGH, end - FADE_OUT_DURATION);

            // Fade Out Final (100% -> 0%)
            bgGain.gain.linearRampToValueAtTime(0.0001, end);

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
