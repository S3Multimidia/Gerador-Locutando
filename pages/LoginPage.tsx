import React, { useState } from 'react';
import { UserIcon, KeyIcon, ChevronRightIcon } from '../components/IconComponents';
import { useAuth } from '../hooks/useAuth';

interface LoginPageProps {
    onLoginSuccess: (role: any) => void;
    onNavigate: (page: any) => void;
    auth: ReturnType<typeof useAuth>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigate, auth }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const result = auth.login(email, password);
        if (result.success) {
            onLoginSuccess(auth.userRole || 'user');
        } else {
            setError(result.message || 'Erro ao entrar.');
        }
    };

    const handleLoginClick = (e: React.FormEvent) => {
        e.preventDefault();
        const result = auth.login(email, password);
        if (result.success) {
            onLoginSuccess(auth.userRole || 'user');
        } else {
            setError(result.message || 'Erro');
        }
    }

    return (
        <main className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
            <div className="w-full max-w-md">
                <div className="bg-slate-800 p-8 md:p-10 rounded-2xl shadow-2xl border border-slate-700">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white">Acesse sua Conta</h2>
                        <p className="text-slate-400 mt-2">Bem-vindo de volta! Faça login para continuar.</p>
                    </div>
                    {error && (
                        <div className="mb-4 p-3 bg-red-900/50 text-red-200 border border-red-800 rounded-lg text-center text-sm">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleLoginClick} className="space-y-6">
                        <div className="relative">
                            <UserIcon className="w-5 h-5 text-slate-500 absolute top-1/2 left-4 transform -translate-y-1/2" />
                            <input
                                type="email"
                                placeholder="E-mail"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full p-3 pl-12 bg-slate-900 border border-slate-700 rounded-lg shadow-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition duration-150 ease-in-out"
                            />
                        </div>
                        <div className="relative">
                            <KeyIcon className="w-5 h-5 text-slate-500 absolute top-1/2 left-4 transform -translate-y-1/2" />
                            <input
                                type="password"
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full p-3 pl-12 bg-slate-900 border border-slate-700 rounded-lg shadow-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition duration-150 ease-in-out"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center p-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-all duration-200 ease-in-out transform hover:scale-[1.02] focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                        >
                            Entrar
                            <ChevronRightIcon className="w-5 h-5 ml-2" />
                        </button>
                    </form>
                    <div className="text-center mt-6 text-sm text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                        <p className="font-semibold text-slate-300">Para testar:</p>
                        <p>admin@admin.com / mudar@123</p>
                    </div>
                    <div className="text-center mt-6 text-sm">
                        <p className="text-slate-400">
                            Não tem uma conta?{' '}
                            <button onClick={() => onNavigate('pricing')} className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">
                                Veja nossos planos
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
};
