import React, { useState, useRef, useEffect } from 'react';
import { MessageCircleIcon, XIcon, SendIcon, LoadingSpinner, SparklesIcon } from './IconComponents';
import { GoogleGenAI } from '@google/genai';
import { useSiteConfig } from '../contexts/SiteConfigContext';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
}

export const SupportChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { config } = useSiteConfig();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: inputText
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            const apiKey = localStorage.getItem('assistantApiKey') || localStorage.getItem('apiKey');
            if (!apiKey) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'model',
                    text: "Desculpe, não encontrei uma chave de API configurada. Por favor, entre em contato com o administrador."
                }]);
                return;
            }

            const ai = new GoogleGenAI({ apiKey });
            const assistantInstructions = localStorage.getItem('assistantInstructions') || '';

            const systemPrompt = `Você é o Assistente Virtual da ${config.hero.title}.
            
CONTEXTO DO NEGÓCIO:
- Nome: ${config.hero.title}
- Slogan: ${config.hero.subtitle}
- Preços: Básico R$${config.pricing.basic}, Profissional R$${config.pricing.pro}, Empresarial R$${config.pricing.enterprise}.
- Contato: ${config.contact.email}, ${config.contact.phone}.
- Features: Clonagem de voz (${config.features.showVoices ? 'Sim' : 'Não'}), Roteirista (${config.features.showWriter ? 'Sim' : 'Não'}), Mixagem (${config.features.showMixer ? 'Sim' : 'Não'}).

INSTRUÇÕES PERSONALIZADAS DO ADMINISTRADOR:
${assistantInstructions}

SUA MISSÃO:
Ajudar visitantes a entenderem os planos, tirarem dúvidas sobre a tecnologia e converterem em vendas.
Seja educado, prestativo e persuasivo, mas honesto.
Responda de forma concisa (máximo 3 parágrafos curtos).
Sempre tente direcionar para o cadastro ou compra.`;

            const chat = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt + "\n\n" + "Histórico da conversa:\n" + messages.map(m => `${m.role}: ${m.text}`).join('\n') + `\nUser: ${inputText}` }] }
                ]
            });

            let responseText = '';
            const part = (chat as any)?.candidates?.[0]?.content?.parts?.[0];
            if (part && typeof part.text === 'string') responseText = part.text;
            else if (typeof (chat as any).text === 'function') responseText = await (chat as any).text();
            else responseText = String((chat as any).text || '');

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText
            };

            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: "Desculpe, tive um problema ao processar sua mensagem. Tente novamente mais tarde."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-indigo-600 hover:bg-indigo-500'} text-white`}
            >
                {isOpen ? <XIcon className="w-6 h-6" /> : <MessageCircleIcon className="w-6 h-6" />}
            </button>

            {/* Chat Window */}
            <div className={`fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 origin-bottom-right transform ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
                {/* Header */}
                <div className="bg-indigo-600 p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-white">
                        <div className="p-1.5 bg-white/20 rounded-lg">
                            <SparklesIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Assistente Virtual</h3>
                            <p className="text-xs text-indigo-200">Online agora</p>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="h-80 overflow-y-auto p-4 bg-gray-50 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-400 text-sm mt-8">
                            <p>Olá! 👋</p>
                            <p>Como posso ajudar você hoje?</p>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                                <LoadingSpinner className="w-4 h-4 text-indigo-600" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 p-2 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || isLoading}
                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <SendIcon className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </>
    );
};
