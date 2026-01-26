import React from 'react';
import { Header } from '../components/Header';
import { User } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface MainLayoutProps {
    children: React.ReactNode;
    user: User | null;
    onLogout: () => void;
    onNavigate: (page: any) => void;
    currentPage: string;
}

import { SupportChat } from '../components/SupportChat';

export const MainLayout: React.FC<MainLayoutProps> = ({ children, user, onLogout, onNavigate, currentPage }) => {
    const { theme } = useTheme();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
            {/* Background gradients - adjusted for light/dark */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 dark:bg-indigo-900/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 dark:bg-blue-900/20 blur-[120px]" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <Header
                    user={user}
                    onLogout={onLogout}
                    onNavigate={onNavigate}
                    currentPage={currentPage}
                />
                <div className="flex-grow">
                    {children}
                </div>

                <footer className="border-t border-slate-200 dark:border-slate-800 py-8 mt-auto transition-colors duration-300">
                    <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
                        <p className="text-slate-500 text-sm">© 2024 Locutando AI Auto Studio v2.4 - Todos os direitos reservados.</p>
                    </div>
                </footer>

                {/* AI Support Agent - Visible on all pages */}
                <SupportChat />
            </div>
        </div>
    );
};
