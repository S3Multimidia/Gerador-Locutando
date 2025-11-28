import React from 'react';
import { CheckCircleIcon } from '../components/IconComponents';

interface PricingPageProps {
    onNavigate: (page: any) => void;
}

const PricingPlan: React.FC<{ title: string; price: string; period: string; features: string[], popular?: boolean }> = ({ title, price, period, features, popular }) => (
    <div className={`relative flex flex-col p-8 rounded-2xl border transition-all duration-300 ${popular ? 'bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-105 z-10' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
        {popular && <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">Mais Popular</div>}
        <h3 className="text-2xl font-bold text-white">{title}</h3>
        <p className="mt-4 flex items-baseline">
            <span className="text-4xl font-extrabold tracking-tight text-white">${price}</span>
            {price !== 'Custom' && <span className="ml-1 text-base font-medium text-slate-400">/{period}</span>}
        </p>
        <ul role="list" className="mt-8 space-y-4 flex-grow">
            {features.map(feature => (
                <li key={feature} className="flex items-start">
                    <CheckCircleIcon className="flex-shrink-0 w-5 h-5 text-indigo-400 mr-3 mt-0.5" />
                    <span className="text-slate-300 text-sm">{feature}</span>
                </li>
            ))}
        </ul>
        <button className={`w-full mt-8 py-3 px-4 rounded-xl font-bold text-sm transition-all transform hover:scale-[1.02] focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${popular ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500' : 'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500'}`}>
            {price === 'Custom' ? 'Fale Conosco' : 'Começar Agora'}
        </button>
    </div>
);

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
    return (
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col justify-center">
            <div className="text-center mb-16">
                <h2 className="text-4xl font-extrabold text-white sm:text-5xl tracking-tight">Planos para cada estágio</h2>
                <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-400">
                    Escolha o plano ideal para escalar sua produção de conteúdo com IA.
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto w-full">
                <PricingPlan
                    title="Básico"
                    price="29"
                    period="mês"
                    features={[
                        '10,000 caracteres por mês',
                        'Acesso a vozes padrão',
                        'Downloads em MP3',
                        'Suporte por e-mail'
                    ]}
                />
                <PricingPlan
                    title="Profissional"
                    price="79"
                    period="mês"
                    features={[
                        '50,000 caracteres por mês',
                        'Todas as vozes premium',
                        'Modo Turbo (Mixagem)',
                        'Downloads em WAV/MP3',
                        'Suporte prioritário'
                    ]}
                    popular
                />
                <PricingPlan
                    title="Empresarial"
                    price="Custom"
                    period="contato"
                    features={[
                        'Caracteres ilimitados',
                        'Clonagem de voz (Beta)',
                        'API Access',
                        'Gerente de conta dedicado',
                        'SLA de 99.9%'
                    ]}
                />
            </div>
            <div className="text-center mt-16 text-lg">
                <p className="text-slate-400">
                    Já possui uma conta?{' '}
                    <button onClick={() => onNavigate('login')} className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
                        Faça login
                    </button>
                </p>
            </div>
        </main>
    )
};
