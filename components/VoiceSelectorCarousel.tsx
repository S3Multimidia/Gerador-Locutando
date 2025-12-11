import React, { useState, useRef, useEffect, memo } from 'react';
import type { Voice } from '../types';
import { PlayIcon, PauseIcon, CheckIcon } from './IconComponents';

interface VoiceSelectorCarouselProps {
    availableVoices: Voice[];
    selectedVoice: Voice | null;
    setSelectedVoice: (voice: Voice) => void;
}

export const VoiceSelectorCarousel = memo<VoiceSelectorCarouselProps>(({
    availableVoices,
    selectedVoice,
    setSelectedVoice
}) => {
    const [playingDemoId, setPlayingDemoId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [voiceCarouselIndex, setVoiceCarouselIndex] = useState<number>(0);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio();
            audioRef.current = audio;
            const handlePlaybackEnded = () => setPlayingDemoId(null);
            audio.addEventListener('ended', handlePlaybackEnded);
            return () => {
                audio.removeEventListener('ended', handlePlaybackEnded);
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.src = '';
                }
            };
        }
    }, []);

    useEffect(() => {
        if (!selectedVoice && availableVoices.length > 0) {
            setSelectedVoice(availableVoices[0]);
            setVoiceCarouselIndex(0);
        } else if (selectedVoice) {
            const idx = availableVoices.findIndex(v => v.id === selectedVoice.id);
            if (idx >= 0) setVoiceCarouselIndex(idx);
        }
    }, [selectedVoice, availableVoices, setSelectedVoice]);

    const handlePreview = (voice: Voice) => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playingDemoId === voice.id) {
            audio.pause();
            setPlayingDemoId(null);
            return;
        }
        audio.src = voice.demoUrl;
        const playPromise = audio.play();
        setPlayingDemoId(voice.id);
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                if (error.name !== 'AbortError') console.error("Error playing audio:", error);
                if (audio.src === voice.demoUrl) setPlayingDemoId(null);
            });
        }
    };

    return (
        <div className="relative">
            {availableVoices.length > 0 ? (
                <div className="relative flex items-center justify-center">
                    <button
                        onClick={() => {
                            const newIndex = (voiceCarouselIndex - 1 + availableVoices.length) % availableVoices.length;
                            setVoiceCarouselIndex(newIndex);
                            setSelectedVoice(availableVoices[newIndex]);
                        }}
                        className="absolute -left-4 z-20 p-3 bg-slate-800 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 border border-slate-700 shadow-lg transition-all hover:scale-110"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <button
                        onClick={() => {
                            const newIndex = (voiceCarouselIndex + 1) % availableVoices.length;
                            setVoiceCarouselIndex(newIndex);
                            setSelectedVoice(availableVoices[newIndex]);
                        }}
                        className="absolute -right-4 z-20 p-3 bg-slate-800 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 border border-slate-700 shadow-lg transition-all hover:scale-110"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </button>

                    <div className="w-full overflow-hidden px-2 py-4">
                        {(() => {
                            const voice = availableVoices[voiceCarouselIndex];
                            if (!voice) return null;
                            const isSelected = selectedVoice?.id === voice.id;
                            return (
                                <div key={voice.id} className={`relative w-full mx-auto max-w-sm rounded-2xl shadow-2xl transition-all duration-500 ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900 scale-105' : 'scale-100'}`}>
                                    <div className="relative h-64 rounded-2xl overflow-hidden group cursor-pointer" onClick={() => setSelectedVoice(voice)}>
                                        <div
                                            style={{ backgroundImage: `url(${voice.imageUrl})` }}
                                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90" />

                                        <div className="absolute bottom-0 left-0 right-0 p-6">
                                            <div className="flex items-end justify-between mb-2">
                                                <div>
                                                    <h4 className="font-bold text-2xl text-white mb-1">{voice.displayName}</h4>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Premium</span>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-700 text-slate-300 border border-slate-600">PT-BR</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePreview(voice); }}
                                                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-indigo-500 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                                                >
                                                    {playingDemoId === voice.id ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
                                                </button>
                                            </div>
                                            <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed mt-2">
                                                {voice.description}
                                            </p>
                                        </div>

                                        {isSelected && (
                                            <div className="absolute top-4 right-4 bg-indigo-500 text-white rounded-full p-2 shadow-lg shadow-indigo-500/40 animate-bounce-small">
                                                <CheckIcon className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            ) : (
                <div className="text-center w-full py-12 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-700">
                    <p className="text-slate-400 font-medium">Nenhuma voz disponível.</p>
                </div>
            )}
        </div>
    );
});
