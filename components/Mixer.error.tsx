import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadIcon, MusicIcon, LoadingSpinner, PlayIcon, PauseIcon, DownloadIcon, Volume2Icon, VolumeXIcon, SlidersIcon, WandIcon, SparklesIcon } from './IconComponents';
import { TrackChannel } from './TrackChannel';
import { Waveform } from './Waveform';

declare var lamejs: any;

// #region Helper Functions

// Converte AudioBuffer para MP3
async function audioBufferToMp3(buffer: AudioBuffer): Promise<Blob> {
    const target = 44100;
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;

    // Se já está em 44.1kHz, usa direto
    let finalBuffer = buffer;
    if (sampleRate !== target) {
        const ctx = new OfflineAudioContext(channels, Math.ceil(buffer.duration * target), target);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        src.start();
        finalBuffer = await ctx.startRendering();
    }

    const left = finalBuffer.getChannelData(0);
    const right = channels > 1 ? finalBuffer.getChannelData(1) : left;

    const floatToInt16 = (arr: Float32Array): Int16Array => {
        const i16 = new Int16Array(arr.length);
        for (let i = 0; i < arr.length; i++) {
            const s = Math.max(-1, Math.min(1, arr[i]));
            i16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return i16;
    };

    const leftInt16 = floatToInt16(left);
    const rightInt16 = floatToInt16(right);

    const encoder = new lamejs.Mp3Encoder(channels, target, 128);
    const mp3Data: Uint8Array[] = [];
    const sampleBlockSize = 1152;

    for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
        const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
        const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
        const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const mp3buf = encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }

    return new Blob(mp3Data, { type: 'audio/mpeg' });
}

// #endregion

interface MixerProps {
    generatedAudio: AudioBuffer;
    audioContext: AudioContext;
    setGeneratedAudio: (audio: AudioBuffer | null) => void;
    preloadedTracks: { name: string; buffer: AudioBuffer }[];
    isDefaultTrackLoading: boolean;
    cutStartSec: number;
    cutEndSec: number;
    setCutStartSec: (v: number) => void;
    setCutEndSec: (v: number) => void;
    belowTreatment?: React.ReactNode;
}

