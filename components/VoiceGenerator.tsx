

import React, { useState, useRef, useEffect } from 'react';
import type { Voice } from '../types';
import { AVAILABLE_VOICES } from '../constants';
import { PlayIcon, SparklesIcon, LoadingSpinner, MicIcon, CheckIcon, PauseIcon } from './IconComponents';
import type { IntonationStyle } from '../App';

interface VoiceGeneratorProps {
  text: string;
  setText: (text: string) => void;
  suggestedText: string;
  setSuggestedText: (text: string) => void;
  selectedVoice: Voice;
  setSelectedVoice: (voice: Voice) => void;
  intonationStyle: IntonationStyle;
  setIntonationStyle: (style: IntonationStyle) => void;
  isLoading: boolean;
  isTurboLoading: boolean;
  isSuggestingText: boolean;
  onSuggestText: (originalText: string) => void;
  onGenerateExpert: (textToUse: string) => void;
  onGenerateTurbo: (textToUse: string) => void;
}

const MAX_CHARS = 2000;

export const VoiceGenerator: React.FC<VoiceGeneratorProps> = ({
  text,
  setText,
  suggestedText,
  setSuggestedText,
  selectedVoice,
  setSelectedVoice,
  intonationStyle,
  setIntonationStyle,
  isLoading,
  isTurboLoading,
  isSuggestingText,
  onSuggestText,
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
  
  const handleUseSuggestedText = () => {
    setText(suggestedText);
    setSuggestedText('');
  }

  const anyLoading = isLoading || isTurboLoading || isSuggestingText;

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
          {AVAILABLE_VOICES.map((voice) => {
             const isSelected = selectedVoice.id === voice.id;
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
          })}
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

      <div className="space-y-3 pt-4 border-t border-gray-200">
        <label htmlFor="suggested-text-output" className="block text-sm font-medium text-gray-700">Sugestão de Texto (IA)</label>
        <div className="relative">
            <textarea id="suggested-text-output" rows={6} readOnly className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg shadow-sm focus:ring-0 focus:border-gray-300 cursor-not-allowed" value={suggestedText} placeholder="Clique em 'Sugerir Texto com IA' para gerar uma versão aprimorada." aria-label="Texto sugerido pela IA"/>
             {suggestedText && (
                <button onClick={handleUseSuggestedText} disabled={anyLoading} className="absolute bottom-3 right-3 px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-md hover:bg-green-700 transition disabled:opacity-50">
                    Usar este texto
                </button>
            )}
        </div>
        <button onClick={() => onSuggestText(text)} disabled={isSuggestingText || !text.trim() || isLoading || isTurboLoading} className="w-full flex items-center justify-center p-3 bg-gray-700 text-white font-bold rounded-lg shadow-md hover:bg-gray-800 transition-all duration-200 ease-in-out transform hover:scale-[1.02] focus-ring focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
            {isSuggestingText ? (
                <><LoadingSpinner className="w-5 h-5 mr-3" />Sugerindo...</>
            ) : (
                <><SparklesIcon className="w-5 h-5 mr-3" />Sugerir Texto com IA</>
            )}
        </button>
      </div>

      <div className="pt-4 border-t border-gray-200">
         <p className="text-center text-sm font-medium text-gray-700 mb-3">Escolha como finalizar sua locução:</p>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => onGenerateExpert(text)} disabled={anyLoading || !text.trim()} className="w-full flex items-center justify-center p-4 bg-gray-800 text-white font-bold rounded-lg shadow-md hover:bg-gray-900 transition-all duration-200 ease-in-out transform hover:scale-[1.02] focus-ring focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                {isLoading ? (
                    <><LoadingSpinner className="w-5 h-5 mr-3" />Gerando...</>
                ) : (
                    "Modo Experto"
                )}
            </button>
            <button onClick={() => onGenerateTurbo(text)} disabled={anyLoading || !text.trim()} className="w-full flex items-center justify-center p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-lg shadow-md hover:opacity-90 transition-all duration-200 ease-in-out transform hover:scale-[1.02] focus-ring focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
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