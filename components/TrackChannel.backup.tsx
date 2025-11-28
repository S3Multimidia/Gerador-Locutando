import React from 'react';
import { Volume2Icon, VolumeXIcon, ScissorsIcon, MoveHorizontalIcon, PlayIcon, PauseIcon, UndoIcon } from './IconComponents';
import { Waveform } from './Waveform';

interface Track {
    buffer: AudioBuffer;
    onSeek,
    playbackRate,
    onPlaybackRateChange,
    onUndo,
    canUndo = false
}) => {
    const duration = track?.buffer.duration || 0;
    const [selection, setSelection] = React.useState<{ start: number; end: number } | null>(null);

    const handleSelectionChange = (start: number, end: number) => {
        setSelection({ start, end });
    };

    const handleCut = () => {
        if (onCut && selection) {
            onCut(selection.start, selection.end);
            setSelection(null); // Clear selection after cut
        }
    };

    return (
        <div className="flex flex-col md:flex-row bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Left Panel: Controls */}
            <div className="w-full md:w-64 bg-slate-50 p-4 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col gap-4 flex-shrink-0">
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
                                    disabled={!selection || Math.abs(selection.end - selection.start) < 0.1}
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
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic">
                        Nenhuma faixa carregada
                    </div>
                )}
            </div>

            {/* Right Panel: Waveform */}
            <div className="flex-1 relative bg-slate-900 min-h-[200px] p-4 flex items-center justify-center overflow-hidden group">
                {track ? (
                    <div className="w-full h-full relative">
                        <Waveform
                            buffer={track.buffer}
                            color={color}
                            selection={selection}
                            onSelectionChange={handleSelectionChange}
                            markers={markers}
                            playheadPosition={playheadPosition}
                            isPlaying={isPlaying}
                            onSeek={onSeek}
                        />

                        {/* Visual indicators for trim */}
                        {(trimStart > 0 || trimEnd > 0) && (
                            <>
                                <div
                                    className="absolute top-0 left-0 bottom-0 bg-black/50 border-r border-red-500 z-10 pointer-events-none"
                                    style={{ width: `${(trimStart / duration) * 100}%` }}
                                />
                                <div
                                    className="absolute top-0 right-0 bottom-0 bg-black/50 border-l border-red-500 z-10 pointer-events-none"
                                    style={{ width: `${(trimEnd / duration) * 100}%` }}
                                />
                            </>
                        )}

                        <div className="absolute bottom-1 right-2 text-[10px] text-slate-400 font-mono bg-black/30 px-1 rounded">
                            {playheadPosition !== undefined ? (
                                <>
                                    <span className="text-indigo-400">
                                        {Math.floor((playheadPosition * duration) / 60)}:{Math.floor((playheadPosition * duration) % 60).toString().padStart(2, '0')}
                                    </span>
                                    <span className="mx-1">/</span>
                                </>
                            ) : null}
                            {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-600 text-sm font-medium">
                        Área de Visualização (Waveform)
                    </div>
                )}
            </div>
        </div>
    );
};
