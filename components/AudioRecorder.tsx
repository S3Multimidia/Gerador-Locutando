
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MicIcon, StopIcon, PlayIcon, PauseIcon, TrashIcon, LoadingSpinner, UploadIcon } from './IconComponents';

interface AudioRecorderProps {
    audioContext: AudioContext;
    onRecordingComplete: (audioBuffer: AudioBuffer | null) => void;
}

type RecordingStatus = 'idle' | 'permission' | 'recording' | 'decoding' | 'recorded' | 'error';

// Helper to format time in MM:SS
const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ audioContext, onRecordingComplete }) => {
    const [status, setStatus] = useState<RecordingStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedAudio, setRecordedAudio] = useState<{ url: string; buffer: AudioBuffer } | null>(null);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
    }, []);

    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    const handleStartRecording = async () => {
        if (status === 'recording') return;

        setError(null);
        setStatus('permission');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError('A API de gravação não é suportada neste navegador.');
            setStatus('error');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            recorder.onstop = async () => {
                setStatus('decoding');
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                try {
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    const audioUrl = URL.createObjectURL(audioBlob);
                    setRecordedAudio({ url: audioUrl, buffer: decodedBuffer });
                    onRecordingComplete(decodedBuffer);
                    setStatus('recorded');
                } catch (err) {
                    console.error("Error decoding recorded audio:", err);
                    setError('Falha ao processar o áudio gravado.');
                    setStatus('error');
                    onRecordingComplete(null);
                } finally {
                    cleanup();
                }
            };

            recorder.start();
            setStatus('recording');
            setRecordingTime(0);
            timerIntervalRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            if (err instanceof Error && err.name === 'NotAllowedError') {
                setError('Permissão para usar o microfone foi negada. Por favor, habilite o acesso nas configurações do seu navegador.');
            } else {
                setError('Não foi possível acessar o microfone.');
            }
            setStatus('error');
            cleanup();
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    };

    const handleReset = () => {
        if (recordedAudio) {
            URL.revokeObjectURL(recordedAudio.url);
        }
        setRecordedAudio(null);
        setRecordingTime(0);
        setError(null);
        setStatus('idle');
        onRecordingComplete(null);
        stopPreview();
    };

    const togglePreview = () => {
        if (isPlayingPreview) {
            stopPreview();
        } else {
            if (!recordedAudio) return;
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            const source = audioContext.createBufferSource();
            source.buffer = recordedAudio.buffer;
            source.connect(audioContext.destination);
            source.onended = () => {
                setIsPlayingPreview(false);
                previewSourceRef.current = null;
            };
            source.start();
            previewSourceRef.current = source;
            setIsPlayingPreview(true);
        }
    };

    const stopPreview = () => {
        if (previewSourceRef.current) {
            previewSourceRef.current.onended = null;
            previewSourceRef.current.stop();
            previewSourceRef.current = null;
        }
        setIsPlayingPreview(false);
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        setStatus('decoding');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const audioUrl = URL.createObjectURL(file);
            setRecordedAudio({ url: audioUrl, buffer: decodedBuffer });
            onRecordingComplete(decodedBuffer);
            setStatus('recorded');
        } catch (err) {
            console.error("Error decoding uploaded audio:", err);
            setError('Falha ao processar o arquivo de áudio. Verifique se o formato é suportado.');
            setStatus('error');
            onRecordingComplete(null);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-6 p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[300px]">
            {status === 'idle' && (
                <>
                    <p className="text-gray-600 text-center">Grave sua voz ou envie um arquivo.</p>
                    <div className="flex gap-8 items-center">
                        <div className="flex flex-col items-center gap-2">
                            <button onClick={handleStartRecording} className="group flex flex-col items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg border-2 border-red-500 transition-all transform hover:scale-110 focus-ring">
                                <MicIcon className="w-8 h-8 text-red-500 transition-transform group-hover:scale-110" />
                            </button>
                            <p className="text-xs text-gray-500">Gravar</p>
                        </div>

                        <div className="h-12 w-px bg-gray-300"></div>

                        <div className="flex flex-col items-center gap-2">
                            <button
                                onClick={() => document.getElementById('audio-upload-input')?.click()}
                                className="group flex flex-col items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg border-2 border-indigo-500 transition-all transform hover:scale-110 focus-ring"
                            >
                                <UploadIcon className="w-8 h-8 text-indigo-500 transition-transform group-hover:scale-110" />
                            </button>
                            <p className="text-xs text-gray-500">Enviar Arquivo</p>
                            <input
                                id="audio-upload-input"
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>
                    </div>
                </>
            )}

            {(status === 'permission' || status === 'decoding') && (
                <div className="text-center space-y-4">
                    <LoadingSpinner className="w-12 h-12 text-red-500 mx-auto" />
                    <p className="font-semibold text-gray-700">{status === 'permission' ? 'Aguardando permissão...' : 'Processando áudio...'}</p>
                    <p className="text-sm text-gray-500">Por favor, aguarde.</p>
                </div>
            )}

            {status === 'recording' && (
                <>
                    <p className="text-lg font-semibold text-gray-800 tracking-wider font-mono">{formatTime(recordingTime)}</p>
                    <button onClick={handleStopRecording} className="flex items-center justify-center w-24 h-24 bg-red-600 rounded-full shadow-lg transition-all transform hover:scale-110 focus-ring">
                        <StopIcon className="w-10 h-10 text-white" />
                    </button>
                    <p className="text-sm text-gray-500 animate-pulse">Gravando... clique para parar</p>
                </>
            )}

            {status === 'recorded' && recordedAudio && (
                <div className="w-full flex flex-col items-center space-y-4">
                    <p className="font-semibold text-lg text-gray-800">Áudio Pronto</p>
                    <div className="w-full max-w-xs flex items-center justify-center space-x-4 bg-white p-3 rounded-lg shadow border">
                        <button onClick={togglePreview} className="p-2 rounded-full hover:bg-gray-100 transition-colors focus-ring">
                            {isPlayingPreview ? <PauseIcon className="w-6 h-6 text-red-600" /> : <PlayIcon className="w-6 h-6 text-red-600" />}
                        </button>
                        <div className="text-lg font-mono text-gray-700">{formatTime(recordedAudio.buffer.duration)}</div>
                    </div>
                    <button onClick={handleReset} className="flex items-center space-x-2 text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors focus-ring p-2 rounded-md">
                        <TrashIcon className="w-4 h-4" />
                        <span>Novo Áudio</span>
                    </button>
                </div>
            )}

            {status === 'error' && (
                <div className="text-center space-y-4">
                    <p className="text-red-600 font-semibold">Ocorreu um erro</p>
                    <p className="text-sm text-gray-600 max-w-sm">{error}</p>
                    <button onClick={handleReset} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg shadow hover:bg-red-700 transition-colors">
                        Tentar Novamente
                    </button>
                </div>
            )}

        </div>
    );
};
