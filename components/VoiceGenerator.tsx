import React, { useState, useRef, useEffect } from 'react';
import type { Voice } from '../types';
import { PlayIcon, LoadingSpinner, CheckIcon, PauseIcon, WandIcon, PaperclipIcon, CameraIcon } from './IconComponents';
import { GoogleGenAI } from '@google/genai';
import { DynamicLoadingMessage } from './DynamicLoadingMessage';

const VALIDATION_MESSAGES = [
  "Analisando contexto do roteiro...",
  "Aplicando regras de gramática...",
  "Otimizando fluidez para leitura...",
  "Escrevendo versão final..."
];


interface VoiceGeneratorProps {
  text: string;
  setText: (text: string) => void;
  availableVoices: Voice[];
  selectedVoice: Voice | null;
  setSelectedVoice: (voice: Voice) => void;

  isLoading: boolean;
  isTurboLoading: boolean;
  onGenerateExpert: (textToUse: string) => void;
  onGenerateTurbo: (textToUse: string) => void;
  ttsModel: string;
  chatModel: string;
  onGoToChat: () => void;
  isExpertGenerated: boolean;
  setIsExpertGenerated: (value: boolean) => void;
}

const MAX_CHARS = 2000;

export const VoiceGenerator: React.FC<VoiceGeneratorProps> = ({
  text,
  setText,
  availableVoices,
  selectedVoice,
  setSelectedVoice,
  isLoading,
  isTurboLoading,
  onGenerateExpert,
  onGenerateTurbo,
  chatModel,
  onGoToChat,
  isExpertGenerated,
  setIsExpertGenerated
}) => {
  const [playingDemoId, setPlayingDemoId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [voiceCarouselIndex, setVoiceCarouselIndex] = useState<number>(0);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Correction State
  const [isCorrecting, setIsCorrecting] = useState<boolean>(false);
  const [correctedText, setCorrectedText] = useState<string | null>(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<'turbo' | 'expert' | null>(null);

  // Validation State
  const [validationStatus, setValidationStatus] = useState<'idle' | 'pending' | 'validated'>('idle');
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Specialist Review State
  const [pendingScript, setPendingScript] = useState<string | null>(null);
  const [showScriptReview, setShowScriptReview] = useState<boolean>(false);

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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length <= MAX_CHARS) {
      setText(newText);
      if (newText.trim().length > 5) {
        setValidationStatus('pending');
        setIsExpertGenerated(false);
      } else {
        setValidationStatus('idle');
      }
    }
  };

  const handleTextFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setText(prev => {
          const newText = prev + (prev ? '\n\n' : '') + content;
          return newText.slice(0, MAX_CHARS);
        });
        setValidationStatus('pending');
        setIsExpertGenerated(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingImage(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const apiKey = (typeof process !== 'undefined' && (process as any).env && (process as any).env.API_KEY)
        ? (process as any).env.API_KEY
        : (typeof window !== 'undefined' && (window as any).__API_KEY__)
          ? (window as any).__API_KEY__
          : (typeof window !== 'undefined' && localStorage.getItem('apiKey'))
            ? localStorage.getItem('apiKey')!
            : undefined;

      if (!apiKey) throw new Error("API Key not found");

      const ai = new GoogleGenAI({ apiKey });
      const prompt = "Transcreva todo o texto visível nesta imagem. Retorne apenas o texto, sem comentários ou formatação markdown.";

      const res = await ai.models.generateContent({
        model: chatModel,
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: file.type, data: base64Data } }
          ]
        }]
      });

      let extractedText = '';
      const part = (res as any)?.candidates?.[0]?.content?.parts?.[0];
      if (part && typeof part.text === 'string') extractedText = part.text;
      else if (typeof (res as any).text === 'function') extractedText = await (res as any).text();
      else extractedText = String((res as any).text || '');

      if (extractedText) {
        setText(prev => {
          const newText = prev + (prev ? '\n\n' : '') + extractedText.trim();
          return newText.slice(0, MAX_CHARS);
        });
        setValidationStatus('pending');
        setIsExpertGenerated(false);
      }

    } catch (error) {
      console.error("OCR Error:", error);
      alert("Erro ao processar imagem. Tente novamente.");
    } finally {
      setIsAnalyzingImage(false);
      e.target.value = '';
    }
  };

  const handleSuggestVoiceFromText = async () => {
    if (!text.trim()) return;
    if (isLoading || isTurboLoading) return;
    setIsSuggesting(true);
    try {
      const apiKey = (typeof process !== 'undefined' && (process as any).env && (process as any).env.API_KEY)
        ? (process as any).env.API_KEY
        : (typeof window !== 'undefined' && (window as any).__API_KEY__)
          ? (window as any).__API_KEY__
          : (typeof window !== 'undefined' && localStorage.getItem('apiKey'))
            ? localStorage.getItem('apiKey')!
            : undefined;
      if (!apiKey) { setIsSuggesting(false); return; }
      const ai = new GoogleGenAI({ apiKey });
      const allowed = availableVoices.map(v => v.id).join(', ');
      const prompt = `Considere o texto a seguir e indique apenas um id de voz dentre [${allowed}]. Responda estritamente em JSON: {\"voz_sugerida\":\"id\"}. Texto: \n\n${text}`;
      const res = await ai.models.generateContent({ model: chatModel, contents: [{ parts: [{ text: prompt }] }], config: { responseMimeType: "application/json" } });
      let raw = '';
      const part = (res as any)?.candidates?.[0]?.content?.parts?.[0];
      if (part && typeof part.text === 'string') raw = part.text;
      else if (typeof (res as any).text === 'function') raw = await (res as any).text();
      else raw = String((res as any).text || '');
      let obj: any;
      try { obj = JSON.parse(raw.trim()); } catch { setIsSuggesting(false); return; }
      const vidRaw = obj?.voz_sugerida ?? '';
      const vid = String(vidRaw).toLowerCase().trim();
      let v = availableVoices.find(x => x.id.toLowerCase() === vid);
      if (!v) v = availableVoices.find(x => x.displayName.toLowerCase() === vid);
      if (v) {
        setSelectedVoice(v);
        const idx = availableVoices.findIndex(x => x.id === v!.id);
        if (idx >= 0) setVoiceCarouselIndex(idx);
      }
    } catch (e) {
    } finally {
      setIsSuggesting(false);
    }
  };

  const generateSpecialistScript = async () => {
    setIsValidating(true);
    try {
      const apiKey = (typeof process !== 'undefined' && (process as any).env && (process as any).env.API_KEY)
        ? (process as any).env.API_KEY
        : (typeof window !== 'undefined' && (window as any).__API_KEY__)
          ? (window as any).__API_KEY__
          : (typeof window !== 'undefined' && localStorage.getItem('apiKey'))
            ? localStorage.getItem('apiKey')!
            : undefined;

      if (!apiKey) { setIsValidating(false); return; }

      const ai = new GoogleGenAI({ apiKey });

      const storedPrompt = localStorage.getItem('specialistPrompt');
      const defaultPrompt = `Você é um Especialista em Copywriting e Roteiros para Áudio (Rádio e Locução Digital). Sua tarefa é transformar o input do usuário em um texto otimizado para ser lido por uma Inteligência Artificial de voz (TTS).

Siga rigorosamente este fluxo de pensamento e execução:

1. ANÁLISE DE CONTEXTO
Primeiro, identifique o tipo de conteúdo:
- TIPO A: Varejo/Promocional (Se contiver lista de produtos, preços, "oferta", "promoção").
  -> Tom de voz: Alegre, energético, dinâmico e com senso de urgência.
- TIPO B: Institucional/Corporativo (Se contiver "missão", "história", comunicados internos, avisos).
  -> Tom de voz: Sóbrio, confiável, calmo e profissional.

2. ESTRUTURAÇÃO OBRIGATÓRIA
O seu output deve conter SEMPRE, independentemente do tamanho do texto original:
- Abertura (Hook): Uma frase curta e engajadora para prender a atenção (ex: "Atenção para as ofertas...", "Olá, equipe...").
- Corpo do Texto: O conteúdo principal reescrito para fluidez.
- Fechamento (CTA): Uma despedida ou chamada para ação (ex: "Venha conferir!", "Contamos com você.").

3. REGRAS DE REDAÇÃO PARA TTS (Text-to-Speech)
- Converta abreviações para extenso (ex: escreva "quilogramas" em vez de "kg", "reais" em vez de "R$").
- Use pontuação estratégica (vírgulas e pontos) para criar pausas de respiração naturais para o locutor.
- Evite frases excessivamente longas.

4. RESTRIÇÕES CRÍTICAS (DEATH RULES)
- PROIBIDO usar Emojis (🚫).
- PROIBIDO incluir instruções de palco ou efeitos sonoros entre parênteses ou colchetes (ex: NÃO escreva [música animada], [risos]).
- O output deve conter APENAS o texto falado. Nada mais.`;

      const basePrompt = storedPrompt || defaultPrompt;
      const prompt = `${basePrompt}\n\nInput Usuário: "${text}"\nSeu Output:`;

      const res = await ai.models.generateContent({ model: chatModel, contents: [{ parts: [{ text: prompt }] }] });

      let resultText = '';
      const part = (res as any)?.candidates?.[0]?.content?.parts?.[0];
      if (part && typeof part.text === 'string') resultText = part.text;
      else if (typeof (res as any).text === 'function') resultText = await (res as any).text();
      else resultText = String((res as any).text || '');

      if (resultText) {
        setPendingScript(resultText.trim());
        setShowScriptReview(true);
      }
    } catch (e) {
      console.error("Validation Error:", e);
      alert("Erro ao processar o texto. Tente novamente.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidationOption = async (option: 'A' | 'B' | 'C') => {
    if (option === 'A') {
      setValidationStatus('validated');
      setIsExpertGenerated(true);
      return;
    }

    if (option === 'C') {
      generateSpecialistScript();
      return;
    }

    setIsValidating(true);
    try {
      const apiKey = (typeof process !== 'undefined' && (process as any).env && (process as any).env.API_KEY)
        ? (process as any).env.API_KEY
        : (typeof window !== 'undefined' && (window as any).__API_KEY__)
          ? (window as any).__API_KEY__
          : (typeof window !== 'undefined' && localStorage.getItem('apiKey'))
            ? localStorage.getItem('apiKey')!
            : undefined;

      if (!apiKey) { setIsValidating(false); return; }

      const ai = new GoogleGenAI({ apiKey });
      let prompt = '';

      if (option === 'B') {
        prompt = `Corrija a ortografia, a pontuação e a capitalização (transforme texto em CAIXA ALTA para escrita normal, apenas com iniciais maiúsculas quando necessário) do seguinte texto. NÃO altere palavras, estilo ou tom. Responda APENAS com o texto corrigido. Texto: \n\n${text}`;
      }

      const res = await ai.models.generateContent({ model: chatModel, contents: [{ parts: [{ text: prompt }] }] });

      let resultText = '';
      const part = (res as any)?.candidates?.[0]?.content?.parts?.[0];
      if (part && typeof part.text === 'string') resultText = part.text;
      else if (typeof (res as any).text === 'function') resultText = await (res as any).text();
      else resultText = String((res as any).text || '');

      if (resultText) {
        setText(resultText.trim());
        setValidationStatus('validated');
        setIsExpertGenerated(true);
      }
    } catch (e) {
      console.error("Validation Error:", e);
      alert("Erro ao processar o texto. Tente novamente.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleApproveScript = () => {
    if (pendingScript) {
      setText(pendingScript);
      setValidationStatus('validated');
      setIsExpertGenerated(true);
      setShowScriptReview(false);
      setPendingScript(null);
    }
  };

  const handleRegenerateScript = () => {
    generateSpecialistScript();
  };

  const anyLoading = isLoading || isTurboLoading || isValidating;

  return (
    <div className="space-y-8 relative h-full flex flex-col">
      {/* Text Section */}
      <div className="relative group flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3 px-1">
          <label htmlFor="text-input" className="block text-sm font-bold text-slate-300 uppercase tracking-wider">
            Roteiro da Locução
          </label>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt"
              className="hidden"
              onChange={handleTextFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700 hover:border-slate-600"
              title="Carregar arquivo de texto (.txt)"
            >
              <PaperclipIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Anexar Texto</span>
            </button>

            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={isAnalyzingImage}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Tirar foto ou carregar imagem"
            >
              {isAnalyzingImage ? <LoadingSpinner className="w-4 h-4" /> : <CameraIcon className="w-4 h-4" />}
              <span className="hidden sm:inline">{isAnalyzingImage ? 'Lendo...' : 'Foto/Câmera'}</span>
            </button>
          </div>
        </div>

        <div className="relative flex-1">
          <textarea
            id="text-input"
            className="w-full h-full min-h-[200px] p-6 bg-slate-900/50 border border-slate-700 rounded-2xl shadow-inner text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-300 resize-none text-lg leading-relaxed"
            value={text}
            onChange={handleTextChange}
            placeholder="Digite ou cole seu roteiro aqui para a mágica acontecer..."
            aria-label="Texto para narrar"
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-slate-500 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
              {text.length} / {MAX_CHARS}
            </span>
          </div>

          {/* Floating AI Suggestion Button */}
          <div className="absolute bottom-4 left-4 z-10">
            <button
              onClick={handleSuggestVoiceFromText}
              disabled={isSuggesting || !text.trim()}
              className="flex items-center px-4 py-2 bg-slate-800/90 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl shadow-lg border border-slate-700 hover:border-indigo-500 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none backdrop-blur-sm group/ai"
            >
              {isSuggesting ? <LoadingSpinner className="w-4 h-4 mr-2" /> : <span className="mr-2 text-lg group-hover/ai:animate-pulse">✨</span>}
              <span className="text-xs font-bold uppercase tracking-wide">Sugerir Voz</span>
            </button>
          </div>
        </div>
      </div>

      {/* Validation Options Block */}
      {validationStatus === 'pending' && (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl animate-fade-in">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <span className="mr-2">🛡️</span> Validação do Roteiro
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            Antes de prosseguir, escolha como deseja tratar o seu texto:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleValidationOption('A')}
              disabled={isValidating}
              className="p-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-left transition-all hover:scale-[1.02]"
            >
              <div className="font-bold text-white mb-1">Não Corrigir</div>
              <p className="text-xs text-slate-400 mb-2">Mantém o texto exato (raw).</p>
              <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 block text-center">
                ⚠️ Pode conter erros de pronúncia
              </span>
            </button>

            <button
              onClick={() => handleValidationOption('B')}
              disabled={isValidating}
              className="p-4 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-500/30 rounded-xl text-left transition-all hover:scale-[1.02]"
            >
              <div className="font-bold text-indigo-300 mb-1">Corrigir Gramática</div>
              <p className="text-xs text-slate-400">Ajusta pontuação e ortografia sem mudar o estilo.</p>
            </button>

            <button
              onClick={() => handleValidationOption('C')}
              disabled={isValidating}
              className="p-4 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 rounded-xl text-left transition-all hover:scale-[1.02]"
            >
              <div className="font-bold text-purple-300 mb-1">Especialista em Roteiros</div>
              <p className="text-xs text-slate-400">Reescreve para melhorar a fluidez e naturalidade.</p>
            </button>
          </div>

          {isValidating && (
            <div className="mt-4 flex items-center justify-center text-indigo-400 text-sm font-medium">
              <LoadingSpinner className="w-4 h-4 mr-2" />
              <DynamicLoadingMessage messages={VALIDATION_MESSAGES} />
            </div>
          )}
        </div>
      )}

      {/* Script Review Modal */}
      {showScriptReview && pendingScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-xl font-bold text-white flex items-center">
                <span className="mr-2 text-2xl">✨</span> Revisão do Especialista
              </h3>
              <button
                onClick={() => setShowScriptReview(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-slate-400 text-sm mb-4">
                A IA reescreveu seu roteiro para melhor fluidez. Revise abaixo:
              </p>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-slate-200 whitespace-pre-wrap leading-relaxed font-medium">
                {pendingScript}
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex flex-col sm:flex-row gap-4 justify-end">
              <button
                onClick={handleRegenerateScript}
                disabled={isValidating}
                className="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white font-semibold transition-all flex items-center justify-center"
              >
                {isValidating ? <LoadingSpinner className="w-5 h-5 mr-2" /> : <span className="mr-2">🔄</span>}
                Gerar Novamente
              </button>
              <button
                onClick={handleApproveScript}
                className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold shadow-lg shadow-green-600/20 transition-all transform hover:scale-105 flex items-center justify-center"
              >
                <span className="mr-2">✅</span>
                Aprovar e Usar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Section & Actions - Hidden/Disabled until validated */}
      <div className={`transition-all duration-500 ${validationStatus === 'pending' ? 'opacity-30 pointer-events-none filter blur-sm' : 'opacity-100'}`}>
        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Selecione o Locutor</label>
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
        </div>

        {/* Action Buttons */}
        <div className="pt-6 mt-auto">
          <div className="space-y-4">
            {/* Main Action Buttons - Always Visible with Equal Prominence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Modo Turbo Button (Orange) */}
              <div className="flex flex-col">
                <button
                  onClick={() => onGenerateTurbo(text)}
                  disabled={anyLoading || !text.trim() || !selectedVoice || validationStatus !== 'validated'}
                  className="group relative w-full flex flex-col items-center justify-center p-5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-2xl shadow-[0_0_25px_rgba(249,115,22,0.6)] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  {isTurboLoading ? (
                    <><LoadingSpinner className="w-6 h-6 mb-2" /><span className="text-lg uppercase tracking-widest">Processando Turbo...</span></>
                  ) : (
                    <>
                      <div className="flex items-center mb-2">
                        <span className="mr-2 text-2xl">🚀</span>
                        <span className="text-lg uppercase tracking-widest">MODO TURBO</span>
                      </div>
                      <p className="text-xs font-normal normal-case tracking-normal opacity-90">Equaliza, coloca trilha e entrega pronto em segundos</p>
                    </>
                  )}
                </button>
              </div>

              {/* Modo Expert Button (Blue) */}
              <div className="flex flex-col">
                <button
                  onClick={() => onGenerateExpert(text)}
                  disabled={anyLoading || !text.trim() || !selectedVoice || validationStatus !== 'validated'}
                  className="group relative w-full flex flex-col items-center justify-center p-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-[0_0_25px_rgba(37,99,235,0.6)] transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  {isLoading ? (
                    <><LoadingSpinner className="w-6 h-6 mb-2" /><span className="text-lg uppercase tracking-widest">Processando...</span></>
                  ) : (
                    <>
                      <div className="flex items-center mb-2">
                        <span className="mr-2 text-xl">🎙️</span>
                        <span className="text-lg uppercase tracking-widest">MODO EXPERT</span>
                      </div>
                      <p className="text-xs font-normal normal-case tracking-normal opacity-90">Abre mesa de mixagem com efeitos e trilhas</p>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
