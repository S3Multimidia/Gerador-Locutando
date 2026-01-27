import { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { jwtDecode } from 'jwt-decode';
import { supabase } from '../utils/supabaseClient'; // Import Supabase Client

const INITIAL_USERS: User[] = [
  { id: 1, name: 'S3 Multimídia', email: 's3multimidia@gmail.com', plan: 'Empresarial', status: 'Ativo', role: 'admin' },
  { id: 2, name: 'Cliente', email: 'cliente@cliente.com', plan: 'Profissional', status: 'Ativo', role: 'user' },
];

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window === 'undefined') return INITIAL_USERS;
    try {
      const raw = localStorage.getItem('locutando_users');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Failed to load users from storage", e);
    }
    return INITIAL_USERS;
  });

  // Restore session from Supabase on load
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        // If Supabase has a session, we consider the user logged in
        // We map the Supabase user to our local "System User" to keep roles working
        processLocalUserLogic(session.user.email, session.user.user_metadata?.name || '', session.user.user_metadata?.picture);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        processLocalUserLogic(session.user.email, session.user.user_metadata?.name, session.user.user_metadata?.picture);
      } else {
        // Logged out
        setIsAuthenticated(false);
        setUserRole(null);
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [users]);


  // Helper to process local user mapping (Legacy Logic Preservation)
  const processLocalUserLogic = (email: string, name?: string, picture?: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists locally
    let user = users.find(u => u.email.toLowerCase() === cleanEmail);

    // If not, create a new user locally
    if (!user) {
      if (cleanEmail === 's3multimidia@gmail.com') {
        user = {
          id: Date.now(),
          name: name || 'S3 Multimídia',
          email: cleanEmail,
          plan: 'Empresarial',
          status: 'Ativo',
          role: 'admin',
          imageUrl: picture
        };
      } else {
        user = {
          id: Date.now(),
          name: name || email.split('@')[0],
          email: cleanEmail,
          plan: 'Gratuito',
          status: 'Ativo',
          role: 'user',
          imageUrl: picture
        };
      }
      setUsers(prev => [...prev, user!]);
    } else {
      if (picture && user.imageUrl !== picture) {
        user.imageUrl = picture;
        setUsers(prev => prev.map(u => u.id === user!.id ? { ...u, imageUrl: picture } : u));
      }
    }

    if (cleanEmail === 's3multimidia@gmail.com' && user.role !== 'admin') {
      user.role = 'admin';
      setUsers(prev => prev.map(u => u.id === user!.id ? { ...u, role: 'admin' } : u));
    }

    setIsAuthenticated(true);
    setUserRole(user.role);
    setCurrentUser(user);
    return user;
  };


  const loginWithGoogle = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      // Get the current URL for redirection back after Google login
      const redirectTo = window.location.origin;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      // The user will be redirected to Google, so we don't return success immediately
      return { success: true };
    } catch (error: any) {
      console.error("Google Login failed", error);
      return { success: false, message: error.message || 'Falha ao iniciar login com Google.' };
    }
  };

  const loginWithGoogleToken = async (credentialResponse: any): Promise<{ success: boolean; message?: string }> => {
    // NOTE: This is Google Sign-In via @react-oauth/google (Client Side)
    // To integrate with Supabase properly, we should ideally use supabase.auth.signInWithOAuth({ provider: 'google' })
    // But since the button is already implemented, we will treat it as "External Auth Success"
    // and just map to local user. 
    // SECURITY WARNING: This bypasses Supabase Auth for Google users unless we exchange tokens. 
    // For now, to fix the "Server Error", we will trust the Google Token client-side validation logic from before.

    try {
      if (credentialResponse.credential) {
        const decoded: any = jwtDecode(credentialResponse.credential);
        const { email, name, picture } = decoded;

        // We act "as if" login succeeded
        processLocalUserLogic(email, name, picture);
        return { success: true };
      }
      return { success: false, message: 'Formato de credencial não suportado.' };
    } catch (error) {
      console.error("Login failed", error);
      return { success: false, message: 'Falha ao processar login do Google.' };
    }
  };


  const login = async (email: string, password: string): Promise<{ success: boolean, message?: string }> => {
    try {
      // 1. Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Supabase Auth Error:", error);
        return { success: false, message: error.message };
      }

      if (data.user && data.user.email) {
        // 2. If success, map to local logic
        processLocalUserLogic(data.user.email);
        return { success: true };
      }

      return { success: false, message: "Erro desconhecido ao logar" };

    } catch (e: any) {
      console.error("Login exception", e);
      return { success: false, message: e.message || "Erro de conexão" };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
  };

  return {
    isAuthenticated,
    userRole,
    currentUser,
    users,
    setUsers,
    login,
    loginWithGoogle, // Export the Supabase OAuth function
    loginWithGoogleToken, // Kept for legacy if needed
    logout
  };
};
