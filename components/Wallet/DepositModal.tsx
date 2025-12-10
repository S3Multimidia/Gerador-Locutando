import React, { useState } from 'react';
import { BackendService } from '../../services/backend';
import { DepositResponse } from '../../types';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
    const [amount, setAmount] = useState<number>(50);
    const [step, setStep] = useState<'input' | 'qr'>('input');
    const [depositData, setDepositData] = useState<DepositResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleCreatePix = async () => {
        if (amount < 5) {
            setError('Valor mínimo de R$ 5,00');
            return;
        }
        try {
            setIsLoading(true);
            setError('');
            const data = await BackendService.createDepositPix(amount);
            setDepositData(data);
            setStep('qr');
        } catch (e) {
            console.error(e);
            setError('Erro ao gerar Pix. Verifique a conexão.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (depositData?.qr_code) {
            navigator.clipboard.writeText(depositData.qr_code);
            alert('Código Pix Copiado!');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>

                <h2 className="text-2xl font-bold mb-4 text-gray-800">Adicionar Saldo</h2>

                {step === 'input' ? (
                    <div className="space-y-4">
                        <p className="text-gray-600">Quanto você deseja depositar?</p>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">R$</span>
                            <input
                                type="number"
                                className="w-full pl-10 p-2 border rounded-lg text-lg font-semibold"
                                value={amount}
                                onChange={e => setAmount(Number(e.target.value))}
                                min="5"
                            />
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Mínimo: R$ 5,00</span>
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <button
                            onClick={handleCreatePix}
                            disabled={isLoading}
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex justify-center"
                        >
                            {isLoading ? (
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                'Gerar Pix'
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="text-center space-y-6">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <p className="font-semibold text-green-800">Pix Gerado com Sucesso!</p>
                            <p className="text-2xl font-bold text-gray-800 mt-2">R$ {depositData?.amount.toFixed(2)}</p>
                        </div>

                        {depositData?.qr_code_base64 && (
                            <img
                                src={`data:image/png;base64,${depositData.qr_code_base64}`}
                                alt="QR Code Pix"
                                className="mx-auto w-48 h-48 border rounded"
                            />
                        )}

                        <div className="space-y-2">
                            <p className="text-sm text-gray-500">Ou copie o código abaixo:</p>
                            <div className="flex">
                                <input
                                    readOnly
                                    value={depositData?.qr_code}
                                    className="flex-1 p-2 border rounded-l bg-gray-50 text-xs truncate"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="bg-indigo-600 text-white px-3 py-2 rounded-r hover:bg-indigo-700 text-sm"
                                >
                                    Copiar
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400">
                            Após o pagamento, seu saldo será atualizado automaticamente em instantes.
                        </p>

                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 underline text-sm"
                        >
                            Fechar janela
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
