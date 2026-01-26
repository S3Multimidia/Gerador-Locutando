import { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { jwtDecode } from 'jwt-decode';

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



  // Helper to sync with backend
  const syncWithBackend = async (email: string, name?: string): Promise<{ success: boolean; token?: string; message?: string }> => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });

      if (!res.ok) throw new Error('Falha na autenticação com servidor');

      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token); // Store real token
        return { success: true, token: data.token };
      }
      return { success: false, message: 'Token não recebido' };
    } catch (e) {
      console.error("Backend auth failed", e);
      return { success: false, message: 'Erro ao conectar com servidor' };
    }
  };

  const processLogin = async (email: string, name?: string, picture?: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Backend Login (Get Token)
    const backendResult = await syncWithBackend(cleanEmail, name);
    if (!backendResult.success) {
      return { success: false, message: backendResult.message };
    }

    // 2. Client Side State (Legacy)
    // Check if user exists
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
    return { success: true };
  }

  const loginWithGoogleToken = async (credentialResponse: any): Promise<{ success: boolean; message?: string }> => {
    try {
      if (credentialResponse.credential) {
        const decoded: any = jwtDecode(credentialResponse.credential);
        const { email, name, picture } = decoded;
        return await processLogin(email, name, picture);
      }
      return { success: false, message: 'Formato de credencial não suportado.' };
    } catch (error) {
      console.error("Login failed", error);
      return { success: false, message: 'Falha ao processar login do Google.' };
    }
  };

  const loginWithGoogle = async (email: string): Promise<{ success: boolean; message?: string }> => {
    return await processLogin(email);
  };

  const login = async (email: string, password: string) => {
    return await processLogin(email);
  };

  const logout = () => {
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
    loginWithGoogle,
    loginWithGoogleToken,
    logout
  };
};
