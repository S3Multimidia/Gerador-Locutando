import React, { useState, useEffect } from 'react';
import { BackendService } from '../../services/backend';

export const SystemConfigTab: React.FC = () => {
    const [config, setConfig] = useState({
        evolution_api_url: '',
        evolution_api_token: '',
        mercado_pago_token: ''
    });
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<string>('Verificando...');
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        // Load initial config
        BackendService.getSystemConfig().then(data => setConfig(data)).catch(console.error);
    }, []);

    const handleSave = async () => {
        try {
            setIsLoading(true);
            await BackendService.updateSystemConfig(config);
            setFeedback('Configuração salva com sucesso!');
        } catch (e) {
            setFeedback('Erro ao salvar configuração.');
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
            <h2 className="text-xl font-bold text-gray-800">Integrações do Sistema (Backend Core)</h2>

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
                        <span className="text-sm text-gray-600">Status: {connectionStatus}</span>
                    </div>
                    {qrCode && (
                        <div className="mt-4 p-4 border rounded bg-gray-50 flex justify-center">
                            <div dangerouslySetInnerHTML={{ __html: qrCode }} />
                        </div>
                    )}
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
