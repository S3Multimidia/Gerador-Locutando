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

  const loginWithGoogleToken = (credentialResponse: any): { success: boolean; message?: string } => {
    try {
      // If using the Google Button component, the response has a 'credential' field (JWT)
      // If using useGoogleLogin (implicit flow), it returns an access_token.
      // However, for simple identity, the JWT (ID Token) is preferred.
      // Let's assume we are receiving the ID Token (credential) or we might need to fetch user info if it's an access token.

      // NOTE: @react-oauth/google's GoogleLogin component returns { credential: string, clientId: string }
      // useGoogleLogin returns { access_token: string, ... } usually.

      // If we receive an object with 'credential', it's the ID Token.
      if (credentialResponse.credential) {
        const decoded: any = jwtDecode(credentialResponse.credential);
        const { email, name, picture } = decoded;
        return processLogin(email, name, picture);
      }

      // If we receive an access_token (from useGoogleLogin), we would need to fetch the user profile.
      // But for simplicity and to match the "Google Login" requirement, we will try to use the ID Token flow if possible,
      // or if the user passes the profile data directly.

      return { success: false, message: 'Formato de credencial não suportado.' };
    } catch (error) {
      console.error("Login failed", error);
      return { success: false, message: 'Falha ao processar login do Google.' };
    }
  };

  const processLogin = (email: string, name?: string, picture?: string): { success: boolean; message?: string } => {
    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    let user = users.find(u => u.email.toLowerCase() === cleanEmail);

    // If not, create a new user
    if (!user) {
      // If it's the specific admin email, ensure they get admin role
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
      // Update existing user info if needed (e.g. picture)
      if (picture && user.imageUrl !== picture) {
        user.imageUrl = picture;
        setUsers(prev => prev.map(u => u.id === user!.id ? { ...u, imageUrl: picture } : u));
      }
    }

    // Enforce Admin Role for specific email
    if (cleanEmail === 's3multimidia@gmail.com' && user.role !== 'admin') {
      user.role = 'admin';
      // Update in state as well
      setUsers(prev => prev.map(u => u.id === user!.id ? { ...u, role: 'admin' } : u));
    }

    setIsAuthenticated(true);
    setUserRole(user.role);
    setCurrentUser(user);
    return { success: true };
  }

  const loginWithGoogle = (email: string): { success: boolean; message?: string } => {
    return processLogin(email);
  };

  // Deprecated: kept for compatibility if needed, but redirects to google login logic
  const login = (email: string, password: string) => {
    return loginWithGoogle(email);
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
