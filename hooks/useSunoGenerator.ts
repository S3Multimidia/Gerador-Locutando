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
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusText, setStatusText] = useState<string>('');
    const [generatedTracks, setGeneratedTracks] = useState<SunoTrackData[] | null>(null);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

    const pollingInterval = useRef<any>(null);
    const cachedApiKey = useRef<string | null>(null);

    const clearPolling = () => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
    };

    // Fetch result by taskId (used both by polling and manual check)
    const checkStatus = useCallback(async (taskId: string, apiKey: string) => {
        console.log('[Suno checkStatus] chamando com taskId:', taskId);
        try {
            const result = await SunoApiService.getGenerationStatusWithKey(taskId, apiKey);
            console.log('[Suno checkStatus] resultado:', JSON.stringify(result));

            let dataObj = result.data;
            if (Array.isArray(result.data)) {
                dataObj = result.data.find((t: any) => t.taskId === taskId) || result.data[0];
            }

            const status = (dataObj?.status ?? '').toUpperCase();
            const sunoData = dataObj?.response?.sunoData;
            const hasTracks = Array.isArray(sunoData) && sunoData.length > 0;
            const hasAudio = hasTracks && (sunoData[0]?.audioUrl || sunoData[0]?.streamAudioUrl);

            console.log('[Suno checkStatus] status:', status, '| hasTracks:', hasTracks, '| hasAudio:', hasAudio);
            setStatusText(`Status Suno: ${status || 'aguardando...'}`);

            if (status === 'SUCCESS' || status === 'COMPLETED' || (hasTracks && hasAudio)) {
                clearPolling();
                setGeneratedTracks(sunoData);
                setIsLoading(false);
                setStatusText('Música gerada com sucesso! 🎵');
                return true;
            } else if (['GENERATE_AUDIO_FAILED', 'CREATE_TASK_FAILED', 'SENSITIVE_WORD_ERROR'].includes(status)) {
                clearPolling();
                setError(`Falha na geração: ${status}`);
                setIsLoading(false);
                return true;
            }
            return false;
        } catch (err: any) {
            console.error('[Suno checkStatus] erro:', err);
            setStatusText(`Erro ao verificar: ${err.message}`);
            return false;
        }
    }, []);

    // Manual check button handler
    const checkManually = useCallback(async () => {
        if (!currentTaskId || !cachedApiKey.current) return;
        setIsChecking(true);
        await checkStatus(currentTaskId, cachedApiKey.current);
        setIsChecking(false);
    }, [currentTaskId, checkStatus]);

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
        setCurrentTaskId(null);
        clearPolling();

        try {
            // Get and cache the API key once
            const apiKey = await SunoApiService.getApiKey();
            cachedApiKey.current = apiKey;

            const taskId = await SunoApiService.generateMusicWithKey(apiKey, {
                prompt: params.lyrics,
                style: params.style,
                title: params.title,
                customMode: params.isCustom,
                instrumental: params.isInstrumental,
                model: params.version
            });

            console.log('[Suno] taskId recebido:', taskId);
            setCurrentTaskId(taskId);
            setStatusText(`Aguardando Suno AI... (taskId: ${taskId})`);

            if (!taskId) {
                setError('taskId não retornado pela API. Verifique o console.');
                setIsLoading(false);
                return;
            }

            // Poll every 8 seconds using cached API key
            let pollCount = 0;
            pollingInterval.current = setInterval(async () => {
                pollCount++;
                console.log(`[Suno Polling] tick #${pollCount}, taskId: ${taskId}`);
                const done = await checkStatus(taskId, apiKey);
                if (done) clearPolling();
                if (pollCount > 30) { // 4 minutes max
                    clearPolling();
                    setStatusText('Tempo esgotado. Use "Verificar Resultado" manualmente.');
                    setIsLoading(false);
                }
            }, 8000);

        } catch (err: any) {
            console.error('[Suno] erro ao gerar:', err);
            setError(err.message || 'Erro ao comunicar com a API do Suno.');
            setIsLoading(false);
        }
    }, [checkStatus]);

    return {
        generate,
        checkManually,
        isLoading,
        isChecking,
        error,
        statusText,
        generatedTracks,
        currentTaskId,
        clearPolling
    };
};
