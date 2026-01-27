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
    onBoost?: () => void;
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
    downloadLabel = 'Baixar',
    onBoost
}) => {
    const duration = track?.buffer.duration || 0;
    const [selection, setSelection] = React.useState<{ start: number; end: number } | null>(null);
    const [zoom, setZoom] = React.useState<number>(1);
    const [viewStart, setViewStart] = React.useState<number>(0);

    // Auto-center view when selection changes
    const handleSelectionChange = (start: number, end: number) => {
        setSelection({ start, end });
    };

    const handleZoomChange = (newZoom: number) => {
        const center = selection
            ? (selection.start + selection.end) / 2
            : (viewStart + (duration / zoom) / 2);

        // Clamp zoom
        const clampedZoom = Math.max(1, Math.min(20, newZoom));
        setZoom(clampedZoom);

        const visibleDuration = duration / clampedZoom;
        let newViewStart = center - (visibleDuration / 2);
        newViewStart = Math.max(0, Math.min(duration - visibleDuration, newViewStart));
        setViewStart(newViewStart);
    };

    // Zoom with Scroll Wheel
    const handleWheelZoom = (e: React.WheelEvent) => {
        // Prevent default scroll behavior if zooming
        // e.preventDefault(); // React synthetic events don't support preventDefault on passive listeners easily, handling in Waveform is better or here if careful

        const delta = -e.deltaY;
        const zoomFactor = 0.1;
        const newZoom = zoom + (delta > 0 ? zoomFactor * zoom : -zoomFactor * zoom);
        handleZoomChange(newZoom);
    };


    const handleCut = () => {
        if (onCut && selection) {
            onCut(selection.start, selection.end);
            setSelection(null);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-xl w-full mb-6 transition-all hover:border-slate-600">
            {/* Header / Main Controls */}
            <div className="bg-slate-800 p-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-700">
                <div className="flex items-center gap-4 min-w-[200px]">
                    {/* Play/Preview Button */}
                    {track && onPreviewToggle && (
                        <button
                            onClick={onPreviewToggle}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-lg ${isPreviewing ? 'bg-indigo-500 text-white shadow-indigo-500/30 scale-110' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'}`}
                            title={isPreviewing ? "Pausar" : "Ouvir Preview"}
                        >
                            {isPreviewing ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
                        </button>
                    )}

                    <div>
                        <h4 className="font-bold text-slate-200 text-lg truncate leading-tight" title={title}>{title}</h4>
                        {track && <div className="text-xs text-slate-500 font-mono mt-0.5">{duration.toFixed(1)}s • {track.fileName}</div>}
                    </div>
                </div>

                {track && (
                    <div className="flex items-center gap-6 flex-1 justify-end">
                        {/* Volume Control */}
                        <div className="flex items-center gap-3 bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-700/50">
                            <button onClick={onMuteToggle} className="text-slate-400 hover:text-white transition-colors p-1">
                                {isMuted ? <VolumeXIcon className="w-5 h-5" /> : <Volume2Icon className="w-5 h-5" />}
                            </button>
                            <div className="flex flex-col w-24 sm:w-32">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-600 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                                    disabled={isMuted}
                                />
                            </div>
                            <span className="text-xs font-mono text-slate-400 min-w-[2.5rem] text-right">{Math.round(volume * 100)}%</span>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex items-center gap-2">
                            {onUpload && (
                                <label className="cursor-pointer p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all" title="Trocar Arquivo">
                                    <UploadIcon className="w-5 h-5" />
                                    <input type="file" accept="audio/*" className="hidden" onChange={onUpload} />
                                </label>
                            )}

                            {onDownload && (
                                <button onClick={onDownload} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all" title="Baixar Faixa">
                                    <div className="w-5 h-5">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    </div>
                                </button>
                            )}

                            {onUndo && (
                                <button
                                    onClick={onUndo}
                                    disabled={!canUndo}
                                    className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Desfazer"
                                >
                                    <UndoIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex flex-col md:flex-row h-[320px] md:h-[280px]">
                {/* Tools Sidebar */}
                {track && (
                    <div className="w-full md:w-64 bg-slate-800/50 border-b md:border-b-0 md:border-r border-slate-700 p-4 overflow-y-auto custom-scrollbar">
                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ferramentas</h5>
                        <div className="space-y-4">

                            {/* Trim/Cut */}
                            {onTrimChange && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Cortes (Início/Fim)</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max={duration}
                                            step="0.1"
                                            value={trimStart}
                                            onChange={(e) => onTrimChange(parseFloat(e.target.value), trimEnd)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500"
                                            placeholder="Início"
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            max={duration}
                                            step="0.1"
                                            value={trimEnd}
                                            onChange={(e) => onTrimChange(trimStart, parseFloat(e.target.value))}
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-indigo-500"
                                            placeholder="Fim"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Crossfade */}
                            {onCrossfadeChange && crossfadeDuration !== undefined && (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Crossfade</span>
                                        <span className="text-indigo-400">{crossfadeDuration}s</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                        value={crossfadeDuration}
                                        onChange={(e) => onCrossfadeChange(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-slate-600 rounded cursor-pointer accent-indigo-500"
                                    />
                                </div>
                            )}

                            {/* Fades */}
                            {(onFadeInChange || onFadeOutChange) && (
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/50">
                                    {onFadeInChange && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-slate-400">
                                                <span>Fade In</span>
                                                <span className="text-indigo-400">{fadeIn}s</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="5"
                                                step="0.1"
                                                value={fadeIn}
                                                onChange={(e) => onFadeInChange(parseFloat(e.target.value))}
                                                className="w-full h-1 bg-slate-600 rounded cursor-pointer accent-indigo-500"
                                            />
                                        </div>
                                    )}
                                    {onFadeOutChange && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-slate-400">
                                                <span>Fade Out</span>
                                                <span className="text-indigo-400">{fadeOut}s</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="5"
                                                step="0.1"
                                                value={fadeOut}
                                                onChange={(e) => onFadeOutChange(parseFloat(e.target.value))}
                                                className="w-full h-1 bg-slate-600 rounded cursor-pointer accent-indigo-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Quick Actions */}
                            <div className="pt-2 border-t border-slate-700/50 grid grid-cols-2 gap-2">
                                {onSilenceRemovalToggle && (
                                    <button
                                        onClick={onSilenceRemovalToggle}
                                        className={`col-span-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSilenceRemovalActive ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' : 'bg-slate-700/50 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'}`}
                                    >
                                        Remover Silêncio
                                    </button>
                                )}

                                {onCut && (
                                    <button
                                        onClick={handleCut}
                                        disabled={!selection}
                                        className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                    >
                                        <ScissorsIcon className="w-3 h-3" /> Cortar
                                    </button>
                                )}

                                {onBoost && (
                                    <button
                                        onClick={onBoost}
                                        className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                                    >
                                        Boost +10%
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Waveform Area */}
                <div
                    className="flex-1 relative bg-slate-900 group"
                    onWheel={track ? handleWheelZoom : undefined} // Add scroll zoom
                >
                    {track ? (
                        <>
                            <div className="absolute inset-0 z-0">
                                {/* Grid lines can go here */}
                            </div>
                            <div className="relative w-full h-full z-10 p-4">
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

                                {/* Overlay Stats */}
                                <div className="absolute top-2 right-2 flex flex-col items-end pointer-events-none">
                                    <div className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono mb-1">
                                        Zoom: {zoom.toFixed(1)}x
                                    </div>
                                    {playheadPosition !== undefined && (
                                        <div className="bg-indigo-600/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white font-mono shadow-lg">
                                            {playheadPosition.toFixed(2)}s
                                        </div>
                                    )}
                                </div>

                                {/* Selection Tooltip */}
                                {selection && (
                                    <div className="absolute top-2 left-2 bg-indigo-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-indigo-500/30 shadow-xl pointer-events-none animate-fade-in">
                                        <span className="text-xs text-indigo-100 font-mono">
                                            Seleção: {(selection.end - selection.start).toFixed(2)}s
                                        </span>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/20 border-2 border-dashed border-slate-700/50 m-4 rounded-xl">
                            {onUpload && (
                                <label className="flex flex-col items-center cursor-pointer group p-8">
                                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-600 transition-all duration-300">
                                        <UploadIcon className="w-8 h-8 text-slate-500 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-slate-400 font-bold group-hover:text-white transition-colors">{uploadLabel}</span>
                                    <span className="text-xs text-slate-600 mt-2">MP3, WAV (Max 10MB)</span>
                                    <input type="file" accept="audio/*" className="hidden" onChange={onUpload} />
                                </label>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
