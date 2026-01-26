import React from 'react';
import { Volume2Icon, VolumeXIcon, ScissorsIcon, MoveHorizontalIcon, PlayIcon, PauseIcon, UndoIcon, UploadIcon } from './IconComponents';
import { Waveform } from './Waveform';

interface Track {
    buffer: AudioBuffer;
    fileName: string;
}

interface TrackChannelProps {
    title: string;
    track: Track | null;
    volume: number;
    isMuted: boolean;
    trimStart?: number;
    trimEnd?: number;
    crossfadeDuration?: number;
    onVolumeChange: (v: number) => void;
    onMuteToggle: () => void;
    onTrimChange?: (start: number, end: number) => void;
    onCrossfadeChange?: (duration: number) => void;
    color?: string;
    onPreviewToggle?: () => void;
    isPreviewing?: boolean;
    onCut?: (start: number, end: number) => void;
    onSilenceRemovalToggle?: () => void;
    isSilenceRemovalActive?: boolean;
    fadeIn?: number;
    fadeOut?: number;
    onFadeInChange?: (value: number) => void;
    onFadeOutChange?: (value: number) => void;
    markers?: { time: number; color: string; label?: string }[];
    playheadPosition?: number;
    isPlaying?: boolean;
    onSeek?: (position: number) => void;
    playbackRate?: number;
    onPlaybackRateChange?: (rate: number) => void;
    onUndo?: () => void;
    canUndo?: boolean;
    onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploadLabel?: string;
    silenceThreshold?: number;
    onSilenceThresholdChange?: (value: number) => void;
    onDownload?: () => void;
    downloadLabel?: string;
}

