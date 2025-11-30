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
                        <div className="flex justify-center w-full">
                            <GoogleLogin
                                onSuccess={credentialResponse => {
                                    const result = auth.loginWithGoogleToken(credentialResponse);
                                    if (result.success) {
                                        onLoginSuccess(auth.userRole || 'user');
                                    }
                                }}
                                onError={() => {
                                    console.log('Login Failed');
                                    alert('Falha no login com Google.');
                                }}
                                theme="filled_blue"
                                size="large"
                                text="signin_with"
                                shape="pill"
                                width="300"
                            />
                        </div>

                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-slate-700"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase tracking-wider">Seguro e Rápido</span>
                            <div className="flex-grow border-t border-slate-700"></div>
                        </div>


                    </div>

                    {/* Temporary Email Login for Testing */}
                    <div className="mt-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
                        <p className="text-xs text-slate-400 mb-2 text-center uppercase tracking-wider">Acesso Temporário (Dev)</p>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
                                if (email) {
                                    const result = auth.login(email, '');
                                    if (result.success) {
                                        onLoginSuccess(auth.userRole || 'user');
                                    } else {
                                        alert('Erro ao logar: ' + result.message);
                                    }
                                }
                            }}
                            className="flex flex-col gap-2"
                        >
                            <input
                                type="email"
                                name="email"
                                placeholder="Digite seu email..."
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                required
                            />
                            <button
                                type="submit"
                                className="w-full py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
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

