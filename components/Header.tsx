import React from 'react';
import { MicIcon, LogOutIcon, ShieldIcon, UserIcon, SunIcon, MoonIcon } from './IconComponents';
import { User, Role } from '../types';
import { useTheme } from '../contexts/ThemeContext';

type Page = 'login' | 'pricing' | 'dashboard' | 'admin';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onNavigate: (page: any) => void;
  currentPage: string;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onNavigate, currentPage }) => {
  const isAuthenticated = !!user;
  const userRole = user?.role;
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'sales')} className="flex items-center space-x-3 group">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-105">
              <MicIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Locutando
            </h1>
          </button>

          <div className="flex items-center space-x-6">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>

            {isAuthenticated ? (
              <>
                <div className="hidden md:flex items-center space-x-4 mr-4">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{user?.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{user?.plan}</span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold border-2 border-slate-200 dark:border-slate-800">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                </div>

                {userRole === 'admin' && (
                  <button onClick={() => onNavigate('admin')} className={`flex items-center text-sm font-semibold transition-colors ${currentPage === 'admin' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                    <ShieldIcon className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Admin</span>
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="flex items-center p-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Sair"
                >
                  <LogOutIcon className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <button onClick={() => onNavigate('pricing')} className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                  Preços
                </button>
                <button onClick={() => onNavigate('login')} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/20 transition-all transform hover:scale-105">
                  Entrar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};