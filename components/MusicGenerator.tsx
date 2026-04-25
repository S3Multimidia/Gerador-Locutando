import React, { useState } from 'react';

interface MusicGeneratorProps {
    onGenerate?: (data: { title: string; style: string; lyrics: string; isInstrumental: boolean; version: string; isCustom: boolean }) => void;
    isLoading?: boolean;
}

export const MusicGenerator: React.FC<MusicGeneratorProps> = ({ onGenerate, isLoading = false }) => {
    const [isCustomMode, setIsCustomMode] = useState(true);
    const [version, setVersion] = useState('V3.5');
    const [title, setTitle] = useState('');
    const [style, setStyle] = useState('');
    const [isInstrumental, setIsInstrumental] = useState(false);
    const [lyrics, setLyrics] = useState('');

    const handleGenerate = () => {
        if (onGenerate) {
            onGenerate({ title, style, lyrics, isInstrumental, version, isCustom: isCustomMode });
        } else {
            alert('A geração de música será conectada à API em breve! Configure sua API Key no painel Admin.');
        }
    };

    return (
        <div className="bg-[#111113] p-6 rounded-2xl border border-slate-800/50 max-w-2xl mx-auto text-slate-200 font-sans">
            
            {/* Top Tabs (Mocked visual only for context if needed, but we focus on the form) */}
            <div className="flex bg-[#1a1a1d] rounded-full p-1 mb-6">
                <button className="flex-1 bg-[#8b5cf6] text-white py-2 rounded-full font-medium text-sm transition-all shadow-lg">
                    Geração de Música
                </button>
                <button className="flex-1 text-slate-400 py-2 rounded-full font-medium text-sm hover:text-slate-200 transition-all">
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
                    <option value="V4">V4</option>
                    <option value="V3.5">V3.5</option>
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

            {/* Lyrics */}
            {!isInstrumental && (
                <div className="mb-6 bg-[#1a1a1d] p-4 rounded-xl border border-slate-800/50">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Letras</label>
                    <textarea
                        className="w-full bg-transparent border-none p-0 text-white focus:ring-0 focus:outline-none placeholder-slate-600 text-sm resize-none h-32"
                        placeholder="Escreva sua própria letra, dois versos (8 linhas) para melhores resultados."
                        value={lyrics}
                        maxLength={3000}
                        onChange={(e) => setLyrics(e.target.value)}
                    />
                    <div className="text-right text-xs text-slate-500 mt-1">{lyrics.length}/3000</div>
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
