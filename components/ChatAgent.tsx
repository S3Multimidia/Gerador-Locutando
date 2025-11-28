import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { LoadingSpinner, SendIcon, SparklesIcon, UserIcon } from './IconComponents';
import { Client } from '../types';

interface ChatMessage {
  role: 'user' | 'model' | 'system';
  id: string;
  text?: string;
  options?: string[];
  suggestion?: {
    text: string;
    voiceId: string;
  };
}

interface ChatAgentProps {
  onScriptFinalized: (finalText: string, suggestedVoiceId: string, history: ChatMessage[]) => void;
  initialText: string;
  initialHistory: ChatMessage[];
  chatModel: string;
  clients: Client[];
  onAddClient: (name: string, instructions: string) => void;
}

const AVAILABLE_VOICES_LIST = "achernar, achird, algenib, algieba, alnilam, aoede, autonoe, callirrhoe, charon, despina, enceladus, erinome, fenrir, gacrux, iapetus, kore, laomedeia, leda, orus, puck, pulcherrima, rasalgethi, sadachbia, sadaltager, schedar, sulafat, umbriel, vindemiatrix, zephyr, zubenelgenubi";

const SYSTEM_PROMPT = `Você é um Especialista em Copywriting para Áudio e Diretor de Criação.
Seu objetivo é criar o roteiro de locução PERFEITO para o usuário.

NÃO gere o roteiro imediatamente se o usuário der apenas uma ideia vaga. Aja como um consultor.
Faça perguntas (uma ou duas por vez) para entender:
1. MEIO DE VEICULAÇÃO: Onde vai tocar? (Carro de som, Rádio FM, Spotify, Instagram/TikTok, Espera Telefônica, etc.)
2. OBJETIVO: Vender, Avisar, Emocionar?
3. PÚBLICO: Jovem, Idoso, Popular, Elite?

Conduza a conversa. Quando fizer uma pergunta, OFEREÇA OPÇÕES DE RESPOSTA para facilitar para o usuário.

Sua resposta DEVE SER SEMPRE um JSON estrito com a seguinte estrutura:
{
  "mensagem": "Sua resposta conversacional aqui. Use emojis.",
  "opcoes_resposta": ["Opção 1", "Opção 2", "Opção 3"], // Sugestões curtas para o usuário clicar
  "roteiro_final": "O texto final do roteiro COMPLETO (apenas quando pronto, senão null)",
  "voz_sugerida": "O ID da voz sugerida (apenas quando roteiro_final existir, senão null). Lista: [${AVAILABLE_VOICES_LIST}]"
}

IMPORTANTE:
- Responda SEMPRE em JSON.
- Se o usuário já der um texto pronto, pule as perguntas e entregue o roteiro melhorado.
`;

