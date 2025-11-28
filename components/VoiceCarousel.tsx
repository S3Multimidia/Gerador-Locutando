import React, { useState, useRef } from 'react';
import { Voice } from '../types';
import { PlayIcon, StopIcon, MicIcon, UserIcon, ChevronRightIcon } from './IconComponents';

interface VoiceCarouselProps {
    voices: Voice[];
    onNavigate: (page: any) => void;
}

export const VoiceCarousel: React.FC<VoiceCarouselProps> = ({ voices, onNavigate }) => {
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handlePlayDemo = (voice: Voice) => {
        if (playingVoiceId === voice.id) {
            audioRef.current?.pause();
            setPlayingVoiceId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }

            if (!voice.demoUrl) {
                alert("Esta voz não possui uma demo disponível.");
                return;
            }

            const audio = new Audio(voice.demoUrl);
            audio.onended = () => setPlayingVoiceId(null);
            audio.play().catch(e => console.error("Error playing demo:", e));
            audioRef.current = audio;
            setPlayingVoiceId(voice.id);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 350; // Approx card width + gap
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Filter only voices that have a display name
    const displayVoices = voices.filter(v => v.displayName);

    return (
        <div className="relative w-full max-w-7xl mx-auto px-4 group/carousel">
            {/* Navigation Buttons */}
            <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/50 hover:bg-indigo-600/80 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover/carousel:opacity-100 -ml-4 lg:-ml-12 border border-white/10 hover:border-indigo-400/50 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                aria-label="Anterior"
            >
                <ChevronRightIcon className="w-6 h-6 transform rotate-180" />
            </button>
            <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/50 hover:bg-indigo-600/80 text-white rounded-full backdrop-blur-sm transition-all opacity-0 group-hover/carousel:opacity-100 -mr-4 lg:-mr-12 border border-white/10 hover:border-indigo-400/50 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                aria-label="Próximo"
            >
                <ChevronRightIcon className="w-6 h-6" />
            </button>

            {/* Carousel Container */}
            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto pb-12 pt-8 px-4 snap-x snap-mandatory scrollbar-hide gap-8"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {displayVoices.map((voice) => (
                    <div
                        key={voice.id}
                        className="snap-center shrink-0 w-80 relative group"
                    >
                        {/* Futuristic Card Effect */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl opacity-30 group-hover:opacity-100 blur transition duration-500"></div>

                        <div className="relative h-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 flex flex-col">
                            {/* Image Section */}
                            <div className="h-56 w-full bg-slate-800 relative overflow-hidden">
                                {voice.imageUrl ? (
                                    <img
                                        src={voice.imageUrl}
                                        alt={voice.displayName}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-900">
                                        <UserIcon className="w-24 h-24 opacity-20" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90" />

                                {/* Badge */}
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full">
                                    <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">{voice.gender}</span>
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className="p-6 flex-1 flex flex-col -mt-12 relative z-10">
                                <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">{voice.displayName}</h3>
                                <p className="text-indigo-400 text-xs font-medium uppercase tracking-widest mb-4">{voice.language}</p>

                                <p className="text-slate-400 text-sm mb-6 line-clamp-2 flex-grow leading-relaxed">
                                    {voice.description || "Voz profissional de alta qualidade pronta para dar vida aos seus projetos de áudio."}
                                </p>

                                {/* Buttons */}
                                <div className="space-y-3 mt-auto">
                                    <button
                                        onClick={() => handlePlayDemo(voice)}
                                        className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center transition-all border ${playingVoiceId === voice.id
                                            ? 'bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20'
                                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/30'
                                            }`}
                                    >
                                        {playingVoiceId === voice.id ? (
                                            <>
                                                <StopIcon className="w-4 h-4 mr-2 animate-pulse" /> Parar Demo
                                            </>
                                        ) : (
                                            <>
                                                <PlayIcon className="w-4 h-4 mr-2" /> Ouvir Demo
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => onNavigate('login')}
                                        className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25 flex items-center justify-center transition-all transform hover:-translate-y-1 hover:shadow-indigo-500/40 border border-white/10"
                                    >
                                        <MicIcon className="w-4 h-4 mr-2" />
                                        Criar Agora
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
