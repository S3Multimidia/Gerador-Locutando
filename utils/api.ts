/**
 * Retrieves the API Key from various possible sources.
 * Priority:
 * 1. Vite Environment Variable (process.env.API_KEY) - Injected at build time
 * 2. Window Global (__API_KEY__) - For runtime injection
 * 3. Local Storage (apiKey) - For user override
 */
export const getApiKey = (): string | undefined => {
    // 1. Try Vite injected env var
    // Note: We access process.env.API_KEY directly so Vite can replace it.
    // We do NOT check typeof process because Vite replaces the string literal.
    try {
        const envKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (envKey) return envKey;
    } catch (e) {
        // Ignore reference errors if process is not defined (though Vite usually handles this)
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
