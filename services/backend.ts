import { Wallet, Transaction, DepositResponse } from '../types';

// Base URL for the Django Backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const BackendService = {
    // --- System Config & Admin ---
    async getSystemConfig() {
        try {
            const res = await fetch(`${API_URL}/api/admin/config/`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to fetch config');
            return await res.json();
        } catch (e) {
            // Mock fallback
            return {
                evolution_api_url: '',
                evolution_api_token: '',
                mercado_pago_token: '',
            };
        }
    },

    async updateSystemConfig(config: any) {
        const res = await fetch(`${API_URL}/api/admin/config/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error('Failed to update config');
        return await res.json();
    },

    async getEvolutionQrCode() {
        const res = await fetch(`${API_URL}/api/admin/evolution/connect/`, { headers: getAuthHeaders() });
        // Handled as text or json depending on backend
        return await res.text(); // or res.json()
    },

    async sendBroadcast(message: string, filter?: string) {
        return fetch(`${API_URL}/api/admin/broadcast/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ message, filter })
        });
    },

    // --- Wallet & Payments ---
    async getWalletBalance(): Promise<Wallet> {
        try {
            const res = await fetch(`${API_URL}/api/wallet/balance/`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to fetch balance');
            return await res.json();
        } catch (e) {
            return { balance: 0.00, currency: 'BRL' };
        }
    },

    async createDepositPix(amount: number): Promise<DepositResponse> {
        const res = await fetch(`${API_URL}/api/deposit/create_pix/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ amount })
        });
        if (!res.ok) throw new Error('Failed to create deposit');
        return await res.json();
    },

    async getTransactions(): Promise<Transaction[]> {
        try {
            const res = await fetch(`${API_URL}/api/wallet/transactions/`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to fetch transactions');
            return await res.json();
        } catch (e) {
            return [];
        }
    },

    async addCredits(userId: number, amount: number) {
        const res = await fetch(`${API_URL}/api/admin/users/${userId}/add_credits/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ amount })
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed: ${res.status} ${res.statusText} - ${errText}`);
        }
        return await res.json();
        return await res.json();
    },

    async checkHealth(): Promise<boolean> {
        try {
            // Simple fetch to root or admin login to check connectivity
            // We use 'HEAD' to be lightweight if supported, or GET
            // Making a request to a known open endpoint is best.
            // Using logic: if fetch fails, it's down.
            const res = await fetch(`${API_URL}/admin/login/`, { method: 'HEAD' });
            return true; // If we get any response (even 404 or 200), server is up.
        } catch (e) {
            return false;
        }
    }
};
