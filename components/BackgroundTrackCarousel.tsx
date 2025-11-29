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
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 200;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div>
            {/* Carousel Container */}
            <div className="relative group/carousel">
                {/* Scroll Buttons */}
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-900/80 text-white rounded-full shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0 hover:bg-slate-800"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-900/80 text-white rounded-full shadow-lg opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0 hover:bg-slate-800"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>

                <div
                    ref={scrollContainerRef}
                    className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory px-1"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {tracks.map((track) => {
                        const isSelected = selectedTrackName === track.name;
                        const isPreviewing = previewingTrackName === track.name && isPlayingPreview;

                        return (
                            <div
                                key={track.name}
                                onClick={() => onSelect(track.name)}
                                className={`flex-shrink-0 w-40 h-40 relative rounded-xl overflow-hidden cursor-pointer transition-all snap-start group ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : 'hover:scale-105'}`}
                            >
                                {/* Background Gradient */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${isSelected ? 'from-indigo-600 to-purple-700' : 'from-slate-800 to-slate-700'}`} />

                                {/* Pattern Overlay */}
                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '16px 16px' }} />

                                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-black/20'}`}>
                                            <MusicIcon className="w-5 h-5 text-white" />
                                        </div>
                                        {isSelected && (
                                            <div className="bg-white text-indigo-600 rounded-full p-1 shadow-sm">
                                                <CheckIcon className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h5 className="text-white font-bold text-sm line-clamp-2 leading-tight mb-2">{track.name}</h5>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onPreview(track.name); }}
                                            className="w-full py-1.5 rounded-lg bg-black/30 hover:bg-white/20 text-xs font-medium text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                                        >
                                            {isPreviewing ? (
                                                <><PauseIcon className="w-3 h-3 mr-1.5" /> Pausar</>
                                            ) : (
                                                <><PlayIcon className="w-3 h-3 mr-1.5" /> Ouvir</>
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
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-700/50 pt-6">
                {/* No Track Option */}
                <div
                    onClick={() => onSelect('none')}
                    className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all group ${selectedTrackName === 'none' ? 'border-red-500 bg-red-500/10' : 'border-slate-700 hover:border-red-500 hover:bg-red-500/5 bg-slate-800/50'}`}
                >
                    <div className={`p-3 rounded-full mr-4 transition-colors ${selectedTrackName === 'none' ? 'bg-red-500' : 'bg-slate-800 group-hover:bg-red-500'}`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    </div>
                    <div>
                        <span className={`block text-sm font-bold transition-colors ${selectedTrackName === 'none' ? 'text-red-400' : 'text-slate-300 group-hover:text-red-300'}`}>Sem Trilha</span>
                        <span className="text-xs text-slate-500">Não utilizar música de fundo</span>
                    </div>
                    {selectedTrackName === 'none' && (
                        <div className="ml-auto bg-red-500 text-white rounded-full p-1">
                            <CheckIcon className="w-3 h-3" />
                        </div>
                    )}
                </div>

                {/* Custom Upload Card */}
                <div
                    onClick={onUploadClick}
                    className={`flex items-center p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all group ${selectedTrackName === 'custom' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/5 bg-slate-800/50'}`}
                >
                    <div className="p-3 rounded-full bg-slate-800 group-hover:bg-indigo-500 mr-4 transition-colors">
                        <UploadIcon className="w-5 h-5 text-slate-400 group-hover:text-white" />
                    </div>
                    <div>
                        <span className="block text-sm font-bold text-slate-300 group-hover:text-indigo-300 transition-colors">Upload Próprio</span>
                        <span className="text-xs text-slate-500">Carregar arquivo de áudio</span>
                    </div>
                    {selectedTrackName === 'custom' && (
                        <div className="ml-auto bg-indigo-500 text-white rounded-full p-1">
                            <CheckIcon className="w-3 h-3" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
