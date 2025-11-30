import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { PricingPage } from './pages/PricingPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { SalesPage } from './pages/SalesPage';
import { useAuth } from './hooks/useAuth';
import { INITIAL_VOICES, INITIAL_BACKGROUND_TRACKS } from './constants';
import { getVoices, getTracks, saveVoices, saveTracks } from './utils/storage';
import { Voice, TrackInfo } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { SiteConfigProvider } from './contexts/SiteConfigContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Safe storage helper
const safeStorageGet = (key: string, defaultValue: string) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (e) {
    console.warn(`Failed to access localStorage for key ${key}`, e);
    return defaultValue;
  }
};

type Page = 'login' | 'pricing' | 'dashboard' | 'admin' | 'sales';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('sales');
  const auth = useAuth();

  // Global State
  const [availableVoices, setAvailableVoices] = useState<Voice[]>(INITIAL_VOICES);
  const [backgroundTracks, setBackgroundTracks] = useState<TrackInfo[]>(INITIAL_BACKGROUND_TRACKS);
  const [isLoadingStorage, setIsLoadingStorage] = useState(true);

  const [ttsModel, setTtsModel] = useState<string>(() => safeStorageGet('locutando_ttsModel', 'gemini-2.5-flash-preview-tts'));
  const [chatModel, setChatModel] = useState<string>(() => safeStorageGet('locutando_chatModel', 'gemini-2.5-pro'));

  // Load from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [voices, tracks] = await Promise.all([
          getVoices(),
          getTracks()
        ]);

        // Merge stored voices with INITIAL_VOICES to update static properties (images, descriptions)
        const mergedVoices = voices.map(v => {
          const initial = INITIAL_VOICES.find(iv => iv.id === v.id);
          if (initial) {
            return { ...v, ...initial };
          }
          return v;
        });

        // Add any new voices from INITIAL_VOICES that are not in storage
        const existingIds = new Set(mergedVoices.map(v => v.id));
        const newVoices = INITIAL_VOICES.filter(iv => !existingIds.has(iv.id));

        // Ensure placeholders exist
        const allowed = ['achernar', 'achird', 'algenib', 'algieba', 'alnilam', 'aoede', 'autonoe', 'callirrhoe', 'charon', 'despina', 'enceladus', 'erinome', 'fenrir', 'gacrux', 'iapetus', 'kore', 'laomedeia', 'leda', 'orus', 'puck', 'pulcherrima', 'rasalgethi', 'sadachbia', 'sadaltager', 'schedar', 'sulafat', 'umbriel', 'vindemiatrix', 'zephyr', 'zubenelgenubi'];
        const allCurrentIds = new Set([...existingIds, ...newVoices.map(v => v.id)]);

        const placeholders: Voice[] = allowed
          .filter(id => !allCurrentIds.has(id))
          .map(id => ({
            id, name: id, displayName: id, gender: 'Masculino', language: 'pt-BR', description: '', prompt: '', imageUrl: '', demoUrl: ''
          }));

        setAvailableVoices([...mergedVoices, ...newVoices, ...placeholders]);
        setBackgroundTracks(tracks);
      } catch (error) {
        console.error('Failed to load data from storage:', error);
      } finally {
        setIsLoadingStorage(false);
      }
    };
    loadData();
  }, []);

  // Save to IndexedDB on change
  useEffect(() => {
    if (!isLoadingStorage) {
      saveVoices(availableVoices);
    }
  }, [availableVoices, isLoadingStorage]);

  useEffect(() => {
    if (!isLoadingStorage) {
      saveTracks(backgroundTracks);
    }
  }, [backgroundTracks, isLoadingStorage]);

  // Navigation Handler
  const handleNavigate = (newPage: Page) => {
    setPage(newPage);
  };

  // Auth Handler
  const handleLoginSuccess = (role: any) => {
    // Auth hook updates state, we just navigate
    setPage('dashboard');
  };

  const handleLogout = () => {
    auth.logout();
    setPage('login');
  };

  // Routing Logic
  const renderPage = () => {
    switch (page) {
      case 'sales':
        return <SalesPage onNavigate={handleNavigate} voices={availableVoices} />;
      case 'login':
        return <LoginPage onLoginSuccess={handleLoginSuccess} onNavigate={handleNavigate} auth={auth} />;
      case 'pricing':
        return <PricingPage onNavigate={handleNavigate} />;
      case 'dashboard':
        if (!auth.isAuthenticated) return <LoginPage onLoginSuccess={handleLoginSuccess} onNavigate={handleNavigate} auth={auth} />;
        return (
          <DashboardPage
            availableVoices={availableVoices}
            backgroundTracks={backgroundTracks}
            ttsModel={ttsModel}
            chatModel={chatModel}
          />
        );
      case 'admin':
        if (!auth.isAuthenticated || auth.userRole !== 'admin') return <DashboardPage availableVoices={availableVoices} backgroundTracks={backgroundTracks} ttsModel={ttsModel} chatModel={chatModel} />;
        return (
          <AdminPage
            availableVoices={availableVoices}
            setAvailableVoices={setAvailableVoices}
            backgroundTracks={backgroundTracks}
            setBackgroundTracks={setBackgroundTracks}
            ttsModel={ttsModel}
            setTtsModel={setTtsModel}
            chatModel={chatModel}
            setChatModel={setChatModel}
            users={auth.users}
            setUsers={auth.setUsers}
          />
        );
      default:
        return <LoginPage onLoginSuccess={handleLoginSuccess} onNavigate={handleNavigate} auth={auth} />;
    }
  };

  if (isLoadingStorage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const googleClientId = safeStorageGet('googleClientId', '');

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ErrorBoundary>
        <ThemeProvider>
          <SiteConfigProvider>
            <MainLayout
              user={auth.currentUser}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              currentPage={page}
            >
              {renderPage()}
            </MainLayout>
          </SiteConfigProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GoogleOAuthProvider>
  );
};

export default App;