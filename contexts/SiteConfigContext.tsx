import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

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
    const [configId, setConfigId] = useState<number | null>(null);

    // Load from Supabase on mount
    useEffect(() => {
        const loadGlobalConfig = async () => {
            try {
                // 1. Try Loading from Supabase (Source of Truth)
                const { data, error } = await supabase
                    .from('site_config')
                    .select('id, config')
                    .limit(1)
                    .single();

                if (error) {
                    console.warn("Supabase Config Error (Using Local/Defaults):", error.message);
                    throw error;
                }

                if (data) {
                    console.log("Config loaded from Supabase ID:", data.id);
                    setConfig(prev => ({ ...prev, ...data.config }));
                    setConfigId(data.id);
                    // Update Local Backup
                    localStorage.setItem('locutando_site_config', JSON.stringify(data.config));
                }
            } catch (e) {
                // 2. Fallback to LocalStorage
                console.warn("Using offline config fallback.");
                const savedConfig = localStorage.getItem('locutando_site_config');
                if (savedConfig) {
                    try {
                        const parsed = JSON.parse(savedConfig);
                        setConfig(prev => ({ ...prev, ...parsed }));
                    } catch (err) { }
                }
            }
        };

        loadGlobalConfig();
    }, []);

    // Save to Supabase + localStorage whenever config changes
    const updateConfig = async (newConfig: Partial<SiteConfig>) => {
        // Calculate State Synchronously
        const finalConfig = { ...config, ...newConfig };

        // Update Local State & Storage
        setConfig(finalConfig);
        localStorage.setItem('locutando_site_config', JSON.stringify(finalConfig));

        // Persist to Supabase
        if (configId) {
            try {
                const { error } = await supabase
                    .from('site_config')
                    .update({ config: finalConfig })
                    .eq('id', configId);

                if (error) console.error("Error saving to DB:", error);
            } catch (err) {
                console.error("Failed to persist config remotely", err);
            }
        }
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
