import { supabase } from '../utils/supabaseClient';

const BASE_URL = 'https://api.sunoapi.org/api/v1';

export const SunoApiService = {
    async getApiKey(): Promise<string> {
        const { data, error } = await supabase.from('system_config').select('value').eq('key', 'suno_api_key').single();
        if (error || !data?.value) {
            throw new Error('Suno API Key não configurada. Por favor, adicione-a no painel Admin.');
        }
        return data.value;
    },

    async generateMusic(params: {
        prompt: string;
        style: string;
        title: string;
        customMode: boolean;
        instrumental: boolean;
        model: string;
    }) {
        const apiKey = await this.getApiKey();

        const response = await fetch(`${BASE_URL}/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...params,
                callBackUrl: 'https://localhost/api/suno-callback' // Dummy URL obrigatória pela API
            })
        });

        const result = await response.json();
        
        if (!response.ok || result.code !== 200) {
            throw new Error(result.msg || 'Erro ao iniciar geração de música');
        }

        return result.data.taskId;
    },

    async getGenerationStatus(taskId: string) {
        const apiKey = await this.getApiKey();

        const response = await fetch(`${BASE_URL}/generate/record-info?taskId=${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const result = await response.json();
        
        if (!response.ok || result.code !== 200) {
            throw new Error(result.msg || 'Erro ao verificar status da música');
        }

        return result;
    }
};
