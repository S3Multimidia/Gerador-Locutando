import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, Type } from '@google/genai';
import { LoadingSpinner, SendIcon, SparklesIcon } from './IconComponents';
import type { IntonationStyle } from '../App';

interface ChatMessage {
  role: 'user' | 'model' | 'system';
  id: string;
  text?: string;
  suggestion?: {
    text: string;
    style: IntonationStyle;
  };
}

interface ChatAgentProps {
  onScriptFinalized: (finalText: string, suggestedStyle: IntonationStyle, history: ChatMessage[]) => void;
  initialText: string;
  initialHistory: ChatMessage[];
  chatModel: string;
}

const SYSTEM_PROMPT = `Você é um assistente de roteiro para locuções e anúncios. Seu objetivo é ajudar o usuário a criar o roteiro perfeito. Quando o usuário fornecer um texto ou ideia, analise-o e sugira uma versão melhorada. Junto com o texto, analise o tom e sugira um 'estilo_entonacao' ('auto' para narração padrão, 'retail' para um tom promocional e de vendedor). Sua resposta DEVE SER ESTRITAMENTE um objeto JSON com duas chaves: 'texto_sugerido' e 'estilo_entonacao'. NÃO adicione nenhum texto de conversação ou formatação fora do objeto JSON. Apenas o JSON.`;

export const ChatAgent: React.FC<ChatAgentProps> = ({ onScriptFinalized, initialText, initialHistory, chatModel }) => {
  const [userInput, setUserInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(initialHistory);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatHistory.length === 0) {
      setChatHistory([
        { role: 'system', id: 'init', text: 'Olá, seja bem-vindo ao nosso novo sistema de som. Qual oferta você gostaria de anunciar hoje? Cole o seu texto ou Ideia e juntos vamos ajustando...' },
      ]);
      setUserInput(initialText);
    }
  }, [initialText, initialHistory]);

  useEffect(() => {
    if (!process.env.API_KEY) {
        setError("Chave de API não configurada.");
        return;
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatRef.current = ai.chats.create({
        model: chatModel,
        config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    texto_sugerido: { type: Type.STRING },
                    estilo_entonacao: { type: Type.STRING }
                },
                required: ['texto_sugerido', 'estilo_entonacao']
            }
        }
    });
  }, [chatModel]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !chatRef.current) return;
    
    const userMessage: ChatMessage = { role: 'user', id: Date.now().toString(), text: userInput };
    setChatHistory(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    setUserInput('');

    try {
        const response = await chatRef.current.sendMessage({ message: userMessage.text as string });
        const jsonStr = response.text.trim();
        const suggestions = JSON.parse(jsonStr);

        const modelMessage: ChatMessage = {
            role: 'model',
            id: Date.now().toString() + '-model',
            suggestion: {
                text: suggestions.texto_sugerido,
                style: suggestions.estilo_entonacao as IntonationStyle,
            }
        };
        setChatHistory(prev => [...prev, modelMessage]);

    } catch (err) {
        console.error("Error communicating with AI:", err);
        const errorMessage = "Desculpe, não consegui processar a sugestão. Tente reformular seu texto ou verifique sua conexão.";
        setError(errorMessage);
        setChatHistory(prev => prev.slice(0, -1)); // Remove the user message that failed
        setUserInput(userMessage.text || ''); // Put text back in input
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Assistente de Roteiro IA</h2>
      <div className="flex flex-col h-[60vh] bg-gray-50 rounded-lg border border-gray-200">
        <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto">
            {chatHistory.map(msg => (
                <div key={msg.id} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role !== 'user' && (
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white shadow-md">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                    )}
                    <div className={`max-w-lg p-4 rounded-2xl shadow-sm ${
                        msg.role === 'user' ? 'bg-red-500 text-white rounded-br-none' : 
                        msg.role === 'model' ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-none' :
                        'bg-transparent text-gray-600 text-center w-full max-w-full shadow-none'
                    }`}>
                        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                        {msg.suggestion && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500 italic">Aqui está uma sugestão otimizada:</p>
                                <p className="p-3 bg-gray-100 rounded-lg border border-gray-200 whitespace-pre-wrap">{msg.suggestion.text}</p>
                                <p className="text-xs text-gray-500">Estilo de entonação sugerido: <span className="font-semibold">{msg.suggestion.style === 'retail' ? 'Varejo' : 'Padrão'}</span></p>
                                <button
                                    onClick={() => onScriptFinalized(msg.suggestion!.text, msg.suggestion!.style, [...chatHistory, {role: 'user', id: Date.now().toString(), text: `Usei o texto: "${msg.suggestion?.text}"`}])}
                                    className="w-full p-2 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-all transform hover:scale-[1.02] focus-ring"
                                >
                                    Usar este Texto e Avançar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {isLoading && (
                 <div className="flex items-end gap-3 justify-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white shadow-md">
                        <SparklesIcon className="w-6 h-6" />
                    </div>
                    <div className="max-w-lg p-4 rounded-2xl shadow-sm bg-white border border-gray-200 text-gray-800 rounded-bl-none flex items-center space-x-2">
                       <LoadingSpinner className="w-5 h-5 text-red-500"/>
                       <span className="text-gray-500">Pensando...</span>
                    </div>
                 </div>
            )}
        </div>
        {error && (
            <div className="p-4 bg-red-50 text-red-800 border-t border-red-200 text-sm">
                {error}
            </div>
        )}
        <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Digite seu texto ou ideia aqui..."
                    className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg shadow-sm transition duration-150 ease-in-out focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || !userInput.trim()} className="p-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed focus-ring">
                    <SendIcon className="w-6 h-6"/>
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};