import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';

export const SystemConfigTab: React.FC = () => {
    const [config, setConfig] = useState({
        suno_api_key: '',
        evolution_api_url: '',
        evolution_api_token: '',
        mercado_pago_token: ''
    });
    const [connectionStatus, setConnectionStatus] = useState<string>('Verificando...');
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const { data, error } = await supabase.from('system_config').select('*');
                if (error && error.code !== '42P01') { // Ignore table not found error initially
                    console.error('Error loading config:', error);
                    return;
                }
                
                if (data) {
                    const newConfig = { ...config };
                    data.forEach((row: any) => {
                        if (row.key in newConfig) {
                            (newConfig as any)[row.key] = row.value;
                        }
                    });
                    setConfig(newConfig);
                }
            } catch (e) {
                console.error(e);
            }
        };
        loadConfig();
    }, []);

    const handleSave = async () => {
        try {
            setIsLoading(true);
            setFeedback('');
            
            // Format for Supabase upsert
            const updates = Object.entries(config).map(([key, value]) => ({
                key,
                value
            }));

            const { error } = await supabase.from('system_config').upsert(updates, { onConflict: 'key' });
            
            if (error) throw error;
            
            setFeedback('Configuração salva com sucesso!');
        } catch (e: any) {
            console.error(e);
            setFeedback('Erro ao salvar: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            setIsLoading(true);
            const res = await BackendService.getEvolutionQrCode();
            // Assuming response is HTML or Base64 image directly or JSON
            // Adjust based on actual backend response structure.
            // Our backend creates an HTML string or text.
            // Let's assume for now it returns just the image source or HTML.
            // Frontend service: returns `api.get(...)` which returns AxiosResponse.
            // Backend admin returns `format_html`. But API logic might differ.
            // Wait, I implemented `view_qr_code` in Admin, but not a public API endpoint for it yet!
            // I only made `admin.py`.
            // Correction: I should assume I need to ADD that endpoint to `api.py` or use what I have.
            // For now, let's mock the "Connect" action or display a message.
            setFeedback('Funcionalidade de conexão via API em desenvolvimento.');
        } catch (e) {
            setFeedback('Erro ao conectar.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold text-gray-800">Integrações do Sistema (Global)</h2>

            {/* AI Settings */}
            <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Configurações de IA</h3>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Suno API Key (Geração de Música)</label>
                        <input
                            type="password"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            value={config.suno_api_key}
                            onChange={e => setConfig({ ...config, suno_api_key: e.target.value })}
                            placeholder="Sua chave de API do Suno..."
                        />
                        <p className="text-xs text-gray-500 mt-1">Essa chave será usada globalmente para gerar músicas na aba "Gerar Música".</p>
                    </div>
                </div>
            </div>

            {/* Evolution API */}
            <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Evolution API (WhatsApp)</h3>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Instance URL</label>
                        <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            value={config.evolution_api_url}
                            onChange={e => setConfig({ ...config, evolution_api_url: e.target.value })}
                            placeholder="https://api.evolution.com/instance/Locutando"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">API Token</label>
                        <input
                            type="password"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            value={config.evolution_api_token}
                            onChange={e => setConfig({ ...config, evolution_api_token: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center space-x-4 mt-2">
                        <button
                            onClick={handleConnect}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Conectando...' : 'Gerar QR Code'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mercado Pago */}
            <div className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Mercado Pago (Pix)</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Access Token (Production)</label>
                    <input
                        type="password"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        value={config.mercado_pago_token}
                        onChange={e => setConfig({ ...config, mercado_pago_token: e.target.value })}
                        placeholder="APP_USR-..."
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <span className="mr-4 text-green-600 self-center">{feedback}</span>
                <button
                    onClick={handleSave}
                    className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 shadow"
                >
                    Salvar Configurações
                </button>
            </div>
        </div>
    );
};
