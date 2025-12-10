import React, { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceGenerator } from '../components/VoiceGenerator';
import { AudioResult } from '../components/AudioResult';
import { Mixer } from '../components/Mixer';
import { AudioRecorder } from '../components/AudioRecorder';
import { LoadingSpinner } from '../components/IconComponents';
import { Voice, TrackInfo } from '../types';
import { useVoiceGenerator } from '../hooks/useVoiceGenerator';
import { useClients } from '../hooks/useClients';
import { DynamicLoadingMessage } from '../components/DynamicLoadingMessage';
import { useDashboardPersistence } from '../hooks/useDashboardPersistence';
import { BackendService } from '../services/backend';
import { DepositModal } from '../components/Wallet/DepositModal';

interface DashboardPageProps {
    availableVoices: Voice[];
    backgroundTracks: TrackInfo[];
    ttsModel: string;
    chatModel: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ availableVoices, backgroundTracks, ttsModel, chatModel }) => {
    const [text, setText] = useState<string>('');
    const [isExpertGenerated, setIsExpertGenerated] = useState<boolean>(false);
    const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);

    const [activeTab, setActiveTab] = useState<'generate' | 'record'>('generate');
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number>(0);

    useEffect(() => {
        BackendService.getWalletBalance().then(w => setWalletBalance(w.balance || 0));
    }, []);

    // Audio Cuts State
    const [cutStartSec, setCutStartSec] = useState<number>(0);
    const [cutEndSec, setCutEndSec] = useState<number>(0);
    const [finalCutStartSec, setFinalCutStartSec] = useState<number>(0);
    const [finalCutEndSec, setFinalCutEndSec] = useState<number>(0);

    const { dashboardState, updateDashboardState, isPersistenceLoaded } = useDashboardPersistence();

    // Initialize state from persistence once loaded
    useEffect(() => {
        if (isPersistenceLoaded) {
            if (dashboardState.text) setText(dashboardState.text);
            if (dashboardState.activeTab) setActiveTab(dashboardState.activeTab);
            if (dashboardState.cutStartSec) setCutStartSec(dashboardState.cutStartSec);
            if (dashboardState.cutEndSec) setCutEndSec(dashboardState.cutEndSec);
            if (dashboardState.finalCutStartSec) setFinalCutStartSec(dashboardState.finalCutStartSec);
            if (dashboardState.finalCutEndSec) setFinalCutEndSec(dashboardState.finalCutEndSec);

            if (dashboardState.selectedVoiceId && availableVoices.length > 0) {
                const persistedVoice = availableVoices.find(v => v.id === dashboardState.selectedVoiceId);
                if (persistedVoice) {
                    setSelectedVoice(persistedVoice);
                }
            }
        }
    }, [isPersistenceLoaded, availableVoices, dashboardState.text, dashboardState.activeTab, dashboardState.cutStartSec, dashboardState.cutEndSec, dashboardState.finalCutStartSec, dashboardState.finalCutEndSec, dashboardState.selectedVoiceId]);

    // Update persistence when local state changes
    useEffect(() => {
        if (isPersistenceLoaded) {
            updateDashboardState({
                text,
                activeTab,
                cutStartSec,
                cutEndSec,
                finalCutStartSec,
                finalCutEndSec,
                selectedVoiceId: selectedVoice?.id || null
            });
        }
    }, [text, activeTab, cutStartSec, cutEndSec, finalCutStartSec, finalCutEndSec, selectedVoice, isPersistenceLoaded]);

    const mixerRef = useRef<HTMLDivElement>(null);

    const { clients, addClient } = useClients();

    const {
        audioContext,
        isLoading,
        isTurboLoading,
        error,
        setError,
        generatedAudio,
        setGeneratedAudio,
        finalMixedAudio,
        setFinalMixedAudio,
        preloadedTracks,
        isDefaultTrackLoading,
        generateExpert,
        generateTurbo
    } = useVoiceGenerator(availableVoices, backgroundTracks, ttsModel);

    const GENERATION_MESSAGES = [
        "Carregando voz neural...",
        "Sintetizando fala...",
        "Aplicando entonação...",
        "Mixando trilha sonora...",
        "Renderizando arquivo final..."
    ];

    // Sync selected voice availability and data
    useEffect(() => {
        if (availableVoices.length === 0) {
            setSelectedVoice(null);
            return;
        }
        if (selectedVoice) {
            const updatedVoice = availableVoices.find(v => v.id === selectedVoice.id);
            if (updatedVoice) {
                // Update if the object reference changed (meaning data might have changed)
                if (updatedVoice !== selectedVoice) {
                    setSelectedVoice(updatedVoice);
                }
            } else {
                // Voice no longer exists
                setSelectedVoice(null);
            }
        }
    }, [availableVoices, selectedVoice]);

    // Update cut times when audio changes
    useEffect(() => {
        if (generatedAudio) {
            setCutStartSec(0);
            setCutEndSec(generatedAudio.duration);
        }
    }, [generatedAudio]);

    useEffect(() => {
        if (finalMixedAudio) {
            setFinalCutStartSec(0);
            setFinalCutEndSec(finalMixedAudio.duration);
        }
    }, [finalMixedAudio]);

    const handleRecordingComplete = useCallback((audioBuffer: AudioBuffer | null) => {
        setGeneratedAudio(audioBuffer);
        setFinalMixedAudio(null);
        if (!audioBuffer) setError(null);
    }, [setGeneratedAudio, setFinalMixedAudio, setError]);

    return (
        <main className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-fade-in">
                {/* Left Panel: Voice Generator (5 cols) */}
                <div className="xl:col-span-5 bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-700 h-full">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                        <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center mr-3 text-indigo-400 text-sm">🎙️</span>
                        Estúdio de Voz
                    </h2>

                    {/* Wallet Info */}
                    <div className="mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                        <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Seu Saldo</p>
                            <p className="text-2xl font-bold text-green-400">R$ {walletBalance.toFixed(2)}</p>
                        </div>
                        <button
                            onClick={() => setShowDepositModal(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center"
                        >
                            <span>+ Adicionar</span>
                        </button>
                    </div>

                    <DepositModal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} />

                    {/* Tab Navigation */}
                    <div className="mb-6 bg-slate-900/50 p-1 rounded-lg inline-flex w-full">
                        <button
                            onClick={() => setActiveTab('generate')}
                            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'generate' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            IA Generator
                        </button>
                        <button
                            onClick={() => setActiveTab('record')}
                            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'record' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Gravar Áudio
                        </button>
                    </div>

                    <div className="animate-fade-in">
                        {activeTab === 'generate' && (
                            <VoiceGenerator
                                text={text}
                                setText={setText}
                                isExpertGenerated={isExpertGenerated}
                                setIsExpertGenerated={setIsExpertGenerated}
                                availableVoices={availableVoices}
                                selectedVoice={selectedVoice}
                                setSelectedVoice={setSelectedVoice}
                                isLoading={isLoading}
                                isTurboLoading={isTurboLoading}
                                onGenerateExpert={(txt) => generateExpert(selectedVoice, txt)}
                                onGenerateTurbo={(txt) => generateTurbo(selectedVoice, txt)}
                                ttsModel={ttsModel}
                                chatModel={chatModel}
                                onGoToChat={() => { }} // No longer used
                            />
                        )}
                        {activeTab === 'record' && audioContext && (
                            <AudioRecorder
                                audioContext={audioContext}
                                onRecordingComplete={handleRecordingComplete}
                            />
                        )}
                    </div>
                    {error && (
                        <div className="mt-6 p-4 bg-red-900/30 text-red-200 border-l-4 border-red-500 rounded-r-lg" role="alert">
                            <p className="font-bold">Atenção</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                </div>

                {/* Right Panel: Mixer (7 cols) */}
                <div className="xl:col-span-7 space-y-8">
                    {isTurboLoading ? (
                        <div className="bg-slate-800 p-12 rounded-2xl shadow-xl border border-slate-700 animate-fade-in text-center flex flex-col items-center justify-center min-h-[400px]">
                            <LoadingSpinner className="w-16 h-16 text-indigo-500 mb-6" />
                            <h3 className="text-2xl font-bold text-white mb-2">Processando Áudio...</h3>
                            <div className="text-slate-400 mt-2 text-lg h-8">
                                <DynamicLoadingMessage messages={GENERATION_MESSAGES} interval={3000} />
                            </div>
                        </div>
                    ) : finalMixedAudio ? (
                        // TURBO MODE UI
                        <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-700 animate-fade-in">
                            <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                                <span className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center mr-3 text-orange-500 text-sm">🚀</span>
                                Resultado Turbo
                            </h2>
                            <p className="text-sm text-slate-400 mb-6 pl-11">
                                Seu áudio foi gerado, mixado e masterizado automaticamente.
                            </p>
                            <AudioResult
                                audioBuffer={finalMixedAudio}
                                audioContext={audioContext!}
                                setGeneratedAudio={setFinalMixedAudio}
                                cutStartSec={finalCutStartSec}
                                cutEndSec={finalCutEndSec}
                                setCutStartSec={setFinalCutStartSec}
                                setCutEndSec={setFinalCutEndSec}
                                variant="mix"
                            />
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setFinalMixedAudio(null)}
                                    className="text-sm text-slate-500 hover:text-white underline"
                                >
                                    Voltar / Gerar Novo
                                </button>
                            </div>
                        </div>
                    ) : generatedAudio && audioContext ? (
                        // EXPERT MODE UI
                        <div ref={mixerRef} className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-700 animate-fade-in">
                            <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
                                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center mr-3 text-indigo-400 text-sm">🎛️</span>
                                Pós-Produção
                            </h2>
                            <p className="text-sm text-slate-400 mb-6 pl-11">
                                Adicione trilha sonora e ajuste o áudio gerado.
                            </p>
                            <Mixer
                                generatedAudio={generatedAudio}
                                audioContext={audioContext}
                                setGeneratedAudio={setGeneratedAudio}
                                preloadedTracks={preloadedTracks}
                                backgroundTracks={backgroundTracks}
                                isDefaultTrackLoading={isDefaultTrackLoading}
                                cutStartSec={cutStartSec}
                                cutEndSec={cutEndSec}
                                setCutStartSec={setCutStartSec}
                                setCutEndSec={setCutEndSec}
                                belowTreatment={(
                                    <AudioResult
                                        audioBuffer={generatedAudio}
                                        audioContext={audioContext}
                                        setGeneratedAudio={setGeneratedAudio}
                                        cutStartSec={cutStartSec}
                                        cutEndSec={cutEndSec}
                                        setCutStartSec={setCutStartSec}
                                        setCutEndSec={setCutEndSec}
                                    />
                                )}
                            />
                        </div >
                    ) : (
                        <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 p-12 rounded-2xl text-center flex flex-col items-center justify-center min-h-[400px]">
                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                                <span className="text-3xl">🎙️</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-300">Aguardando Locução</h3>
                            <p className="text-slate-500 mt-2 max-w-md">
                                Gere ou grave uma locução no painel à esquerda para desbloquear as ferramentas de mixagem.
                            </p>
                        </div>
                    )}
                </div >
            </div >
        </main >
    );
};
