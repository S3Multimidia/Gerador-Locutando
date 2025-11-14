import React from 'react';
import { MicIcon, LogOutIcon, ShieldIcon } from './IconComponents';

type Page = 'login' | 'pricing' | 'dashboard' | 'admin';
type Role = 'user' | 'admin';

interface HeaderProps {
  isAuthenticated: boolean;
  userRole: Role | null;
  onLogout: () => void;
  onNavigate: (page: Page) => void;
}


export const Header: React.FC<HeaderProps> = ({ isAuthenticated, userRole, onLogout, onNavigate }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'login')} className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-red-500 to-orange-500 p-2 rounded-full shadow-md">
              <MicIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              Locutando
            </h1>
          </button>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {userRole === 'admin' && (
                  <button onClick={() => onNavigate('admin')} className="hidden sm:flex items-center text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors">
                    <ShieldIcon className="w-4 h-4 mr-1.5" />
                    Painel Admin
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="flex items-center p-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <LogOutIcon className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
               <button onClick={() => onNavigate('login')} className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors">
                  Entrar
               </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};