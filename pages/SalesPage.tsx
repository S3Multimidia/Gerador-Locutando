import React from 'react';
import { PlayIcon, CheckCircleIcon, MicIcon, WandIcon, SparklesIcon } from '../components/IconComponents';
import { useSiteConfig } from '../contexts/SiteConfigContext';
import { VoiceCarousel } from '../components/VoiceCarousel';
import { Voice } from '../types';

interface SalesPageProps {
    onNavigate: (page: any) => void;
    voices: Voice[];
}

export const SalesPage: React.FC<SalesPageProps> = ({ onNavigate, voices }) => {
    const { config } = useSiteConfig();

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative pt-32 pb-40 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-slate-900">
                        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
                    </div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-900"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-sm font-medium mb-8 backdrop-blur-md animate-fade-in hover:bg-white/10 transition-colors cursor-default">
                        <span className="flex h-2 w-2 rounded-full bg-indigo-400 mr-2 animate-pulse shadow-[0_0_10px_rgba(129,140,248,0.5)]"></span>
                        Nova Geração de Vozes Neurais
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 tracking-tight mb-8 leading-tight animate-fade-in drop-shadow-2xl">
                        {config.hero.title}
                    </h1>

                    <p className="mt-6 max-w-2xl mx-auto text-xl text-slate-300 mb-12 animate-fade-in delay-100 leading-relaxed">
                        {config.hero.subtitle}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in delay-200">
                        <button
                            onClick={() => onNavigate(config.hero.ctaLink)}
                            className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all transform hover:scale-105 hover:-translate-y-1 w-full sm:w-auto overflow-hidden"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                            <span className="relative flex items-center justify-center">
                                {config.hero.ctaText}
                                <SparklesIcon className="w-5 h-5 ml-2 text-indigo-200" />
                            </span>
                        </button>
                        <button
                            onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-lg border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all w-full sm:w-auto flex items-center justify-center group"
                        >
                            <PlayIcon className="w-5 h-5 mr-2 text-indigo-400 group-hover:text-white transition-colors" />
                            Ouvir Exemplos
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {config.features.showVoices && (
                            <div className="p-8 bg-slate-800 rounded-3xl border border-slate-700/50 hover:border-indigo-500/30 transition-all hover:-translate-y-1 group">
                                <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 transition-colors">
                                    <MicIcon className="w-7 h-7 text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Vozes Ultra-Realistas</h3>
                                <p className="text-slate-400 leading-relaxed">
                                    Mais de 30 vozes neurais que respiram, pausam e entoam como humanos reais.
                                </p>
                            </div>
                        )}

                        {config.features.showWriter && (
                            <div className="p-8 bg-slate-800 rounded-3xl border border-slate-700/50 hover:border-purple-500/30 transition-all hover:-translate-y-1 group">
                                <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                                    <WandIcon className="w-7 h-7 text-purple-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Roteirista IA</h3>
                                <p className="text-slate-400 leading-relaxed">
                                    Nossa IA reescreve seu texto para ficar mais fluido, natural e persuasivo.
                                </p>
                            </div>
                        )}

                        {config.features.showMixer && (
                            <div className="p-8 bg-slate-800 rounded-3xl border border-slate-700/50 hover:border-blue-500/30 transition-all hover:-translate-y-1 group">
                                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                                    <SparklesIcon className="w-7 h-7 text-blue-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Mixagem Automática</h3>
                                <p className="text-slate-400 leading-relaxed">
                                    Adicione trilha de fundo e efeitos de áudio instantaneamente. Pós-produção em um clique.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Demo Section - Dynamic Carousel */}
            <section id="demo" className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Nossas Vozes</h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Escolha a voz perfeita para o seu projeto.
                        </p>
                    </div>

                    <VoiceCarousel voices={voices} onNavigate={onNavigate} />
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-24 bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Planos Flexíveis</h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Comece pequeno e cresça conforme sua necessidade.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto w-full">
                        {/* Basic Plan */}
                        <div className="relative flex flex-col p-8 rounded-2xl border bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all duration-300">
                            <h3 className="text-2xl font-bold text-white">Básico</h3>
                            <p className="mt-4 flex items-baseline">
                                <span className="text-4xl font-extrabold tracking-tight text-white">${config.pricing.basicPrice}</span>
                                <span className="ml-1 text-base font-medium text-slate-400">/mês</span>
                            </p>
                            <ul role="list" className="mt-8 space-y-4 flex-grow">
                                {['10,000 caracteres', 'Vozes Padrão', 'MP3'].map(feature => (
                                    <li key={feature} className="flex items-start">
                                        <CheckCircleIcon className="flex-shrink-0 w-5 h-5 text-indigo-400 mr-3 mt-0.5" />
                                        <span className="text-slate-300 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => onNavigate('login')} className="w-full mt-8 py-3 px-4 rounded-xl font-bold text-sm bg-slate-700 text-white hover:bg-slate-600 transition-all">
                                Começar Agora
                            </button>
                        </div>

                        {/* Pro Plan */}
                        <div className="relative flex flex-col p-8 rounded-2xl border bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-105 z-10 transition-all duration-300">
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">Mais Popular</div>
                            <h3 className="text-2xl font-bold text-white">Profissional</h3>
                            <p className="mt-4 flex items-baseline">
                                <span className="text-4xl font-extrabold tracking-tight text-white">${config.pricing.proPrice}</span>
                                <span className="ml-1 text-base font-medium text-slate-400">/mês</span>
                            </p>
                            <ul role="list" className="mt-8 space-y-4 flex-grow">
                                {['50,000 caracteres', 'Vozes Premium', 'Modo Turbo', 'WAV/MP3'].map(feature => (
                                    <li key={feature} className="flex items-start">
                                        <CheckCircleIcon className="flex-shrink-0 w-5 h-5 text-indigo-400 mr-3 mt-0.5" />
                                        <span className="text-slate-300 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => onNavigate('login')} className="w-full mt-8 py-3 px-4 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all">
                                Começar Agora
                            </button>
                        </div>

                        {/* Enterprise Plan */}
                        <div className="relative flex flex-col p-8 rounded-2xl border bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all duration-300">
                            <h3 className="text-2xl font-bold text-white">Empresarial</h3>
                            <p className="mt-4 flex items-baseline">
                                <span className="text-4xl font-extrabold tracking-tight text-white">Custom</span>
                            </p>
                            <ul role="list" className="mt-8 space-y-4 flex-grow">
                                {['Ilimitado', 'Clonagem de Voz', 'API Access', 'Gerente Dedicado'].map(feature => (
                                    <li key={feature} className="flex items-start">
                                        <CheckCircleIcon className="flex-shrink-0 w-5 h-5 text-indigo-400 mr-3 mt-0.5" />
                                        <span className="text-slate-300 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => window.location.href = `mailto:${config.contact.email}`} className="w-full mt-8 py-3 px-4 rounded-xl font-bold text-sm bg-slate-700 text-white hover:bg-slate-600 transition-all">
                                Fale Conosco
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-12 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Pronto para elevar o nível?</h2>
                            <p className="text-indigo-100 text-lg mb-10 max-w-2xl mx-auto">
                                Junte-se a milhares de criadores que usam o Locutando para dar voz às suas ideias.
                            </p>
                            <button
                                onClick={() => onNavigate('login')}
                                className="px-10 py-5 bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl font-bold text-lg shadow-xl transition-all transform hover:scale-105"
                            >
                                Criar Conta Gratuita
                            </button>
                            <p className="mt-6 text-sm text-indigo-200 opacity-80">
                                Sem cartão de crédito necessário para começar.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
