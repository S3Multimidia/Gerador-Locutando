/**
 * Retrieves the API Key from various possible sources.
 * Priority:
 * 1. Vite Environment Variable (process.env.API_KEY) - Injected at build time
 * 2. Window Global (__API_KEY__) - For runtime injection
 * 3. Local Storage (apiKey) - For user override
 */
export const getApiKey = (): string | undefined => {
    // 1. Try Vite environment variables
    try {
        const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
        if (envKey) return envKey;
    } catch (e) {
        // Ignore errors
    }

    // 2. Try Window global
    if (typeof window !== 'undefined' && (window as any).__API_KEY__) {
        return (window as any).__API_KEY__;
    }

    // 3. Try Local Storage
    if (typeof window !== 'undefined') {
        return localStorage.getItem('apiKey') || undefined;
    }

    return undefined;
};
