import { Wallet, Transaction, DepositResponse } from '../types';

// Serverless Mode Active - Backend URL ignored
const API_URL = '';

const getAuthHeaders = () => {
    return { 'Content-Type': 'application/json' };
};

export const BackendService = {
    API_URL: API_URL,

    async getMyRequests(): Promise<any[]> {
        console.log("Mock: getMyRequests");
        return [];
    },

    // --- System Config & Admin ---
    async getSystemConfig() {
        console.log("Mock: getSystemConfig");
        return {
            evolution_api_url: '',
            evolution_api_token: '',
            mercado_pago_token: '',
        };
    },

    async updateSystemConfig(config: any) {
        console.log("Mock: updateSystemConfig", config);
        return { success: true };
    },

    async getEvolutionQrCode() {
        console.log("Mock: getEvolutionQrCode");
        return "Backend Offline - QR Code Unavailable";
    },

    async sendBroadcast(message: string, filter?: string) {
        console.log("Mock: sendBroadcast", message);
        return { success: true };
    },

    // --- Wallet & Payments ---
    async getWalletBalance(): Promise<Wallet> {
        // Mock Balance for Serverless
        return { balance: 0.00, currency: 'BRL' };
    },

    async createDepositPix(amount: number): Promise<DepositResponse> {
        console.log("Mock: createDepositPix", amount);
        return {
            qr_code: "mock_qr_code",
            qr_code_base64: "",
            payment_id: "mock_payment_id"
        };
    },

    async getTransactions(): Promise<Transaction[]> {
        return [];
    },

    async addCredits(userId: number, amount: number) {
        console.log(`Mock: Added ${amount} credits to user ${userId}`);
        return { success: true, new_balance: amount };
    },

    async checkHealth(): Promise<boolean> {
        return true; // Always healthy in Serverless mode
    },

    async generateStorefrontAudio(formData: FormData): Promise<any> {
        // Here we hit a limitation: Audio Generation usually requires python backend.
        // For now, we return a mock error or success placeholder.
        console.warn("Backend Generation Unavailable. Returning Mock.");

        // Simulate Logic delay
        await new Promise(r => setTimeout(r, 2000));

        throw new Error("O servidor de geração de áudio (Python) está desligado nesta versão Serverless. Aguarde atualizações.");
    },

    async cancelStorefrontRequest(requestId: number): Promise<any> {
        return { success: true };
    }
};