export const ChatAgent: React.FC<ChatAgentProps> = ({ onScriptFinalized, initialText, initialHistory, chatModel, clients, onAddClient }) => {
  const [userInput, setUserInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(initialHistory);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Client Management State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientInstructions, setNewClientInstructions] = useState('');

  useEffect(() => {
    if (chatHistory.length === 0) {
      // Initial Greeting with Client Selection
      const clientOptions = clients.map(c => `Cliente: ${c.name}`);
      clientOptions.push('Novo Cliente');
      clientOptions.push('Sem Cliente Fixo');

      setChatHistory([
        {
          role: 'system',
          id: 'init',
          text: 'Olá! Sou seu Diretor de Criação. Antes de começarmos, para qual cliente vamos criar hoje?',
          options: clientOptions
        },
      ]);
      setUserInput(initialText);
    }
  }, [initialText, initialHistory, clients]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const sendMessage = async (text: string, contextInstructions?: string) => {
    if (!text.trim() || isLoading) return;

    const apiKey = (typeof process !== 'undefined' && (process as any).env && (process as any).env.API_KEY)
      ? (process as any).env.API_KEY
      : (typeof window !== 'undefined' && (window as any).__API_KEY__)
        ? (window as any).__API_KEY__
        : (typeof window !== 'undefined' && localStorage.getItem('apiKey'))
          ? localStorage.getItem('apiKey')
          : undefined;

    if (!apiKey) {
      setError("Chave de API não encontrada.");
      return;
    }

    const userMessage: ChatMessage = { role: 'user', id: Date.now().toString(), text: text };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    setIsLoading(true);
    setError(null);
    setUserInput('');

    try {
      const ai = new GoogleGenAI({ apiKey });

      const contents = newHistory
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text || '' }]
        }));

      // Inject Client Context if available
      let finalSystemPrompt = SYSTEM_PROMPT;
      if (selectedClient || contextInstructions) {
        const clientName = selectedClient?.name || "Novo Cliente";
        const instructions = selectedClient?.instructions || contextInstructions || "";
        finalSystemPrompt += `\n\nCONTEXTO DO CLIENTE ATUAL:\nNome: ${clientName}\nInstruções Obrigatórias (Endereço, Telefone, Pronúncia, etc): ${instructions}\n\nCERTIFIQUE-SE DE USAR ESSAS INFORMAÇÕES NO ROTEIRO SE APLICÁVEL.`;
      }

      const res = await ai.models.generateContent({
        model: chatModel,
        config: {
          systemInstruction: finalSystemPrompt,
          responseMimeType: "application/json"
        },
        contents: contents
      });

      let rawText = '';
      const part = (res as any)?.candidates?.[0]?.content?.parts?.[0];
      if (part && typeof part.text === 'string') rawText = part.text;
      else if (typeof (res as any).text === 'function') rawText = await (res as any).text();
      else rawText = String((res as any).text || '');

      let responseData;
      try {
        responseData = JSON.parse(rawText.trim());
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError, rawText);
        responseData = {
          mensagem: rawText,
          opcoes_resposta: [],
          roteiro_final: null,
          voz_sugerida: null
        };
      }

      const modelMessage: ChatMessage = {
        role: 'model',
        id: Date.now().toString() + '-model',
        text: responseData.mensagem,
        options: responseData.opcoes_resposta || [],
        suggestion: responseData.roteiro_final ? {
          text: responseData.roteiro_final,
          voiceId: String(responseData.voz_sugerida || '').toLowerCase(),
        } : undefined
      };

      setChatHistory(prev => [...prev, modelMessage]);

    } catch (err) {
      console.error("Error communicating with AI:", err);
      setError("Erro ao conectar com o Diretor. Tente novamente.");
      setChatHistory(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(userInput);
  };

  const handleOptionClick = (opt: string) => {
    if (opt === 'Novo Cliente') {
      setIsClientModalOpen(true);
    } else if (opt === 'Sem Cliente Fixo') {
      setSelectedClient(null);
      sendMessage("Vou criar sem cliente fixo.");
    } else if (opt.startsWith('Cliente: ')) {
      const clientName = opt.replace('Cliente: ', '');
      const client = clients.find(c => c.name === clientName);
      if (client) {
        setSelectedClient(client);
        // Send a hidden system message or just a user confirmation to set context
        // Actually, we just trigger the next step.
        // Let's simulate the user saying "Vou usar o cliente X" so the AI knows.
        sendMessage(`Vou criar para o cliente ${clientName}. O que você sugere?`);
      }
    } else {
      sendMessage(opt);
    }
  };

  const handleSaveNewClient = () => {
    if (!newClientName.trim()) return;
    onAddClient(newClientName, newClientInstructions);
    setIsClientModalOpen(false);

    // Set as selected and notify AI
    const newClient: Client = { id: 'temp', name: newClientName, instructions: newClientInstructions };
    setSelectedClient(newClient);
    sendMessage(`Acabei de cadastrar o cliente ${newClientName}. As instruções são: ${newClientInstructions}. O que vamos criar?`, newClientInstructions);

    setNewClientName('');
    setNewClientInstructions('');
  };

  return (
    <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-700 max-w-4xl mx-auto relative">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <span className="mr-2 text-3xl">🎬</span> Diretor de Criação IA
        </h2>
        <div className="flex items-center gap-2">
          {selectedClient && (
            <span className="text-xs bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1">
              <UserIcon className="w-3 h-3" />
              {selectedClient.name}
            </span>
          )}
          <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
            Especialista em Áudio
          </div>
        </div>
      </div>

      <div className="flex flex-col h-[60vh] bg-slate-900/50 rounded-xl border border-slate-700 relative overflow-hidden">
        {/* Chat Area */}
        <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar scroll-smooth">
          {chatHistory.map((msg, index) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
              <div className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role !== 'user' && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg border border-indigo-400/30">
                    <SparklesIcon className="w-5 h-5" />
                  </div>
                )}
                <div className={`max-w-lg p-4 rounded-2xl shadow-sm ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-500/20'
                  : msg.role === 'model' || msg.role === 'system'
                    ? 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                    : 'bg-transparent'
                  }`}>
                  {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}

                  {msg.suggestion && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
                      <div className="flex items-center justify-between text-xs uppercase tracking-wider font-semibold text-indigo-400">
                        <span>Roteiro Final</span>
                        <span className="bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300">{msg.suggestion.voiceId}</span>
                      </div>
                      <div className="p-4 bg-slate-900 rounded-lg border border-slate-700/80 relative group">
                        <p className="whitespace-pre-wrap text-white font-medium font-mono text-sm">{msg.suggestion.text}</p>
                      </div>
                      <button
                        onClick={() => onScriptFinalized(msg.suggestion!.text, msg.suggestion!.voiceId, [...chatHistory, { role: 'user', id: Date.now().toString(), text: `(Roteiro Aprovado)` }])}
                        className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all transform hover:scale-[1.02] focus:ring-2 focus:ring-green-500 focus:outline-none flex items-center justify-center gap-2"
                      >
                        <span>🎙️</span> Gravar este Roteiro
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Reply Options */}
              {msg.role !== 'user' && msg.options && msg.options.length > 0 && index === chatHistory.length - 1 && !isLoading && (
                <div className="mt-3 ml-14 flex flex-wrap gap-2">
                  {msg.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleOptionClick(opt)}
                      className="px-4 py-2 bg-slate-700 hover:bg-indigo-600 text-slate-200 hover:text-white text-sm font-medium rounded-full border border-slate-600 hover:border-indigo-500 transition-all transform hover:scale-105 shadow-sm"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-3 justify-start animate-pulse">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg opacity-70">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 rounded-bl-none flex items-center space-x-2">
                <LoadingSpinner className="w-4 h-4 text-indigo-400" />
                <span className="text-sm">Criando...</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="absolute top-0 left-0 right-0 p-2 bg-red-500/90 text-white text-center text-sm backdrop-blur-sm animate-fade-in z-10">
            {error}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-3">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Converse com o diretor..."
              className="flex-1 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-inner text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !userInput.trim()}
              className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-500 transition-all disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              <SendIcon className="w-6 h-6" />
            </button>
          </form>
        </div>
      </div>

      {/* New Client Modal */}
      {isClientModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-2xl">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold text-white mb-4">Novo Cliente</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Pizzaria do João"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Instruções (Endereço, Zap, Pronúncia)</label>
                <textarea
                  value={newClientInstructions}
                  onChange={(e) => setNewClientInstructions(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 h-32"
                  placeholder="Ex: Rua das Flores, 123. Zap 9999-8888. Falar 'Pizzaria' com sotaque italiano."
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNewClient}
                  disabled={!newClientName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar e Usar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};