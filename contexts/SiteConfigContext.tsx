import React, { createContext, useContext, useState, useEffect } from 'react';
import { BackendService } from '../services/backend';

// Define the shape of the site configuration
export interface SiteConfig {
    hero: {
        title: string;
        subtitle: string;
        ctaText: string;
        ctaLink: string;
    };
    features: {
        showVoices: boolean;
        showWriter: boolean;
        showMixer: boolean;
    };
    pricing: {
        basicPrice: string;
        proPrice: string;
    };
    contact: {
        email: string;
        whatsapp: string;
    };
}

// Default configuration
const DEFAULT_CONFIG: SiteConfig = {
    hero: {
        title: "A Voz da Sua Marca Em Segundos",
        subtitle: "Crie locuções profissionais, mixadas com trilha sonora e prontas para usar. Sem estúdio, sem microfone, apenas mágica.",
        ctaText: "Começar Agora Grátis",
        ctaLink: "login"
    },
    features: {
        showVoices: true,
        showWriter: true,
        showMixer: true
    },
    pricing: {
        basicPrice: "29",
        proPrice: "79"
    },
    contact: {
        email: "contato@locutando.com.br",
        whatsapp: ""
    }
};

interface SiteConfigContextType {
    config: SiteConfig;
    updateConfig: (newConfig: Partial<SiteConfig>) => void;
    resetConfig: () => void;
}

const SiteConfigContext = createContext<SiteConfigContextType | undefined>(undefined);

export const SiteConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);

    // Load from backend on mount
    useEffect(() => {
        const loadGlobalConfig = async () => {
            try {
                // Fetch Global Config from Admin API (Public route)
                const res = await fetch(`${BackendService.API_URL}/api/storefront/config/`);
                if (res.ok) {
                    const serverConfig = await res.json();

                    // Update Local State with Server Data
                    setConfig(prev => ({
                        ...prev,
                        hero: {
                            ...prev.hero,
                            title: serverConfig.heroHeadline || prev.hero.title,
                            subtitle: serverConfig.heroSubheadline || prev.hero.subtitle,
                            // Could map colors here if SiteConfig supported it
                        }
                    }));

                    // Inject AI Keys / Model Configs into Globals/LocalStorage for Client usage
                    if (serverConfig.apiKey) localStorage.setItem('gemini_api_key_global', serverConfig.apiKey);
                    if (serverConfig.googleClientId) localStorage.setItem('google_client_id_global', serverConfig.googleClientId);

                    // Supabase
                    if (serverConfig.supabaseUrl) localStorage.setItem('supabase_url', serverConfig.supabaseUrl);
                    if (serverConfig.supabaseKey) localStorage.setItem('supabase_key', serverConfig.supabaseKey);

                    console.log("Loaded global config from server:", serverConfig.siteTitle);
                }
            } catch (e) {
                console.warn("Backend config unreachable, using cache/defaults", e);
            }
        };

        loadGlobalConfig();

        // Also load local backup
        const savedConfig = localStorage.getItem('locutando_site_config');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                setConfig(prev => ({ ...prev, ...parsed }));
            } catch (e) { }
        }
    }, []);

    // Save to localStorage whenever config changes
    const updateConfig = (newConfig: Partial<SiteConfig>) => {
        setConfig(prev => {
            const updated = { ...prev, ...newConfig };
            localStorage.setItem('locutando_site_config', JSON.stringify(updated));
            return updated;
        });
    };

    const resetConfig = () => {
        setConfig(DEFAULT_CONFIG);
        localStorage.removeItem('locutando_site_config');
    };

    return (
        <SiteConfigContext.Provider value={{ config, updateConfig, resetConfig }}>
            {children}
        </SiteConfigContext.Provider>
    );
};

export const useSiteConfig = () => {
    const context = useContext(SiteConfigContext);
    if (context === undefined) {
        throw new Error('useSiteConfig must be used within a SiteConfigProvider');
    }
    return context;
};
