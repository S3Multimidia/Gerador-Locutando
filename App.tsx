

import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Header } from './components/Header';
import { VoiceGenerator } from './components/VoiceGenerator';
import { AudioResult } from './components/AudioResult';
import { Mixer } from './components/Mixer';
import { AudioRecorder } from './components/AudioRecorder';
import { FinalResultCard } from './components/FinalResultCard';
import type { Voice } from './types';
import { AVAILABLE_VOICES, DEFAULT_BACKGROUND_TRACK_URL } from './constants';
import { UserIcon, KeyIcon, ChevronRightIcon, CheckCircleIcon, ShieldIcon, LoadingSpinner } from './components/IconComponents';

// #region UTILITY FUNCTIONS
// Helper to decode base64 string to Uint8Array
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode raw PCM data into an AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
// #endregion

type Page = 'login' | 'pricing' | 'dashboard' | 'admin';
type Role = 'user' | 'admin';
export type IntonationStyle = 'auto' | 'retail';

// ============================================================================
// #region DASHBOARD COMPONENT (The Core Voice Generation App)
// ============================================================================
const Dashboard: React.FC = () => {
  const [text, setText] = useState<string>('Bem-vindo ao Locutando! O seu gerador de locuções com inteligência artificial.');
  const [suggestedText, setSuggestedText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<Voice>(AVAILABLE_VOICES[0]);
  const [intonationStyle, setIntonationStyle] = useState<IntonationStyle>('auto');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTurboLoading, setIsTurboLoading] = useState<boolean>(false);
  const [isSuggestingText, setIsSuggestingText] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<AudioBuffer | null>(null);
  const [finalMixedAudio, setFinalMixedAudio] = useState<AudioBuffer | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'record'>('generate');
  const [audioContext] = useState<AudioContext | null>(() => {
    if (typeof window !== 'undefined') {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        return Ctx ? new Ctx({ sampleRate: 24000 }) : null;
    }
    return null;
  });

  const handleSuggestText = useCallback(async (originalText: string) => {
    if (!process.env.API_KEY) {
      setError("Chave de API não encontrada.");
      return;
    }
    if (!originalText.trim()) {
      setError("Por favor, insira um texto para gerar uma sugestão.");
      return;
    }

    setIsSuggestingText(true);
    setSuggestedText('');
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Você é um copywriter publicitário sênior. Sua tarefa é reescrever o texto a seguir para que seja mais impactante, claro e persuasivo, ideal para uma locução. Mantenha a mensagem central e o significado, mas aprimore o estilo e a fluidez. O tom deve ser profissional e envolvente. Não adicione nenhuma introdução ou comentário, apenas o texto reescrito.\n\nTexto Original:\n---\n${originalText}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
      });
      
      const newText = response.text.trim();
      setSuggestedText(newText);
    } catch (err) {
      console.error("Erro ao sugerir texto:", err);
      let errorMessage = "Ocorreu um erro desconhecido ao gerar a sugestão.";
       if (err instanceof Error) {
           errorMessage = err.message;
       }
      setError(`Falha ao sugerir texto: ${errorMessage}`);
    } finally {
      setIsSuggestingText(false);
    }
  }, []);

  const handleGenerateSpeech = useCallback(async (voiceToUse: Voice, textToUse: string) => {
    if (!process.env.API_KEY) {
      setError("Chave de API não encontrada.");
      return null;
    }
     if (!audioContext) {
      setError("A Web Audio API não é suportada neste navegador.");
      return null;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const RETAIL_PROMPT = "Crie uma Voz, animada, explosiva, clara e com tom publicitário. A entonação deve transmitir entusiasmo e simpatia, mantendo uma dicção excelente e expressiva. A velocidade é rápida, transmitindo urgência de promoção, mas com pausas naturais para destacar as principais informações. O timbre é levemente agudo, mas encorpado, garantindo credibilidade e carisma. A voz deve soar como de um locutor profissional de rádio ou TV, usada em campanhas publicitárias, apresentando dinamismo e confiança. Narre o seguinte texto: ";
      
      const finalText = intonationStyle === 'retail' ? `${RETAIL_PROMPT}${textToUse}` : textToUse;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: finalText }] }],
        config: {
          temperature: 1.35,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceToUse.id },
            },
          },
        },
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            audioContext,
            24000,
            1,
        );
        return audioBuffer;
      } else {
        throw new Error("A resposta da API não continha dados de áudio.");
      }
    } catch (err) {
       console.error("Erro ao gerar locução:", err);
      let errorMessage = "Ocorreu um erro desconhecido.";
      if (err instanceof Error) {
          errorMessage = err.message;
      }
      setError(`Falha ao gerar áudio: ${errorMessage}`);
      return null;
    }
  }, [audioContext, intonationStyle]);
  
  const handleExpertGenerate = async (textToUse: string) => {
      setIsLoading(true);
      setError(null);
      setGeneratedAudio(null);
      setFinalMixedAudio(null);

      const audioBuffer = await handleGenerateSpeech(selectedVoice, textToUse);
      if (audioBuffer) {
          setGeneratedAudio(audioBuffer);
      }
      setIsLoading(false);
  };

  const handleTurboGenerate = async (textToUse: string) => {
      setIsTurboLoading(true);
      setError(null);
      setGeneratedAudio(null);
      setFinalMixedAudio(null);

      const [voiceBuffer, backgroundBuffer] = await Promise.all([
          handleGenerateSpeech(selectedVoice, textToUse),
          fetch(DEFAULT_BACKGROUND_TRACK_URL)
              .then(res => res.arrayBuffer())
              .then(ab => audioContext!.decodeAudioData(ab))
              .catch(e => {
                  console.error("Error fetching background track:", e);
                  setError("Falha ao carregar a trilha sonora padrão.");
                  return null;
              })
      ]);

      if (!voiceBuffer || !backgroundBuffer) {
          setIsTurboLoading(false);
          return;
      }

      // Offline Mixing Logic
      try {
          const startPad = 3.0;
          const endPad = 3.0;
          const backgroundVolume = 0.4;
          const outputDuration = startPad + voiceBuffer.duration + endPad;

          const offlineCtx = new OfflineAudioContext(2, Math.ceil(audioContext!.sampleRate * outputDuration), audioContext!.sampleRate);
          
          // Voice Source
          const voiceSource = offlineCtx.createBufferSource();
          voiceSource.buffer = voiceBuffer;
          voiceSource.connect(offlineCtx.destination);
          voiceSource.start(startPad);

          // Background Source
          const bgSource = offlineCtx.createBufferSource();
          bgSource.buffer = backgroundBuffer;
          const bgGain = offlineCtx.createGain();
          bgGain.gain.value = backgroundVolume;
          bgSource.connect(bgGain);
          bgGain.connect(offlineCtx.destination);
          bgSource.start(0);

          const mixedBuffer = await offlineCtx.startRendering();
          setFinalMixedAudio(mixedBuffer);
      } catch (e) {
          console.error("Error during offline mixing:", e);
          setError("Ocorreu um erro ao mixar o áudio no Modo Turbo.");
      } finally {
          setIsTurboLoading(false);
      }
  };
  
  const handleRecordingComplete = useCallback((audioBuffer: AudioBuffer | null) => {
    setGeneratedAudio(audioBuffer);
    setFinalMixedAudio(null);
    if (!audioBuffer) {
      setError(null);
    }
  }, []);

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">1. Crie sua Locução</h2>
          
           {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('generate')}
                  className={`${
                    activeTab === 'generate'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base transition-colors focus:outline-none focus-ring`}
                >
                  Gerar com IA
                </button>
                <button
                  onClick={() => setActiveTab('record')}
                  className={`${
                    activeTab === 'record'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base transition-colors focus:outline-none focus-ring`}
                >
                  Gravar Voz
                </button>
              </nav>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="animate-fade-in">
            {activeTab === 'generate' && (
               <VoiceGenerator
                text={text}
                setText={setText}
                suggestedText={suggestedText}
                setSuggestedText={setSuggestedText}
                selectedVoice={selectedVoice}
                setSelectedVoice={setSelectedVoice}
                intonationStyle={intonationStyle}
                setIntonationStyle={setIntonationStyle}
                isLoading={isLoading}
                isTurboLoading={isTurboLoading}
                isSuggestingText={isSuggestingText}
                onSuggestText={handleSuggestText}
                onGenerateExpert={handleExpertGenerate}
                onGenerateTurbo={handleTurboGenerate}
              />
            )}
            {activeTab === 'record' && audioContext && (
                <AudioRecorder
                    audioContext={audioContext}
                    onRecordingComplete={handleRecordingComplete}
                />
            )}
          </div>
           {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-800 border-l-4 border-red-400 rounded-r-lg" role="alert">
              <p className="font-bold">Ocorreu um erro</p>
              <p className="text-sm break-words">{error}</p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {isTurboLoading && (
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 animate-fade-in text-center">
                  <LoadingSpinner className="w-12 h-12 text-red-500 mx-auto" />
                  <h3 className="mt-4 text-xl font-bold text-gray-800">Criando em Modo Turbo...</h3>
                  <p className="text-gray-600 mt-2">Por favor, aguarde enquanto geramos e mixamos seu áudio.</p>
              </div>
          )}
          {finalMixedAudio && audioContext && !isTurboLoading && (
               <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 animate-fade-in">
                 <h2 className="text-3xl font-bold text-gray-800 mb-6">Áudio Pronto!</h2>
                  <FinalResultCard
                    audioBuffer={finalMixedAudio}
                    audioContext={audioContext}
                    onDiscard={() => setFinalMixedAudio(null)}
                  />
               </div>
          )}
          {!finalMixedAudio && !isTurboLoading && generatedAudio && audioContext && (
            <>
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 animate-fade-in">
                 <h2 className="text-3xl font-bold text-gray-800 mb-6">2. Resultado</h2>
                <AudioResult audioBuffer={generatedAudio} audioContext={audioContext} />
              </div>
            
               <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 animate-fade-in" style={{ animationDelay: '150ms' }}>
                 <h2 className="text-3xl font-bold text-gray-800 mb-6">3. Mixagem <span className="text-base font-normal text-gray-500">(Opcional)</span></h2>
                  <p className="text-base text-gray-600 mb-4">
                    Aprimore sua locução com tratamentos de áudio e adicione uma trilha sonora para um resultado profissional.
                  </p>
                 <Mixer
                   generatedAudio={generatedAudio}
                   audioContext={audioContext}
                   setGeneratedAudio={setGeneratedAudio}
                 />
               </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
};
// #endregion


// ============================================================================
// #region LOGIN PAGE COMPONENT
// ============================================================================
const LoginPage: React.FC<{ onLogin: (role: Role) => void; onNavigate: (page: Page) => void; }> = ({ onLogin, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate role-based login for demonstration
    const role = email.toLowerCase() === 'admin@admin.com' && password === 'mudar@123' ? 'admin' : 'user';
    onLogin(role);
  };
  
  return (
    <main className="flex items-center justify-center p-4" style={{minHeight: 'calc(100vh - 64px)'}}>
       <div className="w-full max-w-md">
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl border border-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Acesse sua Conta</h2>
            <p className="text-gray-500 mt-2">Bem-vindo de volta! Faça login para continuar.</p>
          </div>
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div className="relative">
              <UserIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-4 transform -translate-y-1/2" />
              <input
                type="email"
                placeholder="E-mail (use admin@admin.com for admin)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 pl-12 bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition duration-150 ease-in-out focus:border-red-500 focus:ring-2 focus:ring-red-200"
              />
            </div>
            <div className="relative">
              <KeyIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-4 transform -translate-y-1/2" />
              <input
                type="password"
                placeholder="Senha (use mudar@123 for admin)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 pl-12 bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition duration-150 ease-in-out focus:border-red-500 focus:ring-2 focus:ring-red-200"
              />
            </div>
             <button
              type="submit"
              className="w-full flex items-center justify-center p-4 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all duration-200 ease-in-out transform hover:scale-[1.02] focus-ring"
            >
              Entrar
              <ChevronRightIcon className="w-5 h-5 ml-2" />
            </button>
          </form>
          <div className="text-center mt-6 text-sm">
            <p className="text-gray-600">
              Não tem uma conta?{' '}
              <button onClick={() => onNavigate('pricing')} className="font-semibold text-red-600 hover:underline">
                Veja nossos planos
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};
// #endregion

// ============================================================================
// #region PRICING PAGE COMPONENT
// ============================================================================
const PricingPlan: React.FC<{title: string; price: string; period: string; features: string[], popular?: boolean}> = ({title, price, period, features, popular}) => (
  <div className={`relative border rounded-2xl p-8 flex flex-col ${popular ? 'border-red-500' : 'border-gray-300'}`}>
    {popular && <div className="absolute top-0 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Popular</div>}
    <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
    <p className="mt-4">
      <span className="text-4xl font-extrabold tracking-tight text-gray-900">${price}</span>
      <span className="text-base font-medium text-gray-500">/{period}</span>
    </p>
    <ul role="list" className="mt-8 space-y-4 flex-grow">
      {features.map(feature => (
        <li key={feature} className="flex items-start">
          <CheckCircleIcon className="flex-shrink-0 w-6 h-6 text-green-500 mr-2" />
          <span className="text-gray-600">{feature}</span>
        </li>
      ))}
    </ul>
    <button className={`w-full mt-10 p-3 font-bold rounded-lg shadow-md transition-all transform hover:scale-[1.02] focus-ring ${popular ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-700 text-white hover:bg-gray-800'}`}>
      Assinar Agora
    </button>
  </div>
);

const PricingPage: React.FC<{ onNavigate: (page: Page) => void; }> = ({ onNavigate }) => {
  return (
     <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">Planos flexíveis para sua necessidade</h2>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
          Escolha o plano que melhor se adapta ao seu projeto e comece a criar locuções incríveis hoje mesmo.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <PricingPlan 
          title="Básico"
          price="29"
          period="mês"
          features={[
            '10,000 caracteres por mês',
            'Acesso a todas as vozes padrão',
            'Suporte por e-mail'
          ]}
        />
        <PricingPlan 
          title="Profissional"
          price="79"
          period="mês"
          features={[
            '50,000 caracteres por mês',
            'Acesso a todas as vozes padrão',
            'Mixagem com trilha sonora',
            'Suporte prioritário por e-mail'
          ]}
          popular
        />
        <PricingPlan 
          title="Empresarial"
          price="Custom"
          period="contato"
          features={[
            'Caracteres ilimitados',
            'Vozes personalizadas (em breve)',
            'Gerente de conta dedicado',
            'Suporte 24/7'
          ]}
        />
      </div>
       <div className="text-center mt-12 text-lg">
            <p className="text-gray-600">
              Já possui uma conta?{' '}
              <button onClick={() => onNavigate('login')} className="font-semibold text-red-600 hover:underline">
                Faça login
              </button>
            </p>
          </div>
    </main>
  )
};
// #endregion

// ============================================================================
// #region ADMIN PANEL COMPONENT
// ============================================================================
const AdminPanel: React.FC = () => {
    const users = [
        { id: 1, name: 'Alice', email: 'alice@example.com', plan: 'Profissional', status: 'Ativo' },
        { id: 2, name: 'Bob', email: 'bob@example.com', plan: 'Básico', status: 'Ativo' },
        { id: 3, name: 'Charlie', email: 'charlie@example.com', plan: 'Profissional', status: 'Inativo' },
    ];
    return (
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex items-center mb-8">
                <ShieldIcon className="w-8 h-8 text-red-600 mr-3" />
                <h2 className="text-4xl font-extrabold text-gray-900">Painel Administrativo</h2>
            </div>
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Gerenciar Usuários e Assinaturas</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-mail</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.plan}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
};
// #endregion

// ============================================================================
// #region MAIN APP COMPONENT (ROUTER)
// ============================================================================
const App: React.FC = () => {
  const [page, setPage] = useState<Page>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<Role | null>('user');

  const handleLogin = (role: Role) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setPage('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setPage('login');
  };

  const handleNavigate = (newPage: Page) => {
    // Prevent navigating to protected routes if not authenticated
    if (!isAuthenticated && (newPage === 'dashboard' || newPage === 'admin')) {
      setPage('login');
      return;
    }
    setPage(newPage);
  };
  
  const renderPage = () => {
    if (!isAuthenticated) {
      switch (page) {
        case 'pricing':
          return <PricingPage onNavigate={handleNavigate} />;
        case 'login':
        default:
          return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;
      }
    }
    
    // Authenticated routes
    switch (page) {
      case 'admin':
        // Simple guard to prevent non-admins from seeing the admin panel
        return userRole === 'admin' ? <AdminPanel /> : <Dashboard />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        userRole={userRole}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
      {renderPage()}
    </div>
  );
};

export default App;
// #endregion