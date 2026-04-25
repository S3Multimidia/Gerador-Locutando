import React, { useState, useEffect } from 'react';
import { useSunoGenerator } from '../hooks/useSunoGenerator';

export const MusicGenerator: React.FC = () => {
    const [isCustomMode, setIsCustomMode] = useState(true);
    const [version, setVersion] = useState('V4_5ALL');
    const [title, setTitle] = useState('');
    const [style, setStyle] = useState('');
    const [isInstrumental, setIsInstrumental] = useState(false);
    const [lyrics, setLyrics] = useState('');

    const { generate, isLoading, error, statusText, generatedTracks, clearPolling } = useSunoGenerator();

    useEffect(() => {
        return () => clearPolling();
    }, [clearPolling]);

    const handleGenerate = () => {
        if (!isInstrumental && isCustomMode && !lyrics) {
            alert('Por favor, preencha a letra ou ative o modo instrumental.');
            return;
        }
        if (isCustomMode && !style && !title) {
            alert('Por favor, preencha o Título e o Estilo de Música.');
            return;
        }
        if (!isCustomMode && !lyrics) {
            alert('Por favor, preencha o prompt na área de letras.');
            return;
        }

        generate({ title, style, lyrics, isInstrumental, version, isCustom: isCustomMode });
    };

    return (
        <div className="bg-[#111113] p-6 rounded-2xl border border-slate-800/50 max-w-2xl mx-auto text-slate-200 font-sans">
            
            {/* Top Tabs */}
            <div className="flex bg-[#1a1a1d] rounded-full p-1 mb-6">
                <button className="flex-1 bg-[#8b5cf6] text-white py-2 rounded-full font-medium text-sm transition-all shadow-lg">
                    Geração de Música
                </button>
                <button className="flex-1 text-slate-400 py-2 rounded-full font-medium text-sm hover:text-slate-200 transition-all cursor-not-allowed" title="Em breve">
                    Geração de Efeitos Sonoros
                </button>
            </div>

            {/* Custom Mode & Version */}
            <div className="flex items-center justify-between bg-[#1a1a1d] p-3 rounded-xl mb-4 border border-slate-800/50">
                <div className="flex items-center space-x-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isCustomMode} onChange={(e) => setIsCustomMode(e.target.checked)} />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8b5cf6]"></div>
                    </label>
                    <span className="text-sm font-medium">Modo Personalizado</span>
                </div>
                <select 
                    value={version} 
                    onChange={(e) => setVersion(e.target.value)}
                    className="bg-transparent border-none text-sm text-slate-300 focus:ring-0 cursor-pointer outline-none"
                >
                    <option value="V4_5ALL">V4.5 ALL</option>
                    <option value="V4_5PLUS">V4.5 PLUS</option>
                    <option value="V5">V5</option>
                    <option value="V4">V4</option>
                </select>
            </div>

            {isCustomMode && (
                <>
                    {/* Title */}
                    <div className="mb-4 bg-[#1a1a1d] p-4 rounded-xl border border-slate-800/50">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Título</label>
                        <input
                            type="text"
                            className="w-full bg-transparent border border-[#8b5cf6]/50 rounded-lg p-3 text-white focus:outline-none focus:border-[#8b5cf6] placeholder-slate-600 text-sm"
                            placeholder="Digite um título"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Style */}
                    <div className="mb-4 bg-[#1a1a1d] p-4 rounded-xl border border-slate-800/50">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Estilo de Música</label>
                        <textarea
                            className="w-full bg-transparent border-none p-0 text-white focus:ring-0 focus:outline-none placeholder-slate-600 text-sm resize-none h-20"
                            placeholder="Digite o estilo de música"
                            value={style}
                            maxLength={200}
                            onChange={(e) => setStyle(e.target.value)}
                        />
                        <div className="text-right text-xs text-slate-500 mt-1">{style.length}/200</div>
                    </div>
                </>
            )}

            {/* Instrumental Toggle */}
            <div className="flex items-center justify-between bg-[#1a1a1d] p-3 rounded-xl mb-4 border border-slate-800/50">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isInstrumental} onChange={(e) => setIsInstrumental(e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8b5cf6]"></div>
                </label>
                <span className="text-sm font-medium text-slate-300">Instrumental</span>
            </div>

            {/* Lyrics / Prompt */}
            {!isInstrumental && (
                <div className="mb-6 bg-[#1a1a1d] p-4 rounded-xl border border-slate-800/50">
                    <label className="block text-sm font-medium text-slate-300 mb-2">{isCustomMode ? 'Letras' : 'Ideia da Música (Prompt)'}</label>
                    <textarea
                        className="w-full bg-transparent border-none p-0 text-white focus:ring-0 focus:outline-none placeholder-slate-600 text-sm resize-none h-32"
                        placeholder={isCustomMode ? "Escreva sua própria letra, dois versos (8 linhas) para melhores resultados." : "Ex: Uma música calma de piano relaxante"}
                        value={lyrics}
                        maxLength={isCustomMode ? 3000 : 500}
                        onChange={(e) => setLyrics(e.target.value)}
                    />
                    <div className="text-right text-xs text-slate-500 mt-1">{lyrics.length}/{isCustomMode ? 3000 : 500}</div>
                </div>
            )}

            {/* Status and Errors */}
            {statusText && (
                <div className="mb-4 text-center text-sm text-[#8b5cf6] animate-pulse font-medium">
                    {statusText}
                </div>
            )}
            {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                    {error}
                </div>
            )}

            {/* Audio Results */}
            {generatedTracks && generatedTracks.length > 0 && (
                <div className="mb-6 space-y-4">
                    <h4 className="text-sm font-bold text-slate-300 border-b border-slate-700 pb-2">Músicas Geradas:</h4>
                    {generatedTracks.map((track) => (
                        <div key={track.id} className="bg-[#1a1a1d] p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-4 items-center">
                            <img src={track.imageUrl || '/default-album.png'} alt="Capa" className="w-16 h-16 rounded-lg object-cover" />
                            <div className="flex-1">
                                <h5 className="font-bold text-white text-sm">{track.title || 'Música Gerada'}</h5>
                                <p className="text-xs text-slate-400 mt-1">{track.tags}</p>
                                <audio controls src={track.audioUrl} className="w-full mt-2 h-8" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={isLoading}
                className={`w-full py-3.5 rounded-full font-medium text-sm transition-all transform active:scale-[0.98] flex items-center justify-center ${
                    isLoading
                        ? 'bg-[#8b5cf6]/50 text-slate-400 cursor-not-allowed'
                        : 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-lg shadow-[#8b5cf6]/20'
                }`}
            >
                {isLoading ? (
                    <>
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        Gerando...
                    </>
                ) : (
                    'Gerar Música'
                )}
            </button>
        </div>
    );
};
