import { useState, useCallback, useRef } from 'react';
import { SunoApiService } from '../services/sunoApi';

export interface SunoTrackData {
    id: string;
    audioUrl: string;
    streamAudioUrl: string;
    imageUrl: string;
    prompt: string;
    modelName: string;
    title: string;
    tags: string;
    createTime: string;
    duration: number;
}

export const useSunoGenerator = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusText, setStatusText] = useState<string>('');
    const [generatedTracks, setGeneratedTracks] = useState<SunoTrackData[] | null>(null);

    const pollingInterval = useRef<any>(null);

    const clearPolling = () => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    };

    const generate = useCallback(async (params: {
        title: string;
        style: string;
        lyrics: string;
        isInstrumental: boolean;
        version: string;
        isCustom: boolean;
    }) => {
        setIsLoading(true);
        setError(null);
        setStatusText('Iniciando geração...');
        setGeneratedTracks(null);
        clearPolling();

        try {
            const taskId = await SunoApiService.generateMusic({
                prompt: params.lyrics,
                style: params.style,
                title: params.title,
                customMode: params.isCustom,
                instrumental: params.isInstrumental,
                model: params.version
            });

            console.log('[Suno] taskId recebido:', taskId);
            setStatusText(`Aguardando Suno AI... (taskId: ${taskId})`);

            if (!taskId) {
                setError('Não foi possível obter o taskId da API. Verifique o console.');
                setIsLoading(false);
                return;
            }

            // Poll every 5 seconds
            pollingInterval.current = setInterval(async () => {
                try {
                    const result = await SunoApiService.getGenerationStatus(taskId);
                    console.log('[Suno Polling] resposta raw:', JSON.stringify(result));

                    // Handle data being object or array
                    let dataObj = result.data;
                    if (Array.isArray(result.data)) {
                        dataObj = result.data.find((t: any) => t.taskId === taskId) || result.data[0];
                    }

                    const status = (dataObj?.status ?? '').toUpperCase();
                    console.log('[Suno Polling] status:', status, '| dataObj keys:', Object.keys(dataObj || {}));

                    // Show real status on screen
                    setStatusText(`Processando... (Status: ${status || 'aguardando'})`);

                    // Check if tracks are ready
                    const sunoData = dataObj?.response?.sunoData;
                    const hasTracks = Array.isArray(sunoData) && sunoData.length > 0;
                    const hasAudio = hasTracks && (sunoData[0]?.audioUrl || sunoData[0]?.streamAudioUrl);

                    if (status === 'SUCCESS' || status === 'COMPLETED' || (hasTracks && hasAudio)) {
                        clearPolling();
                        setGeneratedTracks(sunoData);
                        setIsLoading(false);
                        setStatusText('Música gerada com sucesso! 🎵');
                    } else if (['GENERATE_AUDIO_FAILED', 'CREATE_TASK_FAILED', 'SENSITIVE_WORD_ERROR'].includes(status)) {
                        clearPolling();
                        setError(`Falha na geração: ${status}`);
                        setIsLoading(false);
                    }
                    // PENDING, TEXT_SUCCESS, FIRST_SUCCESS, PROCESSING → keep polling

                } catch (err: any) {
                    console.error('[Suno Polling] erro:', err);
                    clearPolling();
                    setError(err.message || 'Erro ao verificar status.');
                    setIsLoading(false);
                }
            }, 5000);

        } catch (err: any) {
            console.error('[Suno] erro ao gerar:', err);
            setError(err.message || 'Erro ao comunicar com a API do Suno.');
            setIsLoading(false);
        }
    }, []);

    return {
        generate,
        isLoading,
        error,
        statusText,
        generatedTracks,
        clearPolling
    };
};
