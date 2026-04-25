import React, { useState, useRef, useEffect } from 'react';
import type { Voice } from '../types';
import { getApiKey } from '../utils/api';
import { PlayIcon, LoadingSpinner, CheckIcon, PauseIcon, WandIcon, PaperclipIcon, CameraIcon } from './IconComponents';
import { GoogleGenAI } from '@google/genai';
import { DynamicLoadingMessage } from './DynamicLoadingMessage';
import { VoiceSelectorCarousel } from './VoiceSelectorCarousel';
import { useSiteConfig } from '../contexts/SiteConfigContext';

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
  const { config } = useSiteConfig();

  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomPromptInput, setShowCustomPromptInput] = useState(false);
  const [reviewSource, setReviewSource] = useState<'specialist' | 'custom' | null>(null);

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

      const apiKey = config?.apiKeys?.googleApiKey || getApiKey();

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

      const extractedText = res.text || '';

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

  const generateSpecialistScript = async () => {
    setIsValidating(true);
    try {
      const apiKey = config?.apiKeys?.googleApiKey || getApiKey();

      if (!apiKey) {
        setIsValidating(false);
        alert("Chave da API do Google (Gemini) não configurada! Acesse o Painel de Controle (Configurações) para adicioná-la.");
        return;
      }

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

      const res = await ai.models.generateContent({ model: chatModel, contents: prompt });
      const resultText = res.text;

      if (resultText) {
        setPendingScript(resultText.trim());
        setReviewSource('specialist');
        setShowScriptReview(true);
      }
    } catch (e: any) {
      console.error("Validation Error:", e);
      alert(`Erro da API: ${e.message || "Tente novamente."}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidationOption = async (option: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (option === 'A') {
      setValidationStatus('validated');
      setIsExpertGenerated(true);
      return;
    }

    if (option === 'C') {
      generateSpecialistScript();
      return;
    }

    if (option === 'D') {
      // Retail Style Formatting (Client-side optimization)
      let formatted = text.toUpperCase();

      // 1. Intensify Punctuation
      formatted = formatted.replace(/\./g, '!!!').replace(/,/g, '... ');

      // 2. Highlight Prices (Simple Regex for R$ XX,XX or similar)
      formatted = formatted.replace(/(R\$\s?[\d,.]+)/g, '💥 APENAS $1!!!');

      // 3. Ensure Urgency (Prepend/Append if missing)
      if (!formatted.includes('CORRA') && !formatted.includes('APROVEITE')) {
        formatted = `🚨 ATENÇÃO!!! ${formatted} CORRA E APROVEITE!!! 🚨`;
      }

      setText(formatted);
      setValidationStatus('validated');
      setIsExpertGenerated(true);
      return;
    }

    setIsValidating(true);
    try {
      const apiKey = config?.apiKeys?.googleApiKey || getApiKey();

      if (!apiKey) {
        setIsValidating(false);
        alert("Chave da API do Google (Gemini) não configurada! Acesse o Painel de Controle (Configurações) para adicioná-la.");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      let prompt = '';

      if (option === 'B') {
        prompt = `Corrija a ortografia, a pontuação e a capitalização (transforme texto em CAIXA ALTA para escrita normal, apenas com iniciais maiúsculas quando necessário) do seguinte texto. NÃO altere palavras, estilo ou tom. Responda APENAS com o texto corrigido. Texto: \n\n${text}`;
      } else if (option === 'E') {
        prompt = `Aqui está uma instrução específica do usuário: "${customPrompt}"\n\nAplique estritamente esta instrução ao texto abaixo. Devolva apenas o roteiro resultante do que eu pedir e com as devidas pontuações para que a IA de voz reproduza com perfeição, sem aspas, sem asteriscos para formatar e sem comentários adicionais.\n\nTexto Original:\n"${text}"`;
      }

      const res = await ai.models.generateContent({ model: chatModel, contents: prompt });
      const resultText = res.text;

      if (resultText) {
        if (option === 'E') {
          setPendingScript(resultText.trim());
          setReviewSource('custom');
          setShowScriptReview(true);
        } else {
          setText(resultText.trim());
          setValidationStatus('validated');
          setIsExpertGenerated(true);
        }
      }
    } catch (e: any) {
      console.error("Validation Error:", e);
      alert(`Erro da API: ${e.message || "Tente novamente."}`);
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
    if (reviewSource === 'custom') {
      handleValidationOption('E');
    } else {
      generateSpecialistScript();
    }
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
            className="w-full h-full min-h-[350px] p-6 bg-slate-900/50 border border-slate-700 rounded-2xl shadow-inner text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-300 resize-none text-lg leading-relaxed"
            value={text}
            onChange={handleTextChange}
            placeholder="Digite ou cole seu roteiro aqui para a mágica acontecer..."
            aria-label="Texto para narrar"
            disabled={isValidating}
          />

          {/* AI Processing Overlay */}
          {isValidating && (
            <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center animate-fade-in border border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
               <div className="bg-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center shadow-2xl border border-indigo-500/30">
                 <div className="relative w-16 h-16 mb-6">
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl animate-pulse">✨</span>
                    </div>
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2 ml-2">A IA está trabalhando...</h3>
                 <div className="text-indigo-400 font-medium text-center text-lg ml-2 animate-pulse">
                   <DynamicLoadingMessage messages={VALIDATION_MESSAGES} />
                 </div>
               </div>
            </div>
          )}
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-slate-500 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
              {text.length} / {MAX_CHARS}
            </span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleValidationOption('A')}
              disabled={isValidating}
              className="p-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-left transition-all group"
            >
              <div className="font-bold text-white mb-1 group-hover:text-green-400 transition-colors">A. Manter como está</div>
              <p className="text-xs text-slate-400">Usar o texto exatamente como digitei.</p>
            </button>

            <button
              onClick={() => handleValidationOption('B')}
              disabled={isValidating}
              className="p-4 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-left transition-all group"
            >
              <div className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">B. Corrigir Gramática</div>
              <p className="text-xs text-slate-400">Ajustar pontuação e erros ortográficos apenas.</p>
            </button>

            <button
              onClick={() => handleValidationOption('C')}
              disabled={isValidating}
              className="p-4 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 rounded-xl text-left transition-all group md:col-span-2"
            >
              <div className="font-bold text-indigo-300 mb-1 group-hover:text-indigo-200 transition-colors">C. ✨ Melhorar com IA (Especialista)</div>
              <p className="text-xs text-indigo-400/80">Reescrever para maior fluidez e naturalidade.</p>
            </button>

            <button
              onClick={() => handleValidationOption('D')}
              disabled={isValidating}
              className="p-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 rounded-xl text-left transition-all group md:col-span-2"
            >
              <div className="font-bold text-red-300 mb-1 group-hover:text-red-200 transition-colors">D. 💥 ESTILO VAREJO (IMPACTO)</div>
              <p className="text-xs text-red-400/80">Converter para CAIXA ALTA, adicionar ênfase em preços e urgência!</p>
            </button>

            <button
              onClick={() => {
                setShowCustomPromptInput(!showCustomPromptInput);
              }}
              disabled={isValidating}
              className="p-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-xl text-left transition-all group md:col-span-2"
            >
              <div className="font-bold text-purple-300 mb-1 group-hover:text-purple-200 transition-colors">E. 💬 Orientação Específica (Prompt)</div>
              <p className="text-xs text-purple-400/80">Diga exatamente o que a IA deve fazer com o texto.</p>
              
              {showCustomPromptInput && (
                <div 
                  className="mt-4 animate-fade-in" 
                  onClick={e => e.stopPropagation()}
                >
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ex: Reescreva com sotaque caipira, ou ex: Deixe mais romântico..."
                    className="w-full bg-slate-900 border border-purple-500/50 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-400 resize-none h-20 mb-3"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (customPrompt.trim()) handleValidationOption('E');
                      }}
                      disabled={!customPrompt.trim() || isValidating}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      Processar Solicitação
                    </button>
                  </div>
                </div>
              )}
            </button>
          </div>


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
      <div className={`transition-all duration-500 ${validationStatus === 'pending' ? 'opacity-100' : 'opacity-100'}`}>
        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Selecione o Locutor</label>
          <div className="relative">
            <VoiceSelectorCarousel
              availableVoices={availableVoices}
              selectedVoice={selectedVoice}
              setSelectedVoice={setSelectedVoice}
            />
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
