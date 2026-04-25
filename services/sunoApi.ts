import { supabase } from '../utils/supabaseClient';

const BASE_URL = 'https://api.sunoapi.org/api/v1';

export const SunoApiService = {
    async getApiKey(): Promise<string> {
        const { data, error } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', 'suno_api_key')
            .single();
        if (error || !data?.value) {
            throw new Error('Suno API Key não configurada. Por favor, adicione-a no painel Admin.');
        }
        return data.value;
    },

    async generateMusicWithKey(apiKey: string, params: {
        prompt: string;
        style: string;
        title: string;
        customMode: boolean;
        instrumental: boolean;
        model: string;
    }) {
        const body = {
            ...params,
            callBackUrl: 'https://locutando-novo.vercel.app/'
        };
        console.log('[Suno] POST /generate body:', JSON.stringify(body));

        const response = await fetch(`${BASE_URL}/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        console.log('[Suno] POST /generate resposta:', JSON.stringify(result));

        if (!response.ok || result.code !== 200) {
            throw new Error(result.msg || 'Erro ao iniciar geração de música');
        }

        const taskId = result.data?.taskId || result.data?.task_id || result.data;
        console.log('[Suno] taskId extraído:', taskId);
        return taskId;
    },

    async getGenerationStatusWithKey(taskId: string, apiKey: string) {
        const url = `${BASE_URL}/generate/record-info?taskId=${taskId}`;
        console.log('[Suno] GET chamando:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('[Suno] GET status HTTP:', response.status);
        const result = await response.json();
        console.log('[Suno] GET resposta:', JSON.stringify(result));

        if (!response.ok || result.code !== 200) {
            throw new Error(result.msg || `HTTP ${response.status}`);
        }

        return result;
    }
};
