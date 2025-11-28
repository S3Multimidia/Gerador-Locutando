import { useState, useEffect } from 'react';
import { Client } from '../types';

const STORAGE_KEY = 'locutando_clients';

export const useClients = () => {
    const [clients, setClients] = useState<Client[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setClients(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to parse clients", e);
        }
    }, []);

    const saveClients = (newClients: Client[]) => {
        setClients(newClients);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newClients));
    };

    const addClient = (name: string, instructions: string) => {
        const newClient: Client = {
            id: Date.now().toString(),
            name,
            instructions
        };
        saveClients([...clients, newClient]);
        return newClient;
    };

    const updateClient = (id: string, name: string, instructions: string) => {
        const newClients = clients.map(c => c.id === id ? { ...c, name, instructions } : c);
        saveClients(newClients);
    };

    const deleteClient = (id: string) => {
        const newClients = clients.filter(c => c.id !== id);
        saveClients(newClients);
    };

    return {
        clients,
        addClient,
        updateClient,
        deleteClient
    };
};