type Track = { buffer: AudioBuffer; fileName: string };
type TrackName = 'opening' | 'voice' | 'background' | 'closing';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const Mixer: React.FC<MixerProps> = ({
    generatedAudio,
    audioContext,
    setGeneratedAudio,
    preloadedTracks,
    isDefaultTrackLoading,
    cutStartSec,
    cutEndSec,
    setCutStartSec,
    setCutEndSec,
    belowTreatment
}) => {
    // Estados para as trilhas
    const [openingTrack, setOpeningTrack] = useState<Track | null>(null);
    const [backgroundTrack, setBackgroundTrack] = useState<Track | null>(null);
    const [closingTrack, setClosingTrack] = useState<Track | null>(null);

    const [isLoading, setIsLoading] = useState({ opening: false, background: false, closing: false });
    const [error, setError] = useState<string | null>(null);

    // Controles de volume e mute
    const [volumes, setVolumes] = useState({ opening: 1, voice: 1, background: 0.5, closing: 1 });
    const [mutes, setMutes] = useState({ opening: false, voice: false, background: false, closing: false });

    // Configurações de trim
    const [trimSettings, setTrimSettings] = useState({
        opening: { start: 0, end: 0 },
        voice: { start: 0, end: 0 },
        background: { start: 0, end: 0 },
        closing: { start: 0, end: 0 }
    });

    // Configurações de crossfade
    const [crossfadeSettings, setCrossfadeSettings] = useState({
        opening: 2.0,
        closing: 2.0
    });

    // Estados de reprodução e mixagem
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isMixing, setIsMixing] = useState<boolean>(false);
    const [masterMixBuffer, setMasterMixBuffer] = useState<AudioBuffer | null>(null);

    // Tratamentos de áudio
    const [treatments, setTreatments] = useState({
        noiseReduction: false,
        removeSilence: false,
        normalizeVolume: false,
        compressor: false,
    });
    const [isProcessing, setIsProcessing] = useState(false);

    // Refs para playback
    const sourceRefs = useRef<Record<TrackName, AudioBufferSourceNode | null>>({
        opening: null,
        voice: null,
        background: null,
        closing: null
    });
    const playbackTimeoutRef = useRef<number | null>(null);

    // Previewing individual tracks
    const [previewingTrack, setPreviewingTrack] = useState<TrackName | null>(null);
    const previewSourceRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);

    // Inicializa trilha de fundo com a primeira pré-carregada
    const isInitialLoad = useRef(true);
    useEffect(() => {
        if (preloadedTracks.length > 0 && isInitialLoad.current && !backgroundTrack) {
            setBackgroundTrack({
                buffer: preloadedTracks[0].buffer,
                fileName: preloadedTracks[0].name,
            });
            isInitialLoad.current = false;
        }
    }, [preloadedTracks, backgroundTrack]);

    // Funções de controle de playback
    const stopPreview = useCallback(() => {
        if (previewSourceRef.current) {
            previewSourceRef.current.source.onended = null;
            try { previewSourceRef.current.source.stop(); } catch (e) { }
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
                try { source.stop(); } catch (e) { }
            }
        });
        sourceRefs.current = { opening: null, voice: null, background: null, closing: null };
        setIsPlaying(false);
    }, []);

    useEffect(() => {
        return () => {
            stopPlayback();
            stopPreview();
        };
    }, [generatedAudio, openingTrack, backgroundTrack, closingTrack, stopPlayback, stopPreview]);

    // Upload de arquivos
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

        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            setTrackMap[trackType]({ buffer: audioBuffer, fileName: file.name });
            setTrimSettings(prev => ({ ...prev, [trackType]: { start: 0, end: 0 } }));
        } catch (e) {
            console.error("Error decoding audio file:", e);
            setError("Não foi possível decodificar o arquivo de áudio. Verifique se o formato é suportado (MP3, WAV).");
        } finally {
            setIsLoading(prev => ({ ...prev, [trackType]: false }));
        }
    };

    // Preview de trilha individual
    const togglePreview = useCallback(async (track: TrackName) => {
        if (isPlaying) stopPlayback();
        if (previewingTrack === track) {
            stopPreview();
            return;
        }
        stopPreview();

        if (audioContext.state === 'suspended') audioContext.resume();

        let buffer: AudioBuffer | null = null;
        let volume = 1;
        let isMuted = false;
        let trimStart = 0;
        let trimEnd = 0;

        switch (track) {
            case 'voice':
                buffer = generatedAudio;
                volume = volumes.voice;
                isMuted = mutes.voice;
                trimStart = trimSettings.voice.start;
                trimEnd = trimSettings.voice.end;
                break;
            case 'opening':
                buffer = openingTrack?.buffer ?? null;
                volume = volumes.opening;
                isMuted = mutes.opening;
                trimStart = trimSettings.opening.start;
                trimEnd = trimSettings.opening.end;
                break;
            case 'background':
                buffer = backgroundTrack?.buffer ?? null;
                volume = volumes.background;
                isMuted = mutes.background;
                trimStart = trimSettings.background.start;
                trimEnd = trimSettings.background.end;
                break;
            case 'closing':
                buffer = closingTrack?.buffer ?? null;
                volume = volumes.closing;
                isMuted = mutes.closing;
                trimStart = trimSettings.closing.start;
                trimEnd = trimSettings.closing.end;
                break;
        }

        if (!buffer) return;

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        const gainNode = audioContext.createGain();
        gainNode.gain.value = isMuted ? 0 : volume;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        source.onended = () => {
            if (previewSourceRef.current?.source === source) stopPreview();
        };

        const duration = buffer.duration - trimStart - trimEnd;
        if (duration > 0) {
            source.start(0, trimStart, duration);
            previewSourceRef.current = { source, gain: gainNode };
            setPreviewingTrack(track);
        }
    }, [isPlaying, previewingTrack, audioContext, generatedAudio, openingTrack, backgroundTrack, closingTrack, volumes, mutes, trimSettings, stopPlayback, stopPreview]);

    // Aplicar tratamentos de áudio
    const handleApplyTreatments = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            let bufferToProcess = generatedAudio;

            // Remover silêncio
            if (treatments.removeSilence) {
                const data = bufferToProcess.getChannelData(0);
                const threshold = 0.01;
                const minSilenceDuration = 0.3;
                const sampleRate = bufferToProcess.sampleRate;
                const minSilenceSamples = Math.floor(minSilenceDuration * sampleRate);

                const soundSegments: { start: number; end: number; data: Float32Array }[] = [];
                let segmentStart = 0;
                let silenceStart = -1;

                for (let i = 0; i < data.length; i++) {
                    if (Math.abs(data[i]) > threshold) {
                        if (silenceStart !== -1) {
                            const silenceDuration = i - silenceStart;
                            if (silenceDuration >= minSilenceSamples) {
                                const segmentEnd = silenceStart;
                                soundSegments.push({
                                    data: data.slice(segmentStart, segmentEnd),
                                    start: segmentStart,
                                    end: segmentEnd
                                });
                                segmentStart = i;
                            }
                            silenceStart = -1;
                        }
                    } else {
                        if (silenceStart === -1) {
                            silenceStart = i;
                        }
                    }
                }

                if (segmentStart < data.length) {
                    const finalSegment = data.slice(segmentStart, data.length);
                    const endOfSound = data.length - 1;
                    for (let i = data.length - 1; i >= segmentStart; i--) {
                        if (Math.abs(data[i]) > threshold) {
                            soundSegments.push({
                                data: data.slice(segmentStart, i + 1),
                                start: segmentStart,
                                end: i + 1
                            });
                            break;
                        }
                    }
                }

                const totalLength = soundSegments.reduce((sum, segment) => sum + segment.data.length, 0);
                const result = new Float32Array(totalLength);
                let offset = 0;

                for (const segment of soundSegments) {
                    result.set(segment.data, offset);
                    offset += segment.data.length;
                }

                const newBuffer = audioContext.createBuffer(1, result.length, sampleRate);
                newBuffer.copyToChannel(result, 0);
                bufferToProcess = newBuffer;
            }

            // Normalizar volume
            if (treatments.normalizeVolume) {
                const offlineCtx = new OfflineAudioContext(bufferToProcess.numberOfChannels, bufferToProcess.length, bufferToProcess.sampleRate);
                const source = offlineCtx.createBufferSource();
                source.buffer = bufferToProcess;

                const data = bufferToProcess.getChannelData(0);
                let maxAmplitude = 0;
                for (let i = 0; i < data.length; i++) {
                    maxAmplitude = Math.max(maxAmplitude, Math.abs(data[i]));
                }

                if (maxAmplitude > 0) {
                    const gain = offlineCtx.createGain();
                    const targetLevel = 0.95;
                    gain.gain.value = targetLevel / maxAmplitude;
                    source.connect(gain);
                    gain.connect(offlineCtx.destination);
                } else {
                    source.connect(offlineCtx.destination);
                }

                source.start();
                bufferToProcess = await offlineCtx.startRendering();
            }

            setGeneratedAudio(bufferToProcess);
        } catch (e) {
            console.error("Error applying treatments:", e);
            setError("Ocorreu um erro ao aplicar os tratamentos.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Mixagem e download
    const handleDownload = async () => {
        if (isMixing) return;
        stopPlayback();
        stopPreview();

        setIsMixing(true);
        setError(null);

        try {
            const voiceDur = generatedAudio.duration - trimSettings.voice.start - trimSettings.voice.end;
            const openingDur = openingTrack ? (openingTrack.buffer.duration - trimSettings.opening.start - trimSettings.opening.end) : 0;
            const closingDur = closingTrack ? (closingTrack.buffer.duration - trimSettings.closing.start - trimSettings.closing.end) : 0;
            const backgroundDur = backgroundTrack ? (backgroundTrack.buffer.duration - trimSettings.background.start - trimSettings.background.end) : 0;

            const openingCrossfade = openingTrack ? Math.min(crossfadeSettings.opening, openingDur, voiceDur) : 0;
            const closingCrossfade = closingTrack ? Math.min(crossfadeSettings.closing, closingDur, voiceDur) : 0;

            const voiceStartTime = openingDur > 0 ? Math.max(0, openingDur - openingCrossfade) : 0;
            const closingStartTime = voiceStartTime + Math.max(0, voiceDur - closingCrossfade);
            const totalDuration = closingStartTime + closingDur;

            const backgroundStartTime = voiceStartTime;

            const offlineCtx = new OfflineAudioContext(2, Math.ceil(audioContext.sampleRate * totalDuration), audioContext.sampleRate);

            // Adicionar opening
            if (openingTrack && openingDur > 0) {
                const src = offlineCtx.createBufferSource();
                src.buffer = openingTrack.buffer;
                const gain = offlineCtx.createGain();
                src.connect(gain);
                gain.connect(offlineCtx.destination);
                gain.gain.setValueAtTime(mutes.opening ? 0 : volumes.opening, 0);

                if (openingCrossfade > 0 && voiceStartTime + openingCrossfade <= openingDur) {
                    gain.gain.setValueAtTime(mutes.opening ? 0 : volumes.opening, voiceStartTime);
                    gain.gain.linearRampToValueAtTime(0, voiceStartTime + openingCrossfade);
                }

                src.start(0, trimSettings.opening.start, openingDur);
            }

            // Adicionar voz
            const voiceSrc = offlineCtx.createBufferSource();
            voiceSrc.buffer = generatedAudio;
            const voiceGain = offlineCtx.createGain();
            voiceSrc.connect(voiceGain);
            voiceGain.connect(offlineCtx.destination);
            voiceGain.gain.setValueAtTime(mutes.voice ? 0 : volumes.voice, voiceStartTime);

            if (openingCrossfade > 0) {
                voiceGain.gain.setValueAtTime(0, voiceStartTime);
                voiceGain.gain.linearRampToValueAtTime(mutes.voice ? 0 : volumes.voice, voiceStartTime + openingCrossfade);
            }

            if (closingCrossfade > 0) {
                voiceGain.gain.setValueAtTime(mutes.voice ? 0 : volumes.voice, closingStartTime);
                voiceGain.gain.linearRampToValueAtTime(0, closingStartTime + closingCrossfade);
            }

            voiceSrc.start(voiceStartTime, trimSettings.voice.start, voiceDur);

            // Adicionar background
            if (backgroundTrack && backgroundDur > 0) {
                const bgSrc = offlineCtx.createBufferSource();
                bgSrc.buffer = backgroundTrack.buffer;
                const bgGain = offlineCtx.createGain();
                bgSrc.connect(bgGain);
                bgGain.connect(offlineCtx.destination);
                bgGain.gain.setValueAtTime(mutes.background ? 0 : volumes.background, backgroundStartTime);
                bgSrc.start(backgroundStartTime, trimSettings.background.start, Math.min(backgroundDur, totalDuration - backgroundStartTime));
            }

            // Adicionar closing
            if (closingTrack && closingDur > 0) {
                const src = offlineCtx.createBufferSource();
                src.buffer = closingTrack.buffer;
                const gain = offlineCtx.createGain();
                src.connect(gain);
                gain.connect(offlineCtx.destination);

                if (closingCrossfade > 0) {
                    gain.gain.setValueAtTime(0, closingStartTime);
                    gain.gain.linearRampToValueAtTime(mutes.closing ? 0 : volumes.closing, closingStartTime + closingCrossfade);
                } else {
                    gain.gain.setValueAtTime(mutes.closing ? 0 : volumes.closing, closingStartTime);
                }

                src.start(closingStartTime, trimSettings.closing.start, closingDur);
            }

            const mixedBuffer = await offlineCtx.startRendering();
            setMasterMixBuffer(mixedBuffer);

            const mp3Blob = await audioBufferToMp3(mixedBuffer);
            const url = URL.createObjectURL(mp3Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'audio_mixado.mp3';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Error mixing audio:", e);
            setError("Ocorreu um erro ao mixar o áudio.");
        } finally {
            setIsMixing(false);
        }
    };

    const handleVolumeChange = (track: TrackName, value: number) => {
        setVolumes(prev => ({ ...prev, [track]: value }));
    };

    const handleMuteToggle = (track: TrackName) => {
        setMutes(prev => ({ ...prev, [track]: !prev[track] }));
    };

    const handleTrimChange = (track: TrackName, start: number, end: number) => {
        setTrimSettings(prev => ({ ...prev, [track]: { start, end } }));
    };

    const noTreatmentsSelected = !treatments.noiseReduction && !treatments.removeSilence && !treatments.normalizeVolume && !treatments.compressor;

    return (
        <div className="space-y-8 p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl">
            {/* Seção de Tratamentos */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <WandIcon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Tratamento de Áudio</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <label className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800/70 transition-colors">
                        <input
                            type="checkbox"
                            checked={treatments.removeSilence}
                            onChange={(e) => setTreatments(prev => ({ ...prev, removeSilence: e.target.checked }))}
                            className="w-5 h-5 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="text-slate-200 font-medium">Remover Silêncios</span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800/70 transition-colors">
                        <input
                            type="checkbox"
                            checked={treatments.normalizeVolume}
                            onChange={(e) => setTreatments(prev => ({ ...prev, normalizeVolume: e.target.checked }))}
                            className="w-5 h-5 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="text-slate-200 font-medium">Normalizar Volume</span>
                    </label>
                </div>

                <button
                    onClick={handleApplyTreatments}
                    disabled={isProcessing || noTreatmentsSelected}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${isProcessing || noTreatmentsSelected
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                        }`}
                >
                    {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                            <LoadingSpinner className="w-5 h-5" />
                            Processando...
                        </span>
                    ) : (
                        'Aplicar Tratamentos'
                    )}
                </button>

                {belowTreatment}
            </div>

            {/* Trilha Sonora de Fundo */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <MusicIcon className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Trilha Sonora de Fundo</h3>
                </div>

                {isDefaultTrackLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <LoadingSpinner className="w-8 h-8 text-indigo-400" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-3">
                            {preloadedTracks.map(track => (
                                <button
                                    key={track.name}
                                    onClick={() => {
                                        setBackgroundTrack({ buffer: track.buffer, fileName: track.name });
                                        setTrimSettings(prev => ({ ...prev, background: { start: 0, end: 0 } }));
                                    }}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${backgroundTrack?.fileName === track.name
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }`}
                                >
                                    {track.name}
                                </button>
                            ))}
                        </div>

                        <div className="pt-4">
                            <label className="block">
                                <span className="text-sm font-semibold text-slate-300 mb-2 block">Ou faça upload de um arquivo:</span>
                                <input
                                    type="file"
                                    accept="audio/mpeg, audio/wav"
                                    onChange={(e) => handleFileChange(e, 'background')}
                                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                                />
                            </label>
                        </div>
                        trimStart={trimSettings.voice.start}
                        trimEnd={trimSettings.voice.end}
                        onVolumeChange={(v) => handleVolumeChange('voice', v)}
                        onMuteToggle={() => handleMuteToggle('voice')}
                        onTrimChange={(s, e) => handleTrimChange('voice', s, e)}
                        onPreviewToggle={() => togglePreview('voice')}
                        isPreviewing={previewingTrack === 'voice'}
                        color="#6366f1"
                    />

                        {/* Abertura */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-300">Trilha de Abertura (Opcional)</label>
                            {!openingTrack ? (
                                <label className="block">
                                    <input
                                        type="file"
                                        accept="audio/mpeg, audio/wav"
                                        onChange={(e) => handleFileChange(e, 'opening')}
                                        disabled={isLoading.opening}
                                        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                                    />
                                </label>
                            ) : (
                                <>
                                    <TrackChannel
                                        title="Abertura"
                                        track={openingTrack}
                                        volume={volumes.opening}
                                        isMuted={mutes.opening}
                                        trimStart={trimSettings.opening.start}
                                        trimEnd={trimSettings.opening.end}
                                        crossfadeDuration={crossfadeSettings.opening}
                                        onVolumeChange={(v) => handleVolumeChange('opening', v)}
                                        onMuteToggle={() => handleMuteToggle('opening')}
                                        onTrimChange={(s, e) => handleTrimChange('opening', s, e)}
                                        onCrossfadeChange={(v) => setCrossfadeSettings(prev => ({ ...prev, opening: v }))}
                                        onPreviewToggle={() => togglePreview('opening')}
                                        isPreviewing={previewingTrack === 'opening'}
                                        color="#a855f7"
                                    />
                                    <button
                                        onClick={() => setOpeningTrack(null)}
                                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Remover trilha de abertura
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Background */}
                        {backgroundTrack && (
                            <TrackChannel
                                title="Trilha de Fundo"
                                track={backgroundTrack}
                                volume={volumes.background}
                                isMuted={mutes.background}
                                trimStart={trimSettings.background.start}
                                trimEnd={trimSettings.background.end}
                                onVolumeChange={(v) => handleVolumeChange('background', v)}
                                onMuteToggle={() => handleMuteToggle('background')}
                                onTrimChange={(s, e) => handleTrimChange('background', s, e)}
                                onPreviewToggle={() => togglePreview('background')}
                                isPreviewing={previewingTrack === 'background'}
                                color="#10b981"
                            />
                        )}

                        {/* Fechamento */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-300">Trilha de Fechamento (Opcional)</label>
                            {!closingTrack ? (
                                <label className="block">
                                    <input
                                        type="file"
                                        accept="audio/mpeg, audio/wav"
                                        onChange={(e) => handleFileChange(e, 'closing')}
                                        disabled={isLoading.closing}
                                        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-700 cursor-pointer"
                                    />
                                </label>
                            ) : (
                                <>
                                    <TrackChannel
                                        title="Fechamento"
                                        track={closingTrack}
                                        volume={volumes.closing}
                                        isMuted={mutes.closing}
                                        trimStart={trimSettings.closing.start}
                                        trimEnd={trimSettings.closing.end}
                                        crossfadeDuration={crossfadeSettings.closing}
                                        onVolumeChange={(v) => handleVolumeChange('closing', v)}
                                        onMuteToggle={() => handleMuteToggle('closing')}
                                        onTrimChange={(s, e) => handleTrimChange('closing', s, e)}
                                        onCrossfadeChange={(v) => setCrossfadeSettings(prev => ({ ...prev, closing: v }))}
                                        onPreviewToggle={() => togglePreview('closing')}
                                        isPreviewing={previewingTrack === 'closing'}
                                        color="#ec4899"
                                    />
                                    <button
                                        onClick={() => setClosingTrack(null)}
                                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Remover trilha de fechamento
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
            </div>

            {/* Botão de Download */}
            <button
                onClick={handleDownload}
                disabled={isMixing}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${isMixing
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-2xl hover:shadow-emerald-500/20'
                    }`}
            >
                {isMixing ? (
                    <span className="flex items-center justify-center gap-3">
                        <LoadingSpinner className="w-6 h-6" />
                        Mixando Áudio...
                    </span>
                ) : (
                    <span className="flex items-center justify-center gap-3">
                        <DownloadIcon className="w-6 h-6" />
                        Exportar Áudio Final
                    </span>
                )}
            </button>

            {/* Master Waveform */}
            {masterMixBuffer && (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 shadow-xl">
                    <h4 className="text-white font-semibold mb-4">Preview da Mixagem Final</h4>
                    <Waveform buffer={masterMixBuffer} height={120} className="w-full" />
                </div>
            )}

            {/* Mensagens de erro */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-300">
                    {error}
                </div>
            )}
        </div>
    );
};
