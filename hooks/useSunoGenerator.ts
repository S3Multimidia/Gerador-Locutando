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
            // Step 1: Start generation
            const taskId = await SunoApiService.generateMusic({
                prompt: params.lyrics,
                style: params.style,
                title: params.title,
                customMode: params.isCustom,
                instrumental: params.isInstrumental,
                model: params.version
            });

            setStatusText('Aguardando Suno AI...');

            // Step 2: Poll for results every 5 seconds
            pollingInterval.current = setInterval(async () => {
                try {
                    const result = await SunoApiService.getGenerationStatus(taskId);
                    
                    const status = result.data.status;
                    
                    if (status === 'SUCCESS') {
                        clearPolling();
                        setGeneratedTracks(result.data.response.sunoData);
                        setIsLoading(false);
                        setStatusText('Música gerada com sucesso!');
                    } else if (status === 'PENDING' || status === 'TEXT_SUCCESS' || status === 'FIRST_SUCCESS') {
                        setStatusText('Gerando música... (Pode levar até 2 minutos)');
                    } else {
                        // Error statuses
                        clearPolling();
                        setError(`Erro na geração: ${status}`);
                        setIsLoading(false);
                    }
                } catch (err: any) {
                    clearPolling();
                    setError(err.message || 'Erro ao verificar status.');
                    setIsLoading(false);
                }
            }, 5000);

        } catch (err: any) {
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
