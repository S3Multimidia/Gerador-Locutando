import { useState, useEffect } from 'react';
import { User, Role } from '../types';

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

  const loginWithGoogle = (email: string): { success: boolean; message?: string } => {
    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    let user = users.find(u => u.email.toLowerCase() === cleanEmail);

    // If not, create a new user (Simulation of "Sign Up with Google")
    if (!user) {
      // If it's the specific admin email, ensure they get admin role even if not in storage initially
      if (cleanEmail === 's3multimidia@gmail.com') {
        user = {
          id: Date.now(),
          name: 'S3 Multimídia',
          email: cleanEmail,
          plan: 'Empresarial',
          status: 'Ativo',
          role: 'admin'
        };
      } else {
        user = {
          id: Date.now(),
          name: email.split('@')[0], // Simple name extraction
          email: cleanEmail,
          plan: 'Gratuito', // Default plan for new users
          status: 'Ativo',
          role: 'user'
        };
      }
      setUsers(prev => [...prev, user!]);
    }

    // Enforce Admin Role for specific email
    if (cleanEmail === 's3multimidia@gmail.com' && user.role !== 'admin') {
      user.role = 'admin';
    }

    setIsAuthenticated(true);
    setUserRole(user.role);
    setCurrentUser(user);
    return { success: true };
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
    logout
  };
};
