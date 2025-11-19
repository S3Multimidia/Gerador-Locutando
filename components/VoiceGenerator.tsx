

import React, { useState, useRef, useEffect } from 'react';
import type { Voice } from '../types';
import { PlayIcon, LoadingSpinner, CheckIcon, PauseIcon } from './IconComponents';
import type { IntonationStyle } from '../App';

interface VoiceGeneratorProps {
  text: string;
  setText: (text: string) => void;
  availableVoices: Voice[];
  selectedVoice: Voice;
  setSelectedVoice: (voice: Voice) => void;
  intonationStyle: IntonationStyle;
  setIntonationStyle: (style: IntonationStyle) => void;
  isLoading: boolean;
  isTurboLoading: boolean;
  onGenerateExpert: (textToUse: string) => void;
  onGenerateTurbo: (textToUse: string) => void;
  ttsModel: string;
}

const MAX_CHARS = 2000;

export const VoiceGenerator: React.FC<VoiceGeneratorProps> = ({
  text,
  setText,
  availableVoices,
  selectedVoice,
  setSelectedVoice,
  intonationStyle,
  setIntonationStyle,
  isLoading,
  isTurboLoading,
  onGenerateExpert,
  onGenerateTurbo,
}) => {
  const [playingDemoId, setPlayingDemoId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_CHARS) {
      setText(e.target.value);
    }
  };
  
  const anyLoading = isLoading || isTurboLoading;

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-2">
          Texto para narrar
        </label>
        <div className="relative">
          <textarea
            id="text-input"
            rows={6}
            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition duration-150 ease-in-out focus:border-red-500 focus:ring-2 focus:ring-red-200"
            value={text}
            onChange={handleTextChange}
            placeholder="Digite seu texto aqui..."
            aria-label="Texto para narrar"
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-500">
            {text.length} / {MAX_CHARS}
          </div>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Voz</label>
        <div className="flex space-x-4 overflow-x-auto pb-4 -mb-4">
          {availableVoices.length > 0 ? (
            availableVoices.map((voice) => {
             const isSelected = selectedVoice?.id === voice.id;
             return (
                <div key={voice.id} className={`relative flex-shrink-0 w-48 bg-gray-800 rounded-xl shadow-lg border-2 transition-all ${isSelected ? 'border-red-500' : 'border-transparent'}`}>
                  <div style={{ backgroundImage: `url(${voice.imageUrl})` }} aria-label={voice.displayName} className="w-full h-48 bg-cover bg-center rounded-t-lg" />
                  {isSelected && (<div className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5"><CheckIcon className="w-4 h-4" /></div>)}
                  <div className="p-4 text-white">
                      <h4 className="font-bold text-lg">{voice.displayName}</h4>
                      <p className="text-xs text-gray-400 mt-1 h-16">{voice.description}</p>
                      <div className="mt-4 space-y-2">
                          <button onClick={() => handlePreview(voice)} disabled={anyLoading} className="w-full flex items-center justify-center p-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold rounded-md transition disabled:opacity-50">
                           {playingDemoId === voice.id ? <PauseIcon className="w-4 h-4 mr-2" /> : <PlayIcon className="w-4 h-4 mr-2" />}
                            Ouvir
                          </button>
                           <button onClick={() => setSelectedVoice(voice)} disabled={anyLoading} className="w-full p-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-md transition disabled:opacity-50">
                            Usar essa voz
                          </button>
                      </div>
                  </div>
                </div>
             )
          })
          ) : (
             <div className="text-center w-full py-8 bg-gray-50 rounded-lg border border-dashed">
                <p className="text-gray-600">Nenhuma voz de IA disponível.</p>
                <p className="text-sm text-gray-500 mt-1">Um administrador precisa adicionar vozes no painel.</p>
            </div>
          )}
        </div>
      </div>
      
      <div>
        <label htmlFor="intonation-select" className="block text-sm font-medium text-gray-700 mb-2">Estilo de Entonação</label>
        <select id="intonation-select" className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition duration-150 ease-in-out focus:border-red-500 focus:ring-2 focus:ring-red-200" value={intonationStyle} onChange={(e) => setIntonationStyle(e.target.value as IntonationStyle)} aria-label="Selecionar estilo de entonação">
          <option value="auto">Automática (baseada na pontuação)</option>
          <option value="retail">Ofertas Varejo (voz de promoção)</option>
        </select>
         <p className="text-xs text-gray-500 mt-2">A opção "Ofertas Varejo" cria uma voz animada, ideal para anúncios e promoções.</p>
      </div>

      <div className="pt-4 border-t border-gray-200">
         <p className="text-center text-sm font-medium text-gray-700 mb-3">Escolha como finalizar sua locução:</p>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => onGenerateExpert(text)} disabled={anyLoading || !text.trim() || !selectedVoice} className="w-full flex items-center justify-center p-4 bg-gray-800 text-white font-bold rounded-lg shadow-md hover:bg-gray-900 transition-all duration-200 ease-in-out transform hover:scale-[1.02] focus-ring focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                {isLoading ? (
                    <><LoadingSpinner className="w-5 h-5 mr-3" />Gerando...</>
                ) : (
                    "Modo Experto"
                )}
            </button>
            <button onClick={() => onGenerateTurbo(text)} disabled={anyLoading || !text.trim() || !selectedVoice} className="w-full flex items-center justify-center p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-lg shadow-md hover:opacity-90 transition-all duration-200 ease-in-out transform hover:scale-[1.02] focus-ring focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                {isTurboLoading ? (
                    <><LoadingSpinner className="w-5 h-5 mr-3" />Gerando...</>
                ) : (
                    "Modo Turbo"
                )}
            </button>
         </div>
         <div className="text-xs text-gray-500 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            <p><span className="font-semibold">Modo Experto:</span> Gera o áudio e libera a mesa de mixagem para controle total.</p>
            <p><span className="font-semibold">Modo Turbo:</span> Gera, mixa com trilha padrão e entrega o áudio pronto. Rápido e fácil.</p>
         </div>
      </div>
    </div>
  );
};