import React, { useRef } from 'react';
import { TrackInfo } from '../types';
import { PlayIcon, PauseIcon, MusicIcon, UploadIcon, CheckIcon } from './IconComponents';

interface BackgroundTrackCarouselProps {
    tracks: TrackInfo[];
    selectedTrackName: string | null;
    onSelect: (trackName: string) => void;
    onUploadClick: () => void;
    isPlayingPreview: boolean;
    previewingTrackName: string | null;
    onPreview: (trackName: string) => void;
}

export const BackgroundTrackCarousel: React.FC<BackgroundTrackCarouselProps> = ({
    tracks,
    selectedTrackName,
    onSelect,
    onUploadClick,
    isPlayingPreview,
    previewingTrackName,
    onPreview
}) => {
    // Duplicate tracks to create infinite effect
    // We need a LOT of duplicates to ensure it overflows any screen size and loops smoothly.
    // Duplicating 12 times ensures we have plenty of content for the 50% translation.
    const infiniteTracks = Array(12).fill(tracks).flat();

    return (
        <div>
            {console.log("DEBUG: BackgroundTrackCarousel Rendered - VERSION NEW")}
            {/* Carousel Container */}
            <div className="relative group/carousel overflow-hidden w-full mask-linear-fade">
                {/* Gradient Masks for smooth edges */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />

                <div
                    className="flex animate-marquee hover:[animation-play-state:paused] w-max"
                    style={{ animationDuration: '80s' }}
                >
                    {infiniteTracks.map((track, index) => {
                        const isSelected = selectedTrackName === track.name;
                        const isPreviewing = previewingTrackName === track.name && isPlayingPreview;
                        const uniqueKey = `${track.name}-${index}`;

                        return (
                            <div
                                key={uniqueKey}
                                onClick={() => onSelect(track.name)}
                                className={`flex-shrink-0 w-32 h-32 mr-4 relative rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 group ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-900' : ''}`}
                            >
                                {/* Background Gradient */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${isSelected ? 'from-indigo-600 to-purple-700' : 'from-slate-800 to-slate-700'}`} />

                                {/* Pattern Overlay */}
                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '12px 12px' }} />

                                <div className="absolute inset-0 p-3 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className={`p-1.5 rounded-md ${isSelected ? 'bg-white/20' : 'bg-black/20'}`}>
                                            <MusicIcon className="w-4 h-4 text-white" />
                                        </div>
                                        {isSelected && (
                                            <div className="bg-white text-indigo-600 rounded-full p-0.5 shadow-sm">
                                                <CheckIcon className="w-2.5 h-2.5" />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h5 className="text-white font-semibold text-xs line-clamp-2 leading-tight mb-2" title={track.name}>{track.name}</h5>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onPreview(track.name); }}
                                            className="w-full py-1 rounded bg-black/30 hover:bg-white/20 text-[10px] font-medium text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                                        >
                                            {isPreviewing ? (
                                                <><PauseIcon className="w-2.5 h-2.5 mr-1" /> Pausar</>
                                            ) : (
                                                <><PlayIcon className="w-2.5 h-2.5 mr-1" /> Ouvir</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Static Options (No Track & Upload) */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-700/50 pt-4">
                {/* No Track Option */}
                <div
                    onClick={() => onSelect('none')}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all group ${selectedTrackName === 'none' ? 'border-red-500 bg-red-500/10' : 'border-slate-700 hover:border-red-500 hover:bg-red-500/5 bg-slate-800/50'}`}
                >
                    <div className={`p-2 rounded-full mr-3 transition-colors ${selectedTrackName === 'none' ? 'bg-red-500' : 'bg-slate-800 group-hover:bg-red-500'}`}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    </div>
                    <div>
                        <span className={`block text-xs font-bold transition-colors ${selectedTrackName === 'none' ? 'text-red-400' : 'text-slate-300 group-hover:text-red-300'}`}>Sem Trilha</span>
                        <span className="text-[10px] text-slate-500">Silêncio</span>
                    </div>
                    {selectedTrackName === 'none' && (
                        <div className="ml-auto bg-red-500 text-white rounded-full p-0.5">
                            <CheckIcon className="w-2.5 h-2.5" />
                        </div>
                    )}
                </div>

                {/* Custom Upload Card */}
                <div
                    onClick={onUploadClick}
                    className={`flex items-center p-3 rounded-lg border border-dashed cursor-pointer transition-all group ${selectedTrackName === 'custom' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/5 bg-slate-800/50'}`}
                >
                    <div className="p-2 rounded-full bg-slate-800 group-hover:bg-indigo-500 mr-3 transition-colors">
                        <UploadIcon className="w-4 h-4 text-slate-400 group-hover:text-white" />
                    </div>
                    <div>
                        <span className="block text-xs font-bold text-slate-300 group-hover:text-indigo-300 transition-colors">Upload Próprio</span>
                        <span className="text-[10px] text-slate-500">Seu arquivo</span>
                    </div>
                    {selectedTrackName === 'custom' && (
                        <div className="ml-auto bg-indigo-500 text-white rounded-full p-0.5">
                            <CheckIcon className="w-2.5 h-2.5" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
