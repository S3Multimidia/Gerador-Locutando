import React, { useEffect, useState } from 'react';
import { BackendService } from '../services/backend';
import { DownloadIcon, LoadingSpinner, CheckCircleIcon, XIcon } from './IconComponents';

interface AudioRequest {
    id: number;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    created_at: string;
    completed_at?: string;
    error_message?: string;
    output_file?: string;
}

export const OrderList: React.FC = () => {
    const [requests, setRequests] = useState<AudioRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const data = await BackendService.getMyRequests();
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id: number) => {
        if (!confirm('Tem certeza que deseja cancelar?')) return;
        try {
            await BackendService.cancelStorefrontRequest(id);
            fetchRequests(); // Refresh immediately
        } catch (e) {
            alert('Erro ao cancelar pedido.');
        }
    };

    useEffect(() => {
        fetchRequests();
        const interval = setInterval(fetchRequests, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="ox-2 py-1 text-xs rounded bg-gray-700 text-gray-300">Aguardando</span>;
            case 'PROCESSING':
                return <span className="px-2 py-1 text-xs rounded bg-yellow-900/50 text-yellow-500 border border-yellow-700 flex items-center gap-1"><LoadingSpinner className="w-3 h-3" /> Processando</span>;
            case 'COMPLETED':
                return <span className="px-2 py-1 text-xs rounded bg-green-900/50 text-green-400 border border-green-700 flex items-center gap-1"><CheckCircleIcon className="w-3 h-3" /> Concluído</span>;
            case 'FAILED':
                return <span className="ox-2 py-1 text-xs rounded bg-red-900/50 text-red-400 border border-red-700 flex items-center gap-1"><XIcon className="w-3 h-3" /> Falhou</span>;
            case 'CANCELLED':
                return <span className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-400 border border-slate-600 flex items-center gap-1">🚫 Cancelado</span>;
            default:
                return status;
        }
    };

    const handleDownload = (filename: string) => {
        const url = `${BackendService.API_URL}/api/storefront/download/${filename}/`;
        // Trigger download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    if (loading && requests.length === 0) return <div className="text-gray-500 text-center py-4">Carregando pedidos...</div>;

    return (
        <div className="w-full bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mt-6">
            <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    📦 Meus Pedidos
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900 text-slate-200 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Data</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                    Nenhum pedido encontrado.
                                </td>
                            </tr>
                        ) : (
                            requests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="px-4 py-3 font-mono text-slate-500">#{req.id}</td>
                                    <td className="px-4 py-3">
                                        {new Date(req.created_at).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-4 py-3">
                                        {getStatusBadge(req.status)}
                                        {req.error_message && req.status === 'FAILED' && (
                                            <div className="text-xs text-red-500 mt-1 max-w-xs truncate" title={req.error_message}>
                                                {req.error_message}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        {req.status === 'COMPLETED' && req.output_file && (
                                            <button
                                                onClick={() => handleDownload(req.output_file!)}
                                                className="inline-flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors shadow-sm"
                                            >
                                                <DownloadIcon className="w-3 h-3 mr-1" />
                                                Baixar
                                            </button>
                                        )}
                                        {['PENDING', 'PROCESSING'].includes(req.status) && (
                                            <button
                                                onClick={() => handleCancel(req.id)}
                                                className="inline-flex items-center px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded text-xs transition-colors border border-red-800"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