export const TrackChannel: React.FC<TrackChannelProps> = ({
    title,
    track,
    volume,
    isMuted,
    trimStart = 0,
    trimEnd = 0,
    crossfadeDuration,
    onVolumeChange,
    onMuteToggle,
    onTrimChange,
    onCrossfadeChange,
    color = '#6366f1',
    onPreviewToggle,
    isPreviewing = false,
    onCut,
    onSilenceRemovalToggle,
    isSilenceRemovalActive = false,
    fadeIn = 0,
    fadeOut = 0,
    onFadeInChange,
    onFadeOutChange,
    markers = [],
    playheadPosition,
    isPlaying,
    onSeek,
    playbackRate,
    onPlaybackRateChange,
    onUndo,
    canUndo = false,
    onUpload,
    uploadLabel = 'Carregar Arquivo',
    silenceThreshold = 0.5,
    onSilenceThresholdChange,
    onDownload,
    downloadLabel = 'Baixar'
}) => {
    const duration = track?.buffer.duration || 0;
    const [selection, setSelection] = React.useState<{ start: number; end: number } | null>(null);
    const [zoom, setZoom] = React.useState<number>(1);
    const [viewStart, setViewStart] = React.useState<number>(0);

    // Auto-center view when selection changes
    const handleSelectionChange = (start: number, end: number) => {
        setSelection({ start, end });

        // Optional: Auto-scroll to keep selection in view if it's out of bounds
        // Or center it if it's a new selection interaction
        // For now, let's just update selection. 
        // If we want auto-follow behavior:
        /*
        const center = (start + end) / 2;
        const visibleDuration = duration / zoom;
        let newViewStart = center - (visibleDuration / 2);
        newViewStart = Math.max(0, Math.min(duration - visibleDuration, newViewStart));
        setViewStart(newViewStart);
        */
    };

    const handleZoomChange = (newZoom: number) => {
        const center = selection
            ? (selection.start + selection.end) / 2
            : (viewStart + (duration / zoom) / 2);

        setZoom(newZoom);

        const visibleDuration = duration / newZoom;
        let newViewStart = center - (visibleDuration / 2);
        newViewStart = Math.max(0, Math.min(duration - visibleDuration, newViewStart));
        setViewStart(newViewStart);
    };

    const handleCut = () => {
        if (onCut && selection) {
            onCut(selection.start, selection.end);
            setSelection(null);
        }
    };

    return (
        <div className="flex flex-col md:flex-row bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow w-full">
            {/* Left Panel: Controls */}
            <div className="w-full md:w-64 bg-slate-50 p-3 md:p-4 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col gap-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-700 truncate" title={title}>{title}</h4>
                    {track && onPreviewToggle && (
                        <button
                            onClick={onPreviewToggle}
                            className={`p-1.5 rounded-full transition-colors ${isPreviewing ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-slate-200 text-slate-500 hover:text-indigo-500'}`}
                        >
                            {isPreviewing ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                        </button>
                    )}
                </div>

                {track ? (
                    <>
                        {/* Volume Control */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>Volume</span>
                                <span>{Math.round(volume * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={onMuteToggle} className="text-slate-400 hover:text-slate-600">
                                    {isMuted ? <VolumeXIcon className="w-4 h-4" /> : <Volume2Icon className="w-4 h-4" />}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                    className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    disabled={isMuted}
                                />
                            </div>
                        </div>

                        {/* Playback Rate Control */}
                        {onPlaybackRateChange && playbackRate !== undefined && (
                            <div className="space-y-1 pt-2 border-t border-slate-200">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>Velocidade</span>
                                    <span>{playbackRate.toFixed(2)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.05"
                                    value={playbackRate}
                                    onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                        )}

                        {/* Trim Controls */}
                        {onTrimChange && (
                            <div className="space-y-2 pt-2 border-t border-slate-200">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                    <ScissorsIcon className="w-3 h-3" />
                                    <span>Cortar (segundos)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-0.5">Início</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={duration - trimEnd}
                                            step="0.1"
                                            value={trimStart}
                                            onChange={(e) => onTrimChange(parseFloat(e.target.value), trimEnd)}
                                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-0.5">Fim (corte)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={duration - trimStart}
                                            step="0.1"
                                            value={trimEnd}
                                            onChange={(e) => onTrimChange(trimStart, parseFloat(e.target.value))}
                                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Crossfade Control */}
                        {onCrossfadeChange && crossfadeDuration !== undefined && (
                            <div className="space-y-2 pt-2 border-t border-slate-200">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <MoveHorizontalIcon className="w-3 h-3" />
                                        <span>Crossfade</span>
                                    </div>
                                    <span className="font-mono bg-slate-100 px-1 rounded">{crossfadeDuration}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="5"
                                    step="0.1"
                                    value={crossfadeDuration}
                                    onChange={(e) => onCrossfadeChange(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                        )}

                        {/* Fade Controls (Sliders) */}
                        {(onFadeInChange || onFadeOutChange) && (
                            <div className="space-y-2 pt-2 border-t border-slate-200">
                                <div className="grid grid-cols-2 gap-2">
                                    {onFadeInChange && (
                                        <div>
                                            <label className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                                <span>Fade In</span>
                                                <span>{fadeIn}s</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="5"
                                                step="0.1"
                                                value={fadeIn}
                                                onChange={(e) => onFadeInChange(parseFloat(e.target.value))}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                            />
                                        </div>
                                    )}
                                    {onFadeOutChange && (
                                        <div>
                                            <label className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                                <span>Fade Out</span>
                                                <span>{fadeOut}s</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="5"
                                                step="0.1"
                                                value={fadeOut}
                                                onChange={(e) => onFadeOutChange(parseFloat(e.target.value))}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Edit Controls (Cut & Silence) */}
                        <div className="pt-2 border-t border-slate-200 flex gap-2">
                            {onCut && (
                                <button
                                    onClick={handleCut}
                                    disabled={!selection}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Selecione um trecho na waveform para cortar"
                                >
                                    <ScissorsIcon className="w-3 h-3" />
                                    Cortar
                                </button>
                            )}
                            {onSilenceRemovalToggle && (
                                <button
                                    onClick={onSilenceRemovalToggle}
                                    className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-colors ${isSilenceRemovalActive ? 'bg-indigo-100 text-indigo-600 border border-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    Remover Silêncio
                                </button>
                            )}
                            {onUndo && (
                                <button
                                    onClick={onUndo}
                                    disabled={!canUndo}
                                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Desfazer última edição"
                                >
                                    <UndoIcon className="w-3 h-3" />
                                    Desfazer
                                </button>
                            )}
                            {onDownload && (
                                <button
                                    onClick={onDownload}
                                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-xs font-bold transition-colors"
                                    title={downloadLabel}
                                >
                                    <div className="w-3 h-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    </div>
                                    {downloadLabel}
                                </button>
                            )}
                        </div>

                        {/* Silence Intensity Slider (Conditional) */}
                        {isSilenceRemovalActive && onSilenceRemovalToggle && onSilenceThresholdChange && (
                            <div className="pt-2 border-t border-slate-200 animate-fade-in">
                                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                                    <span>Intensidade (Threshold)</span>
                                    <span className="font-mono text-indigo-500">{Math.round(silenceThreshold * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={silenceThreshold}
                                    onChange={(e) => onSilenceThresholdChange(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    title="Ajuste a sensibilidade da remoção de silêncio"
                                />
                                <p className="text-[9px] text-slate-400 mt-0.5">Quanto maior, mais agressiva a remoção.</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                        {onUpload ? (
                            <label className="cursor-pointer">
                                <div className="flex flex-col items-center justify-center px-6 py-4 border-2 border-dashed border-slate-600 rounded-xl hover:border-indigo-500 hover:bg-slate-800/50 transition-all group">
                                    <UploadIcon className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 mb-2 transition-colors" />
                                    <span className="text-sm font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">{uploadLabel}</span>
                                    <span className="text-xs text-slate-600 mt-1">Clique para selecionar</span>
                                </div>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    className="hidden"
                                    onChange={onUpload}
                                />
                            </label>
                        ) : (
                            <div className="text-xs text-slate-400 italic">
                                Nenhuma faixa carregada
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right Panel: Waveform */}
            <div className="flex-1 relative bg-slate-900 min-h-[200px] p-4 flex flex-col items-center justify-center overflow-hidden group">
                {track ? (
                    <div className="w-full h-full relative flex flex-col">
                        <div className="flex-1 relative">
                            <Waveform
                                buffer={track.buffer}
                                color={color}
                                selection={selection}
                                onSelectionChange={handleSelectionChange}
                                markers={markers}
                                playheadPosition={playheadPosition}
                                isPlaying={isPlaying}
                                onSeek={onSeek}
                                zoom={zoom}
                                viewStart={viewStart}
                                amplitudeScale={volume}
                            />
                            {playheadPosition !== undefined && (
                                <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white font-mono pointer-events-none">
                                    {playheadPosition.toFixed(2)}s / {duration.toFixed(2)}s
                                </div>
                            )}
                        </div>

                        {/* Zoom Control */}
                        <div className="h-8 flex items-center gap-2 px-2 mt-2 bg-slate-800/50 rounded-lg w-full max-w-xs mx-auto">
                            <span className="text-[10px] text-slate-400 font-bold">ZOOM</span>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                step="0.1"
                                value={zoom}
                                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                                className="flex-1 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <span className="text-[10px] text-indigo-400 font-mono w-8 text-right">{zoom.toFixed(1)}x</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-500 text-sm italic">
                        Área de Visualização (Waveform)
                    </div>
                )}
            </div>
        </div>
    );
};
