import React, { useState, useCallback } from 'react';
import { Upload, Music, Play, Check, AlertCircle, Clock, Volume2 } from 'lucide-react';

interface StorefrontGeneratorProps {
    onGenerate: (data: FormData) => Promise<void>;
    isLoading: boolean;
}

const GENRES = [
    { id: 'forro', label: 'Forró' },
    { id: 'sertanejo', label: 'Sertanejo' },
    { id: 'pop', label: 'Pop' },
    { id: 'eletronica', label: 'Eletrônica' },
    { id: 'gospel', label: 'Gospel' },
    { id: 'rock', label: 'Rock' },
    { id: 'infantil', label: 'Infantil' },
    { id: 'instrumental', label: 'Instrumental' },
] as const;

export const StorefrontGenerator: React.FC<StorefrontGeneratorProps> = ({ onGenerate, isLoading }) => {
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenreToggle = (genreId: string) => {
        setSelectedGenres(prev =>
            prev.includes(genreId)
                ? prev.filter(id => id !== genreId)
                : [...prev, genreId]
        );
    };

    const handleFiles = (files: FileList) => {
        const audioFiles = Array.from(files).filter(file =>
            file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav')
        );

        if (audioFiles.length > 10) {
            setError('Máximo de 10 arquivos permitidos.');
            return;
        }

        setUploadedFiles(audioFiles);
        setError(null);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    }, []);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleSubmit = async () => {
        if (selectedGenres.length === 0) {
            setError('Selecione pelo menos um gênero musical.');
            return;
        }
        if (uploadedFiles.length === 0) {
            setError('Faça upload de pelo menos uma locução (OFF).');
            return;
        }

        const formData = new FormData();
        selectedGenres.forEach(genre => formData.append('genres', genre));
        uploadedFiles.forEach(file => formData.append('offs', file));

        try {
            await onGenerate(formData);
        } catch (err) {
            setError('Erro ao iniciar geração. Tente novamente.');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Music className="w-5 h-5 mr-2 text-indigo-400" />
                    1. Selecione os Gêneros Musicais
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {GENRES.map((genre) => (
                        <button
                            key={genre.id}
                            onClick={() => handleGenreToggle(genre.id)}
                            className={`
                                relative p-3 rounded-lg border text-left transition-all
                                ${selectedGenres.includes(genre.id)
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-800/80'}
                            `}
                        >
                            <span className="block text-sm font-medium">{genre.label}</span>
                            {selectedGenres.includes(genre.id) && (
                                <div className="absolute top-2 right-2">
                                    <Check className="w-3 h-3 text-indigo-400" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Upload className="w-5 h-5 mr-2 text-indigo-400" />
                    2. Upload de Locuções (OFFs)
                </h3>

                <div
                    className={`
                        border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                        ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'}
                    `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        multiple
                        accept="audio/*,.mp3,.wav"
                        className="hidden"
                        id="off-upload"
                        onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    />
                    <label htmlFor="off-upload" className="cursor-pointer">
                        <Upload className="w-10 h-10 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-300 font-medium mb-1">
                            Clique para selecionar ou arraste seus arquivos
                        </p>
                        <p className="text-slate-500 text-sm">
                            MP3 ou WAV (Máx. 10 arquivos)
                        </p>
                    </label>
                </div>

                {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {uploadedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-800 p-2 rounded text-sm text-slate-300">
                                <span className="truncate flex-1">{file.name}</span>
                                <span className="text-slate-500 text-xs ml-2">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Volume2 className="w-5 h-5 mr-2 text-indigo-400" />
                    Resumo do Motor de Áudio
                </h3>
                <ul className="space-y-3 text-sm text-slate-400">
                    <li className="flex items-start">
                        <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                        <span>Playlist com <strong>30 músicas</strong> distribuídas entre os gêneros.</span>
                    </li>
                    <li className="flex items-start">
                        <Clock className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                        <span>Locução inserida a cada <strong>90 segundos</strong>.</span>
                    </li>
                    <li className="flex items-start">
                        <Volume2 className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                        <span>Ducking automático (redução música) nos momentos de fala.</span>
                    </li>
                </ul>
            </div>

            {error && (
                <div className="p-4 bg-red-900/30 text-red-200 border-l-4 border-red-500 rounded-r-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={isLoading}
                className={`
                    w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center
                    ${isLoading
                        ? 'bg-indigo-900/50 text-indigo-300 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02]'}
                `}
            >
                {isLoading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Processando Áudio (Motor Turbo)...
                    </>
                ) : (
                    <>
                        <Play className="w-5 h-5 mr-3 fill-current" />
                        Gerar Áudio Porta de Loja
                    </>
                )}
            </button>
        </div>
    );
};
