import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';

interface LoginPageProps {
    onLoginSuccess: (role: any) => void;
    onNavigate: (page: any) => void;
    auth: ReturnType<typeof useAuth>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigate, auth }) => {
    // const [isLoggingIn, setIsLoggingIn] = useState(false); // Removed unused state

    return (
        <main className="flex items-center justify-center min-h-screen bg-slate-900 p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />

            <div className="w-full max-w-md relative z-10">
                <div className="bg-slate-800/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-700/50">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-6">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Bem-vindo</h2>
                        <p className="text-slate-400">Faça login para acessar o Locutando</p>
                    </div>

                    <div className="space-y-6">
                        {/* Botão de Google Customizado para Supabase */}
                        <div className="flex justify-center">
                            <button
                                onClick={() => auth.loginWithGoogle()}
                                type="button"
                                className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Entrar com Google
                            </button>
                        </div>

                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-slate-700"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase tracking-wider">Seguro e Rápido</span>
                            <div className="flex-grow border-t border-slate-700"></div>
                        </div>


                    </div>

                    {/* Email/Password Login */}
                    <div className="mt-4">
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
                                const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
                                if (email && password) {
                                    const result = await auth.login(email, password);
                                    if (result.success) {
                                        onLoginSuccess(auth.userRole || 'user');
                                    } else {
                                        alert('Erro ao logar: ' + result.message);
                                    }
                                }
                            }}
                            className="flex flex-col gap-4"
                        >
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium ml-1">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="seu@email.com"
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium ml-1">Senha</label>
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 mt-2"
                            >
                                Entrar com Email
                            </button>
                        </form>
                    </div>



                    <div className="text-center mt-8 text-sm">
                        <p className="text-slate-400">
                            Ao entrar, você concorda com nossos{' '}
                            <button className="text-indigo-400 hover:text-indigo-300 hover:underline">Termos de Uso</button>
                            {' '}e{' '}
                            <button className="text-indigo-400 hover:text-indigo-300 hover:underline">Política de Privacidade</button>.
                        </p>
                    </div>
                </div>
            </div>
        </main >
    );
};

