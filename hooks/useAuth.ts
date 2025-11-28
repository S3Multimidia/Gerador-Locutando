import { useState, useEffect } from 'react';
import { User, Role } from '../types';

const INITIAL_USERS: User[] = [
  { id: 1, name: 'Admin', email: 'admin@admin.com', plan: 'Empresarial', status: 'Ativo', role: 'admin', password: 'mudar@123' },
  { id: 2, name: 'Cliente', email: 'cliente@cliente.com', plan: 'Profissional', status: 'Ativo', role: 'user', password: 'locutando' },
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

  const login = (email: string, password: string): { success: boolean; message?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const found = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (found && found.password === password && found.status === 'Ativo') {
      setIsAuthenticated(true);
      setUserRole(found.role);
      setCurrentUser(found);
      return { success: true };
    }
    return { success: false, message: 'E-mail ou senha inválidos.' };
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
    logout
  };
};
